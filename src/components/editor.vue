<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from "vue";

const props = defineProps<{
    modelValue: string;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
}>();

const editorRef = useTemplateRef("editor");

const ensureBlockWrapper = () => {
    if (!editorRef.value) return;
    if (editorRef.value.childNodes.length === 0) {
        const p = document.createElement("p");
        p.innerHTML = "";
        editorRef.value.appendChild(p);
    }
};

/* ---------- Selection helpers ---------- */

function getRange(): Range | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    return sel.getRangeAt(0);
}

const stripTag = (fragment: DocumentFragment, tag: string) => {
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT, null);
    const toUnwrap: Element[] = [];
    while (walker.nextNode()) {
        const node = walker.currentNode as Element;
        if (node.tagName.toLowerCase() === tag.toLowerCase()) {
            toUnwrap.push(node);
        }
    }
    toUnwrap.forEach((el) => {
        while (el.firstChild) {
            el.parentNode?.insertBefore(el.firstChild, el);
        }
        el.parentNode?.removeChild(el);
    });
};

function wrap(tag: keyof HTMLElementTagNameMap) {
    const range = getRange();
    if (!range || range.collapsed) return;

    const frag = range.extractContents();
    const sole = frag.childNodes.length === 1 ? frag.childNodes[0] : null;
    const soleEl = sole instanceof HTMLElement ? sole : null;
    const isExactSame = soleEl && soleEl.tagName.toLowerCase() === tag.toLowerCase();

    if (isExactSame) {
        while (soleEl.firstChild) {
            range.insertNode(soleEl.firstChild);
        }
    } else {
        stripTag(frag, tag);
        const el = document.createElement(tag);
        el.appendChild(frag);
        range.insertNode(el);
    }

    sync();
}

function heading(level: 1 | 2 | 3) {
    const range = getRange();
    if (!range) return;

    // Normalize to element
    const container =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? range.commonAncestorContainer as Element
            : range.commonAncestorContainer.parentElement;

    if (!container) return;

    const targetTag = `h${level}`;
    const currentHeading = container.closest("h1, h2, h3");

    // 🔁 TOGGLE OFF: same heading level
    if (currentHeading && currentHeading.tagName.toLowerCase() === targetTag) {
        const p = document.createElement("p");

        while (currentHeading.firstChild) {
            p.appendChild(currentHeading.firstChild);
        }

        currentHeading.replaceWith(p);
        sync();
        return;
    }

    // 🔄 REPLACE: different heading level
    if (currentHeading) {
        const h = document.createElement(targetTag);
        h.classList.add(`heading-${level}`);

        while (currentHeading.firstChild) {
            h.appendChild(currentHeading.firstChild);
        }

        currentHeading.replaceWith(h);
        sync();
        return;
    }

    // ➕ APPLY: wrap selection
    if (!range.collapsed) {
        const frag = range.extractContents();

        stripTag(frag, "h1");
        stripTag(frag, "h2");
        stripTag(frag, "h3");

        const h = document.createElement(targetTag);
        h.classList.add(`heading-${level}`);
        h.appendChild(frag);

        range.insertNode(h);
    }

    sync();
}


function list(type: "ul" | "ol") {
    const range = getRange();
    if (!range) return;

    // Normalize to element
    const container =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? range.commonAncestorContainer as Element
            : range.commonAncestorContainer.parentElement;

    if (!container) return;

    const currentList = container.closest("ul, ol");

    /* 🔁 TOGGLE OFF: same list type */
    if (currentList && currentList.tagName.toLowerCase() === type) {
        const frag = document.createDocumentFragment();

        currentList.querySelectorAll("li").forEach(li => {
            const p = document.createElement("p");
            while (li.firstChild) {
                p.appendChild(li.firstChild);
            }
            frag.appendChild(p);
        });

        currentList.replaceWith(frag);
        sync();
        return;
    }

    /* 🔄 REPLACE: different list type */
    if (currentList && currentList.tagName.toLowerCase() !== type) {
        const newList = document.createElement(type);
        newList.style.listStyleType = type === "ol" ? "decimal" : "disc";
        newList.style.paddingLeft = "1.5rem";
        newList.style.margin = "0.25rem 0";

        while (currentList.firstChild) {
            newList.appendChild(currentList.firstChild);
        }

        currentList.replaceWith(newList);
        sync();
        return;
    }

    /* ➕ APPLY: create new list from selection */
    if (!range.collapsed) {
        const lines = range.toString().split("\n").filter(l => l.trim());

        if (!lines.length) return;

        const list = document.createElement(type);
        list.style.listStyleType = type === "ol" ? "decimal" : "disc";
        list.style.paddingLeft = "1.5rem";
        list.style.margin = "0.25rem 0";

        lines.forEach(line => {
            const li = document.createElement("li");
            li.textContent = line;
            list.appendChild(li);
        });

        range.deleteContents();
        range.insertNode(list);
    }

    sync();
}


/* ---------- syncing ---------- */

function sync() {
    if (!editorRef.value) return;
    emit("update:modelValue", editorRef.value.innerHTML);
}

onMounted(() => {
    ensureBlockWrapper();
    watch(
        () => props.modelValue,
        value => {
            console.log("syncing from prop", { value });
            if (!editorRef.value) return;
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
    <div class="flex flex-col h-full w-full">
        <!-- toolbar -->
        <div class="flex flex-wrap space-x-2 text-xs px-2 py-1 items-center bg-slate-800">
            <button @click="wrap('strong')" class="cursor-pointer">
                <svg class="w-5 h-5 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 5h4.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0-7H6m2 7h6.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0 0H6" />
                </svg>
            </button>
            <button @click="wrap('em')" class="cursor-pointer">
                <svg class="w-5 h-5 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="m8.874 19 6.143-14M6 19h6.33m-.66-14H18" />
                </svg>
            </button>
            <button @click="wrap('u')" class="cursor-pointer">
                <svg class="w-5 h-5 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                        d="M6 19h12M8 5v9a4 4 0 0 0 8 0V5M6 5h4m4 0h4" />
                </svg>
            </button>

            <button @click="heading(1)" class="text-[1rem] cursor-pointer">H1</button>
            <button @click="heading(2)" class="text-[1rem] cursor-pointer">H2</button>
            <button @click="heading(3)" class="text-[1rem] cursor-pointer">H3</button>

            <button @click="list('ul')" class="cursor-pointer">
                <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                        d="M9 8h10M9 12h10M9 16h10M4.99 8H5m-.02 4h.01m0 4H5" />
                </svg>
            </button>

            <button @click="list('ol')" class="cursor-pointer">
                <svg class="w-6 h-5 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 6h8m-8 6h8m-8 6h8M4 16a2 2 0 1 1 3.321 1.5L4 20h5M4 5l2-1v6m-2 0h4" />
                </svg>
            </button>
        </div>

        <!-- surface -->
        <div ref="editor" contenteditable
            class="flex-1 w-full min-w-0 p-2 overflow-hidden rounded-xl outline-none overflow-y-auto wrap-break-word whitespace-pre-wrap"
            @input="sync" />
    </div>
</template>

<style scoped>
@reference 'tailwindcss';

:global(.heading-1) {
    @apply text-3xl font-extrabold leading-tight my-2;
}

:global(.heading-2) {
    @apply text-2xl font-bold leading-tight my-2;
}

:global(.heading-3) {
    @apply text-xl font-semibold leading-tight my-1;
}
</style>