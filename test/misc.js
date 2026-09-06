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

describe('hash', () => {
  const { digest } = require('../src/hash')
  const types = {
    crc32: ['hash', { alg: 'crc32', type: 'u32', body: ['buffer', { count: 9 }] }],
    crc32c: ['hash', { alg: 'crc32c', type: 'u32', body: ['buffer', { count: 9 }] }],
    signed: ['hash', { alg: 'crc32c', type: 'HashCode', body: ['buffer', { count: 9 }] }],
    HashCode: 'i32',
    asVarint: ['hash', { alg: 'crc32c', type: 'varint', body: ['buffer', { count: 9 }] }],
    sha256: ['hash', { alg: 'sha256', type: ['buffer', { count: 32 }], body: ['buffer', { count: 9 }] }],
    // A field of the enclosing container selects the body's type
    tagged: ['container', [
      { name: 'kind', type: 'u8' },
      { name: 'hash', type: ['hash', { alg: 'crc32c', type: 'u32', body: ['switch', { compareTo: 'kind', fields: { 0: 'u8', 1: 'u16' } }] }] }
    ]],
    // A hash over a list of hashes
    entry: ['container', [{ name: 'key', type: ['pstring', { countType: 'u8' }] }, { name: 'value', type: 'li32' }]],
    list: ['array', { countType: 'u8', type: ['hash', { alg: 'crc32c', type: 'lu32', body: 'entry' }] }],
    nested: ['hash', { alg: 'crc32c', type: 'lu32', body: 'list' }]
  }
  const proto = new ProtoDef()
  proto.addTypes(types)
  const compiler = new ProtoDefCompiler()
  compiler.addTypesToCompile(types)
  const compiled = compiler.compileProtoDefSync()
  const check = Buffer.from('123456789')
  const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b }
  const lu32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b }

  it('crc32 and crc32c match their check values', () => {
    assert.strictEqual(digest('crc32', check), 0xCBF43926)
    assert.strictEqual(digest('crc32c', check), 0xE3069283)
  })

  for (const [label, p] of [['interpreted', proto], ['compiled', compiled]]) {
    describe(label, () => {
      it('writes the hash of the serialized body', () => {
        assert.deepStrictEqual(p.createPacketBuffer('crc32', check), u32(0xCBF43926))
        assert.deepStrictEqual(p.createPacketBuffer('crc32c', check), u32(0xE3069283))
      })
      it('reads the hash, not the value', () => {
        assert.strictEqual(p.parsePacketBuffer('crc32c', u32(0xE3069283)).data, 0xE3069283)
      })
      it('writes a signed type in two\'s complement', () => {
        const buffer = p.createPacketBuffer('signed', check)
        assert.deepStrictEqual(buffer, u32(0xE3069283))
        assert.strictEqual(p.parsePacketBuffer('signed', buffer).data, 0xE3069283 | 0)
      })
      it('sizes a fixed-size type without hashing', () => {
        assert.strictEqual(p.sizeOf(check, 'signed'), 4)
        assert.strictEqual(p.sizeOf(check, 'sha256'), 32)
      })
      it('sizes a variable-size type from the hash', () => {
        const buffer = p.createPacketBuffer('asVarint', check)
        assert.strictEqual(p.sizeOf(check, 'asVarint'), buffer.length)
        assert.deepStrictEqual(buffer, p.createPacketBuffer('varint', 0xE3069283 | 0))
      })
      it('writes a crypto digest as a buffer', () => {
        assert.deepStrictEqual(p.createPacketBuffer('sha256', check),
          require('crypto').createHash('sha256').update(check).digest())
      })
      it('resolves body fields against the enclosing container', () => {
        assert.deepStrictEqual(p.createPacketBuffer('tagged', { kind: 1, hash: 300 }),
          Buffer.concat([Buffer.from([1]), u32(digest('crc32c', Buffer.from([0x01, 0x2C])))]))
        assert.deepStrictEqual(p.createPacketBuffer('tagged', { kind: 0, hash: 44 }),
          Buffer.concat([Buffer.from([0]), u32(digest('crc32c', Buffer.from([44])))]))
      })
      it('nests hashes of hashes', () => {
        const value = [{ key: 'a', value: 1 }, { key: 'b', value: 2 }]
        const list = Buffer.concat([Buffer.from([2]), ...value.map(entry => lu32(digest('crc32c', p.createPacketBuffer('entry', entry))))])
        assert.deepStrictEqual(p.createPacketBuffer('list', value), list)
        assert.deepStrictEqual(p.createPacketBuffer('nested', value), lu32(digest('crc32c', list)))
      })
    })
  }
})
