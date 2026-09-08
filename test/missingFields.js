/* eslint-env mocha */

const expect = require('chai').expect
const { ProtoDefCompiler } = require('protodef').Compiler

const compiler = new ProtoDefCompiler()
compiler.addTypes({
  Read: {
    maybe: ['native', (buffer, offset) => ({ value: buffer[offset] || undefined, size: 1 })],
    maybeType: ['parametrizable', (compiler) => compiler.wrapCode('return { value: buffer[offset] || undefined, size: 1 }')]
  },
  Write: {
    maybe: ['native', (value, buffer, offset) => { buffer[offset] = value === undefined ? 0 : value; return offset + 1 }],
    maybeType: ['parametrizable', (compiler) => compiler.wrapCode('buffer[offset] = value === undefined ? 0 : value\nreturn offset + 1')]
  },
  SizeOf: {
    maybe: ['native', () => 1],
    maybeType: ['parametrizable', (compiler) => compiler.wrapCode('return 1')]
  }
})
compiler.addTypesToCompile({
  maybe: 'native',
  anonMaybe: ['maybeType', {}],
  count: 'u8',
  hit: ['option', 'u8'],
  packet: ['container', [
    { name: 'mouse', type: 'u8' },
    { name: 'x', type: ['switch', { compareTo: 'mouse', fields: { 2: 'u8' }, default: 'void' }] },
    { name: 'y', type: 'hit' },
    { name: 'extra', type: ['option', 'u8'] },
    { name: 'nbt', type: 'maybe' },
    { name: 'anonNbt', type: 'anonMaybe' },
    { name: 'nothing', type: 'void' }
  ]],
  pair: ['container', [
    { name: 'a', type: 'u8' },
    { name: 'b', type: 'count' },
    { name: 'flags', anon: true, type: ['bitfield', [{ name: 'c', size: 4, signed: false }, { name: 'd', size: 4, signed: false }]] }
  ]]
})
const proto = compiler.compileProtoDefSync()

describe('compiled container write', () => {
  it('rejects a missing field', () => {
    expect(() => proto.createPacketBuffer('pair', { a: 1, c: 1, d: 1 })).to.throw("Missing field 'b'")
  })
  it('rejects an undefined field behind a type alias', () => {
    expect(() => proto.createPacketBuffer('pair', { a: 1, b: undefined, c: 1, d: 1 })).to.throw("Missing field 'b'")
  })
  it('rejects a missing bitfield field', () => {
    expect(() => proto.createPacketBuffer('pair', { a: 1, b: 2, c: 1 })).to.throw("Missing bitfield field 'd'")
  })
  it('accepts absent switch, option, void and native fields', () => {
    expect(proto.createPacketBuffer('packet', { mouse: 0 })).to.deep.equal(Buffer.from([0, 0, 0, 0, 0]))
    expect(proto.createPacketBuffer('packet', { mouse: 2, x: 7, y: 8, extra: 9, nbt: 5, anonNbt: 6 })).to.deep.equal(Buffer.from([2, 7, 1, 8, 1, 9, 5, 6]))
  })
})
