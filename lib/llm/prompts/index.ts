// ============================================
// IMSAM AI Interview - 프롬프트 모듈
// ============================================

// 채점 루브릭
export {
  CORE_RUBRIC,
  CORE_TO_COMPETENCY_MAPPING,
  INTERVIEWER_EVALUATION_WEIGHTS,
  PASS_CRITERIA,
  generateRubricDocument,
  calculateTotalScore,
  convertToCompetencyScores,
  determinePassStatus,
  type CoreEvaluationCategory,
  type ScoreLevel,
  type RubricItem,
  type EvaluationScores,
  type PassCriteria,
} from './scoring-rubric';

// 채점 시스템 프롬프트
export {
  REALTIME_SCORING_SYSTEM_PROMPT,
  FINAL_EVALUATION_SYSTEM_PROMPT,
  REALTIME_SCORING_SCHEMA,
  FINAL_EVALUATION_SCHEMA,
  buildInterviewerScoringPrompt,
  buildQuestionEvaluationPrompt,
  buildInnerThoughtPrompt,
  // API 설정 및 요청 빌더
  SCORING_API_CONFIG,
  buildRealtimeScoringRequest,
  buildFinalEvaluationRequest,
  buildQuestionScoringRequest,
  type ScoringApiRequest,
} from './scoring-system-prompt';

