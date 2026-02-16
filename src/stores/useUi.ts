import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { readSettingsSnapshot, writeSettingsSnapshot } from "../lib/db";

export const useUiStore = defineStore("ui", () => {
    // search & filters
    const searchTerm = ref("");
    const tagFilter = ref<string | null>(null);
    const tagInput = ref("");

    // editing state
    const isEditing = ref(false);
    const editingContent = ref(false);
    const isInfoOpen = ref(false);

    // UI modes
    const focusMode = ref(false);
    const isSettingsOpen = ref(false);
    const isInitialSetup = ref(false);

    const toggleInfo = (action?: "open" | "close") => {
        if (action === "open") {
            isInfoOpen.value = true;
        } else if (action === "close") {
            isInfoOpen.value = false;
        } else {
            isInfoOpen.value = !isInfoOpen.value;
        }
    };

    // persistence helpers
    const persistSettings = async () => {
        await writeSettingsSnapshot({
            isInitialSetup: isInitialSetup.value,
            focusMode: focusMode.value,
            isSettingsOpen: isSettingsOpen.value,
        });
    };

    const toggleInitialSetup = (value: boolean) => {
        isInitialSetup.value = value;
    }

    const hydrateSettings = async () => {
        const snapshot = await readSettingsSnapshot();
        if (!snapshot) return;
        if (typeof snapshot.isInitialSetup === "boolean") isInitialSetup.value = snapshot.isInitialSetup;
        if (typeof snapshot.focusMode === "boolean") focusMode.value = snapshot.focusMode;
        if (typeof snapshot.isSettingsOpen === "boolean") isSettingsOpen.value = snapshot.isSettingsOpen;
    };

    void hydrateSettings();

    watch(
        () => ({ isInitialSetup: isInitialSetup.value, focusMode: focusMode.value, isSettingsOpen: isSettingsOpen.value }),
        () => { void persistSettings(); },
    );

    // --- actions ---
    const setSearchTerm = (value: string) => {
        searchTerm.value = value;
        toggleInfo("close");
    };

    const setTagFilter = (value: string | null) => {
        tagFilter.value = value;
        toggleInfo("close");
    };

    const setTagInput = (value: string) => {
        tagInput.value = value;
        toggleInfo("close");
    };

    const startEditing = () => {
        isEditing.value = true;
        toggleInfo("close");
    };

    const stopEditing = () => {
        isEditing.value = false;
        toggleInfo("close");
    };

    const setEditingContent = (value: boolean) => {
        editingContent.value = value;
        toggleInfo("close");
    };

    const toggleFocusMode = () => {
        focusMode.value = !focusMode.value;
        toggleInfo("close");
    };

    const openSettings = () => {
        isSettingsOpen.value = true;
        toggleInfo("close");
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
        isInfoOpen,

        // actions
        toggleInitialSetup,
        setSearchTerm,
        setTagFilter,
        setTagInput,
        startEditing,
        stopEditing,
        setEditingContent,
        toggleFocusMode,
        openSettings,
        closeSettings,
        toggleInfo,
    };
}, {
    persist: false,
});
