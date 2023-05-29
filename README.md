# simple-xmlrpc
a simple xmlrpc client in TypeScript

## Usage

```js
import { SimpleXmlRpcClient } from "simple-xmlrpc"

// 调用 API 上传文件
const xmlrpcApiUrl = "http://127.0.0.1:3000/xmlrpc.php"
const client = new SimpleXmlRpcClient(xmlrpcApiUrl)
const result = await client.methodCall("metaWeblog.getUsersBlogs", [
  "",
  "terwer",
  "123456"
]);

console.log("success=>", result);
```