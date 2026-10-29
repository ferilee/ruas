import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ClassPicker from '@/components/ClassPicker.vue';
import type { ClassPickerOption } from '@/lib/class-picker';

const options: ClassPickerOption[] = [
  { id: 1, label: '12 RPL', academic_year: '26/27' },
  { id: 2, label: '12 DPIB', academic_year: '26/27' },
  { id: 3, label: '11 TKJ B', academic_year: '26/27' },
  { id: 4, label: 'Kelas Demo', academic_year: '2026/2027' },
  { id: 5, label: '10 TKJ A', academic_year: '' },
];

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(ClassPicker, { props: { options, modelValue: [], ...props } });
}

function optionCheckbox(wrapper: ReturnType<typeof mountPicker>, labelText: string) {
  const row = wrapper.findAll('.class-picker-option').find((item) => item.text().includes(labelText));
  return row?.find('input[type="checkbox"]');
}

describe('ClassPicker', () => {
  it('renders classes grouped by academic year with Lainnya last', () => {
    const wrapper = mountPicker();
    const headers = wrapper.findAll('.class-picker-group-header');
    expect(headers.map((header) => header.text())).toEqual([
      expect.stringContaining('2026/2027'),
      expect.stringContaining('26/27'),
      expect.stringContaining('Lainnya'),
    ]);
    expect(wrapper.text()).toContain('12 RPL · 26/27');
    expect(wrapper.text()).toContain('10 TKJ A');
  });

  it('shows selected classes as chips with a count and removable chips', async () => {
    const wrapper = mountPicker({ modelValue: [1, 4] });
    expect(wrapper.find('.class-picker-count').text()).toBe('2 kelas dipilih');
    const chips = wrapper.findAll('.class-picker-chip');
    expect(chips.map((chip) => chip.text())).toEqual([
      expect.stringContaining('Kelas Demo · 2026/2027'),
      expect.stringContaining('12 RPL · 26/27'),
    ]);

    const removeButton = chips[1].find('button');
    expect(removeButton.attributes('aria-label')).toBe('Lepas 12 RPL · 26/27');
    await removeButton.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[4]]);
  });

  it('shows helper text when nothing is selected', () => {
    const wrapper = mountPicker();
    expect(wrapper.find('.class-picker-count').text()).toBe('0 kelas dipilih');
    expect(wrapper.find('.class-picker-empty-selection').exists()).toBe(true);
  });

  it('emits the new selection when a row checkbox changes', async () => {
    const wrapper = mountPicker({ modelValue: [1] });
    await optionCheckbox(wrapper, '12 DPIB')?.setValue(true);
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[1, 2]]);
    await optionCheckbox(wrapper, '12 RPL')?.setValue(false);
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[]]);
  });

  it('filters rows by the search query and reports no matches', async () => {
    const wrapper = mountPicker();
    const search = wrapper.find('.class-picker-search-input');
    await search.setValue('tkj');
    expect(wrapper.findAll('.class-picker-option').map((row) => row.text())).toEqual([
      expect.stringContaining('11 TKJ B'),
      expect.stringContaining('10 TKJ A'),
    ]);

    await search.setValue('tidak-ada');
    expect(wrapper.findAll('.class-picker-option')).toHaveLength(0);
    expect(wrapper.text()).toContain('Tidak ada kelas yang cocok');
  });

  it('selects and clears a whole group with an indeterminate partial state', async () => {
    const wrapper = mountPicker({ modelValue: [1] });
    const groupToggle = wrapper.findAll('.class-picker-group-toggle input')[1];
    expect((groupToggle.element as HTMLInputElement).checked).toBe(false);
    expect((groupToggle.element as HTMLInputElement).indeterminate).toBe(true);

    await groupToggle.setValue(true);
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[1, 3, 2]]);

    await wrapper.setProps({ modelValue: [1, 2, 3] });
    const updatedToggle = wrapper.findAll('.class-picker-group-toggle input')[1];
    expect((updatedToggle.element as HTMLInputElement).checked).toBe(true);
    await updatedToggle.setValue(false);
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[]]);
  });

  it('badges self-sourced rows and only shows admin badges when asked', () => {
    const sources = { 1: 'self' as const, 2: 'admin' as const };
    const wrapper = mountPicker({ modelValue: [1, 2], sources });
    const badges = wrapper.findAll('.class-picker-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0].text()).toBe('Dipilih sendiri');

    const withAdmin = mountPicker({ modelValue: [1, 2], sources, showAdminBadge: true });
    expect(withAdmin.findAll('.class-picker-badge').map((badge) => badge.text())).toEqual(['Ditetapkan admin', 'Dipilih sendiri']);
  });

  it('shows a fallback chip for selected ids missing from the options', () => {
    const wrapper = mountPicker({ modelValue: [99] });
    expect(wrapper.find('.class-picker-chip').text()).toContain('Kelas #99');
  });
});
