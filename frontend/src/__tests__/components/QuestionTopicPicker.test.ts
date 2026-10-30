import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import QuestionTopicPicker from '@/components/QuestionTopicPicker.vue';
import type { AdminTopic } from '@/types';

function topic(id: number, subjectId: number, subjectLabel: string, label: string, questionCount: number): AdminTopic {
  return {
    id,
    subject_id: subjectId,
    subject_label: subjectLabel,
    class_ids: [],
    class_labels: [],
    slug: label.toLowerCase().replaceAll(' ', '-'),
    label,
    display_order: id,
    requires_token: false,
    token_configured: false,
    question_count: questionCount,
  };
}

const topics: AdminTopic[] = [
  topic(101, 7, 'Matematika', 'Aljabar Dasar', 10),
  topic(102, 7, 'Matematika', 'Geometri Ruang', 4),
  topic(103, 8, 'Informatika', 'Algoritma', 5),
];
const subjects = [
  { id: 7, label: 'Matematika' },
  { id: 8, label: 'Informatika' },
];

async function openPicker(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('.question-topic-picker-trigger').trigger('click');
  return wrapper;
}

describe('QuestionTopicPicker', () => {
  it('shows Semua topik with the bank total when no topic is chosen', () => {
    const wrapper = mount(QuestionTopicPicker, { props: { modelValue: null, topics, subjects } });
    const trigger = wrapper.get('.question-topic-picker-trigger');
    expect(trigger.text()).toContain('Semua topik');
    expect(trigger.text()).toContain('19 soal');
  });

  it('shows the selected topic with its subject and question count on the trigger', () => {
    const wrapper = mount(QuestionTopicPicker, { props: { modelValue: 102, topics, subjects } });
    const trigger = wrapper.get('.question-topic-picker-trigger');
    expect(trigger.text()).toContain('Matematika — Geometri Ruang');
    expect(trigger.text()).toContain('4 soal');
  });

  it('groups options per subject with counts and marks the current choice', async () => {
    const wrapper = await openPicker(mount(QuestionTopicPicker, { props: { modelValue: 101, topics, subjects } }));

    expect(wrapper.findAll('.question-topic-picker-group').map((el) => el.text())).toEqual(['Matematika', 'Informatika']);
    const options = wrapper.findAll('.question-topic-picker-option');
    expect(options.map((el) => el.text())).toEqual([
      expect.stringContaining('Semua topik'),
      expect.stringContaining('Aljabar Dasar'),
      expect.stringContaining('Geometri Ruang'),
      expect.stringContaining('Algoritma'),
    ]);
    expect(options[1].text()).toContain('10 soal');
    expect(options[1].classes()).toContain('selected');
    expect(options[1].attributes('aria-selected')).toBe('true');
    expect(wrapper.get('.question-topic-picker-all').text()).toContain('19 soal');
  });

  it('emits the topic id when a topic is chosen and closes the menu', async () => {
    const wrapper = await openPicker(mount(QuestionTopicPicker, { props: { modelValue: null, topics, subjects } }));

    const option = wrapper.findAll('.question-topic-picker-option').find((el) => el.text().includes('Algoritma'));
    await option!.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[103]]);
    expect(wrapper.find('.question-topic-picker-menu').exists()).toBe(false);
  });

  it('emits null when Semua topik is chosen', async () => {
    const wrapper = await openPicker(mount(QuestionTopicPicker, { props: { modelValue: 101, topics, subjects } }));

    await wrapper.get('.question-topic-picker-all').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
  });

  it('filters options through the search field across subjects', async () => {
    const wrapper = await openPicker(mount(QuestionTopicPicker, { props: { modelValue: null, topics, subjects } }));

    await wrapper.get('.question-topic-picker-search input').setValue('algoritma');

    const labels = wrapper.findAll('.question-topic-picker-option').map((el) => el.text());
    expect(labels.some((text) => text.includes('Algoritma'))).toBe(true);
    expect(labels.some((text) => text.includes('Aljabar'))).toBe(false);
    expect(wrapper.findAll('.question-topic-picker-group').map((el) => el.text())).toEqual(['Informatika']);
  });
});
