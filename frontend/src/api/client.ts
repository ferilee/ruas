import type {
  AdminQuestion,
  AdminQuestionInput,
  AdminQuestionListItem,
  AdminTopic,
  AssessmentSchedule,
  CheckResult,
  ImportSummary,
  Question,
  Subject,
  Topic,
} from '@/types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['x-auth-token'] = token;

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

export async function fetchAssessmentSchedule(): Promise<AssessmentSchedule> {
  const data = await request<{ schedule: AssessmentSchedule }>('/schedule');
  return data.schedule;
}

export async function fetchTopics(subjectId: number): Promise<Topic[]> {
  const data = await request<{ topics: Topic[] }>(`/topics?subject_id=${subjectId}`);
  return data.topics;
}

export async function fetchRandomQuestion(topicId: number, excludeIds?: number[]): Promise<Question | null> {
  let url = `/questions/random?topic_id=${topicId}`;
  if (excludeIds && excludeIds.length > 0) {
    url += `&exclude=${excludeIds.join(',')}`;
  }
  const data = await request<{ question: Question | null }>(url);
  return data.question;
}

export async function checkAnswer(questionId: number, selectedKeys: string[]): Promise<CheckResult> {
  return request<CheckResult>(`/questions/${questionId}/check`, {
    method: 'POST',
    body: JSON.stringify({ selected_keys: selectedKeys }),
  });
}

export async function verifyExamExitPassword(password: string): Promise<void> {
  await request<{ authorized: true }>('/exam/exit', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function fetchQuestionCount(topicId: number): Promise<number> {
  const data = await request<{ count: number }>(`/questions/count?topic_id=${topicId}`);
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

export async function fetchAdminSchedule(): Promise<AssessmentSchedule> {
  const data = await adminRequest<{ schedule: AssessmentSchedule }>('/admin/schedule');
  return data.schedule;
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
