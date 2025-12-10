"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from "@/lib/admin/api";
import type { InterviewQuestion } from "@/lib/admin/api";
import type { PaginatedResponse } from "@/types/admin";
import { toast } from "sonner";

/**
 * 면접 질문 관리 페이지
 */
export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<PaginatedResponse<InterviewQuestion> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuestion, setSelectedQuestion] = useState<InterviewQuestion | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    job_type: "",
    difficulty: "medium",
    question_text: "",
    evaluation_points: "",
    sample_answer: "",
  });

  const limit = 10;

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getQuestions({
        page: currentPage,
        limit,
        search: searchQuery || undefined,
      });
      setQuestions(data);
    } catch (error) {
      console.error("Failed to load questions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadQuestions();
  };

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      await createQuestion({
        category: formData.category,
        job_type: formData.job_type || null,
        difficulty: formData.difficulty,
        question_text: formData.question_text,
        evaluation_points: formData.evaluation_points.split("\n").filter(Boolean),
        sample_answer: formData.sample_answer || null,
      });
      toast.success("질문이 생성되었습니다");
      setShowCreateModal(false);
      setFormData({ category: "", job_type: "", difficulty: "medium", question_text: "", evaluation_points: "", sample_answer: "" });
      loadQuestions();
    } catch (error) {
      console.error("Failed to create question:", error);
      toast.error("질문 생성에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedQuestion) return;
    setIsSaving(true);
    try {
      await updateQuestion(selectedQuestion.id, {
        category: formData.category,
        job_type: formData.job_type || null,
        difficulty: formData.difficulty,
        question_text: formData.question_text,
        evaluation_points: formData.evaluation_points.split("\n").filter(Boolean),
        sample_answer: formData.sample_answer || null,
      });
      toast.success("질문이 수정되었습니다");
      setSelectedQuestion(null);
      setIsEditing(false);
      loadQuestions();
    } catch (error) {
      console.error("Failed to update question:", error);
      toast.error("질문 수정에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteQuestion(id);
      toast.success("질문이 삭제되었습니다");
      loadQuestions();
    } catch (error) {
      console.error("Failed to delete question:", error);
      toast.error("질문 삭제에 실패했습니다");
    }
  };

  const openEdit = (q: InterviewQuestion) => {
    setSelectedQuestion(q);
    setFormData({
      category: q.category,
      job_type: q.job_type || "",
      difficulty: q.difficulty,
      question_text: q.question_text,
      evaluation_points: q.evaluation_points.join("\n"),
      sample_answer: q.sample_answer || "",
    });
    setIsEditing(true);
  };

  const getDifficultyBadge = (difficulty: string) => {
    const styles: Record<string, string> = {
      easy: "bg-green-500/10 text-green-400 border-green-500/20",
      medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      hard: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    const labels: Record<string, string> = { easy: "초급", medium: "중급", hard: "고급" };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${styles[difficulty] || styles.medium}`}>
        {labels[difficulty] || difficulty}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">질문 관리</h1>
          <p className="text-slate-400">총 {questions?.total || 0}개의 질문</p>
        </div>

        <div className="flex gap-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="text"
                placeholder="질문 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-56 bg-slate-800/50 border-slate-700"
              />
            </div>
          </form>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2 bg-mint text-slate-900 hover:bg-mint/90">
            <Plus className="w-4 h-4" />
            새 질문
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">질문</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">카테고리</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">난이도</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-mint border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : questions?.data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">질문이 없습니다</td>
                </tr>
              ) : (
                questions?.data.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-300 max-w-md truncate">{q.question_text}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{q.category}</td>
                    <td className="px-4 py-3">{getDifficultyBadge(q.difficulty)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(q)} className="text-slate-400 hover:text-white">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(q.id)} className="text-slate-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {questions && questions.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
            <p className="text-sm text-slate-400">
              {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, questions.total)} of {questions.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="border-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === questions.totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="border-slate-700">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || isEditing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowCreateModal(false); setIsEditing(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">{isEditing ? "질문 수정" : "새 질문"}</h3>
                <button onClick={() => { setShowCreateModal(false); setIsEditing(false); }} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">질문</label>
                  <textarea
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white resize-none"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">카테고리</label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="bg-slate-700/50 border-slate-600"
                      placeholder="예: 인성, 기술, 상황"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">난이도</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-white"
                    >
                      <option value="easy">초급</option>
                      <option value="medium">중급</option>
                      <option value="hard">고급</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">평가 기준 (줄바꿈으로 구분)</label>
                  <textarea
                    value={formData.evaluation_points}
                    onChange={(e) => setFormData({ ...formData, evaluation_points: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white resize-none"
                    rows={3}
                    placeholder="각 줄에 평가 기준 입력"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">모범 답안 (선택)</label>
                  <textarea
                    value={formData.sample_answer}
                    onChange={(e) => setFormData({ ...formData, sample_answer: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
                <Button variant="outline" onClick={() => { setShowCreateModal(false); setIsEditing(false); }} className="border-slate-600">
                  취소
                </Button>
                <Button onClick={isEditing ? handleUpdate : handleCreate} disabled={isSaving} className="gap-2 bg-mint text-slate-900 hover:bg-mint/90">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isEditing ? "수정" : "생성"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
