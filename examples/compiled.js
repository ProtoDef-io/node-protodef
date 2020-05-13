const ProtoDef = require('protodef').ProtoDef
const Serializer = require('protodef').Serializer
const Parser = require('protodef').Parser
const { performance } = require('perf_hooks')
const { ReadCompiler, WriteCompiler, optimize } = require('protodef').Compiler

const exampleProtocol = require('./example_protocol.json')
const mainType = 'packet'
const packetData = {
  name: 'entity_look',
  params: {
    'entityId': 1,
    'yaw': 1,
    'pitch': 1,
    'onGround': true,
    'position': {
      x: 42,
      y: 255,
      z: -1337
    }
  }
}

const writeCompiler = new WriteCompiler()
writeCompiler.addTypesToCompile(exampleProtocol)
const writeCode = writeCompiler.generate()
console.log(writeCode)
const testWrite = writeCompiler.compile(writeCode)

const readCompiler = new ReadCompiler()
readCompiler.addTypesToCompile(exampleProtocol)
const readCode = readCompiler.generate()
console.log(readCode)
const testRead = readCompiler.compile(readCode)

const proto = new ProtoDef()
proto.addTypes(exampleProtocol)
const serializer = new Serializer(proto, mainType)
const parser = new Parser(proto, mainType)

console.log(JSON.stringify(testRead[mainType](serializer.createPacketBuffer(packetData), 0), null, 2))
const buffer = Buffer.allocUnsafe(1024)
testWrite[mainType](packetData, buffer, 0)
console.log(JSON.stringify(parser.parsePacketBuffer(buffer), null, 2))

const nbTests = 1000000
console.log('Running ' + nbTests + ' tests')

let start, time, ps

start = performance.now()
for (let i = 0; i < nbTests; i++) {
  testWrite[mainType](packetData, buffer, 0)
  testRead[mainType](buffer, 0)
}
time = performance.now() - start
ps = nbTests / time
console.log('write / read compiled: ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')

start = performance.now()
for (let i = 0; i < nbTests; i++) {
  const buffer = serializer.createPacketBuffer(packetData)
  parser.parsePacketBuffer(buffer)
}
time = performance.now() - start
ps = nbTests / time
console.log('serializer / parser: ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')

// Closure optimized:
optimize(writeCode, (writeCode) => {
  optimize(readCode, (readCode) => {
    const testWrite = writeCompiler.compile(writeCode)
    const testRead = readCompiler.compile(readCode)
    start = performance.now()
    for (let i = 0; i < nbTests; i++) {
      testWrite[mainType](packetData, buffer, 0)
      testRead[mainType](buffer, 0)
    }
    time = performance.now() - start
    ps = nbTests / time
    console.log('write / read compiled (+closure): ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')
  })
})
