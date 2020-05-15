const { ProtoDefCompiler } = require('protodef').Compiler

const compiler = new ProtoDefCompiler()
compiler.addTypes(require('./nbt-compound'))
compiler.addTypesToCompile(require('./nbt.json'))
compiler.addTypesToCompile({ 'optionalNbt': ['option', 'nbt'] })
compiler.addTypes(require('./mcDatatypes'))
compiler.addProtocol(require('./protocol.json'), ['play', 'toClient'])
// compiler.addProtocol(require('./protocol.json'), ['play', 'toServer'])

async function main () {
  await compiler.compileProtoDef({ printCode: true })
}

main()
