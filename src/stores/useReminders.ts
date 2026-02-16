import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useNotesStore, type Note, type Reminder } from "./useNotes";

/* ───────────────── helpers ───────────────── */

type ReminderForm = {
    date: string; // YYYY-MM-DD (local)
    time: string; // HH:mm (local)
    repeat: Reminder["repeat"] | "none";
};

const normalizeMinute = (d: Date) => {
    d.setSeconds(0, 0);
    return d;
};

const toLocalDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-CA");

const toLocalTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    });

const combineLocalToIso = (date: string, time: string) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
};

/* ───────────────── store ───────────────── */

export const useRemindersStore = defineStore("reminders", () => {
    const notesStore = useNotesStore();

    const isSheetOpen = ref(false);
    const selectedReminderId = ref<string | "new" | null>(null);
    const reminderForm = ref<ReminderForm>({
        date: "",
        time: "",
        repeat: "none",
    });

    const notificationReady = ref(false);

    /* ─────────────── time guards ─────────────── */

    const dateMin = computed(() =>
        new Date().toISOString().slice(0, 10),
    );

    const timeMin = computed(() => {
        if (reminderForm.value.date !== dateMin.value) return undefined;
        return toLocalTime(
            normalizeMinute(new Date(Date.now() + 60_000)).toISOString(),
        );
    });

    /* ─────────────── derived helpers ─────────────── */

    const getDefaultForm = (): ReminderForm => {
        const base = normalizeMinute(new Date(Date.now() + 60 * 60_000));
        return {
            date: toLocalDate(base.toISOString()),
            time: toLocalTime(base.toISOString()),
            repeat: "none",
        };
    };

    const hydrateFromReminder = (r: Reminder): ReminderForm => ({
        date: toLocalDate(r.at),
        time: toLocalTime(r.at),
        repeat: r.repeat ?? "none",
    });

    /* ─────────────── sheet control ─────────────── */

    const syncFromActive = (id?: string | "new") => {
        const note = notesStore.getActiveNote();
        if (!note) {
            selectedReminderId.value = "new";
            reminderForm.value = getDefaultForm();
            return;
        }

        const reminders = note.reminders ?? [];

        if (id === "new" || reminders.length === 0) {
            selectedReminderId.value = "new";
            reminderForm.value = getDefaultForm();
            return;
        }

        const target =
            reminders.find(r => r.id === id) ??
            reminders.find(r => !r.done) ??
            reminders[0];

        selectedReminderId.value = target?.id ?? "new";
        reminderForm.value = target
            ? hydrateFromReminder(target)
            : getDefaultForm();
    };

    const openSheet = (id?: string | "new") => {
        syncFromActive(id);
        isSheetOpen.value = true;
    };

    const closeSheet = () => {
        isSheetOpen.value = false;
    };

    /* ─────────────── validation ─────────────── */

    const enforceReminderMin = () => {
        if (
            reminderForm.value.date === dateMin.value &&
            timeMin.value &&
            reminderForm.value.time < timeMin.value
        ) {
            reminderForm.value.time = timeMin.value;
        }
    };

    /* ─────────────── scheduling ─────────────── */

    const scheduleReminder = async (note: Note, reminder: Reminder) => {
        if (!notificationReady.value) return;
        if (reminder.done) return;

        await invoke("schedule_reminders", {
            reminders: [
                {
                    id: reminder.id,
                    note_id: note.id,
                    at: reminder.at,
                    title: note.title || "Drift",
                    body: (note.content || "").slice(0, 120),
                },
            ],
        });
    };

    const cancelReminder = async (id: string) => {
        await invoke("cancel_reminders", { ids: [id] });
    };

    /* ─────────────── mutations ─────────────── */

    const saveReminder = async () => {
        const note = notesStore.getActiveNote();
        if (!note) return;

        const { date, time, repeat } = reminderForm.value;
        if (!date || !time) return;

        const at = combineLocalToIso(date, time);

        let saved: Reminder;

        notesStore.updateActive(n => {
            n.reminders = n.reminders ?? [];

            if (selectedReminderId.value && selectedReminderId.value !== "new") {
                n.reminders = n.reminders.map(r =>
                    r.id === selectedReminderId.value
                        ? (saved = {
                            ...r,
                            at,
                            repeat: repeat === "none" ? undefined : repeat,
                            done: false,
                        })
                        : r,
                );
            } else {
                saved = {
                    id: crypto.randomUUID(),
                    at,
                    repeat: repeat === "none" ? undefined : repeat,
                    done: false,
                };
                n.reminders.push(saved);
                selectedReminderId.value = saved.id;
            }
        });

        await scheduleReminder(note, saved!);
        await notesStore.persist();
        closeSheet();
    };

    const removeReminder = async () => {
        if (!selectedReminderId.value || selectedReminderId.value === "new") return;

        const id = selectedReminderId.value;

        notesStore.updateActive(n => {
            n.reminders = (n.reminders ?? []).filter(r => r.id !== id);
        });

        await cancelReminder(id);
        await notesStore.persist();
        selectedReminderId.value = null;
        closeSheet();
    };

    const setQuickReminder = (offsetDays: number) => {
        const base = new Date();
        base.setDate(base.getDate() + offsetDays);
        base.setSeconds(0, 0);

        reminderForm.value = {
            ...reminderForm.value,
            date: base.toISOString().slice(0, 10),
            time: base.toISOString().slice(11, 16),
        };

        enforceReminderMin();
    };

    const rehydrateAll = async () => {
        if (!notificationReady.value) return;

        const notes = notesStore.notes.filter(n => !n.deletedAt);
        const now = Date.now();

        const payloads = notes.flatMap(note =>
            (note.reminders ?? [])
                .filter(r => !r.done && new Date(r.at).getTime() > now)
                .map(r => ({
                    id: r.id,
                    note_id: note.id,
                    at: r.at,
                    title: note.title || "Drift",
                    body: (note.content || "").slice(0, 120),
                })),
        );

        if (!payloads.length) return;

        await invoke("schedule_reminders", { reminders: payloads });
    };


    /* ✔ Mark done = delete + cancel */
    const markDone = async () => {
        if (!selectedReminderId.value || selectedReminderId.value === "new") return;

        const id = selectedReminderId.value;

        notesStore.updateActive(n => {
            n.reminders = (n.reminders ?? []).filter(r => r.id !== id);
        });

        await cancelReminder(id);
        await notesStore.persist();
        selectedReminderId.value = null;
    };

    /* ─────────────── permissions ─────────────── */

    const requestPermission = async () => {
        try {
            await invoke("request_notification_permission");
            notificationReady.value = true;
        } catch {
            notificationReady.value = false;
        }
    };

    return {
        // state
        isSheetOpen, selectedReminderId, reminderForm,
        dateMin, timeMin, notificationReady,

        // actions
        openSheet, closeSheet, syncFromActive, enforceReminderMin,
        saveReminder, removeReminder, markDone, requestPermission,
        setQuickReminder, rehydrateAll
    };
}, {
    persist: {
        pick: ["isSheetOpen", "selectedReminderId", "notificationReady"]
    }
});
