import renderPptx from "@/vendors/pptx"
import renderText from '@/vendors/text/'

/**
 * @description 构造一个vue的包装，让上层统一处理销毁和替换节点
 * @param el
 * @returns {{$el, $destroy()}}
 * @constructor
 */
function VueWrapper(el) {
  return {
    $el: el,
    $destroy() {
    }
  }
}
const handlers = [
  {
    accepts: ["pptx"],
    handler: async (buffer, target) => {
      await renderPptx(buffer, target, null);
      window.dispatchEvent(new Event("resize"));
      return VueWrapper(target);
    }
  },
  {
    accepts: ["txt", "json", "js", "css", "java", "py", "html", "jsx", "ts", "tsx", "xml", "log"],
    handler: async (buffer, target) => {
      return renderText(buffer, target)
    }
  },
  {
    accepts: ["error"],
    handler: async (buffer, target, type) => {
      target.innerHTML = `<div style="text-align: center; margin-top: 80px">不支持.${type}格式的在线预览，请下载后预览或转换为支持的格式</div>
          <div style="text-align: center">支持docx, xlsx, pptx, pdf, 以及纯文本格式和各种图片格式的在线预览</div>`
      return VueWrapper(target);
    }
  }
]

/**
 * @description 将内层的类型list转为对象
 */
export default handlers.reduce((pre, { accepts, handler }) => {
  Array.isArray(accepts) && accepts.forEach(type => pre[type] = handler)
  return pre
}, {})
