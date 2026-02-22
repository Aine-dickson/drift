<template>
    <button class="w-full text-left transition px-3 py-3 rounded-xl border hover:bg-white/10"
        :class="note.id === notesStore.selectedNoteId ? 'border-emerald-400/70 bg-white/10' : 'border-white/10 bg-white/5'"
        @click="notesStore.select(note.id)">
        <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-semibold">{{ note.title || 'Untitled' }}</p>
            <svg v-if="note.pinned" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
                :class="note.pinned ? 'text-emerald-400' : 'text-slate-400'" height="24px" viewBox="0 -960 960 960"
                width="24px" fill="currentColor">
                <path
                    d="m640-480 80 80v80H520v240l-40 40-40-40v-240H240v-80l80-80v-280h-40v-80h400v80h-40v280Zm-286 80h252l-46-46v-314H400v314l-46 46Zm126 0Z" />
            </svg>
        </div>
        <p class="mt-1 line-clamp-2 text-xs text-slate-400">{{ preview(note) }}</p>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span v-if="getReminderState(note)?.overdue && !getReminderState(note)?.done"
                class="rounded-full border border-red-400/70 bg-red-500/10 px-2 py-px font-semibold text-red-100">
                Missed
            </span>
            <span v-for="tag in note.tags.slice(0, 2)" :key="tag"
                class="rounded-full bg-white/5 px-2 py-px whitespace-nowrap">#{{ tag }}</span>
            <span v-if="note.tags.length > 2" class="rounded-full bg-white/5 px-2 py-px whitespace-nowrap">+{{
                note.tags.length - 2 }}</span>

            <span class="ml-auto text-[10px]">
                {{ formatRelative(note.updatedAt) }}
            </span>
        </div>
    </button>
</template>

<script setup lang="ts" vapor>
import { useNotesStore, getReminderState, Note } from "../stores/useNotes";

const notesStore = useNotesStore();
defineProps<{
    note: Note;
}>();

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

const preview = (note: any) => {
    const raw = stripHtml(note.content || "").trim();
    return raw.length ? raw : "Empty note";
};


const formatRelative = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
};
</script>