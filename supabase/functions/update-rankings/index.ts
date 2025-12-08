// ============================================
// Edge Function: Update Rankings Cache
// ============================================
// Periodically updates and caches user rankings
// Can be triggered by:
// - Cron job (recommended: every hour)
// - Manual invocation
// - After batch of interviews complete
//
// Usage:
// POST /functions/v1/update-rankings
// Body: { job_type?: string, force_refresh?: boolean }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface RankingEntry {
  user_id: string;
  rank_position: number;
  percentile: number;
  best_score: number;
  avg_score: number;
  interview_count: number;
}

interface JobTypeStats {
  job_type: string;
  total_users: number;
  total_interviews: number;
  avg_score: number;
  median_score: number;
  std_dev: number;
  updated_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { job_type, force_refresh = false } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if cache exists and is fresh (within 1 hour)
    if (!force_refresh) {
      const { data: cacheInfo } = await supabase
        .from('ranking_cache_meta')
        .select('updated_at')
        .eq('job_type', job_type || 'all')
        .single();

      if (cacheInfo) {
        const lastUpdate = new Date(cacheInfo.updated_at);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

        if (lastUpdate > hourAgo) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Cache is still fresh',
              cached_at: cacheInfo.updated_at,
              next_refresh: new Date(lastUpdate.getTime() + 60 * 60 * 1000).toISOString(),
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    // Build job type filter
    const jobTypeFilter = job_type ? `AND s.job_type = '${job_type}'` : '';

    // Calculate rankings using raw SQL for performance
    const { data: rankings, error: rankError } = await supabase.rpc(
      'calculate_rankings_batch',
      { p_job_type: job_type || null }
    );

    // If RPC doesn't exist, calculate manually
    let calculatedRankings: RankingEntry[] = [];
    let jobStats: JobTypeStats | null = null;

    if (rankError) {
      console.log('RPC not available, calculating manually...');

      // Get all user best scores with job type filter
      const query = supabase
        .from('interview_results')
        .select(
          `
          user_id,
          overall_score,
          session_id,
          interview_sessions!inner(job_type)
        `
        );

      if (job_type) {
        query.eq('interview_sessions.job_type', job_type);
      }

      const { data: results, error: resultsError } = await query;

      if (resultsError) {
        throw new Error(`Failed to fetch results: ${resultsError.message}`);
      }

      // Aggregate by user
      const userScores = new Map<
        string,
        { scores: number[]; count: number }
      >();

      for (const result of results || []) {
        const userId = result.user_id;
        if (!userScores.has(userId)) {
          userScores.set(userId, { scores: [], count: 0 });
        }
        const userData = userScores.get(userId)!;
        userData.scores.push(result.overall_score);
        userData.count++;
      }

      // Calculate stats for each user
      const userStats: {
        user_id: string;
        best_score: number;
        avg_score: number;
        interview_count: number;
      }[] = [];

      userScores.forEach((data, userId) => {
        const bestScore = Math.max(...data.scores);
        const avgScore =
          data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        userStats.push({
          user_id: userId,
          best_score: bestScore,
          avg_score: Math.round(avgScore * 100) / 100,
          interview_count: data.count,
        });
      });

      // Sort by best score descending
      userStats.sort((a, b) => b.best_score - a.best_score);

      // Assign ranks and percentiles
      const totalUsers = userStats.length;
      calculatedRankings = userStats.map((user, index) => ({
        user_id: user.user_id,
        rank_position: index + 1,
        percentile: Math.round(((totalUsers - index) / totalUsers) * 100 * 100) / 100,
        best_score: user.best_score,
        avg_score: user.avg_score,
        interview_count: user.interview_count,
      }));

      // Calculate job type statistics
      const allScores = Array.from(userScores.values()).flatMap((u) => u.scores);
      if (allScores.length > 0) {
        const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        const sortedScores = [...allScores].sort((a, b) => a - b);
        const median =
          sortedScores.length % 2 === 0
            ? (sortedScores[sortedScores.length / 2 - 1] +
                sortedScores[sortedScores.length / 2]) /
              2
            : sortedScores[Math.floor(sortedScores.length / 2)];
        const variance =
          allScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
          allScores.length;
        const stdDev = Math.sqrt(variance);

        jobStats = {
          job_type: job_type || 'all',
          total_users: totalUsers,
          total_interviews: allScores.length,
          avg_score: Math.round(mean * 100) / 100,
          median_score: Math.round(median * 100) / 100,
          std_dev: Math.round(stdDev * 100) / 100,
          updated_at: new Date().toISOString(),
        };
      }
    } else {
      calculatedRankings = rankings as RankingEntry[];
    }

    // Ensure ranking_cache table exists and upsert data
    // First, try to create the tables if they don't exist
    await supabase.rpc('ensure_ranking_tables').catch(() => {
      // If RPC doesn't exist, tables might already exist or we'll create them
      console.log('ensure_ranking_tables RPC not available, continuing...');
    });

    // Upsert rankings to cache table
    if (calculatedRankings.length > 0) {
      const cacheEntries = calculatedRankings.map((r) => ({
        user_id: r.user_id,
        job_type: job_type || 'all',
        rank_position: r.rank_position,
        percentile: r.percentile,
        best_score: r.best_score,
        avg_score: r.avg_score,
        interview_count: r.interview_count,
        updated_at: new Date().toISOString(),
      }));

      // Delete old cache entries for this job type
      await supabase
        .from('ranking_cache')
        .delete()
        .eq('job_type', job_type || 'all');

      // Insert new cache entries
      const { error: insertError } = await supabase
        .from('ranking_cache')
        .insert(cacheEntries);

      if (insertError) {
        console.error('Failed to cache rankings:', insertError);
        // Continue without caching - we can still return the results
      }
    }

    // Update cache metadata
    if (jobStats) {
      await supabase
        .from('ranking_cache_meta')
        .upsert({
          job_type: job_type || 'all',
          total_users: jobStats.total_users,
          total_interviews: jobStats.total_interviews,
          avg_score: jobStats.avg_score,
          median_score: jobStats.median_score,
          std_dev: jobStats.std_dev,
          updated_at: new Date().toISOString(),
        })
        .catch((e) => console.error('Failed to update cache meta:', e));
    }

    // Update individual user rank_percentile in interview_results
    for (const ranking of calculatedRankings.slice(0, 100)) {
      // Update top 100 for performance
      await supabase
        .from('interview_results')
        .update({ rank_percentile: ranking.percentile })
        .eq('user_id', ranking.user_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Rankings updated successfully',
        stats: {
          job_type: job_type || 'all',
          users_ranked: calculatedRankings.length,
          top_10: calculatedRankings.slice(0, 10),
          job_stats: jobStats,
        },
        updated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Update rankings error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
