const ProtoDef = require('protodef').ProtoDef
const Parser = require('protodef').Parser
const { performance } = require('perf_hooks')
const assert = require('assert')
const { ReadCompiler, optimize } = require('protodef').Compiler

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

const exampleProtocol = require('./nbt.json')
const mainType = 'nbt'

/* global native, ctx */
let compiler = new ReadCompiler()
compiler.addContextType('compound', (buffer, offset) => {
  const results = {
    value: {},
    size: 0
  }
  while (true) {
    const typ = native.i8(buffer, offset)
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
let code = compiler.generate(exampleProtocol)
console.log(code)
const test = compiler.compile(code)

const proto = new ProtoDef()
proto.addType('compound', compound)
proto.addTypes(exampleProtocol)
const parser = new Parser(proto, mainType)

const fs = require('fs')
fs.readFile('./examples/bigtest.nbt', function (error, buffer) {
  if (error) {
    throw error
  }

  let result = test[mainType](buffer, 0).value
  let result2 = parser.parsePacketBuffer(buffer).data

  assert.deepStrictEqual(result, result2)

  const nbTests = 10000
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
})
