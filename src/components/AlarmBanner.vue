<template>
  <div
    v-if="active"
    class="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full border border-amber-300/60 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 shadow-lg backdrop-blur"
  >
    <span>Reminder alarm ringing</span>
    <button
      class="rounded-full border border-amber-200/60 bg-amber-400 px-3 py-1 font-semibold text-slate-900 shadow hover:bg-amber-300"
      @click="stop"
    >
      Stop
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ active: boolean; onStop: () => void }>();

const stop = () => props.onStop();
</script>
