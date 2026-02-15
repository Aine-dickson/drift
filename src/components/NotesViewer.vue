<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ html: string }>();

const allowed = new Set([
  "strong", "em", "u",
  "ul", "ol", "li",
  "p", "br",
  "h1", "h2", "h3",
  "span"
]);

const sanitized = computed(() => {
  const tpl = document.createElement("template");
  tpl.innerHTML = props.html || "";

  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_ELEMENT);
  const remove: Element[] = [];

  while (walker.nextNode()) {
    const el = walker.currentNode as Element;
    if (!allowed.has(el.tagName.toLowerCase())) {
      remove.push(el);
    } else {
      [...el.attributes].forEach(a => el.removeAttribute(a.name));
    }
  }

  remove.forEach(n => n.replaceWith(...n.childNodes));
  return tpl.innerHTML;
});
</script>

<template>
  <div
    class="
      prose prose-invert max-w-none
      break-words overflow-wrap-anywhere
    "
    v-html="sanitized"
  />
</template>
