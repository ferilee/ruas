<template>
  <fieldset class="schedule-audience">
    <legend>Target peserta</legend>
    <div class="schedule-audience-options">
      <label class="schedule-audience-option">
        <input type="radio" :checked="mode === 'class'" name="schedule-access-mode" @change="emit('update:mode', 'class')" />
        <span><strong>Semua siswa sesuai kelas</strong><small>Ikuti penetapan kelas pada topik.</small></span>
      </label>
      <label class="schedule-audience-option">
        <input type="radio" :checked="mode === 'individual'" name="schedule-access-mode" @change="emit('update:mode', 'individual')" />
        <span><strong>Siswa tertentu</strong><small>Cocok untuk remedial atau pengulangan individual.</small></span>
      </label>
    </div>

    <div v-if="mode === 'individual'" class="schedule-participant-picker">
      <input v-model.trim="search" class="schedule-participant-search" type="search" placeholder="Cari nama atau username siswa..." aria-label="Cari siswa untuk jadwal" />
      <div class="schedule-participant-list">
        <label v-for="user in filteredParticipants" :key="user.id" class="schedule-participant-option">
          <input type="checkbox" :checked="participantIds.includes(user.id)" @change="toggleParticipant(user.id)" />
          <span><strong>{{ user.display_name }}</strong><small>{{ user.username }} · {{ user.class_label || 'Kelas belum ditetapkan' }}<template v-if="!user.active"> · Nonaktif</template></small></span>
        </label>
        <p v-if="filteredParticipants.length === 0" class="schedule-participant-empty">Siswa tidak ditemukan.</p>
      </div>
      <div v-if="selectedParticipants.length > 0" class="schedule-selected-participants">
        <div class="schedule-selected-heading">
          <strong>Siswa terpilih</strong>
          <span>{{ selectedParticipants.length }} siswa</span>
        </div>
        <ul class="schedule-selected-list">
          <li v-for="user in selectedParticipants" :key="user.id" class="schedule-selected-participant">
            <span><strong>{{ user.display_name }}</strong><small>{{ user.class_label || 'Kelas belum ditetapkan' }}</small></span>
            <button type="button" :aria-label="`Hapus ${user.display_name} dari target peserta`" @click="toggleParticipant(user.id)">×</button>
          </li>
        </ul>
      </div>
      <p class="field-hint">{{ participantIds.length }} siswa dipilih.</p>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AdminUser } from '@/types';

const props = defineProps<{
  mode: 'class' | 'individual';
  participantIds: number[];
  participants: AdminUser[];
}>();

const emit = defineEmits<{
  'update:mode': [value: 'class' | 'individual'];
  'update:participantIds': [value: number[]];
}>();

const search = ref('');
const filteredParticipants = computed(() => {
  const query = search.value.toLocaleLowerCase('id-ID');
  return props.participants.filter((user) => !query || `${user.display_name} ${user.username} ${user.class_label ?? ''}`.toLocaleLowerCase('id-ID').includes(query));
});
const selectedParticipants = computed(() => props.participantIds.map((id) => props.participants.find((user) => user.id === id)).filter((user): user is AdminUser => Boolean(user)));

function toggleParticipant(userId: number) {
  const next = props.participantIds.includes(userId)
    ? props.participantIds.filter((id) => id !== userId)
    : [...props.participantIds, userId];
  emit('update:participantIds', next);
}
</script>

<style scoped>
.schedule-audience { min-width: 0; margin: 0; padding: 12px; border: 1px solid #dce8f5; border-radius: 11px; }
.schedule-audience legend { padding: 0 5px; color: #456382; font-size: .78rem; font-weight: 800; }
.schedule-audience-options { display: grid; gap: 7px; }
.schedule-audience-option, .schedule-participant-option { display: flex; width: 100%; align-items: flex-start; gap: 8px; padding: 8px; border-radius: 8px; cursor: pointer; }
.schedule-audience-option:hover, .schedule-participant-option:hover { background: #f1f7ff; }
.schedule-audience-option input, .schedule-participant-option input { width: auto; flex: 0 0 auto; margin-top: 2px; accent-color: #2671c9; }
.schedule-audience-option span, .schedule-participant-option span { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.schedule-audience-option strong, .schedule-participant-option strong { color: #385b86; font-size: .75rem; }
.schedule-audience-option small, .schedule-participant-option small { color: #8497ae; font-size: .68rem; line-height: 1.4; }
.schedule-participant-picker { display: flex; flex-direction: column; gap: 8px; margin-top: 9px; padding-top: 9px; border-top: 1px solid #e6eef6; }
.schedule-participant-search { width: 100%; min-height: 36px; padding: 8px 10px; border: 1px solid #d4e2ef; border-radius: 8px; color: #334b68; background: #fff; font: inherit; font-size: .75rem; }
.schedule-participant-list { display: flex; max-height: 170px; flex-direction: column; gap: 2px; overflow-y: auto; padding-right: 2px; }
.schedule-participant-empty { padding: 8px; color: #8497ae; font-size: .72rem; }
.schedule-selected-participants { display: flex; flex-direction: column; gap: 7px; padding: 9px; border: 1px solid #dce8f5; border-radius: 9px; background: #f6faff; }
.schedule-selected-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #385b86; font-size: .7rem; }
.schedule-selected-heading span { color: #8497ae; font-size: .66rem; font-weight: 600; }
.schedule-selected-list { display: flex; max-height: 132px; flex-direction: column; gap: 4px; margin: 0; padding: 0; overflow-y: auto; list-style: none; }
.schedule-selected-participant { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 7px; border-radius: 7px; background: #fff; }
.schedule-selected-participant > span { display: flex; min-width: 0; flex-direction: column; gap: 1px; }
.schedule-selected-participant strong { overflow: hidden; color: #385b86; font-size: .7rem; text-overflow: ellipsis; white-space: nowrap; }
.schedule-selected-participant small { color: #8497ae; font-size: .65rem; }
.schedule-selected-participant button { flex: 0 0 auto; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 50%; color: #7188a2; background: transparent; font-size: 1rem; line-height: 1; cursor: pointer; }
.schedule-selected-participant button:hover { color: #c24762; background: #fff0f3; }
.schedule-audience .field-hint { margin: 0; font-size: .7rem; }
</style>
