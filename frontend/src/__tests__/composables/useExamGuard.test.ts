import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { useExamGuard } from '@/composables/useExamGuard';

describe('useExamGuard', () => {
  it('blocks clipboard events and records forbidden shortcuts while active', () => {
    let guard: ReturnType<typeof useExamGuard> | undefined;
    const onViolation = vi.fn();
    const component = defineComponent({
      setup() {
        const localGuard = useExamGuard({ onViolation });
        guard = localGuard;
        localGuard.activate();
        return () => h('div');
      },
    });
    const wrapper = mount(component);

    const copyEvent = new Event('copy', { cancelable: true });
    document.dispatchEvent(copyEvent);
    const shortcutEvent = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, cancelable: true });
    document.dispatchEvent(shortcutEvent);

    expect(copyEvent.defaultPrevented).toBe(true);
    expect(shortcutEvent.defaultPrevented).toBe(true);
    expect(guard?.violationCount.value).toBe(1);
    expect(onViolation).toHaveBeenCalledWith(expect.objectContaining({ type: 'blocked_shortcut' }));

    wrapper.unmount();
  });
});
