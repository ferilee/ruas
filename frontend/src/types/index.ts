export interface Subject {
  id: number;
  slug: string;
  label: string;
  display_order: number;
  max_attempts: number;
  duration_minutes: number;
  minimum_duration_minutes: number;
  explanation_mode: ExplanationMode;
  show_correct_answer_on_wrong: boolean;
  class_id?: number | null;
  assessment_type_id?: number | null;
}

export type ExplanationMode = 'after_answer' | 'after_exam' | 'hidden';

export interface CurriculumClass {
  id: number;
  slug: string;
  label: string;
  academic_year: string;
  grade: number;
  program: string;
  section: string | null;
  display_order: number;
}

export interface AssessmentType {
  id: number;
  slug: string;
  label: string;
  display_order: number;
}

export interface CurriculumData {
  classes: CurriculumClass[];
  assessment_types: AssessmentType[];
  subjects: Subject[];
}

export interface AssessmentSchedule {
  id?: number;
  topic_id: number | null;
  topic_label?: string | null;
  subject_id?: number | null;
  subject_label?: string | null;
  assessment_type_label?: string | null;
  start_at: string | null;
  end_at: string | null;
  enabled: boolean;
  state: 'open' | 'upcoming' | 'ended' | 'disabled';
  is_open: boolean;
  starts_in_seconds: number;
  notes?: string | null;
  updated_at?: string;
}

export interface ParticipantProfile {
  username: string;
  participant_code: string;
  name: string;
  gender: '' | 'male' | 'female';
  birth_date: string;
  subject_id: number | null;
  subject_label: string;
  class_label: string;
  assessment_type_label: string;
  access_token: string;
  is_demo: boolean;
  is_complete: boolean;
}

export interface ParticipantProfileInput {
  username?: string;
  participant_code: string;
  name: string;
  gender: 'male' | 'female';
  birth_date: string;
  subject_id: number;
  subject_label?: string;
  class_label?: string;
  assessment_type_label?: string;
  access_token: string;
}

export interface Topic {
  id: number;
  subject_id: number;
  class_id?: number | null;
  class_label?: string | null;
  slug: string;
  label: string;
  display_order: number;
  question_count: number;
  requires_token: boolean;
}

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: number;
  type: 'single_choice' | 'multiple_response' | 'true_false';
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  options: QuestionOption[];
}

export interface AdminQuestionOption extends QuestionOption {
  is_correct: boolean;
}

export interface AdminQuestionListItem {
  id: number;
  topic_id: number;
  topic_slug: string;
  topic_label: string;
  type: Question['type'];
  difficulty: Question['difficulty'];
  question_text: string;
  external_id: string | null;
}

export interface AdminQuestionPage {
  questions: AdminQuestionListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AdminQuestion extends AdminQuestionListItem {
  explanation_text: string;
  options: AdminQuestionOption[];
}

export interface AdminTopic {
  id: number;
  subject_id: number;
  subject_label: string;
  class_ids: number[];
  class_labels: string[];
  slug: string;
  label: string;
  display_order: number;
  requires_token: boolean;
  token_configured: boolean;
}

export interface AdminTopicInput {
  subject_id: number;
  slug: string;
  label: string;
  display_order: number;
  class_ids: number[];
}

export interface AdminQuestionInput {
  topic_id: number;
  type: Question['type'];
  difficulty: Question['difficulty'];
  external_id: string | null;
  question_text: string;
  explanation_text: string;
  options: AdminQuestionOption[];
}

export interface ImportSummary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export type UserRole = 'admin' | 'editor' | 'participant';

export interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  class_id: number | null;
  class_label: string | null;
  subject_id: number | null;
  role: UserRole;
  active: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserInput {
  username: string;
  password?: string;
  display_name: string;
  class_id: number | null;
  subject_id: number | null;
  role: UserRole;
  active: boolean;
  is_demo: boolean;
}

export interface UserImportSummary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface CheckResult {
  correct: boolean;
  correct_keys: string[];
  explanation: string | null;
  explanation_mode: ExplanationMode;
  correct_answer_hidden?: boolean;
}

export interface ExamReviewItem {
  question_id: number;
  question_text: string;
  explanation: string;
  is_correct: boolean;
  elapsed_seconds: number;
}

export interface ExamReviewResponse {
  mode: ExplanationMode;
  items: ExamReviewItem[];
}

export interface ExamAttempt {
  id: number;
  participant_id: number;
  subject_id: number;
  topic_id: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  total_questions: number;
  answered_questions: number;
  correct_count: number;
  incorrect_count: number;
  total_time_seconds: number;
  accuracy: number;
  violation_count: number;
  integrity_penalty: number;
  final_score: number;
  started_at: string;
  deadline_at: string | null;
  minimum_duration_minutes: number;
  completed_at: string | null;
  question_order?: number[] | null;
  option_order?: Record<string, string[]> | null;
  doubtful_question_ids?: number[] | null;
}

export interface ExamAttemptAvailability {
  max_attempts: number;
  attempts_used: number;
  remaining_attempts: number | null;
  can_start: boolean;
  has_active_attempt: boolean;
}

export interface ExamAnswerRecord {
  id: number;
  attempt_id: number;
  question_id: number;
  selected_keys: string[];
  is_correct: boolean;
  elapsed_seconds: number;
  answered_at: string;
}

export interface AttemptQuestion {
  question: Question | null;
  question_number: number;
  total_questions: number;
  selected_keys: string[];
  answered: boolean;
  is_doubtful: boolean;
}

export type ReportStatus = 'all' | 'in_progress' | 'completed' | 'abandoned';
export type ReportScorePolicy = 'best' | 'latest' | 'average';

export interface AdminReportFilters {
  status: ReportStatus;
  score_policy: ReportScorePolicy;
  subject_id?: number;
  class_id?: number;
  assessment_type_id?: number;
  from?: string;
  to?: string;
  search?: string;
}

export interface AdminReportSummary {
  total_attempts: number;
  completed_attempts: number;
  in_progress_attempts: number;
  abandoned_attempts: number;
  average_score: number;
  average_accuracy: number;
  average_time_seconds: number;
  total_violations: number;
}

export interface AdminReportClassStatistic {
  class_id: number | null;
  class_label: string;
  participant_count: number;
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  average_accuracy: number;
  average_time_seconds: number;
  total_violations: number;
}

export interface AdminReportRow {
  attempt_id: number;
  participant_id: number;
  participant_code: string;
  participant_name: string;
  username: string;
  subject_id: number;
  subject_label: string;
  class_id: number | null;
  class_label: string | null;
  assessment_type_id: number | null;
  assessment_type_label: string | null;
  topic_id: number | null;
  topic_label: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  total_questions: number;
  answered_questions: number;
  correct_count: number;
  incorrect_count: number;
  total_time_seconds: number;
  accuracy: number;
  violation_count: number;
  integrity_penalty: number;
  final_score: number;
  started_at: string;
  completed_at: string | null;
}

export interface AdminReportAnswer {
  id: number;
  attempt_id: number;
  question_id: number;
  question_text: string;
  selected_keys: string[];
  is_correct: boolean;
  elapsed_seconds: number;
  answered_at: string;
}

export type AdminReportQuestionStatus = 'correct' | 'incorrect' | 'unanswered';

export interface AdminReportQuestionAnalysis {
  question_number: number;
  question_id: number;
  topic_label: string;
  question_text: string;
  selected_keys: string[];
  selected_texts: string[];
  correct_keys: string[];
  correct_texts: string[];
  status: AdminReportQuestionStatus;
  is_correct: boolean;
  elapsed_seconds: number;
  answered_at: string | null;
}

export interface AdminReportIntegrityEvent {
  id: number;
  attempt_id: number;
  event_type: string;
  occurred_at: string;
}

export interface AdminReportDetail extends AdminReportRow {
  answers: AdminReportAnswer[];
  integrity_events: AdminReportIntegrityEvent[];
  question_analysis: AdminReportQuestionAnalysis[];
  correct_question_numbers: number[];
  incorrect_question_numbers: number[];
  unanswered_question_numbers: number[];
}

export interface AdminReportData {
  filters: AdminReportFilters;
  summary: AdminReportSummary;
  class_statistics: AdminReportClassStatistic[];
  rows: AdminReportRow[];
}
