export interface Subject {
  id: number;
  slug: string;
  label: string;
  display_order: number;
  max_attempts: number;
  explanation_mode: ExplanationMode;
  class_id?: number | null;
  assessment_type_id?: number | null;
}

export type ExplanationMode = 'after_answer' | 'after_exam' | 'hidden';

export interface CurriculumClass {
  id: number;
  slug: string;
  label: string;
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
  start_at: string | null;
  is_open: boolean;
  starts_in_seconds: number;
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

export interface AdminQuestion extends AdminQuestionListItem {
  explanation_text: string;
  options: AdminQuestionOption[];
}

export interface AdminTopic {
  id: number;
  subject_id: number;
  subject_label: string;
  slug: string;
  label: string;
  display_order: number;
  requires_token: boolean;
  token_configured: boolean;
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
  subject_id: number | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserInput {
  username: string;
  password?: string;
  display_name: string;
  subject_id: number | null;
  role: UserRole;
  active: boolean;
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
  completed_at: string | null;
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

export type ReportStatus = 'all' | 'in_progress' | 'completed' | 'abandoned';

export interface AdminReportFilters {
  status: ReportStatus;
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

export interface AdminReportIntegrityEvent {
  id: number;
  attempt_id: number;
  event_type: string;
  occurred_at: string;
}

export interface AdminReportDetail extends AdminReportRow {
  answers: AdminReportAnswer[];
  integrity_events: AdminReportIntegrityEvent[];
}

export interface AdminReportData {
  filters: AdminReportFilters;
  summary: AdminReportSummary;
  rows: AdminReportRow[];
}
