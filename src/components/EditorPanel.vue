<template>
    <main
        class="flex min-w-0 flex-1 flex-col w-full rounded-none border border-white/10 bg-white/5 p-4 backdrop-blur md:rounded-2xl md:p-6"
        :class="{ 'hidden md:flex': !uiStore.isEditing }">
        <div v-if="activeNote" class="mb-3 w-full flex items-center gap-2 text-xs text-slate-400 md:hidden">
            <button
                class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
                @click="exitEditing">
                Back
            </button>
            <span class="truncate">{{ activeNote.title || 'Untitled' }}</span>
        </div>

        <div v-if="activeNote" class="flex h-full flex-col w-full">
            <div class="flex flex-wrap items-center gap-2 text-xs">
                <button
                    class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
                    @click="uiStore.toggleFocusMode">
                    {{ uiStore.focusMode ? 'Exit focus' : 'Focus mode' }}
                </button>

                <button
                    class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
                    @click="toggleEdit">
                    {{ uiStore.editingContent ? 'Done' : 'Edit' }}
                </button>

                <div class="ml-auto flex gap-2 relative">
                    <!-- Pin button -->
                    <svg @click="notesStore.togglePin(activeNote.id)" xmlns="http://www.w3.org/2000/svg"
                        class="w-5 h-5 cursor-pointer"
                        :class="activeNote.pinned ? 'text-emerald-400' : 'text-slate-400'" height="24px"
                        viewBox="0 -960 960 960" width="24px" fill="currentColor">
                        <path
                            d="m640-480 80 80v80H520v240l-40 40-40-40v-240H240v-80l80-80v-280h-40v-80h400v80h-40v280Zm-286 80h252l-46-46v-314H400v314l-46 46Zm126 0Z" />
                    </svg>

                    <!-- Delete note btn -->
                    <svg @click="deleteNote(activeNote.id)"
                        class="w-5 h-5 cursor-pointer text-red-500 dark:text-red-400" aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z" />
                    </svg>

                    <!-- Note Info button -->
                    <svg @click="uiStore.toggleInfo()" class="w-5 h-5 cursor-pointer text-gray-800 dark:text-white"
                        aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                        viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>

                    <!-- Note info -->
                    <div v-if="uiStore.isInfoOpen" class=" overflow-y-auto absolute top-0 right-0 w-42">
                        <div class="relative bg-slate-800 border border-slate-700 rounded-md shadow-sm p-2">
                            <!-- Modal header -->
                            <div class="flex items-center justify-between border-b border-default">
                                <span class="text-base font-medium">
                                    Info
                                </span>
                               
                                <svg @click="uiStore.toggleInfo()" class="w-4 h-4 cursor-pointer" aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                                    viewBox="0 0 24 24">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                        stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6" />
                                </svg>
                            </div>
                            <!-- Modal body -->
                            <div class="pt-4">
                                <div class="flex justify-between">
                                    <p class="text-body mb-2">Version:</p>
                                    <span class="text-gray-500">{{ activeNote.version }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <p class="text-body mb-2">Sync:</p>
                                    <span class="text-gray-500">{{ activeNote.version ? 'Local' : 'Complete' }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <p class="text-body mb-2">Created:</p>
                                    <span class="text-gray-500">{{ formatDate(activeNote.createdAt) }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <p class="text-body mb-2">Updated:</p>
                                    <span class="text-gray-500">{{ formatDate(activeNote.updatedAt) }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <p class="">Alarms:</p>
                                    <span class="text-gray-500">{{ activeNote.reminders?.length }}</span>
                                </div>
                                
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-4 space-y-3">
                <div class="flex items-center gap-3">
                    <input :value="activeNote.title"
                        class="w-full bg-transparent text-2xl font-semibold leading-tight text-slate-50 placeholder:text-slate-600 focus:outline-none md:text-3xl"
                        placeholder="Title"
                        @input="(event) => notesStore.updateTitle((event.target as HTMLInputElement).value)" />
                    <span v-if="reminderState?.overdue && !reminderState.done"
                        class="rounded-full border border-red-400/80 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100">
                        Missed
                    </span>
                </div>

                <div v-if="!uiStore.focusMode" class="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>Created {{ formatDate(activeNote.createdAt) }}</span>
                    <span class="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true"></span>
                    <span>{{ activeNote.tags.length }} tags</span>
                    <button
                        class="flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition cursor-pointer"
                        :class="[
                            reminderState?.overdue ? 'border-red-400/80 text-red-200' : '',
                            reminderState?.dueSoon ? 'border-amber-300/80 text-amber-200' : '',
                            reminderState?.done ? 'border-emerald-400/70 text-emerald-200' : '',
                            !reminderState ? 'border-white/10 text-slate-300' : 'border-white/10'
                        ]" @click="remindersStore.openSheet()">
                        ⏰
                        <span v-if="reminderState">
                            {{ reminderState.label }}
                        </span>
                        <span v-else class="text-slate-500">
                            Add reminder
                        </span>
                    </button>
                </div>

                <div v-if="!uiStore.focusMode" class="flex overflow-x-auto thin-scroll pb-1 gap-2">
                    <div
                        class="flex items-center gap-2 rounded-full border border-dashed border-white/20 px-3 py-1 text-xs text-slate-400">
                        <input :value="uiStore.tagInput"
                            class="w-24 bg-transparent text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
                            placeholder="Add tag"
                            @input="(event) => uiStore.setTagInput((event.target as HTMLInputElement).value)"
                            @keydown="onTagKeydown" />
                        <button class="text-emerald-300 hover:text-emerald-200" @click="addTag">Add</button>
                    </div>
                    <button v-for="tag in activeNote.tags" :key="tag"
                        class="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:border-emerald-400"
                        @click="notesStore.removeTag(tag)">
                        #{{ tag }}
                        <span class="text-slate-500 transition group-hover:text-emerald-300">×</span>
                    </button>
                </div>
            </div>

            <div class="mt-4 flex-1 w-full min-w-0 overflow-hidden">

                <div v-if="uiStore.editingContent"
                    class="h-full w-full min-w-0 thin-scroll rounded-2xl border border-white/10 bg-slate-950/40 overflow-hidden text-sm leading-6 text-slate-100 shadow-inner focus-within:border-emerald-400">
                    <editor v-if="activeNote" v-model="activeNote.content" />

                </div>

                <div v-else
                    class="h-full thin-scroll w-full rounded-2xl border border-white/10 bg-slate-950/20 p-4 text-sm leading-6 text-slate-100">
                    <p v-if="(activeNote.content || '').trim().length === 0" class="text-slate-500">Empty note.
                        Click Edit to
                        add content.
                    </p>
                    <div v-else v-html="normalizeHtml(activeNote.content)"></div>
                </div>
            </div>
        </div>

        <div v-else
            class="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 text-sm text-slate-500">
            Create a note to get started.
        </div>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useNotesStore, getReminderState } from "../stores/useNotes";
import { useUiStore } from "../stores/useUi";
import { useRemindersStore } from "../stores/useReminders";
import editor from "./editor.vue";

const notesStore = useNotesStore();
const uiStore = useUiStore();
const remindersStore = useRemindersStore();
const editorSurfaceRef = ref<HTMLDivElement | null>(null);
const shouldFocusEditor = ref(false);

const activeNote = computed(() => notesStore.getActiveNote());
const reminderState = computed(() => (activeNote.value ? getReminderState(activeNote.value) : null));
const formatDate = (timestamp: string) => {
    const target = new Date(timestamp);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const absDiff = Math.abs(diffMs);

    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;

    const timePart = target.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

    if (absDiff < minuteMs) return "Just now";
    if (diffMs < 0 && absDiff < hourMs) return `${Math.floor(absDiff / minuteMs)}min ago`;
    if (diffMs > 0 && absDiff < hourMs) return `in ${Math.ceil(absDiff / minuteMs)}min`;

    const startOfDay = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(0, 0, 0, 0);
        return copy;
    };

    const todayStart = startOfDay(now).getTime();
    const targetStart = startOfDay(target).getTime();
    const dayDiff = Math.floor((targetStart - todayStart) / dayMs);

    if (dayDiff === 0) return `Today, ${timePart}`;
    if (dayDiff === -1) return `Yesterday, ${timePart}`;
    if (dayDiff === 1) return `Tomorrow, ${timePart}`;

    const weekdayLabel = target.toLocaleDateString(undefined, { weekday: "short" });

    if (dayDiff >= -6 && dayDiff < 0) return `${weekdayLabel}, ${timePart}`;
    if (dayDiff <= 6 && dayDiff > 1) return `${weekdayLabel}, ${timePart}`;

    const sameYear = target.getFullYear() === now.getFullYear();
    if (sameYear) {
        const md = target.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });
        return `${md}, ${timePart}`;
    }

    const mdy = target.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
    return mdy;
};

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const normalizeHtml = (raw: string) => {
    if (!raw.includes("<")) {
        return escapeHtml(raw).replace(/\n/g, "<br>");
    }
    return raw;
};

const syncSurfaceHtml = () => {
    const el = editorSurfaceRef.value;
    if (!el) return;
    el.innerHTML = normalizeHtml(activeNote.value?.content ?? "");
};

// const syncFromSurface = () => {
//     const el = editorSurfaceRef.value;
//     if (!el) return;
//     notesStore.updateContent(el.innerHTML);
// };

onMounted(() => {
    syncSurfaceHtml();
});



watch(
    () => uiStore.editingContent,
    (next) => {
        if (next) {
            syncSurfaceHtml();
        }
        if (next && shouldFocusEditor.value) {
            //focusEditorEnd();
            shouldFocusEditor.value = false;
        }
    },
);

watch(
    () => activeNote.value?.id,
    () => {
        syncSurfaceHtml();
    },
);

const enterEditMode = () => {
    shouldFocusEditor.value = true;
    uiStore.setEditingContent(true);
};

const exitEditMode = async () => {
    if (!activeNote.value) return;
    if (activeNote.value.content.trim().length === 0) {
        notesStore.pruneEmptyActive();
        uiStore.stopEditing();
    } else {
        uiStore.setEditingContent(false);
    }
    await notesStore.persist();
};

const toggleEdit = () => {
    if (uiStore.editingContent) {
        void exitEditMode();
    } else {
        enterEditMode();
    }
};

const exitEditing = async () => {
    notesStore.pruneEmptyActive();
    uiStore.stopEditing();
    uiStore.setEditingContent(false);
    await notesStore.persist();
};

const addTag = () => {
    notesStore.addTag(uiStore.tagInput);
    uiStore.setTagInput("");
};

const onTagKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        addTag();
    }
};

watch(
    () => uiStore.editingContent,
    (next, prev) => {
        if (next && !prev) {
            shouldFocusEditor.value = true;
        }
    },
);

const deleteNote = async (id: string) => {
    await notesStore.deleteNote(id);
    await notesStore.persist();
    uiStore.stopEditing();
    uiStore.setEditingContent(false);
};
</script>
