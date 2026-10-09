import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import TopicView from '@/views/TopicView.vue';

const { fetchTopics, fetchSubjects, fetchAssessmentSchedule, getTopicAccessToken, verifyTopicAccess } = vi.hoisted(() => ({
  fetchTopics: vi.fn(),
  fetchSubjects: vi.fn(),
  fetchAssessmentSchedule: vi.fn(),
  getTopicAccessToken: vi.fn(),
  verifyTopicAccess: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  fetchTopics,
  fetchSubjects,
  fetchAssessmentSchedule,
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

    await vi.waitFor(() => expect(wrapper.findAll('a[data-to]').length).toBe(2));

    const links = wrapper.findAll('a[data-to]');
    const quizLink = links.find((link) => link.text().includes('Aljabar'));

    expect(quizLink).toBeDefined();
    const target = quizLink?.attributes('data-to');
    expect(target).toBeTruthy();
    expect(JSON.parse(target as string)).toEqual({
      path: '/quiz/11',
      query: {
        subject_id: '7',
        topic_label: 'Aljabar',
      },
    });
  });
});
