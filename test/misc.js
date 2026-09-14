/* eslint-env mocha */

const assert = require('assert')
const { ProtoDef, FullPacketParser } = require('../')
const { ProtoDefCompiler } = require('../').Compiler

it('example works', () => {
  require('../example')
})

describe('mapper', () => {
  const mapper = ['mapper', { type: 'varint', mappings: { '0x00': 'zero', '0x01': 'one' } }]
  const proto = new ProtoDef()
  proto.addType('name', mapper)
  const compiler = new ProtoDefCompiler()
  compiler.addTypesToCompile({ name: mapper })
  const compiled = compiler.compileProtoDefSync()

  for (const [label, p] of [['interpreted', proto], ['compiled', compiled]]) {
    it(`writes a value mapped to 0 (${label})`, () => {
      assert.deepStrictEqual(p.createPacketBuffer('name', 'zero'), Buffer.from([0]))
    })
    it(`throws on a value not in the mappings instead of writing it (${label})`, () => {
      assert.throws(() => p.createPacketBuffer('name', 'nope'), /nope is not in the mappings value/)
    })
  }
})

describe('FullPacketParser', () => {
  const packet = ['container', [{ name: 'a', type: 'i32' }]]
  const proto = new ProtoDef()
  proto.addType('packet', packet)
  const compiler = new ProtoDefCompiler()
  compiler.addTypesToCompile({ packet })
  const compiled = compiler.compileProtoDefSync()

  for (const [label, p] of [['interpreted', proto], ['compiled', compiled]]) {
    it(`emits partialReadError with the chunk it could not read, and keeps parsing (${label})`, async () => {
      const parser = new FullPacketParser(p, 'packet', true)
      const errors = []
      const packets = []
      parser.on('partialReadError', e => errors.push(e))
      parser.on('data', d => packets.push(d.data))
      parser.write(Buffer.from([0, 0]))
      parser.write(Buffer.from([0, 0, 0, 7]))
      await new Promise(resolve => parser.end(resolve))
      assert.strictEqual(errors.length, 1)
      assert.strictEqual(errors[0].partialReadError, true)
      assert.deepStrictEqual(errors[0].buffer, Buffer.from([0, 0]))
      assert.deepStrictEqual(packets, [{ a: 7 }])
    })
  }
})
