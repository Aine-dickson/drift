<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 lg:hidden"
  >
    <div class="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Settings</p>
          <p class="text-sm text-slate-200">Stay notified</p>
        </div>
        <button class="text-slate-400 hover:text-slate-200" @click="close">✕</button>
      </div>
      <div class="mt-4 space-y-3 text-sm text-slate-200">
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <p class="text-xs text-slate-400">Autostart</p>
          <p class="text-[13px] text-slate-300 mt-1">Launch Drift on login so reminders stay alive.</p>
          <button
            class="mt-2 w-full rounded-lg border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 hover:border-emerald-300"
            @click="ensureAutostart"
          >
            Enable / refresh
          </button>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <p class="text-xs text-slate-400">Alarm</p>
          <p class="text-[13px] text-slate-300">Alarms loop until you hit Stop.</p>
          <button
            class="w-full rounded-lg border border-amber-300/60 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 hover:border-amber-200"
            @click="stopAlarmSound"
          >
            Stop current alarm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean; onClose: () => void; ensureAutostart: () => void; stopAlarmSound: () => void }>();

const close = () => props.onClose();
const ensureAutostart = () => props.ensureAutostart();
const stopAlarmSound = () => props.stopAlarmSound();
</script>
