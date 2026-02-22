<template>
    <aside
        class="grid grid-rows-[min-content_1fr] grid-cols-1 w-full h-full gap-4 bg-white/5 p-3 md:rounded-2xl md:border md:border-white/10 md:p-4 md:w-64 lg:w-80"
        :class="{ 'hidden md:flex': uiStore.isEditing }">

        <div class="flex flex-col gap-4 max-w-full">
            <div class="flex justify-between">
                <div class="flex flex-col lg:flex-row items-start justify-between">
                    <h1 class="text-xl font-semibold">Drift</h1>
                    <div class="flex lg:hidden space-x-1">
                        <p class="text-xs text-slate-400">Local-first notes</p>
                        <p class="text-[11px] opacity-70">On-Demand sync</p>
                    </div>
                </div>
                <div class="hidden lg:block text-right text-xs text-slate-400">
                    <p class="text-xs text-slate-400">Local-first notes</p>
                    <p class="text-[11px] opacity-70">On-Demand sync</p>
                </div>
                <span class="lg:hidden">
                    <svg @click="uiStore.openSettings" class="w-5 h-5 cursor-pointer text-gray-800 dark:text-white"
                        aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                        viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 13v-2a1 1 0 0 0-1-1h-.757l-.707-1.707.535-.536a1 1 0 0 0 0-1.414l-1.414-1.414a1 1 0 0 0-1.414 0l-.536.535L14 4.757V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v.757l-1.707.707-.536-.535a1 1 0 0 0-1.414 0L4.929 6.343a1 1 0 0 0 0 1.414l.536.536L4.757 10H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h.757l.707 1.707-.535.536a1 1 0 0 0 0 1.414l1.414 1.414a1 1 0 0 0 1.414 0l.536-.535 1.707.707V20a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-.757l1.707-.708.536.536a1 1 0 0 0 1.414 0l1.414-1.414a1 1 0 0 0 0-1.414l-.535-.536.707-1.707H20a1 1 0 0 0 1-1Z" />
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    </svg>
                </span>
            </div>
            <div class="space-y-1"></div>

            <button
                class="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-px hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-emerald-400"
                @click="notesStore.createNote()">
                <span class="text-lg">＋</span>
                New
            </button>

            <div
                class="flex items-center overflow-hidden gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <span class="text-xs uppercase tracking-[0.2em] text-slate-500">Search</span>
                <input :value="uiStore.searchTerm"
                    class="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                    placeholder="Titles, content, #tags" type="search"
                    @input="(event) => uiStore.setSearchTerm((event.target as HTMLInputElement).value)" />
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between text-xs text-slate-400">
                    <span>Tags</span>
                    <button class="text-emerald-300 cursor-pointer hover:text-emerald-200"
                        @click="uiStore.setTagFilter()">Clear</button>
                </div>
                <div class="flex overflow-x-auto thin-scroll pb-2 gap-2">
                    <button v-for="tag in tagCloud" :key="tag"
                        class="rounded-full border border-white/10 px-3 py-1 text-xs transition hover:border-emerald-400 hover:text-emerald-200"
                        :class="{ 'border-emerald-400 bg-emerald-500/10 text-emerald-200': tagFilter.includes(tag) }"
                        @click="uiStore.setTagFilter(tag)">
                        #{{ tag }}
                    </button>
                    <span v-if="tagCloud.length === 0" class="text-xs text-slate-500">No tags yet</span>
                </div>
            </div>

            <div class="flex items-center justify-between text-xs text-slate-400">
                <span>Notes</span>
                <span class="rounded-full bg-white/5 px-2 py-0.5 text-emerald-200">{{ filteredNotes.length }}</span>
            </div>

        </div>

        <div class="flex-1 h-full overflow-y-auto thin-scroll space-y-2 px-3">
            <NoteCard v-for="note in filteredNotes" :key="note.id" :note="note" />
            <div v-if="filteredNotes.length === 0"
                class="rounded-xl border border-white/10 bg-white/5 px-3 py-6 text-center text-sm text-slate-500">
                No notes match the filters.
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts" vapor>
import { computed } from "vue";
import { useNotesStore } from "../stores/useNotes";
import { useUiStore } from "../stores/useUi";
import NoteCard from "./NoteCard.vue";

const notesStore = useNotesStore();
const uiStore = useUiStore();

const tagFilter = computed(() => Array.isArray(uiStore.tagFilter) ? uiStore.tagFilter : []);

const filteredNotes = computed(() => {
    const term = uiStore.searchTerm.trim().toLowerCase();
    return notesStore.notes
        .filter((note) => !note.deletedAt)
        .filter((note) => {
            const matchesTerm = term
                ? note.title.toLowerCase().includes(term) ||
                note.content.toLowerCase().includes(term) ||
                note.tags.some((tag) => tag.toLowerCase().includes(term))
                : true;
            const matchesTag = tagFilter.value.length
                ? note.tags.some((tag) => tagFilter.value.includes(tag))
                : true;
            return matchesTerm && matchesTag;
        })
        .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
});

const tagCloud = computed(() => {
    const tags = new Set<string>();
    notesStore.notes
        .filter((note) => !note.deletedAt)
        .forEach((note) => note.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
});



</script>
