import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizSession } from '@/composables/useQuizSession';

const {
  abandonExamAttempt,
  completeExamAttempt,
  createExamAttempt,
  fetchActiveExamAttempt,
  fetchExamReview,
  fetchNextAttemptQuestion,
  fetchQuestionCount,
  fetchTopic,
  saveExamAnswer,
  saveExamIntegrityEvent,
} = vi.hoisted(() => ({
  abandonExamAttempt: vi.fn(),
  completeExamAttempt: vi.fn(),
  createExamAttempt: vi.fn(),
  fetchActiveExamAttempt: vi.fn(),
  fetchExamReview: vi.fn(),
  fetchNextAttemptQuestion: vi.fn(),
  fetchQuestionCount: vi.fn(),
  fetchTopic: vi.fn(),
  saveExamAnswer: vi.fn(),
  saveExamIntegrityEvent: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  abandonExamAttempt,
  completeExamAttempt,
  createExamAttempt,
  fetchActiveExamAttempt,
  fetchExamReview,
  fetchNextAttemptQuestion,
  fetchQuestionCount,
  fetchTopic,
  saveExamAnswer,
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
    fetchExamReview.mockReset();
    fetchNextAttemptQuestion.mockReset();
    fetchQuestionCount.mockReset();
    fetchTopic.mockReset();
    saveExamAnswer.mockReset();
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
    expect(fetchNextAttemptQuestion).toHaveBeenNthCalledWith(2, 501);
    expect(session.question.value?.id).toBe(202);
    expect(session.state.value).toBe('answering');
    expect(session.currentQuestionNumber.value).toBe(2);
    expect(session.timerRunning.value).toBe(true);
  });
});
