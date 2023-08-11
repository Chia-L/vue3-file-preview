<script setup>
import Vue, { VNode } from 'vue';
import { ref, watch, computed, nextTick, onMounted } from 'vue'

const KEYCODE_ENTER = 13;
const KEYCODE_TAB = 9;
const KEYCODE_BACKSPACE = 8;
const KEYCODE_Y = 89;
const KEYCODE_Z = 90;
const KEYCODE_M = 77;
const KEYCODE_PARENS = 57;
const KEYCODE_BRACKETS = 219;
const KEYCODE_QUOTE = 222;
const KEYCODE_BACK_QUOTE = 192;
const KEYCODE_ESCAPE = 27;

const HISTORY_LIMIT = 100;
const HISTORY_TIME_GAP = 3000;

const isWindows = typeof window !== 'undefined' && navigator && /Win/i.test(navigator.platform);
const isMacLike = typeof window !== 'undefined' && navigator && /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);

const props = defineProps({
  lineNumbers: {
    type: Boolean,
    default: false,
  },
  autoStyleLineNumbers: {
    type: Boolean,
    default: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  value: {
    type: String,
    default: '',
  },
  highlight: {
    type: Function,
    required: true,
  },
  tabSize: {
    type: Number,
    default: 2,
  },
  insertSpaces: {
    type: Boolean,
    default: true,
  },
  ignoreTabKey: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: '',
  },
})
const emits = defineEmits(['input', 'keydown', 'blur'])

const captureRef = ref(true)
const historyRef = ref({
  stack: [],
  offset: -1,
})
const lineNumbersHeightRef = ref('20px')
const codeDataRef = ref('')
const textareaInsRef = ref(null)
const preInsRef = ref(null)

const isEmptyRef = computed(() => {
  return codeDataRef.value?.length === 0
})
const contentRef = computed(() => {
  const result = props.highlight(codeDataRef.value) + '<br />';
  return result;
})
const lineNumbersCountRef = computed(() => {
  const totalLines = codeDataRef.value.split(/\r\n|\n/).length;
  return totalLines;
})

watch(() => props.value, value => {
  if (!value) {
    codeDataRef.value = '';
  } else {
    codeDataRef.value = value;
  }
}, { immediate: true })

watch(contentRef, value => {
  if (props.lineNumbers) {
    nextTick(() => {
      setLineNumbersHeight();
    })
  }
}, { immediate: true })

watch(() => props.lineNumbers, value => {
  nextTick(() => {
    {
      styleLineNumbers();
      setLineNumbersHeight();
    }
  })
}, { immediate: true })

function setLineNumbersHeight() {
  lineNumbersHeightRef.value = getComputedStyle(preInsRef.value.$el).height;
}
function applyEdits(record) {
  // Save last selection state
  const last = historyRef.value.stack[historyRef.value.offset];

  if (last && textareaInsRef.value.$el) {
    historyRef.value.stack[historyRef.value.offset] = {
      ...last,
      selectionStart: textareaInsRef.value.$el.selectionStart,
      selectionEnd: textareaInsRef.value.$el.selectionEnd,
    }
  }
  // Save the changes
  recordChange(record);
  updateInput(record);
}
function styleLineNumbers() {
  if (!props.lineNumbers || !props.autoStyleLineNumbers) return
  const lineNumbers = document.querySelector('.prism-editor__line-numbers')
  const editorStyles = window.getComputedStyle(preInsRef.value.$el)
  nextTick(() => {
    const btlr = 'border-top-left-radius'
    const bblr = 'border-bottom-left-radius'
    if (!lineNumbers) return
    lineNumbers.style[btlr] = editorStyles[btlr]
    lineNumbers.style[bblr] = editorStyles[bblr]
    preInsRef.value.$el.style[btlr] = '0'
    preInsRef.value.$el.style[bblr] = '0'
    const stylesList = ['background-color', 'margin-top', 'padding-top', 'font-family', 'font-size', 'line-height']
    stylesList.forEach((style) => {
      lineNumbers.style[style] = editorStyles[style]
    })
    lineNumbers.style['margin-bottom'] = '-' + editorStyles['padding-top']
  })
}
function recordCurrentState() {
  if (!textareaInsRef.value.$el) return;
  // Save current state of the input
  const { value, selectionStart, selectionEnd } = textareaInsRef.value.$el;
  recordChange({
    value,
    selectionStart,
    selectionEnd,
  });
}
function recordChange(record, overwrite = false) {
  const { stack, offset } = historyRef.value

  if (stack.length && offset > -1) {
    // When something updates, drop the redo operations
    historyRef.value.stack = stack.slice(0, offset + 1);

    // Limit the number of operations to 100
    const count = historyRef.value.stack.length;

    if (count > HISTORY_LIMIT) {
      const extras = count - HISTORY_LIMIT;
      historyRef.value.stack = stack.slice(extras, count);
      historyRef.value.offset = Math.max(historyRef.value.offset - extras, 0);
    }
  }
  const timestamp = Date.now();
  if (overwrite) {
    const last = historyRef.value.stack[historyRef.value.offset];
    if (last && timestamp - last.timestamp < HISTORY_TIME_GAP) {
      // A previous entry exists and was in short interval
      // Match the last word in the line
      const re = /[^a-z0-9]([a-z0-9]+)$/i;
      // Get the previous line
      const previous = getLines(last.value, last.selectionStart).pop()?.match(re);

      // Get the current line
      const current = getLines(record.value, record.selectionStart).pop()?.match(re);

      if (previous && current && current[1].startsWith(previous[1])) {
        // The last word of the previous line and current line match
        // Overwrite previous entry so that undo will remove whole word
        historyRef.value.stack[historyRef.value.offset] = {
          ...record,
          timestamp,
        };
        return;
      }
    }
  }
  // Add the new operation to the stack
  historyRef.value.stack.push({ ...record, timestamp })
  historyRef.value.offset++;
}
function getLines(text, position) {
  return text.substring(0, position).split('\n');
}
function handleChange(e) {
  const { value, selectionStart, selectionEnd } = e.target;

  recordChange(
      {
        value,
        selectionStart,
        selectionEnd,
      },
      true
  );
  emits('input', value);
  // props.onValueChange(value);
}
function undoEdit() {
  const { stack, offset } = historyRef.value;

  // Get the previous edit
  const record = stack[offset - 1];

  if (record) {
    // Apply the changes and update the offset
    updateInput(record);
    historyRef.value.offset = Math.max(offset - 1, 0);
  }
}
function redoEdit() {
  const { stack, offset } = historyRef.value;

  // Get the next edit
  const record = stack[offset + 1];

  if (record) {
    // Apply the changes and update the offset
    updateInput(record);
    historyRef.value.offset = Math.min(offset + 1, stack.length - 1);
  }
}
function updateInput(record) {
  if (!textareaInsRef.value.$el) return;
  // Update values and selection state
  textareaInsRef.value.$el.value = record.value;
  textareaInsRef.value.$el.selectionStart = record.selectionStart;
  textareaInsRef.value.$el.selectionEnd = record.selectionEnd;
  emits('input', record.value);
  // props.onValueChange(record.value);
}
function handleKeyDown(e) {
  // console.log(navigator.platform);
  const { tabSize, insertSpaces, ignoreTabKey } = this;

  if (this.$listeners.keydown) {
    // onKeyDown(e);
    emits('keydown', e);

    if (e.defaultPrevented) {
      return;
    }
  }

  if (e.keyCode === KEYCODE_ESCAPE) {
    (e.target).blur();
    emits('blur', e);
  }
  const { value, selectionStart, selectionEnd } = e.target
  const tabCharacter = (insertSpaces ? ' ' : '\t').repeat(tabSize);
  if (e.keyCode === KEYCODE_TAB && !ignoreTabKey && captureRef.value) {
    // Prevent focus change
    e.preventDefault();
    if (e.shiftKey) {
      // Unindent selected lines
      const linesBeforeCaret = getLines(value, selectionStart);
      const startLine = linesBeforeCaret.length - 1;
      const endLine = getLines(value, selectionEnd).length - 1;
      const nextValue = value
          .split('\n')
          .map((line, i) => {
            if (i >= startLine && i <= endLine && line.startsWith(tabCharacter)) {
              return line.substring(tabCharacter.length);
            }
            return line;
          })
          .join('\n');

      if (value !== nextValue) {
        const startLineText = linesBeforeCaret[startLine];
        applyEdits({
          value: nextValue,
          // Move the start cursor if first line in selection was modified
          // It was modified only if it started with a tab
          selectionStart: startLineText.startsWith(tabCharacter)
              ? selectionStart - tabCharacter.length
              : selectionStart,
          // Move the end cursor by total number of characters removed
          selectionEnd: selectionEnd - (value.length - nextValue.length),
        });
      }
    } else if (selectionStart !== selectionEnd) {
      // Indent selected lines
      const linesBeforeCaret = getLines(value, selectionStart);
      const startLine = linesBeforeCaret.length - 1;
      const endLine = getLines(value, selectionEnd).length - 1;
      const startLineText = linesBeforeCaret[startLine];
      applyEdits({
        value: value
            .split('\n')
            .map((line, i) => {
              if (i >= startLine && i <= endLine) {
                return tabCharacter + line;
              }
              return line;
            })
            .join('\n'),
        // Move the start cursor by number of characters added in first line of selection
        // Don't move it if it there was no text before cursor
        selectionStart: /\S/.test(startLineText) ? selectionStart + tabCharacter.length : selectionStart,
        // Move the end cursor by total number of characters added
        selectionEnd: selectionEnd + tabCharacter.length * (endLine - startLine + 1),
      });
    } else {
      const updatedSelection = selectionStart + tabCharacter.length;
      applyEdits({
        // Insert tab character at caret
        value: value.substring(0, selectionStart) + tabCharacter + value.substring(selectionEnd),
        // Update caret position
        selectionStart: updatedSelection,
        selectionEnd: updatedSelection,
      });
    }
  } else if (e.keyCode === KEYCODE_BACKSPACE) {
    const hasSelection = selectionStart !== selectionEnd;
    const textBeforeCaret = value.substring(0, selectionStart);
    if (textBeforeCaret.endsWith(tabCharacter) && !hasSelection) {
      // Prevent default delete behaviour
      e.preventDefault();

      const updatedSelection = selectionStart - tabCharacter.length;
      applyEdits({
        // Remove tab character at caret
        value: value.substring(0, selectionStart - tabCharacter.length) + value.substring(selectionEnd),
        // Update caret position
        selectionStart: updatedSelection,
        selectionEnd: updatedSelection,
      });
    }
  } else if (e.keyCode === KEYCODE_ENTER) {
    // Ignore selections
    if (selectionStart === selectionEnd) {
      // Get the current line
      const line = getLines(value, selectionStart).pop();
      const matches = line?.match(/^\s+/);

      if (matches && matches[0]) {
        e.preventDefault();
        // Preserve indentation on inserting a new line
        const indent = '\n' + matches[0];
        const updatedSelection = selectionStart + indent.length;
        applyEdits({
          // Insert indentation character at caret
          value: value.substring(0, selectionStart) + indent + value.substring(selectionEnd),
          // Update caret position
          selectionStart: updatedSelection,
          selectionEnd: updatedSelection,
        });
      }
    }
  } else if (
      e.keyCode === KEYCODE_PARENS ||
      e.keyCode === KEYCODE_BRACKETS ||
      e.keyCode === KEYCODE_QUOTE ||
      e.keyCode === KEYCODE_BACK_QUOTE) {
    let chars;
    if (e.keyCode === KEYCODE_PARENS && e.shiftKey) {
      chars = ['(', ')'];
    } else if (e.keyCode === KEYCODE_BRACKETS) {
      if (e.shiftKey) {
        chars = ['{', '}'];
      } else {
        chars = ['[', ']'];
      }
    } else if (e.keyCode === KEYCODE_QUOTE) {
      if (e.shiftKey) {
        chars = ['"', '"'];
      } else {
        chars = ["'", "'"];
      }
    } else if (e.keyCode === KEYCODE_BACK_QUOTE && !e.shiftKey) {
        chars = ['`', '`'];
    }

    // console.log(isMacLike, "navigator" in global && /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));

    // If text is selected, wrap them in the characters
    if (selectionStart !== selectionEnd && chars) {
      e.preventDefault();
      applyEdits({
        value: value.substring(0, selectionStart) + chars[0] + value.substring(selectionStart, selectionEnd) +
        chars[1] +
        value.substring(selectionEnd),
        // Update caret position
        selectionStart,
        selectionEnd: selectionEnd + 2,
      });
    }
  } else if (
      (isMacLike
      ? // Trigger undo with ⌘+Z on Mac
      e.metaKey && e.keyCode === KEYCODE_Z
      : // Trigger undo with Ctrl+Z on other platforms
      e.ctrlKey && e.keyCode === KEYCODE_Z) &&
      !e.shiftKey &&
      !e.altKey
      ) {
    e.preventDefault();
    undoEdit();
  } else if (
      (isMacLike
      ? // Trigger redo with ⌘+Shift+Z on Mac
      e.metaKey && e.keyCode === KEYCODE_Z && e.shiftKey
      : isWindows
      ? // Trigger redo with Ctrl+Y on Windows
      e.ctrlKey && e.keyCode === KEYCODE_Y
      : // Trigger redo with Ctrl+Shift+Z on other platforms
      e.ctrlKey && e.keyCode === KEYCODE_Z && e.shiftKey) &&
      !e.altKey
      ) {
    e.preventDefault();

    redoEdit();
  } else if (e.keyCode === KEYCODE_M && e.ctrlKey && (isMacLike ? e.shiftKey : true)) {
    e.preventDefault();
    // Toggle capturing tab key so users can focus away
    captureRef.value = !captureRef.value;
  }
}

onMounted(() => {
  recordCurrentState();
  styleLineNumbers();
})
</script>

<template>
  <div class="prism-editor-wrapper">
    <div class="prism-editor__line-numbers"
         :style="{'min-height': lineNumbersHeightRef }"
         aria-hidden="true"
         v-if="props.lineNumbers">
      <div class="prism-editor__line-width-calc" style="">999</div>
      <div class="prism-editor__line-number token comment" v-for="(item, index) in lineNumbersCountRef" v-text="++index"></div>
    </div>
    <div class="prism-editor__container">
      <textarea ref="textareaInsRef"
                class="prism-editor__textarea"
                :class="{'prism-editor__textarea--empty': props.isEmpty}"
                spellCheck="false"
                autocapitalize="off"
                autocomplete="off"
                autocorrect="off"
                data-gramm="false"
                :placeholder="props.placeholder"
                data-testid="textarea"
                :readonly="props.readonly"
                :value="codeDataRef"
                @input="handleChange"
                @keydown="handleKeyDown"
                @click=""
                @keyup=""
                @focus=""
                @blur=""></textarea>
      <pre ref="pre"
           class="prism-editor__editor"
           data-testid="preview">
        <code></code>
      </pre>
    </div>
  </div>
</template>

<style scoped lang="less">
.prism-editor-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  overflow: auto;
  tab-size: 1.5em;
  -moz-tab-size: 1.5em;

@media all and (-ms-high-contrast: none), (-ms-high-contrast: active) {
  .prism-editor__textarea {
    color: transparent !important;
  }
  .prism-editor__textarea::selection {
    background-color: #accef7 !important;
    color: transparent !important;
  }
}

.prism-editor__container {
  position: relative;
  text-align: left;
  box-sizing: border-box;
  padding: 0;
  overflow: hidden;
  width: 100%;
}

.prism-editor__line-numbers {
  height: 100%;
  overflow: hidden;
  flex-shrink: 0;
  padding-top: 4px;
  margin-top: 0;
  margin-right: 10px;
  .prism-editor__line-width-calc {
    height: 0px;
    visibility: hidden;
    pointer-events: none;
  }
}
.prism-editor__line-number {
  /* padding: 0 3px 0 5px; */
  text-align: right;
  white-space: nowrap;
}

.prism-editor__textarea {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  resize: none;
  color: inherit;
  overflow: hidden;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  -webkit-text-fill-color: transparent;
}

.prism-editor__textarea,
.prism-editor__editor {
  margin: 0;
  border: 0;
  background: none;
  box-sizing: inherit;
  display: inherit;
  font-family: inherit;
  font-size: inherit;
  font-style: inherit;
  font-variant-ligatures: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  tab-size: inherit;
  text-indent: inherit;
  text-rendering: inherit;
  text-transform: inherit;
  white-space: pre-wrap;
  /*word-wrap: keep-all;*/
  overflow-wrap: break-word;
  padding: 0;
}
.prism-editor__textarea--empty {
  -webkit-text-fill-color: inherit !important;
}
/* highlight */
.prism-editor__editor {
  position: relative;
  pointer-events: none;
}
}
</style>
