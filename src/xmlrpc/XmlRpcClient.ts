/*
 * Copyright (c) 2023, Terwer . All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  Terwer designates this
 * particular file as subject to the "Classpath" exception as provided
 * by Terwer in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Please contact Terwer, Shenzhen, Guangdong, China, youweics@163.com
 * or visit www.terwer.space if you need additional information or have any
 * questions.
 */

import { Serializer } from "./Serializer"
import { Deserializer } from "./Deserializer"
import { XmlRpcFault } from "./XmlRpcFault"
import { Encoding, XmlRpcStruct, XmlRpcValue, XmlRpcValueOrFault } from "./XmlRpcTypes"
import { XmlrpcUtil } from "../custom/XmlrpcUtil"

// A client for making XML-RPC method calls over HTTP(S)
export class XmlRpcClient {
  private readonly fetch
  private serializer: Serializer

  url: string
  encoding?: Encoding
  headers = {
    "Content-Type": "text/xml",
    Accept: "text/xml",
  }

  constructor(appInstance: any, url: string, options?: { encoding?: Encoding; headers?: Record<string, string> }) {
    if (!appInstance.fetch) {
      throw new Error("appInstance must have fetch property")
    }

    this.fetch = appInstance.fetch
    this.serializer = new Serializer(appInstance)

    this.url = url
    this.encoding = options?.encoding
    if (options?.headers != undefined) {
      this.headers = { ...this.headers, ...options.headers }
    }
  }

  // Make an XML-RPC call to the server and return the response
  async methodCall(method: string, params?: XmlRpcValue[]): Promise<XmlRpcValue> {
    const body = this.serializer.serializeMethodCall(method, params, this.encoding)
    console.log("XML-RPC request =>", { body: body })
    const headers = this.headers

    let res: Response
    try {
      res = await this.fetch(this.url, { method: "POST", headers, body })
      const isRedirect = res.url !== this.url
      if (isRedirect) {
        console.log("检测到后端已开启资源重定向，重发请求")
        res = await this.fetch(res.url, { method: "POST", headers, body })
      }
    } catch (err) {
      if ((err as Error).message === "Failed to fetch") {
        throw new Error(`XML-RPC call "${method}" to ${this.url} failed to connect`)
      }
      throw err
    }
    if (!res.ok) {
      throw new Error(`XML-RPC call "${method}" to ${this.url} returned ${res.status}: "${res.statusText}"`)
    }

    let resText = await res.text()
    console.log("XML-RPC return =>", { resText: resText })
    resText = XmlrpcUtil.removeXmlHeader(resText)
    const deserializer = new Deserializer(this.encoding)
    return await deserializer.deserializeMethodResponse(resText)
  }

  async multiMethodCall(requests: { methodName: string; params: XmlRpcValue[] }[]): Promise<XmlRpcValueOrFault[]> {
    const res = await this.methodCall("system.multicall", [requests])
    if (!Array.isArray(res) || res.length !== requests.length) {
      throw new Error(`malformed system.multicall response`)
    }

    const output: XmlRpcValueOrFault[] = []

    const createFault = (fault: XmlRpcStruct = {}) => {
      const faultString = typeof fault.faultString === "string" ? fault.faultString : undefined
      const faultCode = typeof fault.faultCode === "number" ? fault.faultCode : undefined
      return new XmlRpcFault(faultString, faultCode)
    }

    for (const entry of res) {
      if (!Array.isArray(entry) || entry.length !== 1) {
        output.push(createFault(entry as XmlRpcStruct))
      } else {
        output.push(entry[0])
      }
    }

    return output
  }
}
