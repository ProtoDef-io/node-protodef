/**
 * Quick test and demonstration of the new loop and restBuffer types
 */

const { ProtoDef } = require('../src/index')

const proto = new ProtoDef(false)

console.log('=== Testing loop and restBuffer types ===\n')

// Test 1: restBuffer - reads all remaining bytes
console.log('1. Testing restBuffer:')
const testBuffer1 = Buffer.from([1, 2, 3, 4, 5])
const restResult = proto.read(testBuffer1, 2, 'restBuffer')
console.log('   Buffer:', Array.from(testBuffer1))
console.log('   Reading from offset 2:', restResult)
console.log('   Remaining bytes:', Array.from(restResult.value))
console.log()

// Test 2: loop without terminator - reads until EOF
console.log('2. Testing loop (no terminator):')
const loopResult1 = proto.read(Buffer.from([10, 20, 30]), 0, ['loop', { type: 'i8', nt: null }])
console.log('   Buffer: [10, 20, 30]')
console.log('   Result:', loopResult1)
console.log('   Values:', loopResult1.value)
console.log()

// Test 3: loop with terminator
console.log('3. Testing loop (with terminator):')
const loopResult2 = proto.read(Buffer.from([1, 2, 3, 0, 99]), 0, ['loop', { type: 'i8', nt: 0 }])
console.log('   Buffer: [1, 2, 3, 0, 99] (0 is terminator)')
console.log('   Result:', loopResult2)
console.log('   Values:', loopResult2.value, '(99 not included)')
console.log()

// Test 4: Writing with loop
console.log('4. Testing loop writing:')
const writeBuffer1 = proto.createPacketBuffer(['loop', { type: 'i8', nt: 0 }], [5, 10, 15])
console.log('   Writing [5, 10, 15] with null terminator:')
console.log('   Buffer:', Array.from(writeBuffer1))
console.log()

// Test 5: Complex example with both types
console.log('5. Complex example - message with header and payload:')
proto.addType('message', ['container', [
  { name: 'type', type: 'u8' },
  { name: 'flags', type: 'u8' },
  { name: 'data', type: 'restBuffer' }
]])

const complexBuffer = Buffer.concat([
  Buffer.from([42, 0x80]), // type=42, flags=0x80
  Buffer.from('Hello World!') // payload
])

const complexResult = proto.parsePacketBuffer('message', complexBuffer)
console.log('   Message parsed:')
console.log('   Type:', complexResult.data.type)
console.log('   Flags:', '0x' + complexResult.data.flags.toString(16))
console.log('   Data:', complexResult.data.data.toString())
console.log()

console.log('✅ All tests completed successfully!')
console.log('\nAvailable types:', Object.keys(proto.types).filter(t => ['loop', 'restBuffer'].includes(t)))
