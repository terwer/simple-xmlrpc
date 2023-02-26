import { afterEach, beforeEach } from "vitest"
import { resolve } from "path"
import fetch from "cross-fetch"

// 加载环境变量
require("dotenv").config({ path: resolve(__dirname, "../.env.test.local") })

// Add `fetch` polyfill.
// https://markus.oberlehner.net/blog/using-mock-service-worker-with-vitest-and-fetch/
global.fetch = fetch

beforeEach(() => {
  console.log("======test is starting...======")
})

afterEach(() => {
  console.log("======test is finished.========")
})
