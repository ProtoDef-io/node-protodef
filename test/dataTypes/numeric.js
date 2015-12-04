var expect = require('chai').expect;

var numeric = require('protodef').types;
var DataGetter = require('protodef').DataGetter;
var getReader = function(dataType) {
  return async function(buffer, _fieldInfo, rootNodes) {
    var dataGetter=new DataGetter();
    dataGetter.push(buffer);
    return await dataType[0](dataGetter.get.bind(dataGetter),_fieldInfo,rootNodes);
  };
};
var getWriter = function(dataType) {
  return function(value, buffer,offset, typeArgs, context) {
    dataType[1](value,(size,f) => {
      f(buffer.slice(offset));
      offset+=size;
    },typeArgs,context);
  }
};

var testData = {
  'byte': {
    'readPos': {
      'buffer': new Buffer([0x3d]),
      'value': 61
    },
    'readNeg': {
      'buffer': new Buffer([0x86]),
      'value': -122
    },
    'writePos': {
      'buffer': new Buffer([0x00]),
      'value': 32,
      'bufferAfter': new Buffer([0x20])
    },
    'writeNeg': {
      'buffer': new Buffer([0x00]),
      'value': -122,
      'bufferAfter': new Buffer([0x86])
    }
  },
  'ubyte': {
    'readPos': {
      'buffer': new Buffer([0x3d]),
      'value': 61
    },
    'readNeg': {
      'buffer': new Buffer([0x86]),
      'value': 134
    },
    'writePos': {
      'buffer': new Buffer([0x00]),
      'value': 61,
      'bufferAfter': new Buffer([0x3d])
    },
    'writeNeg': {
      'buffer': new Buffer([0x00]),
      'value': 134,
      'bufferAfter': new Buffer([0x86])
    }
  },
  'short': {
    'readPos': {
      'buffer': new Buffer([0x30, 0x87]),
      'value': 12423
    },
    'readNeg': {
      'buffer': new Buffer([0xef, 0x77]),
      'value': -4233
    },
    'writePos': {
      'buffer': new Buffer([0x00, 0x00]),
      'value': 12423,
      'bufferAfter': new Buffer([0x30, 0x87]),
    },
    'writeNeg': {
      'buffer': new Buffer([0x00, 0x00]),
      'value': -4233,
      'bufferAfter': new Buffer([0xef, 0x77])
    }
  },
  'ushort': {
    'readPos': {
      'buffer': new Buffer([0x30, 0x87]),
      'value': 12423
    },
    'readNeg': {
      'buffer': new Buffer([0xef, 0x77]),
      'value': 61303
    },
    'writePos': {
      'buffer': new Buffer([0x00, 0x00]),
      'value': 12423,
      'bufferAfter': new Buffer([0x30, 0x87]),
    },
    'writeNeg': {
      'buffer': new Buffer([0x00, 0x00]),
      'value': 61303,
      'bufferAfter': new Buffer([0xef, 0x77])
    }
  },
  'int': {
    'readPos': {
      'buffer': new Buffer([0x00, 0x00, 0x00, 0xea]),
      'value': 234
    },
    'readNeg': {
      'buffer': new Buffer([0xff, 0xff, 0xfc, 0x00]),
      'value': -1024
    },
    'writePos': {
      'buffer': new Buffer([0x00, 0x00, 0x00, 0x00]),
      'value': 234,
      'bufferAfter': new Buffer([0x00, 0x00, 0x00, 0xea])
    },
    'writeNeg': {
      'buffer': new Buffer([0x00, 0x00, 0x00, 0x00]),
      'value': -1024,
      'bufferAfter': new Buffer([0xff, 0xff, 0xfc, 0x00])
    }
  },
  'uint': {
    'readPos': {
      'buffer': new Buffer([0x00, 0x00, 0x00, 0xea]),
      'value': 234
    },
    'readNeg': {
      'buffer': new Buffer([0xff, 0xff, 0xfc, 0x00]),
      'value': 4294966272
    },
    'writePos': {
      'buffer': new Buffer([0x00, 0x00, 0x00, 0x00]),
      'value': 234,
      'bufferAfter': new Buffer([0x00, 0x00, 0x00, 0xea])
    },
    'writeNeg': {
      'buffer': new Buffer([0x00, 0x00, 0x00, 0x00]),
      'value': 4294966272,
      'bufferAfter': new Buffer([0xff, 0xff, 0xfc, 0x00])
    }
  },
  'float': {
    'readPos': {
      'buffer': new Buffer([0x47, 0x05, 0xc3, 0x00]),
      'value': 34243
    },
    'readNeg': {
      'buffer': new Buffer([0xc6, 0x42, 0x4c, 0x00]),
      'value': -12435
    },
    'writePos': {
      'buffer': new Buffer([0x00, 0x00, 0x00, 0x00]),
      'value': 34243,
      'bufferAfter': new Buffer([0x47, 0x05, 0xc3, 0x00])
    },
    'writeNeg': {
      'buffer': new Buffer([0x00, 0x00, 0x00, 0x00]),
      'value': -12435,
      'bufferAfter': new Buffer([0xc6, 0x42, 0x4c, 0x00])
    }
  },
  'double': {
    'readPos': {
      'buffer': new Buffer([0x40, 0xe0, 0xb8, 0x60, 0x00, 0x00, 0x00, 0x00]),
      'value': 34243
    },
    'readNeg': {
      'buffer': new Buffer([0xc0, 0xc8, 0x49, 0x80, 0x00, 0x00, 0x00, 0x00]),
      'value': -12435
    },
    'writePos': {
      'buffer': new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      'value': 34243,
      'bufferAfter': new Buffer([0x40, 0xe0, 0xb8, 0x60, 0x00, 0x00, 0x00, 0x00]),
    },
    'writeNeg': {
      'buffer': new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      'value': -12435,
      'bufferAfter': new Buffer([0xc0, 0xc8, 0x49, 0x80, 0x00, 0x00, 0x00, 0x00]),
    }
  }
};

describe('Numeric', function() {
  Object.keys(testData).forEach(function(key){
    var value = testData[key];
    describe('.' + key, function() {
      var reader;
      var writer;
      before(function() {
        reader = getReader(numeric[key]);
        writer = getWriter(numeric[key]);
      });
      it('Reads positive values', async function() {
        expect(await reader(value.readPos.buffer, 0)).to.deep.eql(value.readPos.value);
      });
      it('Reads big/negative values',async function() {
        expect(await reader(value.readNeg.buffer, 0)).to.deep.eql(value.readNeg.value);
      });
      it('Writes positive values', function() {
        writer(value.writePos.value, value.writePos.buffer, 0);
        expect(value.writePos.buffer).to.deep.eql(value.writePos.bufferAfter);
      });
      it('Writes negative values', function() {
        writer(value.writeNeg.value, value.writeNeg.buffer, 0);
        expect(value.writeNeg.buffer).to.deep.eql(value.writeNeg.bufferAfter);
      });
    });
  });
});
