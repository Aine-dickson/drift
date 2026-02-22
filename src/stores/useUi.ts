import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { readSettingsSnapshot, writeSettingsSnapshot } from "../lib/db";

export const useUiStore = defineStore("ui", () => {
    // search & filters
    const searchTerm = ref("");
    const tagFilter = ref<string[]>([]);
    const tagInput = ref("");
    const activeView = ref<"sidebar" | "editor" | "settings" | "reminder">("sidebar");
    const isSmall = ref(false);
    const isMedium = ref(false);

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

    const setTagFilter = (value?: string) => {
        toggleInfo("close");
        if(!value) {
            tagFilter.value = [];
            return;
        }
        if(tagFilter.value.includes(value)) {
            tagFilter.value = tagFilter.value.filter(tag => tag !== value);
        } else {
            tagFilter.value = [...tagFilter.value, value];
        }
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
        activeView.value = 'settings'
        toggleInfo("close");
    };

    const closeSettings = () => {
        isSettingsOpen.value = false;
    };

    const setView = (view: "sidebar" | "editor" | "settings" | "reminder") => {
        activeView.value = view;
    }

    const bindViewport = () => {
        if (typeof window === "undefined") return () => {};

        // Tailwind breakpoints: md >= 768, lg >= 1024
        const mqlSmall = window.matchMedia("(max-width: 767px)");
        const mqlLarge = window.matchMedia("(min-width: 1024px)");

        const update = () => {
            isSmall.value = mqlSmall.matches;
            isMedium.value = !mqlSmall.matches && !mqlLarge.matches;
        };

        update();

        const handler = () => update();
        const hasAddEvent = typeof mqlSmall.addEventListener === "function" && typeof mqlLarge.addEventListener === "function";

        if (hasAddEvent) {
            mqlSmall.addEventListener("change", handler);
            mqlLarge.addEventListener("change", handler);
        } else {
            window.addEventListener("resize", handler);
        }

        return () => {
            if (hasAddEvent) {
                mqlSmall.removeEventListener("change", handler);
                mqlLarge.removeEventListener("change", handler);
            } else {
                window.removeEventListener("resize", handler);
            }
        };
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
        activeView,
        isSmall,
        isMedium,

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
        bindViewport,
        setView
    };
}, {
    persist: true,
});
