var assert = require('power-assert');
var expect = require('chai').expect;

var ProtoDef = require('protodef').ProtoDef;

var proto=new ProtoDef();


describe('Utils', function() {
  describe('.bool', function() {
    it('Reads false value for binary 0', async function() {
      assert.deepEqual(await proto.readBuffer(new Buffer([0]),'bool'), false);
    });
    it('Reads true for every other binary value', async function() {
      var buf = new Buffer([0]);
      var i = 1;
      while (i < 256) {
        buf[0] = i++;
        assert.deepEqual(await proto.readBuffer(buf, 'bool'), true);
      }
    });
    it('Writes false', function() {
      var buffer = new Buffer(1);
      proto.writeBuffer(false, buffer, 0,'bool');
      assert.deepEqual(buffer, new Buffer([0]));
    });
    it('Writes true', function() {
      var buffer = new Buffer(1);
      proto.writeBuffer(true, buffer, 0,'bool');
      assert.notDeepEqual(buffer, new Buffer([0]));
    });
  });
  describe('.varint', function() {
    it.skip('Has no tests', function() {
    });
  });
  describe('.buffer', function() {
    it.skip('Has no tests', function() {
    });
  });
  describe('.string', function() {
    it.skip('Has no tests', function() {
    });
  });
  describe('.void', function() {
    it.skip('Has no tests', function() {
    });
  });
  describe('.bitfield', function() {
    it('Reads an unsigned 8 bit number', async function() {
      var buf = new Buffer([0xff]);
      var typeArgs = [
        { "name": "one", "size": 8, "signed": false }
      ];
      expect(await proto.readBuffer(buf, ["bitfield",typeArgs])).to.deep.equal({ "one": 255 });
    });
    it('Reads a signed 8 bit number', async function() {
      var buf = new Buffer([0xff]);
      var typeArgs = [
        { "name": "one", "size": 8, "signed": true }
      ];
      expect(await proto.readBuffer(buf, ["bitfield",typeArgs])).to.deep.equal({ "one": -1 });
    });
    it('Reads multiple signed 8 bit numbers', async function() {
      var buf = new Buffer([0xff, 0x80, 0x12]);
      var typeArgs = [
        { "name": "one", "size": 8, "signed": true },
        { "name": "two", "size": 8, "signed": true },
        { "name": "three", "size": 8, "signed": true }
      ];
      expect(await proto.readBuffer(buf, ["bitfield",typeArgs])).to.deep.equal({ "one": -1, "two": -128, "three": 18 });
    });
    it('Reads multiple unsigned 4 bit numbers', async function() {
      var buf = new Buffer([0xff, 0x80]);
      var typeArgs = [
        { "name": "one", "size": 4, "signed": false },
        { "name": "two", "size": 4, "signed": false },
        { "name": "three", "size": 4, "signed": false }
      ];
      expect(await proto.readBuffer(buf, ["bitfield",typeArgs])).to.deep.equal({ "one": 15, "two": 15, "three": 8 });
    });
    it('Reads multiple signed 4 bit numbers', async function() {
      var buf = new Buffer([0xff, 0x80]);
      var typeArgs = [
        { "name": "one", "size": 4, "signed": true },
        { "name": "two", "size": 4, "signed": true },
        { "name": "three", "size": 4, "signed": true }
      ];
      expect(await proto.readBuffer(buf, ["bitfield",typeArgs])).to.deep.equal({ "one": -1, "two": -1, "three": -8 });
    });
    it('Reads an unsigned 12 bit number', async function() {
      var buf = new Buffer([0xff, 0x80]);
      var typeArgs = [
        { "name": "one", "size": 12, "signed": false }
      ];
      assert.deepEqual(await proto.readBuffer(buf, ["bitfield",typeArgs]), { "one": 4088 });
    });
    it('Reads a complex structure', async function() {
      var buf = new Buffer([0x00, 0x00, 0x03, 0x05, 0x30, 0x42, 0xE0, 0x65]);
      var typeArgs = [
        { "name": "x", "size": 26, "signed": true },
        { "name": "y", "size": 12, "signed": true },
        { "name": "z", "size": 26, "signed": true }
      ];
      var value = { x: 12, y: 332, z: 4382821 };
      assert.deepEqual(await proto.readBuffer(buf, ["bitfield",typeArgs]), value);
    });
    it('Writes an unsigned 8 bit number', function() {
      var buf = new Buffer(1);
      var typeArgs = [
        { "name": "one", "size": 8, "signed": false }
      ];
      var value = { "one": 0xff };
      proto.writeBuffer(value, buf, 0, ["bitfield",typeArgs], {});
      assert.deepEqual(buf, new Buffer([0xff]));
    });
    it('Writes a signed 8 bit number', function() {
      var buf = new Buffer(1);
      var typeArgs = [
        { "name": "one", "size": 8, "signed": true }
      ];
      var value = { "one": -1 };
      proto.writeBuffer(value, buf, 0, ["bitfield",typeArgs], {});
      assert.deepEqual(buf, new Buffer([0xff]));
    });
    it('Writes multiple signed 8 bit numbers', function() {
      var buf = new Buffer(3);
      var typeArgs = [
        { "name": "one", "size": 8, "signed": true },
        { "name": "two", "size": 8, "signed": true },
        { "name": "three", "size": 8, "signed": true }
      ];
      var value = { "one": -1, "two": -128, "three": 18 };
      proto.writeBuffer(value, buf, 0, ["bitfield",typeArgs], {});
      assert.deepEqual(buf, new Buffer([0xff, 0x80, 0x12]));
    });
    it('Writes multiple unsigned 4 bit numbers', function() {
      var buf = new Buffer(2);
      var typeArgs = [
        { "name": "one", "size": 4, "signed": false },
        { "name": "two", "size": 4, "signed": false },
        { "name": "three", "size": 4, "signed": false }
      ];
      var value = { "one": 15, "two": 15, "three": 8 };
      proto.writeBuffer(value, buf, 0, ["bitfield",typeArgs], {});
      assert.deepEqual(buf, new Buffer([0xff, 0x80]));
    });
    it('Writes multiple signed 4 bit numbers', function() {
      var buf = new Buffer(2);
      var typeArgs = [
        { "name": "one", "size": 4, "signed": true },
        { "name": "two", "size": 4, "signed": true },
        { "name": "three", "size": 4, "signed": true }
      ];
      var value = { "one": -1, "two": -1, "three": -8 };
      proto.writeBuffer(value, buf, 0, ["bitfield",typeArgs], {});
      assert.deepEqual(buf, new Buffer([0xff, 0x80]));
    });
    it('Writes an unsigned 12 bit number', function() {
      var buf = new Buffer(2);
      var typeArgs = [
        { "name": "one", "size": 12, "signed": false }
      ];
      var value = { "one": 4088 };
      proto.writeBuffer(value, buf, 0, ["bitfield",typeArgs], {});
      assert.deepEqual(buf, new Buffer([0xff, 0x80]));
    });
    it('Writes a complex structure', function() {
      var buf = new Buffer(8);
      var typeArgs = [
        { "name": "x", "size": 26, "signed": true },
        { "name": "y", "size": 12, "signed": true },
        { "name": "z", "size": 26, "signed": true }
      ];
      var value = { x: 12, y: 332, z: 4382821 };
      proto.writeBuffer(value, buf, 0, ["bitfield",typeArgs], {});
      assert.deepEqual(buf, new Buffer([0x00, 0x00, 0x03, 0x05, 0x30, 0x42, 0xE0, 0x65]));
    });
  });
});
