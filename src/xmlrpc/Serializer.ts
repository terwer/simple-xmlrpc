import { bytesToBase64 } from "byte-base64"
import { Encoding, XmlRpcStruct, XmlRpcValue } from "./XmlRpcTypes"
import { DateFormatter } from "./DateFormatter"
import { XmlRpcFault } from "./XmlRpcFault"
import { CustomType } from "./CustomType"
import { Buffer } from "node:buffer"
const illegalChars = /^(?![^<&]*]]>[^<&]*)[^<&]*$/

// ref <http://xmlrpc-epi.sourceforge.net/specs/rfc.fault_codes.php>
export enum XmlRpcError {
  APPLICATION_ERROR = -32500,
  NOT_FOUND_ERROR = -32601,
  INVALID_PARAMS_ERROR = -32602,
}

export class Serializer {
  private xmlbuilder2: any

  private dateFormatter: DateFormatter

  constructor(appInstance: any) {
    if (!appInstance.xmlbuilder2) {
      throw new Error("appInstance must have xmlbuilder2.create property")
    }

    this.xmlbuilder2 = appInstance.xmlbuilder2
    this.dateFormatter = new DateFormatter()
  }

  // Creates the XML for an XML-RPC method call
  serializeMethodCall(method: string, params: XmlRpcValue[] = [], encoding?: Encoding): string {
    const xml = this.xmlbuilder2
      .create({
        version: "1.0",
        encoding,
      })
      .ele("methodCall")
      .ele("methodName")
      .txt(method)
      .up()
      .ele("params")
    params.forEach((param) => this.serializeValue(param, xml.ele("param")))

    // Includes the <?xml ...> declaration
    return xml.doc().toString()
  }

  // Creates the XML for an XML-RPC method response
  serializeMethodResponse(result: XmlRpcValue): string {
    const xml = this.xmlbuilder2.create().ele("methodResponse").ele("params").ele("param")
    this.serializeValue(result, xml)

    // Includes the <?xml ...> declaration
    return xml.doc().toString()
  }

  serializeFault(fault: XmlRpcFault): string {
    const xml = this.xmlbuilder2.create().ele("methodResponse").ele("fault")
    const faultCode = fault.faultCode ?? XmlRpcError.APPLICATION_ERROR
    const faultString = fault.faultString ?? fault.message
    this.serializeValue({ faultCode, faultString }, xml)

    // Includes the <?xml ...> declaration
    return xml.doc().toString()
  }

  private serializeValue(value: XmlRpcValue, xml: any) {
    let current: any = { value, xml }
    const stack = [current]
    let valueNode
    let next

    while (stack.length > 0) {
      current = stack[stack.length - 1] as any

      if (current.index != undefined) {
        // Iterating a compound
        next = this.getNextItemsFrame(current)
        if (next != undefined) {
          stack.push(next)
        } else {
          stack.pop()
        }
      } else {
        // we're about to add a new value (compound or simple)
        valueNode = current.xml.ele("value")
        switch (typeof current.value) {
          case "boolean":
            this.appendBoolean(current.value, valueNode)
            stack.pop()
            break
          case "string":
            this.appendString(current.value, valueNode)
            stack.pop()
            break
          case "number":
            this.appendNumber(current.value, valueNode)
            stack.pop()
            break
          case "object":
            if (current.value == undefined) {
              valueNode.ele("nil")
              stack.pop()
            } else if (current.value instanceof Date) {
              this.appendDatetime(current.value, valueNode)
              stack.pop()
            } else if (Buffer.isBuffer(current.value)) {
              this.appendBuffer(current.value, valueNode)
              stack.pop()
            } else if (current.value instanceof CustomType) {
              current.value.serialize(valueNode)
              stack.pop()
            } else {
              if (Array.isArray(current.value)) {
                current.xml = valueNode.ele("array").ele("data")
              } else {
                current.xml = valueNode.ele("struct")
                current.keys = Object.keys(current.value)
              }
              current.index = 0
              next = this.getNextItemsFrame(current)
              if (next != undefined) {
                stack.push(next)
              } else {
                stack.pop()
              }
            }
            break
          default:
            stack.pop()
            break
        }
      }
    }
  }

  private getNextItemsFrame(frame: any) {
    let nextFrame: any | undefined

    if (frame.keys != undefined && frame.index != undefined) {
      if (frame.index < frame.keys.length) {
        const key = frame.keys[frame.index++] as string
        const member = frame.xml.ele("member").ele("name").txt(key).up()
        nextFrame = {
          value: (frame.value as XmlRpcStruct)[key],
          xml: member,
        }
      }
    } else if (frame.index != undefined && Array.isArray(frame.value) && frame.index < frame.value.length) {
      nextFrame = {
        value: frame.value[frame.index],
        xml: frame.xml,
      }
      frame.index++
    }

    return nextFrame
  }

  private appendBoolean(value: boolean, xml: any) {
    xml.ele("boolean").txt(value ? "1" : "0")
  }

  private appendString(value: string, xml: any) {
    if (!illegalChars.test(value)) {
      xml.ele("string").dat(value)
    } else {
      xml.ele("string").txt(value)
    }
  }

  private appendNumber(value: number, xml: any) {
    if (value % 1 === 0) {
      xml.ele("int").txt(String(value))
    } else if (value === Infinity) {
      xml.ele("double").txt("inf")
    } else if (value === -Infinity) {
      xml.ele("double").txt("-inf")
    } else if (isNaN(value)) {
      xml.ele("double").txt("nan")
    } else {
      xml.ele("double").txt(String(value))
    }
  }

  private appendDatetime(value: Date, xml: any) {
    xml.ele("dateTime.iso8601").txt(this.dateFormatter.encodeIso8601(value))
  }

  private appendBuffer(value: Uint8Array, xml: any) {
    xml.ele("base64").txt(bytesToBase64(value))
  }
}
