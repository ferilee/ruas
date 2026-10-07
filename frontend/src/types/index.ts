export interface Subject {
  id: number;
  slug: string;
  label: string;
  display_order: number;
}

export interface Topic {
  id: number;
  subject_id: number;
  slug: string;
  label: string;
  display_order: number;
  question_count: number;
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

export interface CheckResult {
  correct: boolean;
  correct_keys: string[];
  explanation: string;
}
