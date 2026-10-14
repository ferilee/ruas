import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import TopicView from '@/views/TopicView.vue';

const { fetchTopics, fetchSubjects, fetchAssessmentSchedule, fetchExamAttemptAvailability, getTopicAccessToken, verifyTopicAccess } = vi.hoisted(() => ({
  fetchTopics: vi.fn(),
  fetchSubjects: vi.fn(),
  fetchAssessmentSchedule: vi.fn(),
  fetchExamAttemptAvailability: vi.fn(),
  getTopicAccessToken: vi.fn(),
  verifyTopicAccess: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  fetchTopics,
  fetchSubjects,
  fetchAssessmentSchedule,
  fetchExamAttemptAvailability,
  getTopicAccessToken,
  verifyTopicAccess,
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '7' },
  }),
  useRouter: () => ({ push: vi.fn() }),
}));

const RouterLinkStub = defineComponent({
  name: 'RouterLink',
  props: {
    to: {
      type: [String, Object],
      required: true,
    },
  },
  setup(props, { slots }) {
    return () => h('a', { 'data-to': JSON.stringify(props.to) }, slots.default?.());
  },
});

describe('TopicView', () => {
  beforeEach(() => {
    fetchTopics.mockReset();
    fetchSubjects.mockReset();
    fetchAssessmentSchedule.mockReset();
    fetchExamAttemptAvailability.mockReset();
    getTopicAccessToken.mockReset();
    verifyTopicAccess.mockReset();
    getTopicAccessToken.mockReturnValue(null);
  });

  it('passes subject_id and topic_label to quiz route', async () => {
    fetchTopics.mockResolvedValue([
      { id: 11, subject_id: 7, slug: 'aljabar', label: 'Aljabar', display_order: 1, question_count: 5, requires_token: false },
    ]);
    fetchSubjects.mockResolvedValue([
      { id: 7, slug: 'pm', label: 'Penalaran Matematika', display_order: 1 },
    ]);
    fetchAssessmentSchedule.mockResolvedValue({ start_at: null, is_open: true, starts_in_seconds: 0 });

    const wrapper = mount(TopicView, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });

    await vi.waitFor(() => expect(wrapper.findAll('button.topic-card').length).toBe(1));

    const quizLink = wrapper.find('button.topic-card');

    expect(quizLink).toBeDefined();
    await quizLink.trigger('click');
    expect(quizLink.text()).toContain('Aljabar');
  });

  it('opens the token modal instead of navigating for a locked topic', async () => {
    fetchTopics.mockResolvedValue([
      { id: 11, subject_id: 7, slug: 'aljabar', label: 'Aljabar', display_order: 1, question_count: 5, requires_token: true },
    ]);
    fetchSubjects.mockResolvedValue([{ id: 7, slug: 'pm', label: 'Penalaran Matematika', display_order: 1 }]);
    fetchAssessmentSchedule.mockResolvedValue({ start_at: null, is_open: true, starts_in_seconds: 0 });
    fetchExamAttemptAvailability.mockResolvedValue({ max_attempts: 1, attempts_used: 0, remaining_attempts: 1, can_start: true, has_active_attempt: false });

    const wrapper = mount(TopicView, { global: { stubs: { RouterLink: RouterLinkStub } } });
    await vi.waitFor(() => expect(wrapper.find('button.topic-card').exists()).toBe(true));

    await wrapper.find('button.topic-card').trigger('click');

    expect(wrapper.find('.topic-token-modal').exists()).toBe(true);
    expect(wrapper.find('.topic-token-modal').text()).toContain('Masukkan token');
  });

  it('groups topics by their assigned class', async () => {
    fetchTopics.mockResolvedValue([
      { id: 11, subject_id: 7, class_id: 1, class_label: 'Kelas 11 TKJ A', slug: 'barisan-tkj', label: 'Barisan dan Deret', display_order: 1, question_count: 5, requires_token: false },
      { id: 12, subject_id: 7, class_id: 2, class_label: 'Kelas 11 DPIB', slug: 'barisan-dpib', label: 'Barisan dan Deret', display_order: 2, question_count: 5, requires_token: false },
    ]);
    fetchSubjects.mockResolvedValue([{ id: 7, slug: 'matematika', label: 'Matematika', display_order: 1 }]);
    fetchAssessmentSchedule.mockResolvedValue({ start_at: null, is_open: true, starts_in_seconds: 0 });

    const wrapper = mount(TopicView, { global: { stubs: { RouterLink: RouterLinkStub } } });
    await vi.waitFor(() => expect(wrapper.findAll('.topic-group').length).toBe(2));

    expect(wrapper.findAll('.topic-group-heading h2').map((heading) => heading.text())).toEqual(['Kelas 11 TKJ A', 'Kelas 11 DPIB']);
    expect(wrapper.findAll('button.topic-card')).toHaveLength(2);
  });
});
