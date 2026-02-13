import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useNotesStore, type Note, type Reminder } from "./useNotes";

type ReminderForm = { date: string; time: string; repeat: Reminder["repeat"] | "none" };

const combineDateTimeToIso = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();
const clampFuture = (iso: string) => {
  const atMs = new Date(iso).getTime();
  const minMs = Date.now() + 60 * 1000;
  return new Date(Math.max(atMs, minMs)).toISOString();
};

const toPayloads = (note: Note) => {
  const now = Date.now();
  const reminders = note.reminders ?? [];
  return reminders
    .filter((rem) => !rem.done && new Date(rem.at).getTime() > now)
    .map((rem) => ({
      id: rem.id,
      note_id: note.id,
      at: rem.at,
      title: note.title || "Drift",
      body: (note.content || "").slice(0, 120),
    }));
};

export const useRemindersStore = defineStore("reminders", () => {
  const notesStore = useNotesStore();

  const isSheetOpen = ref(false);
  const selectedReminderId = ref<string | "new" | null>(null);
  const reminderForm = ref<ReminderForm>({ date: "", time: "", repeat: "none" });
  const notificationReady = ref(false);

  const dateMin = computed(() => new Date().toISOString().slice(0, 10));
  const timeMin = computed(() => {
    if (reminderForm.value.date !== dateMin.value) return undefined;
    return new Date(Date.now() + 60 * 1000).toISOString().slice(11, 16);
  });

  const syncFromActive = (reminderId?: string | "new") => {
    const note = notesStore.getActiveNote();
    const baseDate = new Date(Date.now() + 60 * 60 * 1000);
    const defaults = { date: baseDate.toISOString().slice(0, 10), time: baseDate.toISOString().slice(11, 16), repeat: "none" as const };

    if (!note) {
      selectedReminderId.value = "new";
      reminderForm.value = defaults;
      return;
    }

    const reminders = note.reminders ?? [];
    if (reminderId === "new" || (!reminderId && reminders.length === 0)) {
      selectedReminderId.value = "new";
      reminderForm.value = defaults;
      return;
    }

    const targetId = reminderId && reminderId !== "new" ? reminderId : reminders.find((r) => !r.done)?.id ?? reminders[0]?.id;
    const target = reminders.find((r) => r.id === targetId);
    const base = target ? new Date(target.at) : baseDate;
    reminderForm.value = {
      date: base.toISOString().slice(0, 10),
      time: base.toISOString().slice(11, 16),
      repeat: target?.repeat ?? "none",
    };
    selectedReminderId.value = target?.id ?? "new";
  };

  const openSheet = (reminderId?: string | "new") => {
    syncFromActive(reminderId);
    isSheetOpen.value = true;
  };

  const closeSheet = () => {
    isSheetOpen.value = false;
  };

  const patchReminderForm = (patch: Partial<ReminderForm>) => {
    reminderForm.value = { ...reminderForm.value, ...patch };
  };

  const setSelectedReminderId = (value: string | "new" | null) => {
    selectedReminderId.value = value;
  };

  const enforceReminderMin = () => {
    if (reminderForm.value.date === dateMin.value && timeMin.value && reminderForm.value.time < timeMin.value) {
      reminderForm.value = { ...reminderForm.value, time: timeMin.value };
    }
  };

  const setQuickReminder = (offsetDays: number) => {
    const base = new Date();
    base.setDate(base.getDate() + offsetDays);
    const date = base.toISOString().slice(0, 10);
    const time = reminderForm.value.time || base.toISOString().slice(11, 16);
    patchReminderForm({ date, time });
    enforceReminderMin();
  };

  const scheduleAll = async () => {
    if (!notificationReady.value) return;
    const payloads = notesStore.notes
      .filter((note) => !note.deletedAt)
      .flatMap((note) => toPayloads(note));
    await invoke("schedule_reminders", { reminders: payloads });
  };

  const cancelIds = async (ids: string[]) => {
    await invoke("cancel_reminders", { ids });
  };

  const saveReminder = async () => {
    const { date, time, repeat } = reminderForm.value;
    if (!date || !time) return;
    let at = combineDateTimeToIso(date, time);
    at = clampFuture(at);
    reminderForm.value = { date: at.slice(0, 10), time: at.slice(11, 16), repeat };
    enforceReminderMin();

    notesStore.updateActive((note) => {
      note.reminders = note.reminders ?? [];
      if (selectedReminderId.value && selectedReminderId.value !== "new") {
        note.reminders = note.reminders.map((reminder) =>
          reminder.id === selectedReminderId.value
            ? { ...reminder, at, repeat: repeat === "none" ? undefined : repeat, done: false }
            : reminder,
        );
      } else {
        const newReminder = { id: crypto.randomUUID(), at, repeat: repeat === "none" ? undefined : repeat, done: false };
        note.reminders.push(newReminder);
        selectedReminderId.value = newReminder.id;
      }
    });
    await scheduleAll();
    closeSheet();
  };

  const removeReminder = async () => {
    if (!selectedReminderId.value || selectedReminderId.value === "new") return;
    notesStore.updateActive((note) => {
      note.reminders = (note.reminders ?? []).filter((reminder) => reminder.id !== selectedReminderId.value);
    });
    await cancelIds([selectedReminderId.value]);
    selectedReminderId.value = null;
    closeSheet();
  };

  const toggleReminderDone = async () => {
    if (!selectedReminderId.value || selectedReminderId.value === "new") return;
    notesStore.updateActive((note) => {
      const reminders = note.reminders ?? [];
      const target = reminders.find((r) => r.id === selectedReminderId.value);
      if (!target) return;
      target.done = !target.done;
    });
    await scheduleAll();
  };

  const requestPermission = async () => {
    try {
      await invoke("request_notification_permission");
      notificationReady.value = true;
      await scheduleAll();
    } catch (_) {
      notificationReady.value = false;
    }
  };

  return {
    // state
    isSheetOpen,
    selectedReminderId,
    reminderForm,
    notificationReady,
    dateMin,
    timeMin,
    // actions
    openSheet,
    closeSheet,
    syncFromActive,
    patchReminderForm,
    setSelectedReminderId,
    enforceReminderMin,
    setQuickReminder,
    scheduleAll,
    cancelIds,
    saveReminder,
    removeReminder,
    toggleReminderDone,
    requestPermission,
  };
});
