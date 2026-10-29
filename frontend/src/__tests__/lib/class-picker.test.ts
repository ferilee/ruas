import { describe, expect, it } from 'vitest';
import {
  academicYearRank,
  classGradeRank,
  classOptionLabel,
  filterClasses,
  groupClasses,
  groupFilteredClasses,
  groupSelectionState,
  toggleSelectedIds,
  type ClassPickerOption,
} from '@/lib/class-picker';

function option(id: number, label: string, academic_year = ''): ClassPickerOption {
  return { id, label, academic_year };
}

const masterClasses: ClassPickerOption[] = [
  option(1, '12 RPL', '26/27'),
  option(2, '12 DPIB', '26/27'),
  option(3, '11 TKJ B', '26/27'),
  option(4, 'Guru KKA', '2026/2027'),
  option(5, 'Kelas Demo', '2026/2027'),
  option(6, 'X SMAN Tempeh'),
  option(7, 'AI Enthusiasts Hub'),
  option(8, '11 TKJ A'),
  option(9, '10 TKR B'),
  option(10, '10 TKJ A'),
];

describe('classOptionLabel', () => {
  it('joins name and academic year with a separator', () => {
    expect(classOptionLabel(option(1, '12 RPL', '26/27'))).toBe('12 RPL · 26/27');
  });

  it('falls back to the bare name when the year is blank', () => {
    expect(classOptionLabel(option(6, 'X SMAN Tempeh'))).toBe('X SMAN Tempeh');
    expect(classOptionLabel(option(6, 'X SMAN Tempeh', '   '))).toBe('X SMAN Tempeh');
  });
});

describe('classGradeRank', () => {
  it('reads numeric grade prefixes', () => {
    expect(classGradeRank('10 TKJ A')).toBe(10);
    expect(classGradeRank('11 TKJ B')).toBe(11);
    expect(classGradeRank('12 RPL')).toBe(12);
  });

  it('reads roman grade prefixes', () => {
    expect(classGradeRank('X SMAN Tempeh')).toBe(10);
    expect(classGradeRank('XI RPL')).toBe(11);
    expect(classGradeRank('XII DPIB')).toBe(12);
  });

  it('returns null when no grade prefix is readable', () => {
    expect(classGradeRank('Guru KKA')).toBeNull();
    expect(classGradeRank('Kelas Demo')).toBeNull();
    expect(classGradeRank('AI Enthusiasts Hub')).toBeNull();
    expect(classGradeRank('Xenia Club')).toBeNull();
  });
});

describe('academicYearRank', () => {
  it('uses the four digit year when present', () => {
    expect(academicYearRank('2026/2027')).toBe(2026);
  });

  it('treats a two digit prefix as a 2000s year', () => {
    expect(academicYearRank('26/27')).toBe(2026);
    expect(academicYearRank('25/26')).toBe(2025);
  });

  it('returns -1 for unreadable years', () => {
    expect(academicYearRank('')).toBe(-1);
    expect(academicYearRank('Ganjil')).toBe(-1);
  });
});

describe('groupClasses', () => {
  it('groups by academic year, newest first, with yearless classes in Lainnya last', () => {
    const groups = groupClasses(masterClasses);
    expect(groups.map((group) => group.label)).toEqual(['2026/2027', '26/27', 'Lainnya']);
    expect(groups[2].items.map((item) => item.label)).toEqual(['10 TKJ A', '10 TKR B', 'X SMAN Tempeh', '11 TKJ A', 'AI Enthusiasts Hub']);
  });

  it('sorts items inside a group by grade, then name', () => {
    const groups = groupClasses(masterClasses);
    const shortYear = groups.find((group) => group.label === '26/27');
    expect(shortYear?.items.map((item) => item.label)).toEqual(['11 TKJ B', '12 DPIB', '12 RPL']);
    const fullYear = groups.find((group) => group.label === '2026/2027');
    expect(fullYear?.items.map((item) => item.label)).toEqual(['Guru KKA', 'Kelas Demo']);
  });

  it('sorts unreadable grades after readable ones within a group', () => {
    const groups = groupClasses([
      option(1, 'Seminar Tamu', '2026/2027'),
      option(2, '10 TKJ A', '2026/2027'),
    ]);
    expect(groups[0].items.map((item) => item.label)).toEqual(['10 TKJ A', 'Seminar Tamu']);
  });

  it('returns no groups for an empty list', () => {
    expect(groupClasses([])).toEqual([]);
  });
});

describe('filterClasses', () => {
  it('matches names case-insensitively', () => {
    expect(filterClasses(masterClasses, 'tkj').map((item) => item.label)).toEqual(['11 TKJ B', '11 TKJ A', '10 TKJ A']);
    expect(filterClasses(masterClasses, 'RPL').map((item) => item.label)).toEqual(['12 RPL']);
  });

  it('matches the academic year too', () => {
    expect(filterClasses(masterClasses, '2026').map((item) => item.label)).toEqual(['Guru KKA', 'Kelas Demo']);
  });

  it('returns everything for a blank query and nothing for no match', () => {
    expect(filterClasses(masterClasses, '  ')).toHaveLength(masterClasses.length);
    expect(filterClasses(masterClasses, 'tidak-ada')).toEqual([]);
  });
});

describe('groupFilteredClasses', () => {
  it('keeps grouping after filtering', () => {
    const groups = groupFilteredClasses(masterClasses, 'tkj');
    expect(groups.map((group) => group.label)).toEqual(['26/27', 'Lainnya']);
    expect(groups[0].items.map((item) => item.label)).toEqual(['11 TKJ B']);
    expect(groups[1].items.map((item) => item.label)).toEqual(['10 TKJ A', '11 TKJ A']);
  });
});

describe('groupSelectionState', () => {
  const items = [option(1, '10 TKJ A'), option(2, '10 TKR A'), option(3, '11 RPL')];

  it('reports none, some and all', () => {
    expect(groupSelectionState(items, [])).toBe('none');
    expect(groupSelectionState(items, [2])).toBe('some');
    expect(groupSelectionState(items, [1, 2, 3])).toBe('all');
    expect(groupSelectionState([], [1])).toBe('none');
  });
});

describe('toggleSelectedIds', () => {
  it('adds missing ids in the given order without duplicates', () => {
    expect(toggleSelectedIds([3], [1, 3, 2], true)).toEqual([3, 1, 2]);
  });

  it('removes the given ids and keeps the rest in order', () => {
    expect(toggleSelectedIds([3, 1, 2], [1, 3], false)).toEqual([2]);
    expect(toggleSelectedIds([3, 1, 2], [], false)).toEqual([3, 1, 2]);
  });
});
