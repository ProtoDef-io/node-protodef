import ProtoDef from './protodef.js'
import { Serializer, Parser, FullPacketParser } from './serializer.js'
import Compiler from './compiler.js'
import utils from './utils.js'

const proto = new ProtoDef()

export default {
  ProtoDef,
  Serializer,
  Parser,
  FullPacketParser,
  Compiler,
  types: proto.types,
  utils
}
