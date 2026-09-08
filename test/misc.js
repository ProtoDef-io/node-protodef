/* eslint-env mocha */

const assert = require('assert')
const { ProtoDef, Serializer } = require('../')
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

describe('Serializer', () => {
  const types = {
    packet_position: ['container', [{ name: 'x', type: 'f64' }, { name: 'face', type: ['mapper', { type: 'varint', mappings: { 0: 'down' } }] }]],
    packet: ['container', [
      { name: 'name', type: ['mapper', { type: 'varint', mappings: { 0: 'position' } }] },
      { name: 'params', type: ['switch', { compareTo: 'name', fields: { position: 'packet_position' } }] }
    ]]
  }
  const proto = new ProtoDef()
  proto.addTypes(types)
  const compiler = new ProtoDefCompiler()
  compiler.addTypesToCompile(types)
  const compiled = compiler.compileProtoDefSync()
  const bad = { name: 'position', params: { x: 1, face: 'up' } }

  it('names the packet when the error has no field path (compiled)', () => {
    assert.throws(() => new Serializer(compiled, 'packet').createPacketBuffer(bad),
      { message: 'in packet position: SizeOf error for undefined : up is not in the mappings value' })
  })
  it('does not repeat a packet name already in the field path (interpreted)', () => {
    assert.throws(() => new Serializer(proto, 'packet').createPacketBuffer(bad),
      { message: 'SizeOf error for params.position.face : up is not in the mappings value' })
  })
  it('leaves errors alone when the value has no name', () => {
    assert.throws(() => new Serializer(compiled, 'packet_position').createPacketBuffer(bad.params),
      { message: 'SizeOf error for undefined : up is not in the mappings value' })
  })
})
