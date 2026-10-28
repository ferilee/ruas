import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import ReportExportMenu from '@/components/ReportExportMenu.vue';

let wrapper: VueWrapper | null = null;

function mountMenu(props: Record<string, unknown> = {}) {
  wrapper = mount(ReportExportMenu, { props, attachTo: document.body });
  return wrapper;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe('ReportExportMenu', () => {
  it('opens a menu with both PDF choices and wires it accessibly', async () => {
    const menu = mountMenu();
    const trigger = menu.get('.export-menu-trigger');
    expect(trigger.attributes('aria-haspopup')).toBe('menu');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(menu.find('.export-menu-panel').exists()).toBe(false);

    await trigger.trigger('click');
    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(trigger.attributes('aria-controls')).toBeTruthy();
    const panel = menu.get('.export-menu-panel');
    expect(panel.attributes('role')).toBe('menu');
    expect(panel.attributes('id')).toBe(trigger.attributes('aria-controls'));
    expect(panel.text()).toContain('PDF Analisis per Soal');
    expect(panel.text()).toContain('PDF Hasil Siswa');
  });

  it('emits the chosen mode and closes the menu', async () => {
    const menu = mountMenu();
    await menu.get('.export-menu-trigger').trigger('click');
    const items = menu.findAll('.export-menu-item');
    await items[0].trigger('click');
    expect(menu.emitted('select')).toEqual([['questions']]);
    expect(menu.find('.export-menu-panel').exists()).toBe(false);

    await menu.get('.export-menu-trigger').trigger('click');
    await menu.findAll('.export-menu-item')[1].trigger('click');
    expect(menu.emitted('select')).toEqual([['questions'], ['students']]);
  });

  it('closes on Escape and on outside click', async () => {
    const menu = mountMenu();
    await menu.get('.export-menu-trigger').trigger('click');
    expect(menu.find('.export-menu-panel').exists()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();
    expect(menu.find('.export-menu-panel').exists()).toBe(false);

    await menu.get('.export-menu-trigger').trigger('click');
    expect(menu.find('.export-menu-panel').exists()).toBe(true);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(menu.find('.export-menu-panel').exists()).toBe(false);
  });

  it('disables each choice independently with its reason as the title', async () => {
    const menu = mountMenu({ questionsDisabled: true, studentsDisabled: false });
    await menu.get('.export-menu-trigger').trigger('click');
    const items = menu.findAll('.export-menu-item');
    expect(items[0].attributes('disabled')).toBeDefined();
    expect(items[0].attributes('title')).toBe('Belum ada analisis per soal untuk diunduh');
    expect(items[1].attributes('disabled')).toBeUndefined();
    await items[0].trigger('click');
    expect(menu.emitted('select')).toBeUndefined();
  });

  it('disables the trigger itself when told to', () => {
    const menu = mountMenu({ disabled: true });
    expect(menu.get('.export-menu-trigger').attributes('disabled')).toBeDefined();
  });
});
