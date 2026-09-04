/* eslint-env mocha */

const assert = require('assert')
const { ProtoDef } = require('../')
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
