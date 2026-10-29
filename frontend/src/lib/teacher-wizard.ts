import type { AdminSectionId, TeacherWorkspaceId } from './admin-route-state';

/**
 * Langkah wizard ruang kerja guru (mengikuti pola wizard SIMAK):
 * panel-panel yang sudah ada dipetakan menjadi lima langkah berurutan.
 * Langkah adalah lapisan presentasi di atas state rute yang sudah ada
 * (section/workspace), jadi tautan lama tetap membuka langkah yang setara.
 */
export const TEACHER_STEPS = [
  { id: 'kelas', title: 'Kelas', mobileTitle: 'Kelas', description: 'Kelas tempat Anda terpetakan dan siswa di dalamnya' },
  { id: 'topik', title: 'Topik', mobileTitle: 'Topik', description: 'Struktur asesmen dan topik beserta kelengkapannya' },
  { id: 'soal', title: 'Soal', mobileTitle: 'Soal', description: 'Bank soal beserta pembahasannya' },
  { id: 'jadwal', title: 'Jadwal & Bagikan', mobileTitle: 'Jadwal', description: 'Jadwal asesmen, token topik, dan berbagi ke siswa' },
  { id: 'laporan', title: 'Laporan', mobileTitle: 'Laporan', description: 'Hasil siswa dan analisis per soal' },
] as const;

export type TeacherStepId = (typeof TEACHER_STEPS)[number]['id'];

/** Section admin → langkah wizard. 'overview' adalah beranda langkah Kelas. */
export function teacherStepForSection(section: AdminSectionId): TeacherStepId {
  switch (section) {
    case 'curriculum':
      return 'topik';
    case 'questions':
      return 'soal';
    case 'schedule':
      return 'jadwal';
    case 'reports':
      return 'laporan';
    default:
      // overview, users (isi langkah Kelas), teacher-requests, feedback
      return 'kelas';
  }
}

/**
 * Workspace modal lama → langkah wizard. 'feedback' bukan langkah —
 * ia tetap overlay, jadi dipetakan ke null.
 */
export function teacherStepForWorkspace(workspace: TeacherWorkspaceId): TeacherStepId | null {
  switch (workspace) {
    case 'users':
      return 'kelas';
    case 'curriculum':
      return 'topik';
    case 'questions':
      return 'soal';
    case 'schedule':
      return 'jadwal';
    case 'reports':
      return 'laporan';
    case 'feedback':
      return null;
  }
}

/** Langkah wizard → section kanonis yang ditulis ke query URL. */
export function sectionForTeacherStep(step: TeacherStepId): AdminSectionId {
  switch (step) {
    case 'kelas':
      return 'overview';
    case 'topik':
      return 'curriculum';
    case 'soal':
      return 'questions';
    case 'jadwal':
      return 'schedule';
    case 'laporan':
      return 'reports';
  }
}
