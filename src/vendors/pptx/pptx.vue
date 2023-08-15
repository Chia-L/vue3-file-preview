<script setup>
import { ref, onMounted } from 'vue'
import $ from 'jquery'
import { DefaultOptions } from './util/options'
import processPptx from './worker/pptxWorker'
import "nvd3/build/nv.d3.min.css"

console.log(Worker);

const props  = defineProps({
  data: ArrayBuffer,
  options: {
    type: Object,
    default: DefaultOptions,
    description: "默认配置，支持扩展"
  }
})

const pptxWrapperRef = ref(null)
const isDoneRef = ref(false)
const thumbElementRef = ref(null)
const workerRef = ref(null)
const timerRef = ref(null)

/**
 * @description 启动worker
 */
function startWorker() {
  if (workerRef.value) {
    workerRef.value.terminate()
  }
  const worker = {
    // shim worker
    postMessage: () => {},
    terminate: () => {}
  };
  workerRef.value = {
    // shim worker
    postMessage: () => {},
    terminate: () => {}
  }
  /*workerRef.value.addEventListener('message', evt => {
    processMessage(evt.data)
  }, false)*/
  timerRef.value = setInterval(stopWorker, 500)
  processPptx(func => {workerRef.value.postMessage = func}, processMessage)
  workerRef.value.postMessage({
    type: 'processPPTX',
    data: props.data,
    IE11: !!window.MSInputMethodContext && !!document.documentMode,
    options: props.options
  })
}

// 停止worker逻辑
function stopWorker() {
  if (isDoneRef.value) {
    workerRef.value.terminate()
    clearInterval(timerRef.value)
    timerRef.value = null
  }
}
// 窗口拖动大小，自动调整位置
function resize() {
  const $wrapper = $(pptxWrapperRef.value);
  const slidesWidth = Math.max(
      ...Array.from($wrapper.children("section")).map(s => s.offsetWidth)
  );
  const wrapperWidth = $wrapper[0].offsetWidth;
  $wrapper.css({
    transform: `scale(${wrapperWidth / slidesWidth})`,
    "transform-origin": "top left"
  });
}
// 核心处理逻辑
function processMessage(msg) {
  if (isDoneRef.value) return;
  const $wrapper = $(pptxWrapperRef.value);
  switch (msg.type) {
    case "slide":
      console.log("正在处理:", msg.slide_num);
      $wrapper.append(msg.data);
      break;
    case "pptx-thumb":
      if (thumbElementRef.value)
        $(thumbElementRef.value).attr("src", `data:image/jpeg;base64,${msg.data}`);
      break;
    case "slideSize":
      break;
    case "globalCSS":
      $wrapper.append(`<style>${msg.data}</style>`);
      break;
    case "Done":
      isDoneRef.value = true;
      break;
    case "WARN":
      console.warn("PPTX processing warning: ", msg.data);
      break;
    case "ERROR":
      isDoneRef.value = true;
      console.error("PPTX processing error: ", msg.data);
      break;
    case "DEBUG":
      console.debug("Worker: ", msg.data);
      break;
    case "INFO":
    default:
      console.info("Worker: ", msg.data);
  }
}

onMounted(() => {
  startWorker()
})
</script>

<template>
  <div class="pptx-wrapper" ref="pptxWrapperRef"></div>
</template>

<style scoped>

.slide {
  position: relative;
  border: 1px solid #333;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 50px;
  margin-left: auto;
  margin-right: auto;
}

.slide div.block {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  line-height: 1;
}

.slide div.content {
  display: flex;
  flex-direction: column;
}
.slide div.diagram-content{
  display: flex;
  flex-direction: column;
}

.slide div.content-rtl {
  display: flex;
  flex-direction: column;
  direction: rtl;
}
.slide .pregraph-rtl{
  direction: rtl;
}
.slide .pregraph-ltr{
  direction: ltr;
}
.slide .pregraph-inherit{
  direction: inherit;
}
.slide .slide-prgrph{
  width: 100%;
  /* overflow-wrap:break-word;
    word-wrap: break-word;  */

  /* word-break: break-word; */
  /* unicode-bidi: bidi-override; */
  /* hyphens: auto;
  overflow-wrap: break-word; */

}

.slide .line-break-br::before{
  content: "\A";
  white-space: pre;
}
.slide div.v-up {
  justify-content: flex-start;
}
.slide div.v-mid {
  justify-content: center;
}
.slide div.v-down {
  justify-content: flex-end;
}

.slide div.h-left {
  justify-content: flex-start;
  align-items: flex-start;
  text-align: left;
}
.slide div.h-left-rtl {
  justify-content: flex-end;
  align-items: flex-end;
  text-align: left;
}
.slide div.h-mid {
  justify-content: center;
  align-items: center;
  text-align: center;
}
.slide div.h-right {
  justify-content: flex-end;
  align-items: flex-end;
  text-align: right;
}
.slide div.h-right-rtl {
  justify-content: flex-start;
  align-items: flex-start;
  text-align: right;
}

.slide div.h-just,
.slide div.h-dist {
  text-align: justify;
}


.slide div.up-left {
  justify-content: flex-start;
  align-items: flex-start;
  text-align: left;
}
.slide div.up-center {
  justify-content: flex-start;
  align-items: center;
}
.slide div.up-right {
  justify-content: flex-start;
  align-items: flex-end;
}
.slide div.center-left {
  justify-content: center;
  align-items: flex-start;
  text-align: left;
}
.slide div.center-center {
  justify-content: center;
  align-items: center;
}
.slide div.center-right {
  justify-content: center;
  align-items: flex-end;
}
.slide div.down-left {
  justify-content: flex-end;
  align-items: flex-start;
  text-align: left;
}
.slide div.down-center {
  justify-content: flex-end;
  align-items: center;
}
.slide div.down-right {
  justify-content: flex-end;
  align-items: flex-end;
}


.slide li.slide {
  margin: 10px 0px;
  font-size: 18px;
}

.slide table {
  position: absolute;
}

.slide svg.drawing {
  position: absolute;
  overflow: visible;
}

/*
#pptx-thumb {
	min-width: 240px;
	height: 180px;
}
*/

.pptx-wrapper {
  /* max-width: 1000px;
margin: 0 auto; */
  margin-top: 15px;
}

</style>
