import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StatementJudgementList from '@/components/StatementJudgementList.vue';

const statements = [
  { key: 'S1', text: 'Pernyataan satu' },
  { key: 'S2', text: 'Pernyataan dua' },
  { key: 'S3', text: 'Pernyataan tiga' },
];

describe('StatementJudgementList', () => {
  it('renders one card per statement with Benar and Salah buttons', () => {
    const wrapper = mount(StatementJudgementList, {
      props: { options: statements, judgements: {}, disabled: false },
    });
    expect(wrapper.findAll('.statement-item')).toHaveLength(3);
    expect(wrapper.findAll('.judge-button')).toHaveLength(6);
  });

  it('emits judge events with the chosen value', async () => {
    const wrapper = mount(StatementJudgementList, {
      props: { options: statements, judgements: {}, disabled: false },
    });
    const firstCard = wrapper.findAll('.statement-item')[0];
    await firstCard.find('.judge-true').trigger('click');
    await firstCard.find('.judge-false').trigger('click');
    expect(wrapper.emitted('judge')).toEqual([['S1', true], ['S1', false]]);
  });

  it('marks the selected judgement button per statement', () => {
    const wrapper = mount(StatementJudgementList, {
      props: { options: statements, judgements: { S1: true, S2: false }, disabled: false },
    });
    const cards = wrapper.findAll('.statement-item');
    expect(cards[0].find('.judge-true').classes()).toContain('selected');
    expect(cards[1].find('.judge-false').classes()).toContain('selected');
    expect(cards[2].find('.judge-true').classes()).not.toContain('selected');
    expect(cards[0].classes()).toContain('statement-judged');
    expect(cards[2].classes()).not.toContain('statement-judged');
  });

  it('does not emit while disabled', async () => {
    const wrapper = mount(StatementJudgementList, {
      props: { options: statements, judgements: {}, disabled: true },
    });
    await wrapper.find('.judge-true').trigger('click');
    expect(wrapper.emitted('judge')).toBeUndefined();
  });

  it('shows per-statement feedback and keys in result mode', () => {
    const wrapper = mount(StatementJudgementList, {
      props: {
        options: statements,
        judgements: { S1: true, S2: true, S3: false },
        disabled: true,
        showResult: true,
        correctKeys: ['S1', 'S3'],
        statementResults: [
          { key: 'S1', judged_true: true, correct: true },
          { key: 'S2', judged_true: true, correct: false },
          { key: 'S3', judged_true: false, correct: false },
        ],
      },
    });
    const cards = wrapper.findAll('.statement-item');
    expect(cards[0].classes()).toContain('statement-correct');
    expect(cards[1].classes()).toContain('statement-wrong');
    expect(wrapper.text()).toContain('Kunci: Benar');
    expect(wrapper.text()).toContain('Kunci: Salah');
  });
});
