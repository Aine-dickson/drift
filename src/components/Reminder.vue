<template>
    
	<div
		v-if="remindersStore.isSheetOpen"
		class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 px-3 py-6"
	>
		<div class="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl md:max-w-lg md:p-6">
			<div class="flex items-center justify-between">
				<div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Reminder</p>
                    <p class="text-sm text-slate-300">
						{{ remindersStore.selectedReminderId === 'new' ? 'New reminder' : 'Editing existing' }}
                    </p>
				</div>
				<button class="text-slate-400 hover:text-slate-200" @click="remindersStore.closeSheet">✕</button>
			</div>

			<div v-if="notesStore.getActiveNote()?.reminders?.length" class="mt-3 flex flex-col gap-2 text-sm">
				<label class="text-xs text-slate-400">Choose reminder</label>
				<select
					class="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
					:value="remindersStore.selectedReminderId ?? reminderState?.targetId ?? notesStore.getActiveNote()?.reminders?.[0]?.id"
					@change="(event) => remindersStore.openSheet((event.target as HTMLSelectElement).value)"
				>
					<option v-for="rem in notesStore.getActiveNote()?.reminders" :key="rem.id" :value="rem.id">
						{{ formatReminderShort(rem.at) }}
					</option>
				</select>
			</div>

			<div class="mt-4 flex flex-wrap gap-2 text-sm">
				<button class="rounded-full border border-white/10 px-3 py-1 hover:border-emerald-400" @click="remindersStore.setQuickReminder(0)">Today</button>
				<button class="rounded-full border border-white/10 px-3 py-1 hover:border-emerald-400" @click="remindersStore.setQuickReminder(1)">Tomorrow</button>
				<button class="rounded-full border border-white/10 px-3 py-1 hover:border-emerald-400" @click="remindersStore.setQuickReminder(3)">In 3 days</button>
				<button
					v-if="(notesStore.getActiveNote()?.reminders?.length ?? 0) > 0"
					class="rounded-full border border-dashed border-emerald-400/60 px-3 py-1 text-emerald-200 hover:border-emerald-300"
					@click="remindersStore.openSheet('new')"
				>
					Add another
				</button>
			</div>

			<div class="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
				<label class="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
					<span class="text-xs text-slate-400">Date</span>
					<input
						v-model="remindersStore.reminderForm.date"
						class="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
						type="date"
						:min="remindersStore.dateMin"
						@change="remindersStore.enforceReminderMin"
					/>
				</label>
				<label class="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
					<span class="text-xs text-slate-400">Time</span>
					<input
						v-model="remindersStore.reminderForm.time"
						class="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
						type="time"
						:min="remindersStore.reminderForm.date === remindersStore.dateMin ? remindersStore.timeMin : undefined"
						@change="remindersStore.enforceReminderMin"
					/>
				</label>
			</div>

			<div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
				<p class="text-xs text-slate-400">Repeat</p>
				<div class="mt-2 flex flex-wrap gap-2">
					<label v-for="option in repeatOptions" :key="option.value" class="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-slate-100 transition hover:border-emerald-400">
						<input
							v-model="remindersStore.reminderForm.repeat"
							:value="option.value"
							class="accent-emerald-400"
							name="repeat"
							type="radio"
						/>
						<span>{{ option.label }}</span>
					</label>
				</div>
			</div>

			<div class="mt-4 flex items-center justify-between text-sm">
				<div class="flex gap-2" v-if="(notesStore.getActiveNote()?.reminders?.length ?? 0) > 0 && remindersStore.selectedReminderId !== 'new' && remindersStore.selectedReminderId">
					<button
						class="rounded-full border border-white/10 px-3 py-1 text-slate-200 transition hover:border-emerald-400 disabled:opacity-50"
						@click="toggleReminderDone"
					>
						{{ notesStore.getActiveNote()?.reminders?.find((r) => r.id === remindersStore.selectedReminderId)?.done ? 'Mark not done' : 'Mark done' }}
					</button>
					<button class="text-slate-400 hover:text-slate-200" @click="removeReminder">Remove</button>
				</div>
				<div class="flex gap-2">
					<button class="rounded-xl border border-white/10 px-4 py-2 text-slate-200 hover:border-slate-300" @click="remindersStore.closeSheet">Cancel</button>
					<button class="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400" @click="saveReminder">Save</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRemindersStore } from "../stores/useReminders";
import { useNotesStore, getReminderState } from "../stores/useNotes";

const remindersStore = useRemindersStore();
const notesStore = useNotesStore();

const repeatOptions = [
	{ value: "none" as const, label: "None" },
	{ value: "daily" as const, label: "Daily" },
	{ value: "weekly" as const, label: "Weekly" },
	{ value: "monthly" as const, label: "Monthly" },
];

const reminderState = computed(() => {
	const active = notesStore.getActiveNote();
	return active ? getReminderState(active) : null;
});

const formatReminderShort = (iso: string) =>
	new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });

const saveReminder = () => void remindersStore.saveReminder();
const removeReminder = () => void remindersStore.removeReminder();
const toggleReminderDone = () => void remindersStore.toggleReminderDone();

onMounted(() => {
	remindersStore.syncFromActive();
	watch(
		() => [remindersStore.reminderForm.date, remindersStore.reminderForm.time],
		() => {
			remindersStore.enforceReminderMin();
		},
		{ immediate: true },
	);
	watch(
		() => remindersStore.isSheetOpen,
		(open) => {
			if (open) remindersStore.syncFromActive();
		},
		{ immediate: false },
	);
	void remindersStore.requestPermission();
});
</script>