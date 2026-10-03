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

describe('bitflags', () => {
  // A 32-bit bitflags whose top flag is bit 31. `|=` is signed in JS, so building the value makes it negative;
  // the writer must treat it as unsigned or writeUInt32LE rejects it (regression for a bit-31 write crash).
  const flags = Array.from({ length: 32 }, (_, i) => (i === 31 ? 'topbit' : 'f' + i))
  const type = ['bitflags', { type: 'lu32', flags }]
  const proto = new ProtoDef()
  proto.addType('flags32', type)
  const compiler = new ProtoDefCompiler()
  compiler.addTypesToCompile({ flags32: type })
  const compiled = compiler.compileProtoDefSync()

  for (const [label, p] of [['interpreted', proto], ['compiled', compiled]]) {
    it(`round-trips a value with bit 31 set (${label})`, () => {
      const buf = p.createPacketBuffer('flags32', { topbit: true, f0: true })
      assert.deepStrictEqual(buf, Buffer.from([0x01, 0x00, 0x00, 0x80]))
      const back = p.parsePacketBuffer('flags32', buf).data
      assert.strictEqual(back.topbit, true)
      assert.strictEqual(back.f0, true)
      assert.strictEqual(back.f1, false)
    })
  }
})

describe('bitflags with a signed underlying type', () => {
  // Signed underlying type with bit 31 set: reading 0xffffffff as i32 yields -1. The unsigned coercion must NOT apply
  // here, or writing the decoded value pushes -1 to 4294967295 and the signed writer rejects it (a regression the
  // unsigned bit-31 fix introduced). The |= result is already the correct signed value.
  const type = ['bitflags', { type: 'i32', flags: { top: 31 }, shift: true }]
  const proto = new ProtoDef()
  proto.addType('sflags', type)
  const compiler = new ProtoDefCompiler()
  compiler.addTypesToCompile({ sflags: type })
  const compiled = compiler.compileProtoDefSync()

  for (const [label, p] of [['interpreted', proto], ['compiled', compiled]]) {
    it(`round-trips a signed value with bit 31 set (${label})`, () => {
      const buf = Buffer.from([0xff, 0xff, 0xff, 0xff]) // i32 -1, top bit set
      const obj = p.parsePacketBuffer('sflags', buf).data
      assert.strictEqual(obj.top, true)
      const back = p.createPacketBuffer('sflags', obj) // must not throw and must reproduce the original bytes
      assert.deepStrictEqual(back, buf)
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
