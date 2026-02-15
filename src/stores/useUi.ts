import { defineStore } from "pinia";
import { ref } from "vue";

export const useUiStore = defineStore("ui", () => {
  // search & filters
  const searchTerm = ref("");
  const tagFilter = ref<string | null>(null);
  const tagInput = ref("");

  // editing state
  const isEditing = ref(false);
  const editingContent = ref(false);

  // UI modes
  const focusMode = ref(false);
  const isSettingsOpen = ref(false);
  const isInitialSetup = ref(false);

  // --- actions ---
  const setSearchTerm = (value: string) => {
    searchTerm.value = value;
  };

  const setTagFilter = (value: string | null) => {
    tagFilter.value = value;
  };

  const setTagInput = (value: string) => {
    tagInput.value = value;
  };

  const startEditing = () => {
    isEditing.value = true;
  };

  const stopEditing = () => {
    isEditing.value = false;
  };

  const setEditingContent = (value: boolean) => {
    editingContent.value = value;
  };

  const toggleFocusMode = () => {
    focusMode.value = !focusMode.value;
  };

  const openSettings = () => {
    isSettingsOpen.value = true;
  };

  const closeSettings = () => {
    isSettingsOpen.value = false;
  };

  return {
    // state
    searchTerm,
    tagFilter,
    tagInput,
    isEditing,
    editingContent,
    focusMode,
    isSettingsOpen,
    isInitialSetup,

    // actions
    setSearchTerm,
    setTagFilter,
    setTagInput,
    startEditing,
    stopEditing,
    setEditingContent,
    toggleFocusMode,
    openSettings,
    closeSettings,
  };
});
