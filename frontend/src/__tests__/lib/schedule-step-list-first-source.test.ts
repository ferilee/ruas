import { describe, expect, it } from 'vitest';
import adminSource from '@/views/AdminView.vue?raw';
import curriculumSource from '@/components/CurriculumPanel.vue?raw';

// Pengkabelan langkah Jadwal daftar-dulu hidup di AdminView yang dipakai
// bersama admin dan guru, jadi regresinya dijaga lewat test baca-sumber
// seperti test konteks Soal: formulir terlipat, kelompok tanpa jadwal, dan
// petunjuk di dalam formulir hanya berlaku untuk editor, sementara admin
// mempertahankan markup dan tata letak lamanya persis.
function functionBody(source: string, signature: string) {
  const start = source.indexOf(signature);
  expect(start, `${signature} harus ada`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf('\n}', start);
  return source.slice(start, end);
}

describe('schedule step list-first wiring (editor only)', () => {
  it('renders the form unconditionally for admin but only when opened for editors', () => {
    expect(adminSource).toMatch(/<form v-if="!isEditorSession \|\| scheduleFormOpen" class="schedule-form schedule-editor-form"/);
    expect(adminSource).toMatch(/<div :class="\['schedule-layout', \{ 'schedule-layout-editor': isEditorSession \}\]">/);
    expect(adminSource).toMatch(/\.schedule-layout \{ display: grid; grid-template-columns: minmax\(320px, \.95fr\) minmax\(0, 1\.05fr\);/);
    expect(adminSource).toMatch(/\.schedule-layout-editor \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  });

  it('shows an editor-only action bar whose new-schedule button resets the form to its initial state', () => {
    expect(adminSource).toMatch(/<div v-if="isEditorSession" class="schedule-actions-bar">/);
    expect(adminSource).toMatch(/@click="startNewSchedule">＋ Jadwal baru<\/button>/);
    const body = functionBody(adminSource, 'function startNewSchedule()');
    expect(body).toContain('scheduleTopicId.value = null;');
    expect(body).toContain('loadScheduleDraft(null);');
    expect(body).toContain('scheduleFormOpen.value = true;');
  });

  it('opens the form in editing state from a schedule row, with a topic marker in the form heading', () => {
    const body = functionBody(adminSource, 'function editSchedule(row: AssessmentSchedule)');
    expect(body).toContain('if (isEditorSession.value) scheduleFormOpen.value = true;');
    expect(adminSource).toMatch(/Sedang mengubah jadwal: <strong>\{\{ scheduleEditingTopicLabel \}\}<\/strong>/);
    expect(adminSource).toMatch(/const scheduleEditingTopicLabel = computed\(\(\) => \{/);
    expect(adminSource).toMatch(/<button v-if="isEditorSession" class="secondary-btn schedule-form-close" type="button" @click="closeScheduleForm">Tutup<\/button>/);
  });

  it('closes the form as a pure view action that never saves', () => {
    const body = functionBody(adminSource, 'function closeScheduleForm()');
    expect(body).toContain('scheduleFormOpen.value = false;');
    expect(body).not.toContain('saveSchedule');
    expect(body).not.toContain('updateAdminSchedule');
  });

  it('derives the unscheduled group from the same topic universe as the form options, for editors only', () => {
    expect(adminSource).toMatch(/const unscheduledScheduleTopics = computed\(\(\) => \{/);
    expect(adminSource).toContain('const scheduleTopicOptions = computed(() => topics.value.map(');
    expect(adminSource).toContain("groups.push({ key: 'unscheduled', label: 'Tanpa jadwal — terbuka kapan saja', rows: [], topics: unscheduledScheduleTopics.value });");
    expect(adminSource).toMatch(/group\.key === 'unscheduled' && group\.topics\.length/);
    expect(adminSource).toContain('<span class="schedule-row-state state-unscheduled">Terbuka kapan saja</span>');
    expect(adminSource).toMatch(/@click="openScheduleForTopic\(topic\.id\)">Atur jadwal<\/button>/);
  });

  it('keeps group order: open, upcoming, unscheduled, disabled, ended', () => {
    const openAt = adminSource.indexOf("{ key: 'open', label: 'Sedang Berlangsung'");
    const upcomingAt = adminSource.indexOf("{ key: 'upcoming', label: 'Akan Datang'");
    const unscheduledAt = adminSource.indexOf("{ key: 'unscheduled', label: 'Tanpa jadwal — terbuka kapan saja'");
    const disabledAt = adminSource.indexOf("{ key: 'disabled', label: 'Nonaktif'");
    const endedAt = adminSource.indexOf("{ key: 'ended', label: 'Sudah Berakhir'");
    expect(openAt).toBeGreaterThanOrEqual(0);
    expect(upcomingAt).toBeGreaterThan(openAt);
    expect(unscheduledAt).toBeGreaterThan(upcomingAt);
    expect(disabledAt).toBeGreaterThan(unscheduledAt);
    expect(endedAt).toBeGreaterThan(disabledAt);
  });

  it('shows the legacy empty message only when there are truly no topics for editors', () => {
    expect(adminSource).toMatch(/<div v-if="showScheduleEmptyState" class="schedule-empty">Belum ada jadwal khusus\. Peserta dapat mulai segera\.<\/div>/);
    expect(adminSource).toContain('const showScheduleEmptyState = computed(() => scheduleRows.value.length === 0 && (!isEditorSession.value || unscheduledScheduleTopics.value.length === 0));');
  });

  it('moves the long hint inside the form for editors and keeps it at the bottom for admin', () => {
    expect(adminSource).toMatch(/<p v-if="isEditorSession" class="field-hint schedule-hint">Untuk membuka topik segera/);
    expect(adminSource).toMatch(/<p v-if="!isEditorSession" class="field-hint schedule-hint">Untuk membuka topik segera/);
  });

  it('inherits a topic from the Topik step through openTopicSchedule, opening form and step together', () => {
    const body = functionBody(adminSource, 'function openScheduleForTopic(topicId: number)');
    expect(body).toContain('scheduleTopicId.value = topicId;');
    expect(body).toContain('scheduleFormOpen.value = true;');
    expect(body).toContain("selectSection('schedule');");
    expect(adminSource).toContain('@open-topic-schedule="openScheduleForTopic"');
    expect(curriculumSource).toContain('openTopicSchedule: [topicId: number]');
    expect(curriculumSource).toContain('@click="emit(\'openTopicSchedule\', item.id)"');
  });

  it('keeps the admin form actions and share button markup untouched', () => {
    expect(adminSource).toMatch(/<button class="primary-btn" type="submit" :disabled="scheduleSaving \|\| !scheduleTopicId">/);
    expect(adminSource).toMatch(/@click="openScheduleNow">Buka Sekarang<\/button>/);
    expect(adminSource).toContain('@click="openScheduleShare(row)">Bagikan WA</button>');
  });
});
