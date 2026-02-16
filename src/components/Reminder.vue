<template>
  <div
    v-if="remindersStore.isSheetOpen"
    class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 px-3 py-6"
  >
    <div
      class="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl md:max-w-lg md:p-6"
    >
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">
            Reminder
          </p>
          <p class="text-sm text-slate-300">
            {{
              remindersStore.selectedReminderId === "new"
                ? "New reminder"
                : "Editing existing"
            }}
          </p>
        </div>
        <button
          class="text-slate-400 hover:text-slate-200"
          @click="remindersStore.closeSheet"
        >
          ✕
        </button>
      </div>

      <!-- Select reminder -->
      <div
        v-if="activeReminders.length"
        class="mt-3 flex flex-col gap-2 text-sm"
      >
        <label class="text-xs text-slate-400">Choose reminder</label>
        <select
          v-model="selectedReminderId"
          class="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
        >
          <option
            v-for="rem in activeReminders"
            :key="rem.id"
            :value="rem.id"
          >
            {{ formatReminderShort(rem.at) }}
          </option>
        </select>
      </div>

      <!-- Quick actions -->
      <div class="mt-4 flex flex-wrap gap-2 text-sm">
        <button
          class="rounded-full border border-white/10 px-3 py-1 hover:border-emerald-400"
          @click="remindersStore.setQuickReminder(0)"
        >
          Today
        </button>
        <button
          class="rounded-full border border-white/10 px-3 py-1 hover:border-emerald-400"
          @click="remindersStore.setQuickReminder(1)"
        >
          Tomorrow
        </button>
        <button
          class="rounded-full border border-white/10 px-3 py-1 hover:border-emerald-400"
          @click="remindersStore.setQuickReminder(3)"
        >
          In 3 days
        </button>
        <button
          v-if="activeReminders.length"
          class="rounded-full border border-dashed border-emerald-400/60 px-3 py-1 text-emerald-200 hover:border-emerald-300"
          @click="remindersStore.openSheet('new')"
        >
          Add another
        </button>
      </div>

      <!-- Date & time -->
      <div class="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <label
          class="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
        >
          <span class="text-xs text-slate-400">Date</span>
          <input
            v-model="remindersStore.reminderForm.date"
            type="date"
            :min="remindersStore.dateMin"
            class="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
          />
        </label>

        <label
          class="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
        >
          <span class="text-xs text-slate-400">Time</span>
          <input
            v-model="remindersStore.reminderForm.time"
            type="time"
            :min="
              remindersStore.reminderForm.date === remindersStore.dateMin
                ? remindersStore.timeMin
                : undefined
            "
            class="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
          />
        </label>
      </div>

      <!-- Repeat -->
      <div
        class="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
      >
        <p class="text-xs text-slate-400">Repeat</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <label
            v-for="option in repeatOptions"
            :key="option.value"
            class="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 hover:border-emerald-400"
          >
            <input
              v-model="remindersStore.reminderForm.repeat"
              type="radio"
              name="repeat"
              :value="option.value"
              class="accent-emerald-400"
            />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-4 flex items-center justify-between text-sm">
        <div
          v-if="
            activeReminders.length &&
            remindersStore.selectedReminderId !== 'new'
          "
          class="flex gap-2"
        >
          <button
            class="rounded-full border border-white/10 px-3 py-1 hover:border-emerald-400"
            @click="markDone"
          >
            Mark done
          </button>
          <button
            class="text-slate-400 hover:text-slate-200"
            @click="removeReminder"
          >
            Remove
          </button>
        </div>

        <div class="flex gap-2">
          <button
            class="rounded-xl border border-white/10 px-4 py-2 hover:border-slate-300"
            @click="remindersStore.closeSheet"
          >
            Cancel
          </button>
          <button
            class="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
            @click="saveReminder"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { computed, watch, onMounted } from "vue";
import { useRemindersStore } from "../stores/useReminders";
import { useNotesStore } from "../stores/useNotes";

const remindersStore = useRemindersStore();
const notesStore = useNotesStore();

/* ─────────────── derived state ─────────────── */

const activeReminders = computed(
  () => notesStore.getActiveNote()?.reminders ?? [],
);

/**
 * IMPORTANT:
 * This computed is the bridge between <select v-model>
 * and remindersStore.openSheet()
 */
const selectedReminderId = computed({
  get() {
    return (
      remindersStore.selectedReminderId ??
      activeReminders.value[0]?.id ??
      "new"
    );
  },
  set(id: string) {
    remindersStore.openSheet(id);
  },
});

/* ─────────────── helpers ─────────────── */

const formatReminderShort = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const repeatOptions = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

/* ─────────────── actions ─────────────── */

const saveReminder = () => remindersStore.saveReminder();
const removeReminder = () => remindersStore.removeReminder();
const markDone = () => remindersStore.markDone();

/* ─────────────── effects ─────────────── */

watch(
  () => [
    remindersStore.reminderForm.date,
    remindersStore.reminderForm.time,
  ],
  remindersStore.enforceReminderMin,
  { immediate: true },
);

onMounted(() => {
  remindersStore.requestPermission();
});
</script>

