<template>
    <div class="min-h-screen overflow-hidden bg-linear-to-br min-w-0 from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <!-- Small screens: single view -->
        <div v-if="uiStore.isSmall" class="max-h-dvh min-w-0 h-dvh grid grid-cols-1  grid-rows-1">
            <SidebarPanel v-if="uiStore.activeView === 'sidebar'" />
            <EditorPanel v-else-if="uiStore.activeView === 'editor'" />
            <SettingsPanel v-else-if="uiStore.activeView === 'settings'" :ensureAutostart="ensureAutostart"
                :stopAlarmSound="stopAlarmSound" />
            <Reminder v-else-if="uiStore.activeView === 'reminder'" :isSmall="uiStore.isSmall" />
        </div>

        <!-- Medium screens: Double view -->
        <div v-else-if="uiStore.isMedium"
            class="grid mx-auto max-h-dvh h-dvh max-w-6xl min-w-0 grid-cols-[min-content_1fr] grid-rows-1 justify-center gap-4 px-4 py-2">
            <SidebarPanel />
            <div class="h-full min-w-0">
                <EditorPanel v-if="uiStore.activeView === 'editor'" />
                <SettingsPanel v-if="uiStore.activeView === 'settings'" :ensureAutostart="ensureAutostart"
                    :stopAlarmSound="stopAlarmSound" />
            </div>
        </div>

        <!-- Large screens: full layout -->
        <div v-else
            class="grid mx-auto max-h-dvh h-dvh max-w-6xl xl:max-w-full grid-cols-[min-content_1fr_min-content] grid-rows-1 justify-center gap-6 px-4 py-2">
            <SidebarPanel />
            <EditorPanel />
            <SettingsPanel :ensureAutostart="ensureAutostart"
                :stopAlarmSound="stopAlarmSound" />
        </div>
    </div>

    <Reminder v-if="!uiStore.isSmall && remindersStore.isSheetOpen" :isSmall="uiStore.isSmall" />

    <AlarmBanner :active="alarmActive" :onStop="stopAlarmSound" />
</template>

<script setup lang="ts" vapor>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { listen } from "@tauri-apps/api/event";
import { enable as enableAutostart, isEnabled as isAutostartEnabled } from "@tauri-apps/plugin-autostart";
import { useNotesStore } from "./stores/useNotes";
import { useUiStore } from "./stores/useUi";
import { useRemindersStore } from "./stores/useReminders";
import SettingsPanel from "./components/SettingsPanel.vue";
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

let unbindViewport: (() => void) | null = null;

onMounted(async () => {
    try {
        await notesStore.init();
    } catch (error) {
        console.error("Initialization error:", error);
        throw error; // Rethrow to prevent app from running in a broken state
    }

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
    unbindViewport = uiStore.bindViewport();

    ensureAutostart();

});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", focusHotkeyHandler);
    if (reminderUnlisten.value) reminderUnlisten.value();
    stopAlarmSound();
    unbindViewport?.();
});
</script>