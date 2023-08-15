<script setup>
import {ref, watch} from 'vue'
import PrismEditor from '@/components/PrismEditor.vue'
import { highlight, languages } from "prismjs/components/prism-core"
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const lineNumbersRef = ref(true)
const readonlyRef = ref(false)

function highlighter(code) {
  return highlight(code, languages.js)
}

function f() {

}
</script>

<template>
  <prism-editor
      class="my-editor"
      :value="props.content"
      :highlight="highlighter"
      :line-numbers="lineNumbersRef"
      :readonly="readonlyRef"></prism-editor>
</template>

<style scoped>
.my-editor {
  background: #2d2d2d;
  color: #ccc;
  font-family: Fira code, Fira Mono, Consolas, Menlo, Courier, monospace;
  font-size: 18px;
  line-height: 1.5;
  padding: 5px;
  /*height: calc(100vh - 92px);*/
  width: 99%;
}

/* optional */
.prism-editor__textarea:focus {
  outline: none !important;
}
</style>
