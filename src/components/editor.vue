<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from "vue";

const props = defineProps<{
    modelValue: string;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
}>();

const editorRef = useTemplateRef("editor");

/* ---------- Selection helpers ---------- */

function getRange(): Range | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    return sel.getRangeAt(0);
}

function wrap(tag: keyof HTMLElementTagNameMap) {
    const range = getRange();
    if (!range || range.collapsed) return;

    const el = document.createElement(tag);
    el.appendChild(range.extractContents());
    range.insertNode(el);

    sync();
}

function heading(level: 1 | 2 | 3) {
    const range = getRange();
    if (!range) return;

    const h = document.createElement(`h${level}`);
    h.textContent = range.toString();

    range.deleteContents();
    range.insertNode(h);

    sync();
}

function list(type: "ul" | "ol") {
    const range = getRange();
    if (!range) return;

    const lines = range.toString().split("\n");
    const root = document.createElement(type);

    lines.forEach(l => {
        if (!l.trim()) return;
        const li = document.createElement("li");
        li.textContent = l;
        root.appendChild(li);
    });

    range.deleteContents();
    range.insertNode(root);

    sync();
}

/* ---------- syncing ---------- */

function sync() {
    if (!editorRef.value) return;
    emit("update:modelValue", editorRef.value.innerHTML);
}

onMounted(() => {
    watch(
        () => props.modelValue,
        value => {
            console.log("syncing from prop", { value });
            console.log("Thus: ", editorRef.value)
            if (!editorRef.value) return;
            console.log("halooo")
            console.log("current editor html", { html: editorRef.value?.innerHTML });
            if (editorRef.value.innerHTML !== value) {
                editorRef.value.innerHTML = value || "";
            }
        },
        { immediate: true, flush: "post" },
    );
})
</script>

<template>
    <div class="flex flex-col gap-2 h-full">
        <!-- toolbar -->
        <div class="flex flex-wrap space-x-2 text-xs px-2 py-1 items-center bg-slate-800">
            <button @click="wrap('strong')">
                <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 5h4.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0-7H6m2 7h6.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0 0H6" />
                </svg>
            </button>
            <button @click="wrap('em')">
                <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="m8.874 19 6.143-14M6 19h6.33m-.66-14H18" />
                </svg>
            </button>
            <button @click="wrap('u')">
                <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                        d="M6 19h12M8 5v9a4 4 0 0 0 8 0V5M6 5h4m4 0h4" />
                </svg>
            </button>
            <button @click="heading(1)">H1</button>
            <button @click="heading(2)">H2</button>
            <button @click="heading(3)">H3</button>
            <button @click="list('ul')"><svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                        d="M9 8h10M9 12h10M9 16h10M4.99 8H5m-.02 4h.01m0 4H5" />
                </svg>
            </button>
            <button @click="list('ol')">
                <svg class="w-6 h-5 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 6h8m-8 6h8m-8 6h8M4 16a2 2 0 1 1 3.321 1.5L4 20h5M4 5l2-1v6m-2 0h4" />
                </svg>
            </button>
        </div>

        <!-- surface -->
        <div ref="editor" contenteditable
            class="flex-1 p-4 rounded-xl outline-none overflow-y-auto wrap-break-word overflow-wrap-anywhere whitespace-pre-wrap"
            @input="sync" />
    </div>
</template>
