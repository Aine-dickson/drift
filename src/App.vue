<template>
	<div class="min-h-screen overflow-hidden bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
		<div class="mx-auto max-h-dvh h-dvh max-w-6xl xl:max-w-full grid grid-cols-1 md:grid-cols-[min-content_1fr] lg:grid-cols-[min-content_1fr_min-content] grid-rows-1 justify-center gap-4 lg:gap-6 px-4 md:py-2">
			<SidebarPanel />
			<EditorPanel />
			<SettingsPanel class="hidden lg:block" :ensureAutostart="ensureAutostart" :stopAlarmSound="stopAlarmSound" />
		</div>
	</div>


	<SettingsSheet
		:open="uiStore.isSettingsOpen"
		:onClose="uiStore.closeSettings"
		:ensureAutostart="ensureAutostart"
		:stopAlarmSound="stopAlarmSound"
	/>

	<Reminder />

	<AlarmBanner :active="alarmActive" :onStop="stopAlarmSound" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { listen } from "@tauri-apps/api/event";
import { enable as enableAutostart, isEnabled as isAutostartEnabled } from "@tauri-apps/plugin-autostart";
import { useNotesStore } from "./stores/useNotes";
import { useUiStore } from "./stores/useUi";
import { useRemindersStore } from "./stores/useReminders";
import SettingsPanel from "./components/SettingsPanel.vue";
import SettingsSheet from "./components/SettingsSheet.vue";
import AlarmBanner from "./components/AlarmBanner.vue";
import SidebarPanel from "./components/SidebarPanel.vue";
import EditorPanel from "./components/EditorPanel.vue";
import Reminder from "./components/Reminder.vue";

const notesStore = useNotesStore();
const uiStore = useUiStore();
const remindersStore = useRemindersStore();

const stopAlarm = ref<(() => void) | null>(null);
const reminderUnlisten = ref<(() => void) | null>(null);
const alarmActive = ref(false);
const alarmInterval = ref<number | null>(null);
const playAlarm = () => {
	// Stop any existing alarm before starting a new one
	if (stopAlarm.value) stopAlarm.value();

	const ctx = new AudioContext();
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.type = "sine";
	osc.frequency.value = 880;

	gain.gain.setValueAtTime(0.0, ctx.currentTime);
	osc.connect(gain).connect(ctx.destination);
	osc.start();

	const interval = window.setInterval(() => {
		const now = ctx.currentTime;
		gain.gain.cancelScheduledValues(now);
		gain.gain.setValueAtTime(0.25, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
	}, 700);

	const stop = () => {
		try {
			gain.gain.cancelScheduledValues(ctx.currentTime);
			gain.gain.setValueAtTime(0.0, ctx.currentTime);
			osc.stop();
			ctx.close();
		} catch (_) {
			/* noop */
		}
		if (alarmInterval.value !== null) {
			clearInterval(alarmInterval.value);
			alarmInterval.value = null;
		}
		stopAlarm.value = null;
		alarmActive.value = false;
	};

	alarmInterval.value = interval;
	stopAlarm.value = stop;
	alarmActive.value = true;
};

const stopAlarmSound = () => {
	if (stopAlarm.value) stopAlarm.value();
};

const ensureAutostart = async () => {
	try {
		const enabled = await isAutostartEnabled();
		if (!enabled) {
			await enableAutostart();
		}
	} catch (_) {
		// Autostart might be unavailable on some platforms; ignore failures.
	}
};

const focusHotkeyHandler = (event: KeyboardEvent) => {
	if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "f") {
		event.preventDefault();
		uiStore.toggleFocusMode();
	}
};


onMounted(async () => {
	await notesStore.init();

	if (!notesStore.selectedNoteId && notesStore.notes[0]) {
		notesStore.select(notesStore.notes[0].id);
	}

	await notesStore.persist();

	await remindersStore.requestPermission();
	if (remindersStore.notificationReady) {
		await remindersStore.rehydrateAll();
	}

	window.addEventListener("keydown", focusHotkeyHandler);

	const unlisten = await listen("reminder_fired", playAlarm);
	reminderUnlisten.value = unlisten;

	ensureAutostart();
});

onBeforeUnmount(() => {
	window.removeEventListener("keydown", focusHotkeyHandler);
	if (reminderUnlisten.value) reminderUnlisten.value();
	stopAlarmSound();
});
</script>