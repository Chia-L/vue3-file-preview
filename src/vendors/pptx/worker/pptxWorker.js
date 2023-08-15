"use strict";

import processPptx from "../util/process";

console.log('ddd', processPptx(
  func => {
    self.onmessage = e => func(e.data);
  },
  msg => self.postMessage(msg)
))

export default processPptx
