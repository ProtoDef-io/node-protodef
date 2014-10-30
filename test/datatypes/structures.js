var describe = require('mocha').describe;
var it = require('mocha').it;
var expect = require('chai').expect;
var stub = require('sinon').stub;
var _ = require('lodash');

var protocols = require('../../lib/protocols');
var structures = require('../../lib/datatypes/structures');
var getReader = require('../../lib/utils').getReader;
var getWriter = require('../../lib/utils').getWriter;
var getSizeOf = require('../../lib/utils').getSizeOf;

describe('Structures', function() {
  // Arrays take two arguments : 
  // count OR countType : the length of the array.
  //   - count can either be the name of a field, or a number, or a function.
  //   - countType is a type string. Might be remove in the future.
  // fields OR type : the type of the element inside the array.
  //   - if type, the fieldInfo of the type to read.
  //   - if fields, it is automagically expended to a container.
  describe('.array', function() {
    var reader;
    var writer;
    var sizeof;
    var protocol;
    before(function() {
      protocol = protocols.create();
      reader = getReader(structures.array).bind(protocol, new Buffer([0x02, 0x04, 0x03]));
      writer = getWriter(structures.array).bind(protocol);
      sizeof = getSizeOf(structures.array).bind(protocol);
    });
    it('Reads with countType', function() {
      var val = reader(0, { type: 'ubyte', countType: 'ubyte' }, {});
      expect(val).to.deep.eql({ size: 3, value: [0x04, 0x03]});
    });
    it('Reads with count number', function() {
      var val = reader(0, { type: 'ubyte', count: 3 }, {});
      expect(val).to.deep.eql({ size: 3, value: [0x02, 0x04, 0x03] });
    });
    it('Reads with count field', function() {
      var val = reader(0, { type: 'ubyte', count: 'count' }, { count: 3 });
      expect(val).to.deep.eql({ size: 3, value: [0x02, 0x04, 0x03] });
    });
    it('Reads with count function', function() {
      var val = reader(0, { type: 'ubyte', count: function(fields) { return fields.count } }, { count: 3 });
      expect(val).to.deep.eql({ size: 3, value: [0x02, 0x04, 0x03] });
    });
    it('Writes with countType', function() {
      var buf = new Buffer(3);
      var val = writer([0x04, 0x03], buf, offset, { type: 'ubyte', countType: 'ubyte' }, {});
      expect(val).to.eql(3);
      expect(buf).to.deep.eql([0x02, 0x04, 0x03]);
    });
    it('Writes with count number', function() {
      var buf = new Buffer(3);
      var val = writer([0x02, 0x04, 0x03], buf, offset, { type: 'ubyte', count: 3 }, {});
      expect(val).to.eql(3);
      expect(buf).to.deep.eql([0x02, 0x04, 0x03]);
    });
    it('Writes with count field', function() {
      var buf = new Buffer(3);
      var val = writer([0x02, 0x04, 0x03], buf, offset, { type: 'ubyte', count: 'count' }, { count: 3 });
      expect(val).to.eql(3);
      expect(buf).to.deep.eql([0x02, 0x04, 0x03]);
    });
    it('Writes with count function', function() {
      var buf = new Buffer(3);
      var val = writer([0x02, 0x04, 0x03], buf, offset, { type: 'ubyte', count: function(fields) { return fields.count; } }, { count: 3 });
      expect(val).to.eql(3);
      expect(buf).to.deep.eql([0x02, 0x04, 0x03]);
    });
  });
  describe('.count', function() {
    it('Has no tests', function() {
      throw new Error('No tests implemented');
    });
  });
  describe('.struct', function() {
    var reader;
    var writer;
    var sizeof;
    var protocol;
    before(function() {
      protocol = protocols.create();
      reader = getReader(structures.struct).bind(protocol, new Buffer([0x02, 0x04, 0x03]));
      writer = getWriter(structures.struct).bind(protocol);
      sizeof = getSizeOf(structures.struct).bind(protocol);
    });
    it('Reads', function() {
      var val = reader(0, { fields: [
        { name: 'test1', type: 'ubyte' },
        { name: 'test2', type: 'ushort' }
      ]}, {});
      expect(val).to.deep.eql({ size: 3, value: { test1: 0x02, test2: 0x0403 } });
    });
    it('Writes', function() {
      throw new Error('No tests implemented');
      //var val = writer
    });
  });
});

