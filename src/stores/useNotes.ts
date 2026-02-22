import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import { ref } from "vue";
import { readNotesSnapshot, writeNotesSnapshot, type NotesSnapshot } from "../lib/db";
import { useUiStore } from "./useUi";

export type Reminder = {
    id: string;
    at: string;
    repeat?: "daily" | "weekly" | "monthly";
    done?: boolean;
};

export type Note = {
    id: string;
    title: string;
    content: string;
    tags: string[];
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    version: number;
    reminders?: Reminder[];
};

export const getReminderState = (note: Note) => {
    const reminders = note.reminders ?? [];
    if (!reminders.length) return null;
    const sorted = [...reminders].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const target = sorted.find((r) => !r.done) ?? sorted[0];
    const now = Date.now();
    const at = new Date(target.at).getTime();
    const overdue = !target.done && at <= now;
    const dueSoon = !target.done && at > now && at - now <= 60 * 60 * 1000;
    const label = target.done ? `Done • ${new Date(target.at).toLocaleString()}` : overdue ? "Missed" : new Date(target.at).toLocaleString();
    return { overdue, dueSoon, done: !!target.done, label, targetId: target.id };
};

const nowIso = () => new Date().toISOString();

const seedNote = (title: string, content: string, tags: string[], pinned = false): Note => ({
    id: crypto.randomUUID(),
    title,
    content,
    tags,
    pinned,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    version: 1,
    reminders: [],
});

const seedNotes = (): Note[] => [
    seedNote(
        "Local-first playbook",
        "Notes save instantly to SQLite, sync later via change log batches. No spinners, no blocking UI.",
        ["mvp", "sync"],
        true,
    ),
    seedNote(
        "Reminders",
        "Schedule locally with OS notifications. Sync only the metadata so other devices can mirror the reminder state.",
        ["reminders", "focus"],
    ),
    seedNote(
        "Backlinks",
        "Use [[note-id]] in content; parse client-side for backlinks. No server complexity added.",
        ["links"],
    ),
];

export const useNotesStore = defineStore("notes", () => {
    const uiStore = useUiStore();
    const notes = ref(uiStore.isInitialSetup ? seedNotes() : []);
    const selectedNoteId = ref<string>("")
    const initialized = ref(false)
    // const unsyncedCount = ref(0)
    const unTitleCount = ref(0);


    const getActiveNote = (): Note  | null => {
        if(selectedNoteId.value.length === 0) return null;
        const note = notes.value.find((note) => note.id === selectedNoteId.value && !note.deletedAt);
        if (!note) return null;
        return note;
    }

    const init = async () => {
        if (initialized.value) return;
        const snapshot = await readNotesSnapshot();
        if (snapshot && Array.isArray((snapshot as NotesSnapshot).notes)) {
            notes.value = snapshot.notes as Note[];
            selectedNoteId.value = snapshot.selectedNoteId ?? (notes.value[0]?.id ?? null);
            uiStore.toggleInitialSetup(false);
        } else {
            notes.value = seedNotes();
            selectedNoteId.value = notes.value[0]?.id ?? null;
            uiStore.toggleInitialSetup(true);
            await persist();
        }
        initialized.value = true;
    }

    const persist = async (snapshot?: NotesSnapshot) => {
        const payload = snapshot ?? { notes: notes.value, selectedNoteId: selectedNoteId.value };
        await writeNotesSnapshot(payload);
    }

    const select = async (id: string) => {
        await persist();
        uiStore.setEditingContent(false);
        selectedNoteId.value = id;
        uiStore.toggleInfo('close')
        uiStore.setView('editor')
    }

    const createNote = async () => {
        await persist();
        uiStore.setEditingContent(false);
        const noteName = `Untitled note ${unTitleCount.value + 1}`;
        unTitleCount.value += 1;
        const note = seedNote(noteName, "", []);
        notes.value.unshift(note);
        selectedNoteId.value = note.id;
        uiStore.toggleInfo('close')
        uiStore.setView('editor')
        return note;
    }

    const updateActive = async (updater: (note: Note) => void) => {
        const note = getActiveNote();
        if (!note) return;
        updater(note);
        note.updatedAt = nowIso();
        note.version += 1;
    }

    const updateTitle = (value: string) => {
        updateActive((note) => {
            note.title = value;
        });
    };
    const updateContent = (value: string) => {
        updateActive((note) => {
            note.content = value;
        });
    }

    const togglePin = (id: string) => {
        const target = notes.value.find((note) => note.id === id);
        if (!target) return;
        target.pinned = !target.pinned;
        target.updatedAt = nowIso();
        target.version += 1;

    }
    const addTag = (tag: string) => {
        const value = tag.trim();
        if (!value) return;
        updateActive((note) => {
            if (!note.tags.includes(value)) note.tags.push(value);
        });
    }

    const removeTag = (tag: string) => {
        updateActive((note) => {
            note.tags = note.tags.filter((current) => current !== tag);
        });
    }

    const deleteNote = async (id: string) => {
        const note = notes.value.find((item) => item.id === id);
        if (!note) return;
        note.deletedAt = nowIso();
        const reminderIds = (note.reminders ?? []).map((r) => r.id);
        if (reminderIds.length) {
            try {
                await invoke("cancel_reminders", { ids: reminderIds });
            } catch (_) {
                /* ignore */
            }
        }
        const next = notes.value.find((item) => item.id !== id && !item.deletedAt);
        selectedNoteId.value = next?.id ?? "";
    }

    const pruneEmptyActive = async () => {
        const note = await getActiveNote();
        if (note && note.content.trim().length === 0) {
            notes.value = notes.value.filter((item) => item.id !== note.id);
            selectedNoteId.value = "";
        }
    }

    return{
        notes, selectedNoteId, unTitleCount, initialized,
        init, persist, select, createNote,
        updateActive, updateTitle, updateContent, togglePin,
        addTag, removeTag, deleteNote, pruneEmptyActive,
        getActiveNote
    }
}, {
    persist: false,
}
);
