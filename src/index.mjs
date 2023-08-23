import ProtoDef from './protodef.js'

const proto = new ProtoDef()

const Serializer = await import('./serializer.js').then(m => m.Serializer)
const Parser = await import('./serializer.js').then(m => m.Parser)
const FullPacketParser = await import('./serializer.js').then(m => m.FullPacketParser)
const compiler = await import('./compiler.js')
const types = proto.types
const utils = await import('./utils.js')

export {
  ProtoDef,
  Serializer,
  Parser,
  FullPacketParser,
  compiler,
  types,
  utils
}
