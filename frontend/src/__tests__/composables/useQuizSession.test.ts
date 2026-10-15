import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizSession } from '@/composables/useQuizSession';

const {
  abandonExamAttempt,
  completeExamAttempt,
  createExamAttempt,
  fetchActiveExamAttempt,
  fetchAttemptQuestion,
  fetchExamReview,
  fetchNextAttemptQuestion,
  fetchQuestionCount,
  fetchTopic,
  saveExamAnswer,
  saveAttemptQuestionFlag,
  saveExamIntegrityEvent,
} = vi.hoisted(() => ({
  abandonExamAttempt: vi.fn(),
  completeExamAttempt: vi.fn(),
  createExamAttempt: vi.fn(),
  fetchActiveExamAttempt: vi.fn(),
  fetchAttemptQuestion: vi.fn(),
  fetchExamReview: vi.fn(),
  fetchNextAttemptQuestion: vi.fn(),
  fetchQuestionCount: vi.fn(),
  fetchTopic: vi.fn(),
  saveExamAnswer: vi.fn(),
  saveAttemptQuestionFlag: vi.fn(),
  saveExamIntegrityEvent: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  abandonExamAttempt,
  completeExamAttempt,
  createExamAttempt,
  fetchActiveExamAttempt,
  fetchAttemptQuestion,
  fetchExamReview,
  fetchNextAttemptQuestion,
  fetchQuestionCount,
  fetchTopic,
  saveExamAnswer,
  saveAttemptQuestionFlag,
  saveExamIntegrityEvent,
}));

const firstQuestion = {
  id: 101,
  type: 'single_choice' as const,
  difficulty: 'medium' as const,
  question_text: 'Soal pertama',
  options: [
    { key: 'A', text: 'Opsi A' },
    { key: 'B', text: 'Opsi B' },
  ],
};

const secondQuestion = {
  id: 202,
  type: 'single_choice' as const,
  difficulty: 'hard' as const,
  question_text: 'Soal kedua',
  options: [
    { key: 'A', text: 'Opsi A' },
    { key: 'B', text: 'Opsi B' },
  ],
};

describe('useQuizSession', () => {
  beforeEach(() => {
    abandonExamAttempt.mockReset();
    completeExamAttempt.mockReset();
    createExamAttempt.mockReset();
    fetchActiveExamAttempt.mockReset();
    fetchAttemptQuestion.mockReset();
    fetchExamReview.mockReset();
    fetchNextAttemptQuestion.mockReset();
    fetchQuestionCount.mockReset();
    fetchTopic.mockReset();
    saveExamAnswer.mockReset();
    saveAttemptQuestionFlag.mockReset();
    saveExamIntegrityEvent.mockReset();
    fetchActiveExamAttempt.mockResolvedValue({ attempt: null, answers: [], server_now: new Date().toISOString() });
    createExamAttempt.mockResolvedValue({
      attempt: { id: 501, deadline_at: null } as never,
      server_now: new Date().toISOString(),
    });
    fetchExamReview.mockResolvedValue({ mode: 'after_answer', items: [] });
  });

  it('initializes session from route query without extra topic lookup', async () => {
    fetchQuestionCount.mockResolvedValue(5);

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Aljabar',
    });

    await session.initializeSession();

    expect(fetchTopic).not.toHaveBeenCalled();
    expect(fetchQuestionCount).toHaveBeenCalledWith(11);
    expect(createExamAttempt).not.toHaveBeenCalled();
    expect(session.question.value).toBeNull();
    expect(session.state.value).toBe('ready');

    fetchNextAttemptQuestion.mockResolvedValue(firstQuestion);
    await session.startQuiz();

    expect(createExamAttempt).toHaveBeenCalledWith({ subject_id: 7, topic_id: 11, total_questions: 5 });
    expect(fetchNextAttemptQuestion).toHaveBeenCalledWith(501);
    expect(session.subjectId.value).toBe(7);
    expect(session.topicLabel.value).toBe('Aljabar');
    expect(session.questionCount.value).toBe(5);
    expect(session.question.value?.id).toBe(101);
    expect(session.state.value).toBe('answering');
  });

  it('uses the topic metadata when the count endpoint fails and keeps the next-question flow', async () => {
    fetchQuestionCount.mockRejectedValue(new Error('Jadwal count tidak tersedia'));
    fetchTopic.mockResolvedValue({
      id: 11,
      subject_id: 7,
      slug: 'barisan-dan-deret-xi-kkkr',
      label: 'Barisan dan Deret XI KKKR',
      display_order: 1,
      question_count: 2,
      requires_token: false,
    });
    fetchNextAttemptQuestion
      .mockResolvedValueOnce(firstQuestion)
      .mockResolvedValueOnce(secondQuestion);
    fetchAttemptQuestion.mockResolvedValue({
      question: secondQuestion,
      question_number: 2,
      total_questions: 2,
      selected_keys: [],
      answered: false,
      is_doubtful: false,
    });
    saveExamAnswer.mockResolvedValue({
      correct: true,
      correct_keys: ['B'],
      explanation: null,
      explanation_mode: 'after_answer',
    });

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Barisan dan Deret XI KKKR',
    });

    await session.initializeSession();
    expect(session.questionCount.value).toBe(2);
    expect(session.state.value).toBe('ready');

    await session.startQuiz();
    session.onSelectKeys(['B']);
    session.timerRunning.value = false;
    session.onTime(20);
    await session.submitAnswer();

    expect(session.isLastQuestion.value).toBe(false);
    await session.nextQuestion();
    expect(session.question.value?.id).toBe(202);
    expect(session.currentQuestionNumber.value).toBe(2);
  });

  it('uses the topic metadata when the count endpoint returns zero', async () => {
    fetchQuestionCount.mockResolvedValue(0);
    fetchTopic.mockResolvedValue({
      id: 11,
      subject_id: 7,
      slug: 'barisan-dan-deret-xi-kkkr',
      label: 'Barisan dan Deret XI KKKR',
      display_order: 1,
      question_count: 10,
      requires_token: false,
    });

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Barisan dan Deret XI KKKR',
    });

    await session.initializeSession();

    expect(session.questionCount.value).toBe(10);
    expect(session.questionCountReady.value).toBe(true);
    expect(session.state.value).toBe('ready');
  });

  it('keeps the topic question count when a legacy active attempt reports zero', async () => {
    fetchQuestionCount.mockResolvedValue(10);
    fetchActiveExamAttempt.mockResolvedValue({
      attempt: {
        id: 501,
        total_questions: 0,
        minimum_duration_minutes: 0,
        started_at: new Date().toISOString(),
        deadline_at: null,
      } as never,
      answers: [],
      server_now: new Date().toISOString(),
    });
    fetchNextAttemptQuestion.mockResolvedValue(firstQuestion);

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Barisan dan Deret XI KKKR',
    });

    await session.initializeSession();

    expect(session.questionCount.value).toBe(10);
    expect(session.question.value?.id).toBe(101);
    expect(session.state.value).toBe('ready');
  });

  it('explains when the topic is unavailable for the participant mapping', async () => {
    const accessError = Object.assign(new Error('Topik tidak ditemukan.'), { code: 'not_found' });
    fetchQuestionCount.mockRejectedValue(accessError);
    fetchTopic.mockRejectedValue(accessError);

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Barisan dan Deret XI KKKR',
    });

    await session.initializeSession();

    expect(session.state.value).toBe('error');
    expect(session.errorMessage.value).toContain('mapping kelas peserta');
  });

  it('does not apply minimum duration between questions', async () => {
    fetchQuestionCount.mockResolvedValue(2);
    fetchNextAttemptQuestion
      .mockResolvedValueOnce(firstQuestion)
      .mockResolvedValueOnce(secondQuestion);
    fetchAttemptQuestion.mockResolvedValue({
      question: secondQuestion,
      question_number: 2,
      total_questions: 2,
      selected_keys: [],
      answered: false,
      is_doubtful: false,
    });
    createExamAttempt.mockResolvedValue({
      attempt: {
        id: 501,
        total_questions: 2,
        minimum_duration_minutes: 30,
        started_at: new Date().toISOString(),
        deadline_at: null,
      } as never,
      server_now: new Date().toISOString(),
    });
    saveExamAnswer.mockResolvedValue({
      correct: true,
      correct_keys: ['B'],
      explanation: null,
      explanation_mode: 'after_answer',
    });

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Barisan dan Deret XI KKKR',
    });

    await session.initializeSession();
    await session.startQuiz();
    session.onSelectKeys(['B']);
    session.timerRunning.value = false;
    session.onTime(20);
    await session.submitAnswer();

    expect(session.isLastQuestion.value).toBe(false);
    expect(session.canComplete.value).toBe(false);
    await session.nextQuestion();
    expect(session.question.value?.id).toBe(202);
    expect(session.timerRunning.value).toBe(true);
  });

  it('submits an answer and moves into reviewing state with summary updated', async () => {
    fetchQuestionCount.mockResolvedValue(1);
    fetchNextAttemptQuestion.mockResolvedValue(firstQuestion);
    saveExamAnswer.mockResolvedValue({
      correct: true,
      correct_keys: ['B'],
      explanation: 'Pembahasan benar.',
      explanation_mode: 'after_answer',
    });

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Aljabar',
    });

    await session.initializeSession();
    await session.startQuiz();
    session.onSelectKeys(['B']);
    session.timerRunning.value = false;
    session.onTime(42);
    await session.submitAnswer();

    expect(saveExamAnswer).toHaveBeenCalledWith(501, {
      question_id: 101,
      selected_keys: ['B'],
      elapsed_seconds: 42,
    });
    expect(session.state.value).toBe('reviewing');
    expect(session.result.value).toEqual({
      correct: true,
      correct_keys: ['B'],
      explanation: 'Pembahasan benar.',
      explanation_mode: 'after_answer',
    });
    expect(session.correctCount.value).toBe(1);
    expect(session.incorrectCount.value).toBe(0);
    expect(session.totalTime.value).toBe('00:42');
    expect(session.accuracy.value).toBe(100);
    expect(session.isLastQuestion.value).toBe(true);
    expect(session.isQuestionAnswered(1)).toBe(true);
  });

  it('ignores a duplicate submit while the first answer is still being saved', async () => {
    fetchQuestionCount.mockResolvedValue(1);
    fetchNextAttemptQuestion.mockResolvedValue(firstQuestion);
    const checkResult = {
      correct: false,
      correct_keys: ['B'],
      explanation: null,
      explanation_mode: 'after_answer' as const,
    };
    let releaseSave!: () => void;
    saveExamAnswer.mockImplementation(() => new Promise((resolve) => {
      releaseSave = () => resolve(checkResult);
    }));

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Aljabar',
    });

    await session.initializeSession();
    await session.startQuiz();
    session.onSelectKeys(['A']);
    session.timerRunning.value = false;
    session.onTime(42);

    const firstSubmit = session.submitAnswer();
    const duplicateSubmit = session.submitAnswer();
    expect(saveExamAnswer).toHaveBeenCalledTimes(1);

    releaseSave();
    await Promise.all([firstSubmit, duplicateSubmit]);
    expect(session.correctCount.value).toBe(0);
    expect(session.incorrectCount.value).toBe(1);
  });

  it('uses the persisted attempt summary after the assessment is completed', async () => {
    fetchQuestionCount.mockResolvedValue(20);
    fetchNextAttemptQuestion.mockResolvedValue(firstQuestion);
    completeExamAttempt.mockResolvedValue({
      id: 501,
      status: 'completed',
      correct_count: 7,
      incorrect_count: 13,
      total_questions: 20,
      answered_questions: 20,
      total_time_seconds: 2716,
      accuracy: 35,
    } as never);

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Aljabar',
    });

    await session.initializeSession();
    await session.startQuiz();
    await session.finishSession('timeout');

    expect(session.correctCount.value).toBe(7);
    expect(session.incorrectCount.value).toBe(13);
    expect(session.accuracy.value).toBe(35);
    expect(session.totalTime.value).toBe('45:16');
  });

  it('loads the next question from the persisted attempt order', async () => {
    fetchQuestionCount.mockResolvedValue(2);
    fetchNextAttemptQuestion
      .mockResolvedValueOnce(firstQuestion)
      .mockResolvedValueOnce(secondQuestion);
    createExamAttempt.mockResolvedValue({
      attempt: { id: 501, deadline_at: null, question_order: [101, 202] } as never,
      server_now: new Date().toISOString(),
    });
    fetchAttemptQuestion.mockResolvedValue({
      question: secondQuestion,
      question_number: 2,
      total_questions: 2,
      selected_keys: [],
      answered: false,
      is_doubtful: false,
    });
    saveExamAnswer.mockResolvedValue({
      correct: false,
      correct_keys: ['B'],
      explanation: 'Pembahasan salah.',
      explanation_mode: 'after_answer',
    });

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Aljabar',
    });

    await session.initializeSession();
    await session.startQuiz();
    session.onSelectKeys(['A']);
    session.timerRunning.value = false;
    session.onTime(15);
    await session.submitAnswer();
    await session.nextQuestion();

    expect(fetchNextAttemptQuestion).toHaveBeenNthCalledWith(1, 501);
    expect(fetchAttemptQuestion).toHaveBeenCalledWith(501, 2);
    expect(session.question.value?.id).toBe(202);
    expect(session.state.value).toBe('answering');
    expect(session.currentQuestionNumber.value).toBe(2);
    expect(session.timerRunning.value).toBe(true);
  });

  it('prevents duplicate next-question requests while navigation is loading', async () => {
    fetchQuestionCount.mockResolvedValue(2);
    fetchNextAttemptQuestion.mockResolvedValueOnce(firstQuestion);
    saveExamAnswer.mockResolvedValue({
      correct: true,
      correct_keys: ['B'],
      explanation: null,
      explanation_mode: 'after_answer',
    });

    let releaseQuestion!: () => void;
    fetchAttemptQuestion.mockImplementationOnce(() => new Promise((resolve) => {
      releaseQuestion = () => resolve({
        question: secondQuestion,
        question_number: 2,
        total_questions: 2,
        selected_keys: [],
        answered: false,
        is_doubtful: false,
      });
    }) as never);

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Aljabar',
    });

    await session.initializeSession();
    await session.startQuiz();
    session.onSelectKeys(['B']);
    session.timerRunning.value = false;
    session.onTime(15);
    await session.submitAnswer();

    const firstNavigation = session.nextQuestion();
    const duplicateNavigation = session.nextQuestion();
    expect(session.questionNavigationLoading.value).toBe(true);
    expect(fetchAttemptQuestion).toHaveBeenCalledTimes(1);

    releaseQuestion();
    await Promise.all([firstNavigation, duplicateNavigation]);

    expect(session.question.value?.id).toBe(202);
    expect(session.questionNavigationLoading.value).toBe(false);
  });

  it('navigates directly to a question and restores its saved answer', async () => {
    fetchQuestionCount.mockResolvedValue(2);
    fetchNextAttemptQuestion.mockResolvedValue(firstQuestion);
    fetchAttemptQuestion.mockResolvedValue({
      question: secondQuestion,
      question_number: 2,
      total_questions: 2,
      selected_keys: ['A'],
      answered: true,
      is_doubtful: true,
    });

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Aljabar',
    });

    await session.initializeSession();
    await session.startQuiz();
    await session.loadQuestionNumber(2);

    expect(fetchAttemptQuestion).toHaveBeenCalledWith(501, 2);
    expect(session.question.value?.id).toBe(202);
    expect(session.currentQuestionNumber.value).toBe(2);
    expect(session.selectedKeys.value).toEqual(['A']);
    expect(session.currentQuestionDoubtful.value).toBe(true);
  });

  it('shows the result action after navigating to an answered final question', async () => {
    fetchQuestionCount.mockResolvedValue(2);
    fetchNextAttemptQuestion.mockResolvedValue(firstQuestion);
    saveExamAnswer.mockResolvedValue({
      correct: true,
      correct_keys: ['B'],
      explanation: null,
      explanation_mode: 'after_answer',
    });
    fetchAttemptQuestion.mockResolvedValue({
      question: secondQuestion,
      question_number: 2,
      total_questions: 2,
      selected_keys: ['A'],
      answered: true,
      is_doubtful: false,
    });

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Aljabar',
    });

    await session.initializeSession();
    await session.startQuiz();
    session.onSelectKeys(['B']);
    session.timerRunning.value = false;
    session.onTime(15);
    await session.submitAnswer();
    await session.loadQuestionNumber(2);

    expect(session.state.value).toBe('reviewing');
    expect(session.isLastQuestion.value).toBe(true);
    expect(session.canComplete.value).toBe(true);
    expect(session.isQuestionAnswered(2)).toBe(true);
  });

  it('keeps an all-answered active attempt open for review after reloading', async () => {
    fetchQuestionCount.mockResolvedValue(2);
    fetchActiveExamAttempt.mockResolvedValue({
      attempt: {
        id: 501,
        total_questions: 2,
        question_order: [101, 202],
        minimum_duration_minutes: 0,
        started_at: new Date().toISOString(),
        deadline_at: null,
      } as never,
      answers: [
        { question_id: 101, is_correct: true, elapsed_seconds: 12 },
        { question_id: 202, is_correct: false, elapsed_seconds: 18 },
      ] as never,
      server_now: new Date().toISOString(),
    });
    fetchNextAttemptQuestion.mockResolvedValue(null);
    fetchAttemptQuestion.mockResolvedValue({
      question: firstQuestion,
      question_number: 1,
      total_questions: 2,
      selected_keys: ['A'],
      answered: true,
      is_doubtful: false,
    });

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Aljabar',
    });

    await session.initializeSession();

    expect(completeExamAttempt).not.toHaveBeenCalled();
    expect(fetchAttemptQuestion).toHaveBeenCalledWith(501, 1);
    expect(session.state.value).toBe('reviewing');
    expect(session.question.value?.id).toBe(101);
    expect(session.selectedKeys.value).toEqual(['A']);
    expect(session.isQuestionAnswered(1)).toBe(true);
  });

  it('persists the doubtful status for the current question', async () => {
    fetchQuestionCount.mockResolvedValue(1);
    fetchNextAttemptQuestion.mockResolvedValue(firstQuestion);
    saveAttemptQuestionFlag.mockResolvedValue(undefined);

    const session = useQuizSession({
      getTopicId: () => 11,
      getQuerySubjectId: () => 7,
      getQueryTopicLabel: () => 'Aljabar',
    });

    await session.initializeSession();
    await session.startQuiz();
    await session.toggleDoubtful();

    expect(saveAttemptQuestionFlag).toHaveBeenCalledWith(501, 101, true);
    expect(session.currentQuestionDoubtful.value).toBe(true);
  });
});
