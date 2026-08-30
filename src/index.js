const ProtoDef = require('./protodef')
// No validation: this instance only supplies the default types export, and
// validation here would load the validator for every consumer of the package.
const proto = new ProtoDef(false)

module.exports = {
  ProtoDef,
  Serializer: require('./serializer').Serializer,
  Parser: require('./serializer').Parser,
  FullPacketParser: require('./serializer').FullPacketParser,
  Compiler: require('./compiler'),
  types: proto.types,
  utils: require('./utils')
}
