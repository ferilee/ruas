import type {
  AdminQuestion,
  AdminQuestionInput,
  AdminQuestionListItem,
  AdminTopic,
  AdminUser,
  AdminUserInput,
  AdminReportData,
  AdminReportDetail,
  AdminReportFilters,
  AssessmentSchedule,
  CurriculumData,
  CheckResult,
  ExamAttempt,
  ExamAttemptAvailability,
  ExamAnswerRecord,
  ExamReviewResponse,
  ImportSummary,
  UserImportSummary,
  ParticipantProfile,
  ParticipantProfileInput,
  Question,
  Subject,
  Topic,
} from '@/types';
import { getParticipantClientId } from '@/lib/participant-profile';

const TOPIC_ACCESS_KEY_PREFIX = 'ruas_topic_access_';

function getTopicAccessStorageKey(topicId: number) {
  return `${TOPIC_ACCESS_KEY_PREFIX}${topicId}`;
}

export function getTopicAccessToken(topicId: number): string | null {
  return sessionStorage.getItem(getTopicAccessStorageKey(topicId));
}

function topicAccessHeaders(topicId: number): Record<string, string> {
  const token = getTopicAccessToken(topicId);
  return token ? { 'x-topic-access-token': token } : {};
}

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['x-auth-token'] = token;
  headers['x-client-id'] = getParticipantClientId();

  const mergedHeaders = { ...headers, ...(options?.headers as Record<string, string>) };
  const res = await fetch(`${BASE}${url}`, { ...options, headers: mergedHeaders });

  if (res.status === 401) {
    sessionStorage.removeItem('auth_token');
    window.location.href = '/auth';
    throw new Error('Sesi berakhir.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Gagal memuat data.' }));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function adminRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('admin_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['x-admin-token'] = token;

  const mergedHeaders = { ...headers, ...(options?.headers as Record<string, string>) };
  const res = await fetch(`${BASE}${url}`, { ...options, headers: mergedHeaders });

  if (res.status === 401) {
    sessionStorage.removeItem('admin_token');
    throw new Error('Sesi admin berakhir.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Gagal memproses permintaan admin.' }));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSubjects(): Promise<Subject[]> {
  const data = await request<{ subjects: Subject[] }>('/subjects');
  return data.subjects;
}

export async function fetchCurriculum(): Promise<CurriculumData> {
  return request<CurriculumData>('/curriculum');
}

export async function fetchParticipantProfile(): Promise<ParticipantProfile | null> {
  const data = await request<{ profile: ParticipantProfile | null }>('/profile');
  return data.profile;
}

export async function saveParticipantProfile(profile: ParticipantProfileInput | ParticipantProfile): Promise<ParticipantProfile> {
  const data = await request<{ profile: ParticipantProfile }>('/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
  return data.profile;
}

export async function fetchAssessmentSchedule(): Promise<AssessmentSchedule> {
  const data = await request<{ schedule: AssessmentSchedule }>('/schedule');
  return data.schedule;
}

export async function fetchTopics(subjectId: number): Promise<Topic[]> {
  const data = await request<{ topics: Topic[] }>(`/topics?subject_id=${subjectId}`);
  return data.topics;
}

export async function verifyTopicAccess(topicId: number, token: string): Promise<void> {
  await request<{ granted: true }>(`/topics/${topicId}/access`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  sessionStorage.setItem(getTopicAccessStorageKey(topicId), token.trim());
}

export async function fetchRandomQuestion(topicId: number, excludeIds?: number[]): Promise<Question | null> {
  let url = `/questions/random?topic_id=${topicId}`;
  if (excludeIds && excludeIds.length > 0) {
    url += `&exclude=${excludeIds.join(',')}`;
  }
  const data = await request<{ question: Question | null }>(url, { headers: topicAccessHeaders(topicId) });
  return data.question;
}

export async function checkAnswer(questionId: number, selectedKeys: string[]): Promise<CheckResult> {
  return request<CheckResult>(`/questions/${questionId}/check`, {
    method: 'POST',
    body: JSON.stringify({ selected_keys: selectedKeys }),
  });
}

export async function createExamAttempt(input: { subject_id: number; topic_id: number; total_questions: number }): Promise<ExamAttempt> {
  const topic_access_token = getTopicAccessToken(input.topic_id);
  const data = await request<{ attempt: ExamAttempt }>('/exam/attempts', {
    method: 'POST',
    body: JSON.stringify({ ...input, topic_access_token: topic_access_token ?? undefined }),
  });
  return data.attempt;
}

export async function fetchActiveExamAttempt(topicId: number): Promise<{ attempt: ExamAttempt | null; answers: ExamAnswerRecord[] }> {
  return request<{ attempt: ExamAttempt | null; answers: ExamAnswerRecord[] }>(`/exam/attempts/active?topic_id=${topicId}`);
}

export async function fetchExamAttemptAvailability(subjectId: number, topicId: number): Promise<ExamAttemptAvailability | null> {
  const data = await request<{ availability: ExamAttemptAvailability | null }>(`/exam/attempts/availability?subject_id=${subjectId}&topic_id=${topicId}`);
  return data.availability;
}

export async function saveExamAnswer(attemptId: number, input: { question_id: number; selected_keys: string[]; elapsed_seconds: number }): Promise<CheckResult> {
  return request<CheckResult>(`/exam/attempts/${attemptId}/answers`, { method: 'POST', body: JSON.stringify(input) });
}

export async function saveExamIntegrityEvent(attemptId: number, eventType: string, occurredAt: string): Promise<void> {
  await request(`/exam/attempts/${attemptId}/events`, { method: 'POST', body: JSON.stringify({ event_type: eventType, occurred_at: occurredAt }) });
}

export async function completeExamAttempt(attemptId: number): Promise<ExamAttempt> {
  const data = await request<{ attempt: ExamAttempt }>(`/exam/attempts/${attemptId}/complete`, { method: 'POST' });
  return data.attempt;
}

export async function fetchExamReview(attemptId: number): Promise<ExamReviewResponse> {
  return request<ExamReviewResponse>(`/exam/attempts/${attemptId}/review`);
}

export async function abandonExamAttempt(attemptId: number): Promise<ExamAttempt> {
  const data = await request<{ attempt: ExamAttempt }>(`/exam/attempts/${attemptId}/abandon`, { method: 'POST' });
  return data.attempt;
}

export async function verifyExamExitPassword(password: string): Promise<void> {
  await request<{ authorized: true }>('/exam/exit', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function fetchQuestionCount(topicId: number): Promise<number> {
  const data = await request<{ count: number }>(`/questions/count?topic_id=${topicId}`, { headers: topicAccessHeaders(topicId) });
  return data.count;
}

export async function fetchTopic(topicId: number): Promise<Topic | null> {
  try {
    const data = await request<{ topic: Topic }>(`/topics/${topicId}`);
    return data.topic;
  } catch {
    return null;
  }
}

export async function fetchAdminAuthStatus(): Promise<boolean> {
  const res = await fetch(`${BASE}/admin/auth`);
  if (!res.ok) return false;
  const data = await res.json() as { admin_auth_enabled?: boolean };
  return Boolean(data.admin_auth_enabled);
}

export async function adminLogin(password: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Gagal login admin.' }));
    throw new Error(body.message || `HTTP ${res.status}`);
  }

  const data = await res.json() as { token: string };
  sessionStorage.setItem('admin_token', data.token);
}

export async function fetchAdminQuestions(search?: string): Promise<AdminQuestionListItem[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const data = await adminRequest<{ questions: AdminQuestionListItem[] }>(`/admin/questions${query}`);
  return data.questions;
}

export async function fetchAdminQuestion(id: number): Promise<AdminQuestion> {
  const data = await adminRequest<{ question: AdminQuestion }>(`/admin/questions/${id}`);
  return data.question;
}

export async function fetchAdminTopics(): Promise<AdminTopic[]> {
  const data = await adminRequest<{ topics: AdminTopic[] }>('/admin/topics');
  return data.topics;
}

export async function updateAdminTopicAccess(id: number, input: { requires_token: boolean; token?: string }): Promise<AdminTopic> {
  const data = await adminRequest<{ topic: AdminTopic }>(`/admin/topics/${id}/access`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return data.topic;
}

export async function fetchAdminUsers(search?: string): Promise<AdminUser[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const data = await adminRequest<{ users: AdminUser[] }>(`/admin/users${query}`);
  return data.users;
}

export async function createAdminUser(input: AdminUserInput): Promise<AdminUser> {
  const data = await adminRequest<{ user: AdminUser }>('/admin/users', { method: 'POST', body: JSON.stringify(input) });
  return data.user;
}

export async function updateAdminUser(id: number, input: AdminUserInput): Promise<AdminUser> {
  const data = await adminRequest<{ user: AdminUser }>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  return data.user;
}

export async function assignAdminUsersSubject(userIds: number[], subjectId: number | null): Promise<number> {
  const data = await adminRequest<{ updated: number }>('/admin/users/bulk-subject', {
    method: 'PATCH',
    body: JSON.stringify({ user_ids: userIds, subject_id: subjectId }),
  });
  return data.updated;
}

export async function deleteAdminUser(id: number): Promise<void> {
  await adminRequest(`/admin/users/${id}`, { method: 'DELETE' });
}

export async function importAdminUsers(data: unknown, mode: 'insert' | 'upsert', dryRun: boolean): Promise<UserImportSummary> {
  const response = await adminRequest<{ summary: UserImportSummary }>('/admin/users/import', {
    method: 'POST',
    body: JSON.stringify({ data, mode, dry_run: dryRun }),
  });
  return response.summary;
}

export type CurriculumItemInput = { slug: string; label: string; display_order: number };
export type CurriculumSubjectInput = CurriculumItemInput & { class_id: number | null; assessment_type_id: number | null; max_attempts: number; explanation_mode: Subject['explanation_mode'] };

export async function fetchAdminCurriculum(): Promise<CurriculumData> {
  return adminRequest<CurriculumData>('/admin/curriculum');
}

async function createCurriculumItem(path: string, input: CurriculumItemInput): Promise<number> {
  const data = await adminRequest<{ id: number }>(`/admin/curriculum/${path}`, { method: 'POST', body: JSON.stringify(input) });
  return data.id;
}

async function updateCurriculumItem(path: string, id: number, input: CurriculumItemInput): Promise<void> {
  await adminRequest(`/admin/curriculum/${path}/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

async function deleteCurriculumItem(path: string, id: number): Promise<void> {
  await adminRequest(`/admin/curriculum/${path}/${id}`, { method: 'DELETE' });
}

export const createAdminClass = (input: CurriculumItemInput) => createCurriculumItem('classes', input);
export const updateAdminClass = (id: number, input: CurriculumItemInput) => updateCurriculumItem('classes', id, input);
export const deleteAdminClass = (id: number) => deleteCurriculumItem('classes', id);
export const createAdminAssessmentType = (input: CurriculumItemInput) => createCurriculumItem('assessment-types', input);
export const updateAdminAssessmentType = (id: number, input: CurriculumItemInput) => updateCurriculumItem('assessment-types', id, input);
export const deleteAdminAssessmentType = (id: number) => deleteCurriculumItem('assessment-types', id);

export async function createAdminSubject(input: CurriculumSubjectInput): Promise<number> {
  const data = await adminRequest<{ id: number }>('/admin/curriculum/subjects', { method: 'POST', body: JSON.stringify(input) });
  return data.id;
}

export async function updateAdminSubject(id: number, input: CurriculumSubjectInput): Promise<void> {
  await adminRequest(`/admin/curriculum/subjects/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function deleteAdminSubject(id: number): Promise<void> {
  await deleteCurriculumItem('subjects', id);
}

export async function fetchAdminSchedule(): Promise<AssessmentSchedule> {
  const data = await adminRequest<{ schedule: AssessmentSchedule }>('/admin/schedule');
  return data.schedule;
}

export async function fetchAdminReport(filters: AdminReportFilters): Promise<AdminReportData> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return adminRequest<AdminReportData>(`/admin/reports${query ? `?${query}` : ''}`);
}

export async function fetchAdminReportDetail(attemptId: number): Promise<AdminReportDetail> {
  const data = await adminRequest<{ report: AdminReportDetail }>(`/admin/reports/${attemptId}`);
  return data.report;
}

export async function updateAdminSchedule(startAt: string | null): Promise<AssessmentSchedule> {
  const data = await adminRequest<{ schedule: AssessmentSchedule }>('/admin/schedule', {
    method: 'PUT',
    body: JSON.stringify({ start_at: startAt }),
  });
  return data.schedule;
}

export async function createAdminQuestion(input: AdminQuestionInput): Promise<number> {
  const data = await adminRequest<{ question_id: number }>('/admin/questions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.question_id;
}

export async function updateAdminQuestion(id: number, input: AdminQuestionInput): Promise<void> {
  await adminRequest(`/admin/questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteAdminQuestion(id: number): Promise<void> {
  await adminRequest(`/admin/questions/${id}`, { method: 'DELETE' });
}

export async function importAdminQuestions(
  data: unknown,
  mode: 'insert' | 'upsert',
  dryRun: boolean,
): Promise<ImportSummary> {
  const response = await adminRequest<{ summary: ImportSummary }>('/admin/questions/import', {
    method: 'POST',
    body: JSON.stringify({ data, mode, dry_run: dryRun }),
  });
  return response.summary;
}
