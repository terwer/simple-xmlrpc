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
import { XmlRpcFault, XmlRpcServer, XmlRpcValue } from "../xmlrpc"
import { HttpServerNodejs } from "../xmlrpc/nodejs"

/**
 * 简单的Xmlrpc服务端
 * @see https://raw.githubusercontent.com/foxglove/xmlrpc/main/examples/server.ts
 */
async function main() {
  const xmlrpc = new XmlRpcServer(new HttpServerNodejs())
  xmlrpc.setHandler("sum", async (_methodName, args): Promise<XmlRpcValue> => {
    if (
      args.length !== 2 ||
      typeof args[0] !== "number" ||
      typeof args[1] !== "number"
    ) {
      throw new XmlRpcFault("Usage: sum(a: number, b: number): number")
    }
    const [a, b] = args
    const res = a + b
    console.debug(`sum(${a}, ${b}) -> ${res}`)
    return [res]
  })
  await xmlrpc.listen(8000)
  const url = xmlrpc.server.url() ?? "http://localhost:8000"
  console.info(`Listening on ${url}`)
  console.log(
    `Try running: curl --data "<methodCall><methodName>sum</methodName><params><param><value><int>3</int></value></param><param><value><int>4</int></value></param></params></methodCall>" ${url}`
  )
}

// void main();
