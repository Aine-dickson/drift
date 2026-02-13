import { defineStore } from "pinia";
import { ref } from "vue";

export const useUiStore = defineStore("ui", () => {
    const searchTerm = ref("");
    const tagFilter = ref<string | null>(null);
    const isEditing = ref(false);
    const focusMode = ref(false);
    const editingContent = ref(false);
    const tagInput = ref("");
    const isSettingsOpen = ref(false);
    const isInitialSetup = ref(false);

    const setSearchTerm = (value: string) => {
        searchTerm.value = value;
    }

    const setTagFilter = (value: string | null) => {
        tagFilter.value = value;
    }

    const startEditing = () => {
        isEditing.value = true;
    }

    const closeEditing = () => {
        isEditing.value = false;
    }

    const stopEditing = () => {
        isEditing.value = false;
    }

    const setEditingContent = (value: boolean) => {
        editingContent.value = value;
    }

    const toggleFocusMode = () => {
        focusMode.value = !focusMode.value;
    }

    const setTagInput = (value: string) => {
        tagInput.value = value;
    }

    const openSettings = () => {
        isSettingsOpen.value = true;
    }

    const closeSettings = () => {
        isSettingsOpen.value = false;
    }

        return {
        searchTerm,
        setSearchTerm,
        tagFilter,
        setTagFilter,
        isEditing,
        startEditing,
        closeEditing,
        stopEditing,
        editingContent,
        setEditingContent,
        focusMode,
        toggleFocusMode,
        tagInput,
        setTagInput,
        isSettingsOpen,
        openSettings,
        closeSettings,
        isInitialSetup
    }
});
