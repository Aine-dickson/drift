<template>
    <aside class="flex overflow-y-auto thin-scroll flex-col gap-4 md:rounded-2xl md:border border-white/10
           bg-white/5 p-4 shadow-xl backdrop-blur h-full lg:w-72">
        
        <!-- Header -->
         <div v-if="uiStore.isSmall" class="mb-2 flex items-center space-x-2">
                <button class="py-1 text-sm cursor-pointer text-slate-100 hover:border-emerald-400"
                    @click="uiStore.setView('sidebar')">
                    <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12l4-4m-4 4 4 4"/>
                    </svg>
                </button>
                <span class="text-lg uppercase">Settings</span>
            </div>
        <div v-else>
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Settings</p>
            <p class="text-sm text-slate-200">Quiet, local, intentional</p>
        </div>

        <!-- System -->
        <section class="space-y-3">
            <p class="text-xs uppercase tracking-wide text-slate-400">System</p>

            <SettingToggle label="Autostart" description="Launch Drift on login so reminders stay alive."
                :enabled="settings.autostart" @toggle="toggleAutostart" />

            <SettingToggle label="Run in background" description="Keep Drift running when the window is closed."
                :enabled="settings.background" @toggle="toggleBackground" />
        </section>

        <!-- Sync -->
        <section class="space-y-3">
            <p class="text-xs uppercase tracking-wide text-slate-400">Sync</p>

            <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                <p class="text-sm text-slate-200">Sync mode</p>
                <p class="text-[13px] text-slate-400">
                    Lazy sync happens automatically when idle or reconnected.
                </p>

                <select v-model="settings.syncMode"
                    class="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm">
                    <option value="lazy">Lazy (recommended)</option>
                    <option value="manual">Manual only</option>
                </select>
            </div>

            <SettingToggle label="Show sync status" description="Display pending changes in the editor header."
                :enabled="settings.showSyncBadge" @toggle="() => settings.showSyncBadge = !settings.showSyncBadge" />
        </section>

        <!-- Editor -->
        <section class="space-y-3">
            <p class="text-xs uppercase tracking-wide text-slate-400">Editor</p>

            <SettingToggle label="Focus mode" description="Hide metadata and cards while typing."
                :enabled="settings.focusMode" @toggle="() => settings.focusMode = !settings.focusMode" />

            <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                <p class="text-sm text-slate-200">Font size</p>
                <select v-model="settings.fontSize"
                    class="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm">
                    <option value="sm">Small</option>
                    <option value="md">Normal</option>
                    <option value="lg">Large</option>
                </select>
            </div>
        </section>

        <!-- Reminders -->
        <section class="space-y-3">
            <p class="text-xs uppercase tracking-wide text-slate-400">Reminders</p>

            <SettingToggle label="Alarm sound" description="Play sound when a reminder fires."
                :enabled="settings.alarmSound" @toggle="() => settings.alarmSound = !settings.alarmSound" />

            <button class="w-full rounded-lg border border-red-400/50 bg-red-500/10
               px-3 py-2 text-sm font-semibold text-red-200 hover:border-red-300" @click="stopAlarmSound">
                Stop current alarm
            </button>
        </section>
    </aside>
</template>

<script lang="ts">
/**
 * Extend Window type to include Tauri API
 */
declare global {
    interface Window {
        __TAURI__?: {
            invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
    }
}
</script>

<script setup lang="ts" vapor>
import { reactive, watch } from "vue";
import { useUiStore } from "../stores/useUi";

const uiStore = useUiStore();

/**
 * Local-first settings model
 */
type Settings = {
    autostart: boolean;
    background: boolean;

    syncMode: "lazy" | "manual";
    showSyncBadge: boolean;

    focusMode: boolean;
    fontSize: "sm" | "md" | "lg";

    alarmSound: boolean;
};

const settings = reactive<Settings>({
    autostart: false,
    background: true,

    syncMode: "lazy",
    showSyncBadge: true,

    focusMode: false,
    fontSize: "md",

    alarmSound: true,
});

/**
 * OS / platform hooks (Tauri)
 */
const toggleAutostart = async () => {
    settings.autostart = !settings.autostart;
    await window.__TAURI__?.invoke("set_autostart", {
        enabled: settings.autostart,
    });
};

const toggleBackground = () => {
    settings.background = !settings.background;
};

/**
 * Alarm control
 */
const stopAlarmSound = () => {
    window.dispatchEvent(new CustomEvent("drift:stop-alarm"));
};

/**
 * Persist locally (SQLite / file / kv)
 */
watch(
    settings,
    (value) => {
        localStorage.setItem("drift:settings", JSON.stringify(value));
    },
    { deep: true }
);
</script>
