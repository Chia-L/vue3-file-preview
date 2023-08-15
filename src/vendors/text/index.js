import {h, render} from 'vue'
import { readText } from "@/vendors/index"
import TextViewer from '@/vendors/text/TextViewer.vue'

/**
 * 渲染文本
 * @param buffer 文本二进制内容
 * @param target 目标
 */
export default async function renderText(buffer, target) {
  const text = await readText(buffer);
  return render(h(TextViewer,{ content: text }), target)
}
