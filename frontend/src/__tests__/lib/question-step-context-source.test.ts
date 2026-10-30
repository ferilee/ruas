import { describe, expect, it } from 'vitest';
import adminSource from '@/views/AdminView.vue?raw';
import curriculumSource from '@/components/CurriculumPanel.vue?raw';

// Pengkabelan langkah Soal context-first hidup di AdminView yang dipakai
// bersama admin dan guru, jadi regresinya dijaga lewat test baca-sumber
// seperti test CSS sumber lain di repo: pemilih konteks hanya untuk editor,
// saringan menipis hanya pada mode satu topik editor, bilah Akses Topik
// terlipat hanya untuk editor, dan admin mempertahankan markup lamanya.
describe('question step topic context wiring (editor only)', () => {
  it('renders the topic picker for editor sessions bound to the existing topic filter state', () => {
    expect(adminSource).toMatch(/<div v-if="isEditorSession" class="question-topic-context-bar">/);
    expect(adminSource).toMatch(/<QuestionTopicPicker v-model="questionTopicFilter" :topics="topics" :subjects="curriculum\.subjects" \/>/);
  });

  it('derives single-topic mode from the editor session and the shared filter state', () => {
    expect(adminSource).toMatch(/const editorSingleTopicMode = computed\(\(\) => isEditorSession\.value && questionTopicFilter\.value !== null\);/);
  });

  it('thins the filter row in single-topic mode and replaces the topic select for editors', () => {
    expect(adminSource).toMatch(/<RuasSelect v-if="!editorSingleTopicMode" v-model="questionTypeFilter"/);
    expect(adminSource).toMatch(/<RuasSelect v-if="!editorSingleTopicMode" v-model="questionStatusFilter"/);
    expect(adminSource).toMatch(/<RuasSelect v-if="!isEditorSession" v-model="questionTopicFilter" class="topic-filter-select"/);
  });

  it('keeps the difficulty chips, import dialog button, and new question button unconditional', () => {
    expect(adminSource).toContain('v-for="filter in difficultyFilters"');
    expect(adminSource).toMatch(/<button class="secondary-btn import-question-button" type="button" @click="openImportModal">Import JSON<\/button>/);
    expect(adminSource).toMatch(/<button class="primary-btn new-question-button" type="button" @click="startNew">＋ Soal Baru<\/button>/);
  });

  it('folds the topic access panel behind a reveal button for editors only', () => {
    expect(adminSource).toMatch(/<button v-if="isEditorSession && !topicAccessRevealed" class="secondary-btn topic-access-reveal-btn" type="button" @click="topicAccessRevealed = true">Kelola Akses Topik<\/button>/);
    expect(adminSource).toMatch(/<details v-if="!isEditorSession \|\| topicAccessRevealed" class="panel topic-access-panel" :open="topicAccessOpenAttr">/);
  });

  it('restores, persists, and inherits the topic context through the shared lib helpers', () => {
    expect(adminSource).toContain("import { readStoredQuestionTopic, resolveQuestionTopicFilter, storeQuestionTopic } from '@/lib/question-topic-context';");
    expect(adminSource).toMatch(/function restoreQuestionTopicContext\(\)/);
    expect(adminSource).toContain('questionTopicFilter.value = resolveQuestionTopicFilter(readStoredQuestionTopic(usernameForKey), topics.value);');
    expect(adminSource).toMatch(/function openQuestionsForTopic\(topicId: number\)/);
    expect(adminSource).toContain('@open-topic-questions="openQuestionsForTopic"');
    expect(curriculumSource).toContain("openTopicQuestions: [topicId: number]");
    expect(curriculumSource).toContain("@click=\"emit('openTopicQuestions', item.id)\"");
  });

  it('keeps the context bar compact and the reveal button full width on mobile', () => {
    const mobileCss = adminSource.slice(adminSource.indexOf('@media (max-width: 720px)'));
    expect(mobileCss).toMatch(/\.question-topic-context-bar \{ padding: 12px; \}/);
    expect(mobileCss).toMatch(/\.topic-access-reveal-btn \{ width: 100%; \}/);
    expect(adminSource).toMatch(/\.question-topic-context-bar \{[^}]*min-width: 0;/);
  });
});
