import { describe, expect, it } from 'vitest';
import { curriculumImportTemplate, parseCurriculumCsv } from '@/services/curriculum-import-service';

describe('curriculum import CSV', () => {
  it('parses quoted values and keeps repeated class rows', () => {
    const csv = [
      'class_slug,class_name,academic_year,grade,program,section,class_order,assessment_type_slug,assessment_type_name,assessment_type_order,subject_slug,subject_name,subject_order,topic_slug,topic_name,topic_order',
      '12-rpl,"Kelas 12, RPL",2026/2027,12,RPL,A,1,latihan,Latihan,1,matematika,Matematika,1,aljabar,"Aljabar, Dasar",1',
      '12-tkj,12 TKJ,2026/2027,12,TKJ,A,2,latihan,Latihan,1,matematika,Matematika,1,aljabar,"Aljabar, Dasar",1',
    ].join('\n');

    const result = parseCurriculumCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.class_name).toBe('Kelas 12, RPL');
    expect(result.rows[1]?.topic_name).toBe('Aljabar, Dasar');
  });

  it('reports missing headers and invalid slugs before import', () => {
    const result = parseCurriculumCsv('class_slug,topic_name\nKelas 10,Topik');

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toContain('Kolom wajib belum ada');
  });

  it('provides a usable template with two class examples', () => {
    const template = curriculumImportTemplate();

    expect(template).toContain('assessment_type_slug');
    expect(template).toContain('12-rpl');
    expect(template).toContain('12-tkj');
  });
});
