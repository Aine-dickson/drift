<template>
    <main
        class="flex flex-1 flex-col rounded-none border border-white/10 bg-white/5 p-4 backdrop-blur md:rounded-2xl md:p-6"
        :class="{ 'hidden md:flex': !uiStore.isEditing }">
        <div v-if="activeNote" class="mb-3 flex items-center gap-2 text-xs text-slate-400 md:hidden">
            <button
                class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
                @click="exitEditing">
                Back
            </button>
            <span class="truncate">{{ activeNote.title || 'Untitled' }}</span>
        </div>

        <div v-if="activeNote" class="flex h-full flex-col">
            <div class="flex flex-wrap items-center gap-2 text-xs">
                <button
                    class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
                    @click="uiStore.toggleFocusMode">
                    {{ uiStore.focusMode ? 'Exit focus' : 'Focus mode' }} (Ctrl+Shift+F)
                </button>

                <button
                    class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
                    @click="toggleEdit">
                    {{ uiStore.editingContent ? 'Done' : 'Edit' }}
                </button>

                <template v-if="!uiStore.focusMode">
                    <span
                        class="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">Local</span>
                    <span class="text-xs text-slate-400">v{{ activeNote.version }}</span>
                </template>

                <div class="ml-auto flex gap-2">
                    <button
                        class="rounded-full border border-white/10 px-3 py-1 font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
                        @click="notesStore.togglePin(activeNote.id)">
                        {{ activeNote.pinned ? 'Unpin' : 'Pin' }}
                    </button>
                    <button
                        class="rounded-full border border-white/10 px-3 py-1 text-slate-300 transition hover:border-red-400 hover:text-red-200"
                        @click="deleteNote(activeNote.id)">
                        Delete
                    </button>
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
                    <span>Updated {{ formatDate(activeNote.updatedAt) }}</span>
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

                <div v-if="!uiStore.focusMode" class="flex flex-wrap gap-2">
                    <button v-for="tag in activeNote.tags" :key="tag"
                        class="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:border-emerald-400"
                        @click="notesStore.removeTag(tag)">
                        #{{ tag }}
                        <span class="text-slate-500 transition group-hover:text-emerald-300">×</span>
                    </button>
                    <div
                        class="flex items-center gap-2 rounded-full border border-dashed border-white/20 px-3 py-1 text-xs text-slate-400">
                        <input :value="uiStore.tagInput"
                            class="w-24 bg-transparent text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
                            placeholder="Add tag"
                            @input="(event) => uiStore.setTagInput((event.target as HTMLInputElement).value)"
                            @keydown="onTagKeydown" />
                        <button class="text-emerald-300 hover:text-emerald-200" @click="addTag">Add</button>
                    </div>
                </div>
            </div>

            <div class="mt-4 flex-1 overflow-y-hidden">
                <div v-if="uiStore.editingContent" class="mb-3 flex flex-wrap gap-2 text-xs">
                    <button type="button" class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200" @click="applyCommand('bold')">Bold</button>
                    <button type="button" class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200" @click="applyCommand('italic')">Italic</button>
                    <button type="button" class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200" @click="applyCommand('underline')">Underline</button>
                    <button type="button" class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200" @click="applyBlock('H1')">H1</button>
                    <button type="button" class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200" @click="applyBlock('H2')">H2</button>
                    <button type="button" class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200" @click="applyBlock('H3')">H3</button>
                    <button type="button" class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200" @click="applyCommand('insertUnorderedList')">Bullet</button>
                    <button type="button" class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200" @click="applyCommand('insertOrderedList')">Numbered</button>
                    <button type="button" class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200" @click="insertWikiLink">[[noteId]]</button>
                </div>

                <div v-if="uiStore.editingContent"
                    class="h-full thin-scroll w-full rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-6 text-slate-100 shadow-inner focus-within:border-emerald-400">
                    <div
                        ref="editorSurfaceRef"
                        class="h-full w-full thin-scroll outline-none"
                        contenteditable="true"
                        :data-placeholder="'Capture thoughts instantly. Works offline; sync catches up later.'"
                        @input="onContentInput"
                        @keydown.meta.s.prevent="saveShortcut"
                        @keydown.ctrl.s.prevent="saveShortcut"
                    ></div>
                </div>

                <div v-else
                    class="h-full thin-scroll w-full rounded-2xl border border-white/10 bg-slate-950/20 p-4 text-sm leading-6 text-slate-100">
                    <p v-if="(activeNote.content || '').trim().length === 0" class="text-slate-500">Empty note. Click Edit to
                        add content.
                    </p>
                    <div v-else v-html="renderedContent"></div>
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
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useNotesStore, getReminderState } from "../stores/useNotes";
import { useUiStore } from "../stores/useUi";
import { useRemindersStore } from "../stores/useReminders";

const notesStore = useNotesStore();
const uiStore = useUiStore();
const remindersStore = useRemindersStore();

const editorSurfaceRef = ref<HTMLDivElement | null>(null);
const shouldFocusEditor = ref(false);

const activeNote = computed(() => notesStore.getActiveNote());
const reminderState = computed(() => (activeNote.value ? getReminderState(activeNote.value) : null));
const formatDate = (timestamp: string) => new Date(timestamp).toLocaleString();
const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const normalizeHtml = (raw: string) => {
    if (!raw.includes("<")) {
        return escapeHtml(raw).replace(/\n/g, "<br>");
    }
    return raw;
};

const applyInline = (value: string) => {
    let next = value;
    next = next.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    next = next.replace(/__(.+?)__/g, "<u>$1</u>");
    next = next.replace(/\*(.+?)\*/g, "<em>$1</em>");
    next = next.replace(/\[\[(.+?)\]\]/g, '<span class="text-emerald-300">[[ $1 ]]</span>');
    return next;
};

const allowedTags = ["b", "strong", "em", "i", "u", "ul", "ol", "li", "p", "br", "h1", "h2", "h3", "span"]; // keep minimal

const sanitize = (html: string) => {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_ELEMENT, null);
    const toRemove: Element[] = [];
    while (walker.nextNode()) {
        const el = walker.currentNode as Element;
        if (!allowedTags.includes(el.tagName.toLowerCase())) {
            toRemove.push(el);
        } else {
            // strip all attributes for safety
            [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
        }
    }
    toRemove.forEach((node) => node.replaceWith(...Array.from(node.childNodes)));
    return tpl.innerHTML;
};

const renderedContent = computed(() => sanitize(normalizeHtml(activeNote.value?.content ?? "")));

const applyCommand = (command: string) => {
    document.execCommand(command, false);
    syncFromSurface();
};

const applyBlock = (block: "H1" | "H2" | "H3") => {
    document.execCommand("formatBlock", false, block);
    syncFromSurface();
};

const insertWikiLink = () => {
    document.execCommand("insertText", false, "[[note-id]]");
    syncFromSurface();
};

const syncSurfaceHtml = () => {
    const el = editorSurfaceRef.value;
    if (!el) return;
    el.innerHTML = normalizeHtml(activeNote.value?.content ?? "");
};

const syncFromSurface = () => {
    const el = editorSurfaceRef.value;
    if (!el) return;
    notesStore.updateContent(el.innerHTML);
};

const onContentInput = () => {
    syncFromSurface();
};

const saveShortcut = () => {
    // reserved for future explicit save; no-op now
};

onMounted(() => {
    syncSurfaceHtml();
});

const focusEditorEnd = () => {
    nextTick(() => {
        const el = editorSurfaceRef.value;
        if (!el) return;
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });
};

watch(
    () => uiStore.editingContent,
    (next) => {
        if (next) {
            syncSurfaceHtml();
        }
        if (next && shouldFocusEditor.value) {
            focusEditorEnd();
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

const exitEditMode = () => {
    if (!activeNote.value) return;
    if (activeNote.value.content.trim().length === 0) {
        notesStore.pruneEmptyActive();
        uiStore.stopEditing();
    } else {
        uiStore.setEditingContent(false);
    }
};

const toggleEdit = () => {
    if (uiStore.editingContent) {
        exitEditMode();
    } else {
        enterEditMode();
    }
};

const exitEditing = () => {
    notesStore.pruneEmptyActive();
    uiStore.stopEditing();
    uiStore.setEditingContent(false);
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
    uiStore.stopEditing();
    uiStore.setEditingContent(false);
};
</script>
