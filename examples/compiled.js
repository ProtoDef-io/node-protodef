const ProtoDef = require('protodef').ProtoDef
const Serializer = require('protodef').Serializer
const Parser = require('protodef').Parser
const { performance } = require('perf_hooks')
const { ReadCompiler, optimize } = require('protodef').Compiler

const exampleProtocol = require('./example_protocol.json')
const mainType = 'packet'
const packetData = {
  name: 'entity_look',
  params: {
    'entityId': 1,
    'yaw': 1,
    'pitch': 1,
    'onGround': true
  }
}

/* const exampleProtocol = {
  "position": [
    "bitfield",
    [
      {
        "name": "x",
        "size": 26,
        "signed": true
      },
      {
        "name": "z",
        "size": 26,
        "signed": true
      },
      {
        "name": "y",
        "size": 12,
        "signed": true
      }
    ]
  ]
}
const mainType = 'position'
const packetData = {
  x: 1024,
  y: 256,
  z: -1337
} */

let compiler = new ReadCompiler()
let code = compiler.generate(exampleProtocol)
console.log(code)
const test = compiler.compile(code)

const proto = new ProtoDef()
proto.addTypes(exampleProtocol)
const serializer = new Serializer(proto, mainType)
const parser = new Parser(proto, mainType)

const buffer = serializer.createPacketBuffer(packetData)

console.log(JSON.stringify(test[mainType](buffer, 0), null, 2))
console.log(JSON.stringify(parser.parsePacketBuffer(buffer), null, 2))

const nbTests = 1000000
console.log('Running ' + nbTests + ' tests')

let start, time, ps

start = performance.now()
for (let i = 0; i < nbTests; i++) {
  test[mainType](buffer, 0)
}
time = performance.now() - start
ps = nbTests / time
console.log('read compiled: ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')

start = performance.now()
for (let i = 0; i < nbTests; i++) {
  parser.parsePacketBuffer(buffer)
}
time = performance.now() - start
ps = nbTests / time
console.log('parser: ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')

// Closure optimized:
code = optimize(code, (code) => {
  // console.log(code)
  const test2 = compiler.compile(code)
  start = performance.now()
  for (let i = 0; i < nbTests; i++) {
    test2[mainType](buffer, 0)
  }
  time = performance.now() - start
  ps = nbTests / time
  console.log('read compiled (+closure): ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')
})
