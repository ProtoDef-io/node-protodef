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

  // The compiled read returns the raw id for a value not in the mappings, so writing it back must work
  it('writes a raw integer not in the mappings (compiled)', () => {
    assert.deepStrictEqual(compiled.createPacketBuffer('name', 5), Buffer.from([5]))
    assert.strictEqual(compiled.parsePacketBuffer('name', Buffer.from([5])).data, 5)
  })
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

describe('hash', () => {
  const { digest } = require('../src/datatypes/hash')
  const varintHash = ['hash', { alg: 'crc32c', type: 'varint', body: 'Body' }]
  const inlineBody = ['hash', { alg: 'crc32c', type: 'u32', body: ['buffer', { count: 9 }] }]
  const types = {
    Body: ['buffer', { count: 9 }],
    crc32c: ['hash', { alg: 'crc32c', type: 'u32', body: 'Body' }],
    signed: ['hash', { alg: 'crc32c', type: 'HashCode', body: 'Body' }],
    HashCode: 'i32',
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

  it('crc32c matches its check value', () => {
    assert.strictEqual(digest('crc32c', check), 0xE3069283)
  })

  it('rejects an algorithm the spec does not define', () => {
    assert.throws(() => digest('sha256', check), /Unknown hash algorithm/)
    const log = console.log // the validator dumps the type it rejected
    console.log = () => {}
    try {
      assert.throws(() => new ProtoDef().addTypes({ bad: ['hash', { alg: 'sha256', type: 'u32', body: 'u8' }] }))
    } finally {
      console.log = log
    }
  })

  it('rejects a body that is not a named type', () => {
    assert.throws(() => proto.write(check, Buffer.alloc(4), 0, inlineBody), /named type/)
    const c = new ProtoDefCompiler()
    c.addTypesToCompile({ withInlineBody: inlineBody })
    assert.throws(() => c.compileProtoDefSync(), /named type/)
  })

  it('rejects a hash written as a variable-size type', () => {
    assert.throws(() => proto.sizeOf(check, varintHash), /constant size/)
    const c = new ProtoDefCompiler()
    c.addTypesToCompile({ asVarint: varintHash })
    assert.throws(() => c.compileProtoDefSync(), /constant size/)
  })

  for (const [label, p] of [['interpreted', proto], ['compiled', compiled]]) {
    describe(label, () => {
      it('writes the hash of the serialized body', () => {
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
      it('sizes without hashing', () => {
        assert.strictEqual(p.sizeOf(check, 'signed'), 4)
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
