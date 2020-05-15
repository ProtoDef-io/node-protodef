const ProtoDef = require('protodef').ProtoDef
const { performance } = require('perf_hooks')
const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler

const compound = [readCompound, writeCompound, sizeOfCompound]

function readCompound (buffer, offset, typeArgs, rootNode) {
  const results = {
    value: {},
    size: 0
  }
  while (true) {
    const typ = this.read(buffer, offset, 'i8', rootNode)
    if (typ.value === 0) {
      offset += typ.size
      results.size += typ.size
      break
    }

    const readResults = this.read(buffer, offset, 'nbt', rootNode)
    offset += readResults.size
    results.size += readResults.size
    results.value[readResults.value.name] = {
      type: readResults.value.type,
      value: readResults.value.value
    }
  }
  return results
}

function writeCompound (value, buffer, offset, typeArgs, rootNode) {
  const self = this
  Object.keys(value).map(function (key) {
    offset = self.write({
      name: key,
      type: value[key].type,
      value: value[key].value
    }, buffer, offset, 'nbt', rootNode)
  })
  offset = this.write(0, buffer, offset, 'i8', rootNode)

  return offset
}

function sizeOfCompound (value, typeArgs, rootNode) {
  const self = this
  const size = Object.keys(value).reduce(function (size, key) {
    return size + self.sizeOf({
      name: key,
      type: value[key].type,
      value: value[key].value
    }, 'nbt', rootNode)
  }, 0)
  return 1 + size
}

const mainType = 'nbt'

const fs = require('fs')
fs.readFile('./examples/bigtest.nbt', async (error, buffer) => {
  if (error) {
    throw error
  }

  const proto = new ProtoDef()
  proto.addType('compound', compound)
  proto.addTypes(require('./nbt.json'))

  const compiler = new ProtoDefCompiler()
  compiler.addTypes(require('./nbt-compound'))
  compiler.addTypesToCompile(require('./nbt.json'))
  const compiledProto = await compiler.compileProtoDef()

  let result = compiledProto.parsePacketBuffer(mainType, buffer).data
  let result2 = proto.parsePacketBuffer(mainType, buffer).data

  let buffer2 = compiledProto.createPacketBuffer(mainType, result)
  let result3 = proto.parsePacketBuffer(mainType, buffer2).data

  assert.deepStrictEqual(result, result2)
  assert.deepStrictEqual(result2, result3)
  assert.strictEqual(buffer.length, buffer2.length)

  const nbTests = 10000
  console.log('Running ' + nbTests + ' tests')

  let start, time, ps

  start = performance.now()
  for (let i = 0; i < nbTests; i++) {
    const result = compiledProto.parsePacketBuffer(mainType, buffer).data
    compiledProto.createPacketBuffer(mainType, result)
  }
  time = performance.now() - start
  ps = nbTests / time
  console.log('read / write compiled: ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')

  start = performance.now()
  for (let i = 0; i < nbTests; i++) {
    const result = proto.parsePacketBuffer(mainType, buffer).data
    proto.createPacketBuffer(mainType, result)
  }
  time = performance.now() - start
  ps = nbTests / time
  console.log('read / write parser: ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')

  // Closure optimized:
  const optimizedProto = await compiler.compileProtoDef({ optimize: true })
  start = performance.now()
  for (let i = 0; i < nbTests; i++) {
    const result = optimizedProto.parsePacketBuffer(mainType, buffer).data
    optimizedProto.createPacketBuffer(mainType, result)
  }
  time = performance.now() - start
  ps = nbTests / time
  console.log('read / write compiled (+closure): ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')
})
