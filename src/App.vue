<template>
	<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
		<div class="mx-auto flex h-screen max-w-6xl flex-col md:flex-row gap-4 md:gap-6 px-0 md:px-6 py-0 md:py-6">
			<!-- Sidebar / Mobile home -->
			<aside
				class="
                    flex w-full flex-col gap-4
                    bg-white/5 p-3
                    md:rounded-2xl md:border md:border-white/10 md:p-4
                    md:w-64 lg:w-80
                "
				:class="{ 'hidden md:flex': isEditing }"
			>


				<div class="flex items-start justify-between">
					<div class="space-y-1">
                        <h1 class="text-xl font-semibold">Drift</h1>
                        <!-- <p class="text-xs text-slate-400"> · Quiet sync</p> -->

					</div>
					<div class="text-right text-xs text-slate-400">
                        <p class="text-xs text-slate-400">
                            Local-first notes
                        </p>
                        <p class="text-[11px] opacity-70">
                            Quiet sync
                        </p>

					</div>
				</div>

				<button
					class="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-[1px] hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
					@click="createNote"
				>
					<span class="text-lg">＋</span>
                    New

				</button>

				<div class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
					<span class="text-xs uppercase tracking-[0.2em] text-slate-500">Search</span>
					<input
						v-model="searchTerm"
						class="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
						placeholder="Titles, content, #tags"
						type="search"
					/>
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between text-xs text-slate-400">
						<span>Tags</span>
						<button class="text-emerald-300 hover:text-emerald-200" @click="setTagFilter(null)">Clear</button>
					</div>
					<div class="flex flex-wrap gap-2">
						<button
							v-for="tag in tagCloud"
							:key="tag"
							class="rounded-full border border-white/10 px-3 py-1 text-xs transition hover:border-emerald-400 hover:text-emerald-200"
							:class="{ 'border-emerald-400 bg-emerald-500/10 text-emerald-200': tagFilter === tag }"
							@click="setTagFilter(tag)"
						>
							#{{ tag }}
						</button>
						<span v-if="tagCloud.length === 0" class="text-xs text-slate-500">No tags yet</span>
					</div>
				</div>

				<div class="flex items-center justify-between text-xs text-slate-400">
					<span>Notes</span>
					<span class="rounded-full bg-white/5 px-2 py-[2px] text-emerald-200">{{ filteredNotes.length }}</span>
				</div>

				<div class="flex-1 overflow-y-auto thin-scroll space-y-2 px-3">
					<button
						v-for="note in filteredNotes"
						:key="note.id"
						class="
                        w-full text-left transition
                        px-3 py-3
                        md:rounded-xl md:border md:border-white/10 md:bg-white/5
                        hover:bg-white/10
                        "

						:class="{ 'border-emerald-400/70 bg-white/10': note.id === selectedNoteId }"
						@click="selectNote(note.id)"
					>
						<div class="flex items-center justify-between gap-2">
							<p class="text-sm font-semibold">{{ note.title || 'Untitled' }}</p>
							<span
								v-if="note.pinned"
								class="rounded-full border border-emerald-400/70 px-2 py-[1px] text-[10px] font-semibold text-emerald-200"
							>
								Pinned
							</span>
						</div>
						<p class="mt-1 line-clamp-2 text-xs text-slate-400">{{ note.content || 'Empty note' }}</p>
						<div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
							<span v-for="tag in note.tags" :key="tag" class="rounded-full bg-white/5 px-2 py-[1px]">#{{ tag }}</span>
                            <span class="ml-auto text-[10px]">
                                {{ formatRelative(note.updatedAt) }}
                            </span>

						</div>
					</button>
					<div
						v-if="filteredNotes.length === 0"
						class="rounded-xl border border-white/10 bg-white/5 px-3 py-6 text-center text-sm text-slate-500"
					>
						No notes match the filters.
					</div>
				</div>
			</aside>

			<main
            	class="flex flex-1 flex-col rounded-none border border-white/10 bg-white/5 p-4 backdrop-blur md:rounded-2xl md:p-6"
				:class="{ 'hidden md:flex': !isEditing }"
			>
				<div v-if="activeNote" class="mb-3 flex items-center gap-2 text-xs text-slate-400 md:hidden">
					<button
						class="rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
						@click="exitEditing"
					>
						Back
					</button>
					<span class="truncate">{{ activeNote.title || 'Untitled' }}</span>
				</div>

				<div v-if="activeNote" class="flex h-full flex-col">
					<div class="flex flex-wrap items-center gap-2 text-xs">
                        <span class="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        Local
                    </span>

                    <span class="text-xs text-slate-400">
                        {{ unsyncedCount }} pending · v{{ activeNote.version }}
                    </span>

						<button
							class="ml-auto rounded-full border border-white/10 px-3 py-1 font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
							@click="togglePin(activeNote.id)"
						>
							{{ activeNote.pinned ? 'Unpin' : 'Pin' }}
						</button>
						<button
							class="rounded-full border border-white/10 px-3 py-1 text-slate-300 transition hover:border-red-400 hover:text-red-200"
							@click="deleteNote(activeNote.id)"
						>
							Delete
						</button>
					</div>

					<div class="mt-4 space-y-3">
						<input
							:value="activeNote.title"
							class="w-full bg-transparent text-2xl font-semibold leading-tight text-slate-50 placeholder:text-slate-600 focus:outline-none md:text-3xl"
							placeholder="Title"
							@input="(event) => updateTitle((event.target as HTMLInputElement).value)"
						/>

						<div class="flex flex-wrap items-center gap-2 text-xs text-slate-400">
							<span>Created {{ formatDate(activeNote.createdAt) }}</span>
							<span class="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true"></span>
							<span>Updated {{ formatDate(activeNote.updatedAt) }}</span>
							<span class="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true"></span>
							<span>{{ activeNote.tags.length }} tags</span>
						</div>

						<div class="flex flex-wrap gap-2">
							<button
								v-for="tag in activeNote.tags"
								:key="tag"
								class="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:border-emerald-400"
								@click="removeTag(tag)"
							>
								#{{ tag }}
								<span class="text-slate-500 transition group-hover:text-emerald-300">×</span>
							</button>
							<div class="flex items-center gap-2 rounded-full border border-dashed border-white/20 px-3 py-1 text-xs text-slate-400">
								<input
									v-model="tagInput"
									class="w-24 bg-transparent text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
									placeholder="Add tag"
									@keydown="onTagKeydown"
								/>
								<button class="text-emerald-300 hover:text-emerald-200" @click="addTag">Add</button>
							</div>
						</div>
					</div>

					<div class="mt-4 flex-1 overflow-y-auto">
						<textarea
							:value="activeNote.content"
							class="h-full thin-scroll w-full resize-none rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-6 text-slate-100 shadow-inner focus:border-emerald-400 focus:outline-none"
							placeholder="Capture thoughts instantly. Works offline; sync catches up later."
							@input="(event) => updateContent((event.target as HTMLTextAreaElement).value)"
						></textarea>
					</div>

					<div class="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-400">
						<div class="rounded-xl border border-white/10 bg-white/5 p-3">
							<p class="text-[10px] uppercase tracking-[0.2em] text-slate-500">Sync posture</p>
							<p class="text-sm font-semibold text-emerald-200">Lazy push/pull</p>
							<p class="text-[11px] text-slate-500">Triggers: app start, idle, reconnect.</p>
						</div>
						<div class="rounded-xl border border-white/10 bg-white/5 p-3">
							<p class="text-[10px] uppercase tracking-[0.2em] text-slate-500">Conflicts</p>
							<p class="text-sm font-semibold text-amber-200">Last-write-wins</p>
							<p class="text-[11px] text-slate-500">Keep both if clash; mark conflicted.</p>
						</div>
						<div class="rounded-xl border border-white/10 bg-white/5 p-3">
							<p class="text-[10px] uppercase tracking-[0.2em] text-slate-500">Reminders</p>
							<p class="text-sm font-semibold text-slate-100">Local fire</p>
							<p class="text-[11px] text-slate-500">Schedule locally; sync metadata.</p>
						</div>
					</div>
				</div>

				<div v-else class="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 text-sm text-slate-500">
					Create a note to get started.
				</div>
			</main>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

type Note = {
	id: string;
	title: string;
	content: string;
	tags: string[];
	pinned: boolean;
	createdAt: string;
	updatedAt: string;
	deletedAt?: string;
	version: number;
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
});

const notes = ref<Note[]>([
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
]);

const selectedNoteId = ref<string | null>(notes.value[0]?.id ?? null);
const searchTerm = ref("");
const tagFilter = ref<string | null>(null);
const tagInput = ref("");
const unsyncedCount = ref(0);
const isEditing = ref(false);

const activeNote = computed(() => notes.value.find((note) => note.id === selectedNoteId.value && !note.deletedAt) ?? null);

const filteredNotes = computed(() => {
	const term = searchTerm.value.trim().toLowerCase();
	return notes.value
		.filter((note) => !note.deletedAt)
		.filter((note) => {
			const matchesTerm = term
				? note.title.toLowerCase().includes(term) || note.content.toLowerCase().includes(term) || note.tags.some((tag) => tag.toLowerCase().includes(term))
				: true;
			const matchesTag = tagFilter.value ? note.tags.includes(tagFilter.value) : true;
			return matchesTerm && matchesTag;
		})
		.sort((a, b) => {
			if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
			return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
		});
});

const tagCloud = computed(() => {
	const tags = new Set<string>();
	notes.value
		.filter((note) => !note.deletedAt)
		.forEach((note) => note.tags.forEach((tag) => tags.add(tag)));
	return Array.from(tags).sort();
});

const markChange = () => {
	unsyncedCount.value += 1;
};

const selectNote = (id: string) => {
	selectedNoteId.value = id;
	tagInput.value = "";
	isEditing.value = true;
};

const exitEditing = () => {
	isEditing.value = false;
};


const createNote = () => {
	const note = seedNote("Untitled note", "", []);
	notes.value.unshift(note);
	selectedNoteId.value = note.id;
	isEditing.value = true;
	markChange();
};

const updateActive = (updater: (note: Note) => void) => {
	const note = activeNote.value;
	if (!note) return;
	updater(note);
	note.updatedAt = nowIso();
	note.version += 1;
	markChange();
};

const updateTitle = (value: string) => {
	updateActive((note) => {
		note.title = value;
	});
};

const updateContent = (value: string) => {
	updateActive((note) => {
		note.content = value;
	});
};

const togglePin = (id: string) => {
	updateActive((note) => {
		if (note.id !== id) return;
		note.pinned = !note.pinned;
	});
};

const addTag = () => {
	const value = tagInput.value.trim();
	if (!value) return;
	updateActive((note) => {
		if (!note.tags.includes(value)) {
			note.tags.push(value);
		}
	});
	tagInput.value = "";
};

const onTagKeydown = (event: KeyboardEvent) => {
	if (event.key === "Enter" || event.key === ",") {
		event.preventDefault();
		addTag();
	}
};

const removeTag = (tag: string) => {
	updateActive((note) => {
		note.tags = note.tags.filter((current) => current !== tag);
	});
};

const deleteNote = (id: string) => {
	const note = notes.value.find((item) => item.id === id);
	if (!note) return;
	note.deletedAt = nowIso();
	markChange();
	const next = filteredNotes.value.find((item) => item.id !== id);
	selectedNoteId.value = next?.id ?? null;
	if (!next) {
		isEditing.value = false;
	}
};

const setTagFilter = (tag: string | null) => {
	tagFilter.value = tag;
};

const formatDate = (timestamp: string) => new Date(timestamp).toLocaleString();

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