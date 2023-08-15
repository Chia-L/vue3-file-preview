<script setup>
import { ref } from 'vue'
import { readBuffer, getExtend, render } from '@/vendors/index'

// 下载按钮实例
const uploadInsRef = ref()
// 展示实例
const showViewRef = ref()
const loadingRef = ref(false)
// 文件
const fileBoldRef = ref(null)
const fileName = ref('')
// 上一次展示的实例
const lastViewRef = ref(null)

function onUpload() {
  uploadInsRef.value?.click()
}
async function onChange(e) {
  loadingRef.value = true
  try {
    const [ file ] = e.target.files
    fileBoldRef.value = file
    fileName.value = (file.name && decodeURIComponent(file.name)) ?? ''
    const arrayBuffer = await readBuffer(file);
    loadingRef.value = false
    lastViewRef.value = await showView(arrayBuffer, file);
  } catch (e) {
    console.error(e)
  } finally {
    loadingRef.value = false
  }
}
function showView(buffer, file) {
  const { name } = file;
  const extend = getExtend(name)
  const node = document.createElement("div")
  if (lastViewRef.value) {
    showViewRef.value.$el?.removeChild(showViewRef.value.$el?.lastChild)
    lastViewRef.value.$destroy()
  }
  const child = showViewRef.value.$el?.appendChild(node)
  return new Promise((resolve, reject) => {
    render(buffer, extend, child).then(resolve).catch(reject)
  })

}
</script>

<template>
  <div class="page-container">
    <el-container>
      <el-header>
        <div>文档浏览</div>
        <div class="upload-view">
          <el-button type="primary" plain @click="onUpload">upload file</el-button>
          <input class="real-box" ref="uploadInsRef" type="file" @change="onChange" />
        </div>
      </el-header>
      <el-main v-loading="loadingRef" ref="showViewRef"></el-main>
      <el-footer>Footer</el-footer>
    </el-container>
  </div>
</template>

<style scoped lang="less">
@headerHeight: 3em;
@footerHeight: 2em;
.page-container {
  width: 100vw;
  height: 100vh;
  min-width: 860px;
  .el-container {
    height: 100%;
    .el-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: @headerHeight!important;
      background-color: #323639;
      .upload-view {
        position: relative;
        .real-box {
          position: absolute;
          weight: 0;
          height: 0;
        }
      }
    }
    .el-main {
      background-color: #2d2d2d;
    }
    .el-footer {
      height: @footerHeight!important;
      line-height: @footerHeight;
      background-color: #323639;
    }
  }
}
</style>
