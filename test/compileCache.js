/* eslint-env mocha */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { ProtoDefCompiler } = require('protodef').Compiler

const protocol = {
  container: 'native',
  varint: 'native',
  pstring: 'native',
  packet: ['container', [
    { name: 'id', type: 'varint' },
    { name: 'msg', type: ['pstring', { countType: 'varint' }] }
  ]]
}

function makeCompiler () {
  const compiler = new ProtoDefCompiler()
  compiler.addTypesToCompile(protocol)
  return compiler
}

describe('compileProtoDefSync cacheFile', () => {
  const cacheFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'protodef-test-')), 'proto.js')
  after(() => fs.rmSync(path.dirname(cacheFile), { recursive: true, force: true }))

  const packet = { id: 42, msg: 'hello world' }

  it('writes the cache file on first compile and still works', () => {
    const proto = makeCompiler().compileProtoDefSync({ cacheFile })
    assert.ok(fs.existsSync(cacheFile))
    const buf = proto.createPacketBuffer('packet', packet)
    assert.deepStrictEqual(proto.parsePacketBuffer('packet', buf).data, packet)
  })

  it('loads from the cache file and round-trips identically', () => {
    const proto = makeCompiler().compileProtoDefSync({ cacheFile })
    const buf = proto.createPacketBuffer('packet', packet)
    assert.deepStrictEqual(proto.parsePacketBuffer('packet', buf).data, packet)
    assert.deepStrictEqual(buf, makeCompiler().compileProtoDefSync({}).createPacketBuffer('packet', packet))
  })

  it('falls back to in-process compile when the cache path is unwritable', () => {
    const proto = makeCompiler().compileProtoDefSync({ cacheFile: path.join(cacheFile, 'not-a-dir', 'x.js') })
    const buf = proto.createPacketBuffer('packet', packet)
    assert.deepStrictEqual(proto.parsePacketBuffer('packet', buf).data, packet)
  })
})
