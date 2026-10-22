const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const classSlugPattern = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

export const curriculumImportHeaders = [
  'class_slug',
  'class_name',
  'academic_year',
  'grade',
  'program',
  'section',
  'class_order',
  'assessment_type_slug',
  'assessment_type_name',
  'assessment_type_order',
  'subject_slug',
  'subject_name',
  'subject_order',
  'topic_slug',
  'topic_name',
  'topic_order',
] as const;

export type CurriculumImportRow = Record<(typeof curriculumImportHeaders)[number], string>;

export interface ParsedCurriculumImportRow {
  line: number;
  class_slug: string;
  class_name: string;
  academic_year: string;
  grade: number;
  program: string;
  section: string | null;
  class_order: number;
  assessment_type_slug: string;
  assessment_type_name: string;
  assessment_type_order: number;
  subject_slug: string;
  subject_name: string;
  subject_order: number;
  topic_slug: string;
  topic_name: string;
  topic_order: number;
}

export interface CurriculumImportParseResult {
  rows: ParsedCurriculumImportRow[];
  errors: string[];
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  return rows;
}

function numberValue(value: string, fallback: number, minimum: number, maximum: number) {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function normalized(value: string | undefined) {
  return (value ?? '').replace(/^\uFEFF/, '').trim();
}

export function parseCurriculumCsv(text: string): CurriculumImportParseResult {
  const rawRows = parseCsv(text);
  const [rawHeader, ...rawBody] = rawRows;
  if (!rawHeader || rawHeader.length === 0) return { rows: [], errors: ['File CSV kosong.'] };

  const header = rawHeader.map(normalized);
  const missingHeaders = curriculumImportHeaders.filter((name) => !header.includes(name));
  if (missingHeaders.length > 0) {
    return { rows: [], errors: [`Kolom wajib belum ada: ${missingHeaders.join(', ')}.`] };
  }

  const rows: ParsedCurriculumImportRow[] = [];
  const errors: string[] = [];
  for (const [index, rawValues] of rawBody.entries()) {
    const line = index + 2;
    const values = Object.fromEntries(header.map((key, valueIndex) => [key, normalized(rawValues[valueIndex])]));
    const get = (key: (typeof curriculumImportHeaders)[number]) => values[key] ?? '';
    const classSlug = get('class_slug').toLowerCase();
    const assessmentTypeSlug = get('assessment_type_slug').toLowerCase();
    const subjectSlug = get('subject_slug').toLowerCase();
    const topicSlug = get('topic_slug').toLowerCase();
    const grade = numberValue(get('grade'), 10, 1, 12);
    const classOrder = numberValue(get('class_order'), 1, 1, 9999);
    const assessmentTypeOrder = numberValue(get('assessment_type_order'), 1, 1, 9999);
    const subjectOrder = numberValue(get('subject_order'), 1, 1, 9999);
    const topicOrder = numberValue(get('topic_order'), 1, 1, 9999);
    const rowErrors: string[] = [];

    if (classSlug && !classSlugPattern.test(classSlug)) rowErrors.push('class_slug tidak valid');
    if (classSlug && !get('class_name')) rowErrors.push('class_name wajib diisi');
    if (!assessmentTypeSlug || !slugPattern.test(assessmentTypeSlug)) rowErrors.push('assessment_type_slug tidak valid');
    if (!get('assessment_type_name')) rowErrors.push('assessment_type_name wajib diisi');
    if (!subjectSlug || !slugPattern.test(subjectSlug)) rowErrors.push('subject_slug tidak valid');
    if (!get('subject_name')) rowErrors.push('subject_name wajib diisi');
    if (!topicSlug || !slugPattern.test(topicSlug)) rowErrors.push('topic_slug tidak valid');
    if (!get('topic_name')) rowErrors.push('topic_name wajib diisi');
    if (grade === null) rowErrors.push('grade harus berupa angka 1–12');
    if (classOrder === null || assessmentTypeOrder === null || subjectOrder === null || topicOrder === null) rowErrors.push('urutan harus berupa bilangan bulat positif');
    if (classSlug && (!get('academic_year') || !get('program'))) rowErrors.push('academic_year dan program wajib diisi jika class_slug digunakan');

    if (rowErrors.length > 0) {
      errors.push(`Baris ${line}: ${rowErrors.join(', ')}.`);
      continue;
    }

    rows.push({
      line,
      class_slug: classSlug,
      class_name: get('class_name'),
      academic_year: get('academic_year') || '2026/2027',
      grade: grade as number,
      program: get('program') || 'Umum',
      section: get('section') || null,
      class_order: classOrder as number,
      assessment_type_slug: assessmentTypeSlug,
      assessment_type_name: get('assessment_type_name'),
      assessment_type_order: assessmentTypeOrder as number,
      subject_slug: subjectSlug,
      subject_name: get('subject_name'),
      subject_order: subjectOrder as number,
      topic_slug: topicSlug,
      topic_name: get('topic_name'),
      topic_order: topicOrder as number,
    });
  }

  return { rows, errors };
}

export function curriculumImportTemplate() {
  const header = curriculumImportHeaders.join(',');
  const examples = [
    '12-rpl,12 RPL,2026/2027,12,RPL,A,1,latihan-tka,Latihan TKA,1,matematika,Matematika,1,aljabar,Aljabar Dasar,1',
    '12-tkj,12 TKJ,2026/2027,12,TKJ,A,2,latihan-tka,Latihan TKA,1,matematika,Matematika,1,aljabar,Aljabar Dasar,1',
  ];
  return `${header}\n${examples.join('\n')}\n`;
}
