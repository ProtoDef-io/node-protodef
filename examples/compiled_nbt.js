const ProtoDef = require('protodef').ProtoDef
const Parser = require('protodef').Parser
const Serializer = require('protodef').Serializer
const { performance } = require('perf_hooks')
const assert = require('assert')
const { ReadCompiler, WriteCompiler, optimize } = require('protodef').Compiler

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

/* global ctx */
let writeCompiler = new WriteCompiler()
writeCompiler.addContextType('compound', (value, buffer, offset) => {
  for (const key in value) {
    offset = ctx.nbt({
      name: key,
      type: value[key].type,
      value: value[key].value
    }, buffer, offset)
  }
  offset = ctx.i8(0, buffer, offset)
  return offset
})
writeCompiler.addTypesToCompile(require('./nbt.json'))
let writeCode = writeCompiler.generate()
console.log(writeCode)
const writeTest = writeCompiler.compile(writeCode)

let readCompiler = new ReadCompiler()
readCompiler.addContextType('compound', (buffer, offset) => {
  const results = {
    value: {},
    size: 0
  }
  while (true) {
    const typ = ctx.i8(buffer, offset)
    if (typ.value === 0) {
      offset += typ.size
      results.size += typ.size
      break
    }

    const readResults = ctx.nbt(buffer, offset)
    offset += readResults.size
    results.size += readResults.size
    results.value[readResults.value.name] = {
      type: readResults.value.type,
      value: readResults.value.value
    }
  }
  return results
})
readCompiler.addTypesToCompile(require('./nbt.json'))
let readCode = readCompiler.generate()
console.log(readCode)
const readTest = readCompiler.compile(readCode)

const proto = new ProtoDef()
proto.addType('compound', compound)
proto.addTypes(require('./nbt.json'))
const parser = new Parser(proto, mainType)
const serializer = new Serializer(proto, mainType)

const fs = require('fs')
fs.readFile('./examples/bigtest.nbt', function (error, buffer) {
  if (error) {
    throw error
  }

  let result = readTest[mainType](buffer, 0).value
  let result2 = parser.parsePacketBuffer(buffer).data

  let buffer2 = Buffer.allocUnsafe(buffer.length)
  writeTest[mainType](result, buffer2, 0)

  let result3 = parser.parsePacketBuffer(buffer2).data

  assert.deepStrictEqual(result, result2)
  assert.deepStrictEqual(result2, result3)

  const nbTests = 10000
  console.log('Running ' + nbTests + ' tests')

  let start, time, ps

  start = performance.now()
  for (let i = 0; i < nbTests; i++) {
    const result = readTest[mainType](buffer, 0).value
    writeTest[mainType](result, buffer2, 0)
  }
  time = performance.now() - start
  ps = nbTests / time
  console.log('read / write compiled: ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')

  start = performance.now()
  for (let i = 0; i < nbTests; i++) {
    const result = parser.parsePacketBuffer(buffer).data
    serializer.createPacketBuffer(result)
  }
  time = performance.now() - start
  ps = nbTests / time
  console.log('read / write parser: ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')

  // Closure optimized:
  optimize(readCode, (readCode) => {
    optimize(writeCode, (writeCode) => {
      const readTest = readCompiler.compile(readCode)
      const writeTest = writeCompiler.compile(writeCode)
      start = performance.now()
      for (let i = 0; i < nbTests; i++) {
        const result = readTest[mainType](buffer, 0).value
        writeTest[mainType](result, buffer2, 0)
      }
      time = performance.now() - start
      ps = nbTests / time
      console.log('read compiled (+closure): ' + time.toFixed(2) + ' ms (' + ps.toFixed(2) + 'k packet/s)')
    })
  })
})
