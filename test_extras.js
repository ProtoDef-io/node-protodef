const ProtoDef = require('./src/index').ProtoDef

const proto = new ProtoDef()

// Test basic types are available
console.log('Available types:', Object.keys(proto.types))

// Test the restBuffer type
try {
  const testBuffer = Buffer.from([1, 2, 3, 4, 5])
  const result = proto.read(testBuffer, 2, 'restBuffer')
  console.log('restBuffer result:', result)
} catch (e) {
  console.log('restBuffer error:', e.message)
}

// Test the loop type
try {
  const result = proto.read(Buffer.from([1, 2, 3, 0]), 0, ['loop', { type: 'i8', nt: 0 }])
  console.log('loop result:', result)
} catch (e) {
  console.log('loop error:', e.message)
}
