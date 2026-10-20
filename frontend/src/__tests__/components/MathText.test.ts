import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MathText from '@/components/MathText.vue';

describe('MathText', () => {
  it('renders inline and block LaTeX delimiters', () => {
    const wrapper = mount(MathText, {
      props: {
        text: 'Nilai $x^2$ dan \\(y + 1\\), dengan\\n\\[\\frac{a}{b}\\]',
      },
    });

    expect(wrapper.findAll('.katex')).toHaveLength(3);
    expect(wrapper.find('.katex-display').exists()).toBe(true);
  });

  it('renders legacy powers and square-root syntax', () => {
    const wrapper = mount(MathText, {
      props: {
        text: 'Luas c^2 dan akar(100).',
      },
    });

    expect(wrapper.findAll('.katex')).toHaveLength(2);
  });
});
