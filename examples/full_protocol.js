import { ProtoDef, Serializer, Parser } from 'protodef'
import exampleProtocol from './example_protocol.json'

const proto = new ProtoDef()
proto.addProtocol(exampleProtocol, ['login', 'toClient'])
const parser = new Parser(proto, 'packet')
const serializer = new Serializer(proto, 'packet')

serializer.write({
  name: 'success',
  params: {
    uuid: 'some uuid',
    username: 'some name'
  }
})

parser.on('error', function (err) {
  console.log(err.stack)
  console.log(err.buffer)
})

serializer.pipe(parser)

parser.on('data', function (chunk) {
  console.log(JSON.stringify(chunk.data, null, 2))
})
