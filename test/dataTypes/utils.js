var assert = require('power-assert');
var expect = require('chai').expect;

var utils = require('../../dist/datatypes/utils');
var getReader = function(dataType) { return dataType[0]; };
var getWriter = function(dataType) { return dataType[1]; };
var getSizeOf = function(dataType) { return dataType[2]; };

describe('Utils', function() {
  describe('.bool', function() {
    it('Reads false value for binary 0', function() {
      assert.deepEqual(getReader(utils.bool)(new Buffer([0]), 0), {value: false, size: 1});
    });
    it('Reads true for every other binary value', function() {
      var buf = new Buffer([0]);
      var i = 1;
      while (i < 256) {
        buf[0] = i++;
        assert.deepEqual(getReader(utils.bool)(buf, 0), {value: true, size: 1});
      }
    });
    it('Writes false', function() {
      var buffer = new Buffer(1);
      getWriter(utils.bool)(false, buffer, 0);
      assert.deepEqual(buffer, new Buffer([0]));
    });
    it('Writes true', function() {
      var buffer = new Buffer(1);
      getWriter(utils.bool)(true, buffer, 0);
      assert.notDeepEqual(buffer, new Buffer([0]));
    });
    it('Has a size of 1', function() {
      assert.equal(typeof getSizeOf(utils.bool), "number");
      assert.equal(getSizeOf(utils.bool), 1);
    });
  });
  describe('.varint', function() {
    it('Reads 8-bit integer', function() {
      var buf = new Buffer([0x01]);
      expect(getReader(utils.varint)(buf, 0, [], {})).to.deep.equal({
        value: 1,
        size: 1
      });
    });
    it('Reads 8-bit maximum integer', function() {
      var buf = new Buffer([0x7f]);
      expect(getReader(utils.varint)(buf, 0, [], {})).to.deep.equal({
        value: 0x7f,
        size: 1
      });
    });
    it('Reads 16-bit integer', function() { // example from https://developers.google.com/protocol-buffers/docs/encoding#varints
      var buf = new Buffer([0xac, 0x02]);
      expect(getReader(utils.varint)(buf, 0, [], {})).to.deep.equal({
        value: 300,
        size: 2
      });
    });
    it('Reads 24-bit integer', function() {
      var buf = new Buffer([0xa0, 0x8d, 0x06]);
      expect(getReader(utils.varint)(buf, 0, [], {})).to.deep.equal({
        value: 100000,
        size: 3
      });
    });
    it('Reads 32-bit integer', function() {
      var buf = new Buffer([0x84, 0x86, 0x88, 0x08]);
      expect(getReader(utils.varint)(buf, 0, [], {})).to.deep.equal({
        value: 0x01020304,
        size: 4
      });
    });
    it('Reads negative integer', function() {
      var buf = new Buffer([0xff, 0xff, 0xff, 0xff, 0x0f]);
      expect(getReader(utils.varint)(buf, 0, [], {})).to.deep.equal({
        value: -1, // 0xffffffff,
        size: 5
      });
    });

    it('Writes 8-bit maximum integer', function() {
      var buf = new Buffer(1);
      assert.equal(getWriter(utils.varint)(0x7f, buf, 0, [], {}), 1);
      assert.deepEqual(buf, new Buffer([0x7f]));
    });
    it('Writes 16-bit integer', function() {
      var buf = new Buffer(2);
      assert.equal(getWriter(utils.varint)(300, buf, 0, [], {}), 2);
      assert.deepEqual(buf, new Buffer([0xac, 0x02]));
    });
    it('Writes 24-bit integer', function() {
      var buf = new Buffer(3);
      assert.equal(getWriter(utils.varint)(100000, buf, 0, [], {}), 3);
      assert.deepEqual(buf, new Buffer([0xa0, 0x8d, 0x06]));
    });
    it('Writes 32-bit integer', function() {
      var buf = new Buffer(4);
      assert.equal(getWriter(utils.varint)(0x01020304, buf, 0, [], {}), 4);
      assert.deepEqual(buf, new Buffer([0x84, 0x86, 0x88, 0x08]));
    });
    it('Writes negative integer', function() {
      var buf = new Buffer(5);
      assert.equal(getWriter(utils.varint)(-1, buf, 0, [], {}), 5);
      assert.deepEqual(buf, new Buffer([0xff, 0xff, 0xff, 0xff, 0x0f]));
    });

    it('Throws on read >32-bit integer', function() {
      var buf = new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0x0f]);

      try {
        // 0xffffffff0f (5 bytes) is -1, as expected for varint (32-bit)
        // 0xffffffffff0f (6 bytes) and longer should not parse
        expect(getReader(utils.varint)(buf, 0, [], {})).to.deep.equal({
          value: -1, // 0xffffffff,
          size: 6
        });
        throw new Error('unexpectedly did not fail to read >32-bit varint');
      } catch (e) {
        assert.equal(e.name, 'AssertionError');
        // expect exception
        // TODO: other return value?
      }
    });

    it('Size of small positive integer', function() {
      assert.equal(getSizeOf(utils.varint)(1), 1);
    });
    it('Size of small negative integer', function() {
      assert.equal(getSizeOf(utils.varint)(-1), 5);
    });
    it('Size of 16-bit integer', function() {
      assert.equal(getSizeOf(utils.varint)(0x100), 2);
    });
    it('Size of 24-bit integer', function() {
      assert.equal(getSizeOf(utils.varint)(0x10000), 3);
    });
    it('Size of 32-bit integer', function() {
      assert.equal(getSizeOf(utils.varint)(0xabcdef), 4);
    });
    it('Size of 40-bit integer', function() {
      assert.equal(getSizeOf(utils.varint)(0x7fffffff), 5);
    });
    it('Size of 48-bit integer throws', function() {
      try {
        getSizeOf(utils.varint)(0x7fffffffff);
        throw new Error('unexpectedly did not throw getting varint size of 40-bit');
      } catch (e) {
        assert.equal(e.name, 'AssertionError');
        assert.equal(e.toString(), 'AssertionError: value is out of range for 32-bit varint');
      }
    });



    it('Writes maximum varint 2147483647', function() {
      var buf = new Buffer(5);
      assert.equal(getWriter(utils.varint)(2147483647, buf, 0, [], {}), 5);
      assert.deepEqual(buf, new Buffer([0xff, 0xff, 0xff, 0xff, 0x07]));
    });
    it('Writes minimum varint -2147483648', function() {
      var buf = new Buffer(5);
      assert.equal(getWriter(utils.varint)(-2147483648, buf, 0, [], {}), 5);
      assert.deepEqual(buf, new Buffer([0x80, 0x80, 0x80, 0x80, 0x08]));
    });

    it('Throws on writing maximum+1', function() {
      var buf = new Buffer(5);
      try {
        getWriter(utils.varint)(2147483647 + 1, buf, 0, [], {});
        throw new Error('unexpectedly did not fail to write 2147483647 + 1 varint');
      } catch (e) {
        assert.equal(e.name, 'AssertionError');
        assert.equal(e.toString(), 'AssertionError: value is out of range for 32-bit varint');
        //throw e;
      }
    });
    it('Throws on writing minimum-1', function() {
      var buf = new Buffer(5);
      try {
        getWriter(utils.varint)(-2147483648 - 1, buf, 0, [], {});
        throw new Error('unexpectedly did not fail to write -2147483648 - 1varint');
      } catch (e) {
        assert.equal(e.name, 'AssertionError');
        assert.equal(e.toString(), 'AssertionError: value is out of range for 32-bit varint');
        //throw e;
      }
    });
    it('Throws on writing 2**32-1', function() {
      var buf = new Buffer(5);
      try {
        getWriter(utils.varint)(0xffffffff, buf, 0, [], {});
        throw new Error('unexpectedly did not fail to write 2**32-1 varint');
      } catch (e) {
        assert.equal(e.name, 'AssertionError');
        assert.equal(e.toString(), 'AssertionError: value is out of range for 32-bit varint');
        //throw e;
      }
    });
    it('Throws on writing 2**32', function() {
      var buf = new Buffer(5);
      try {
        getWriter(utils.varint)(0x100000000, buf, 0, [], {});
        throw new Error('unexpectedly did not fail to write 2**32 varint');
      } catch (e) {
        assert.equal(e.name, 'AssertionError');
        assert.equal(e.toString(), 'AssertionError: value is out of range for 32-bit varint');
        //throw e;
      }
    });
  });

  describe('.varlong', function() {
    // first, ensure same tests pass as varint
    it('Reads 8-bit integer', function() {
      var buf = new Buffer([0x01]);
      expect(getReader(utils.varlong)(buf, 0, [], {})).to.deep.equal({
        value: 1,
        size: 1
      });
    });
    it('Reads 8-bit maximum integer', function() {
      var buf = new Buffer([0x7f]);
      expect(getReader(utils.varlong)(buf, 0, [], {})).to.deep.equal({
        value: 0x7f,
        size: 1
      });
    });
    it('Reads 16-bit integer', function() { // example from https://developers.google.com/protocol-buffers/docs/encoding#varlongs
      var buf = new Buffer([0xac, 0x02]);
      expect(getReader(utils.varlong)(buf, 0, [], {})).to.deep.equal({
        value: 300,
        size: 2
      });
    });
    it('Reads 24-bit integer', function() {
      var buf = new Buffer([0xa0, 0x8d, 0x06]);
      expect(getReader(utils.varlong)(buf, 0, [], {})).to.deep.equal({
        value: 100000,
        size: 3
      });
    });
    it('Reads 32-bit integer', function() {
      var buf = new Buffer([0x84, 0x86, 0x88, 0x08]);
      expect(getReader(utils.varlong)(buf, 0, [], {})).to.deep.equal({
        value: 0x01020304,
        size: 4
      });
    });

    // varlong differs from varint here

    it('Reads large unsigned 32-bit integer without negative wraparound', function() {
      var buf = new Buffer([0xff, 0xff, 0xff, 0xff, 0x0f]);
      expect(getReader(utils.varlong)(buf, 0, [], {})).to.deep.equal({
        value: 0xffffffff, // varlong 4294967295, not -1! (varint = -1)
        size: 5
      });
    });
    it('Read even larger >32-bit integer', function() {
      var buf = new Buffer([0xff, 0xff, 0xff, 0xff, 0xff, 0x0f]);
      // 0xffffffff0f (5 bytes) is -1 for varint (32-bit)
      // 0xffffffffff0f (6 bytes) and longer is varlong
      expect(getReader(utils.varlong)(buf, 0, [], {})).to.deep.equal({
        value: 0x7fffffffff, // 549755813887
        size: 6
      });
    });


    it('Writes 8-bit maximum integer', function() {
      var buf = new Buffer(1);
      assert.equal(getWriter(utils.varlong)(0x7f, buf, 0, [], {}), 1);
      assert.deepEqual(buf, new Buffer([0x7f]));
    });
    it('Writes 16-bit integer', function() {
      var buf = new Buffer(2);
      assert.equal(getWriter(utils.varlong)(300, buf, 0, [], {}), 2);
      assert.deepEqual(buf, new Buffer([0xac, 0x02]));
    });
    it('Writes 24-bit integer', function() {
      var buf = new Buffer(3);
      assert.equal(getWriter(utils.varlong)(100000, buf, 0, [], {}), 3);
      assert.deepEqual(buf, new Buffer([0xa0, 0x8d, 0x06]));
    });
    it('Writes 32-bit integer', function() {
      var buf = new Buffer(4);
      assert.equal(getWriter(utils.varlong)(0x01020304, buf, 0, [], {}), 4);
      assert.deepEqual(buf, new Buffer([0x84, 0x86, 0x88, 0x08]));
    });
    /* TODO: fix negatives :(
    it('Writes negative integer', function() {
      var buf = new Buffer(5);
      assert.equal(getWriter(utils.varlong)(-1, buf, 0, [], {}), 5);
      assert.deepEqual(buf, new Buffer([0xff, 0xff, 0xff, 0xff, 0x0f]));
    });
    */

    it('Size of small positive integer', function() {
      assert.equal(getSizeOf(utils.varlong)(1), 1);
    });
    /* TODO: fix negatives, should be 10! (ff's)
    it('Size of small negative integer', function() {
      assert.equal(getSizeOf(utils.varlong)(-1), 10);
    });
    */
    it('Size of 16-bit integer', function() {
      assert.equal(getSizeOf(utils.varlong)(0x100), 2);
    });
    it('Size of 24-bit integer', function() {
      assert.equal(getSizeOf(utils.varlong)(0x10000), 3);
    });
    it('Size of 32-bit integer', function() {
      assert.equal(getSizeOf(utils.varlong)(0xabcdef), 4);
    });
    it('Size of 48-bit integer', function() {
      assert.equal(getSizeOf(utils.varint)(0x7fffffff), 5);
    });
    it('Size of 48-bit integer', function() {
      assert.equal(getSizeOf(utils.varlong)(0x7fffffffff), 6);
    });
    it('Size of 56-bit integer', function() {
      assert.equal(getSizeOf(utils.varlong)(0x7fffffffffff), 7);
    });
    it('Size of 64-bit integer', function() {
      assert.equal(getSizeOf(utils.varlong)(0x7ffffffffffff), 8);
    });
    // can't go much higher in JavaScript numeric type - 0x7fffffffffffff rounds to 0x80000000000000


    // >32-bit varlong-specific test code

    it('Writes maximum varint 2147483647', function() {
      var buf = new Buffer(5);
      assert.equal(getWriter(utils.varlong)(2147483647, buf, 0, [], {}), 5);
      assert.deepEqual(buf, new Buffer([0xff, 0xff, 0xff, 0xff, 0x07]));
    });
    it('Writes minimum varint -2147483648', function() {
      var buf = new Buffer(5);
      assert.equal(getWriter(utils.varlong)(-2147483648, buf, 0, [], {}), 5);
      assert.deepEqual(buf, new Buffer([0x80, 0x80, 0x80, 0x80, 0x08]));
    });

    it('Writes varint maximum+1', function() {
      var buf = new Buffer(5);
      assert.equal(getWriter(utils.varlong)(2147483647 + 1, buf, 0, [], {}), 5);
      assert.deepEqual(buf, new Buffer([0x80, 0x80, 0x80, 0x80, 0x08]));
      assert.deepEqual(getReader(utils.varlong)(buf, 0), { value: 2147483647 + 1, size: 5 });
    });
    it('Does not throw on writing varint minimum-1', function() {
      var buf = new Buffer(5);
      getWriter(utils.varlong)(-2147483648 - 1, buf, 0, [], {});
      // -2147483648 - 1 = -2147483649 (floating), but deserialized as +2147483647 (32-bit wrap) TODO: fix
    });
    it('Writes 2**32-1', function() {
      var buf = new Buffer(5);
      assert.equal(getWriter(utils.varlong)(0xffffffff, buf, 0, [], {}), 5);
      assert.deepEqual(buf, new Buffer([0xff, 0xff, 0xff, 0xff, 0x0f]));
      assert.deepEqual(getReader(utils.varlong)(buf, 0), { value: 0xffffffff, size: 5 });
    });
    /*
    it('Does not throw on writing 2**32', function() {
      var buf = new Buffer(5);
      getWriter(utils.varlong)(0x100000000, buf, 0, [], {});
      // incorrectly writes 0x80 0x00 and decodes to 0 TODO: fix
    });
    */
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
    it('Reads an unsigned 8 bit number', function() {
      var buf = new Buffer([0xff]);
      var typeArgs = [
        { "name": "one", "size": 8, "signed": false }
      ];
      expect(getReader(utils.bitfield)(buf, 0, typeArgs, {})).to.deep.equal({
        value: { "one": 255 },
        size: 1
      });
    });
    it('Reads a signed 8 bit number', function() {
      var buf = new Buffer([0xff]);
      var typeArgs = [
        { "name": "one", "size": 8, "signed": true }
      ];
      expect(getReader(utils.bitfield)(buf, 0, typeArgs, {})).to.deep.equal({
        value: { "one": -1 },
        size: 1
      });
    });
    it('Reads multiple signed 8 bit numbers', function() {
      var buf = new Buffer([0xff, 0x80, 0x12]);
      var typeArgs = [
        { "name": "one", "size": 8, "signed": true },
        { "name": "two", "size": 8, "signed": true },
        { "name": "three", "size": 8, "signed": true }
      ];
      expect(getReader(utils.bitfield)(buf, 0, typeArgs, {})).to.deep.equal({
        value: { "one": -1, "two": -128, "three": 18 },
        size: 3
      });
    });
    it('Reads multiple unsigned 4 bit numbers', function() {
      var buf = new Buffer([0xff, 0x80]);
      var typeArgs = [
        { "name": "one", "size": 4, "signed": false },
        { "name": "two", "size": 4, "signed": false },
        { "name": "three", "size": 4, "signed": false }
      ];
      expect(getReader(utils.bitfield)(buf, 0, typeArgs, {})).to.deep.equal({
        value: { "one": 15, "two": 15, "three": 8 },
        size: 2
      });
    });
    it('Reads multiple signed 4 bit numbers', function() {
      var buf = new Buffer([0xff, 0x80]);
      var typeArgs = [
        { "name": "one", "size": 4, "signed": true },
        { "name": "two", "size": 4, "signed": true },
        { "name": "three", "size": 4, "signed": true }
      ];
      expect(getReader(utils.bitfield)(buf, 0, typeArgs, {})).to.deep.equal({
        value: { "one": -1, "two": -1, "three": -8 },
        size: 2
      });
    });
    it('Reads an unsigned 12 bit number', function() {
      var buf = new Buffer([0xff, 0x80]);
      var typeArgs = [
        { "name": "one", "size": 12, "signed": false }
      ];
      assert.deepEqual(getReader(utils.bitfield)(buf, 0, typeArgs, {}), {
        value: { "one": 4088 },
        size: 2
      });
    });
    it('Reads a complex structure', function() {
      var buf = new Buffer([0x00, 0x00, 0x03, 0x05, 0x30, 0x42, 0xE0, 0x65]);
      var typeArgs = [
        { "name": "x", "size": 26, "signed": true },
        { "name": "y", "size": 12, "signed": true },
        { "name": "z", "size": 26, "signed": true }
      ];
      var value = { x: 12, y: 332, z: 4382821 };
      assert.deepEqual(getReader(utils.bitfield)(buf, 0, typeArgs, {}), {
        value: value,
        size: 8
      });
    });
    it('Writes an unsigned 8 bit number', function() {
      var buf = new Buffer(1);
      var typeArgs = [
        { "name": "one", "size": 8, "signed": false }
      ];
      var value = { "one": 0xff };
      assert.equal(getWriter(utils.bitfield)(value, buf, 0, typeArgs, {}), 1);
      assert.deepEqual(buf, new Buffer([0xff]));
    });
    it('Writes a signed 8 bit number', function() {
      var buf = new Buffer(1);
      var typeArgs = [
        { "name": "one", "size": 8, "signed": true }
      ];
      var value = { "one": -1 };
      assert.equal(getWriter(utils.bitfield)(value, buf, 0, typeArgs, {}), 1);
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
      assert.equal(getWriter(utils.bitfield)(value, buf, 0, typeArgs, {}), 3);
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
      assert.equal(getWriter(utils.bitfield)(value, buf, 0, typeArgs, {}), 2);
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
      assert.equal(getWriter(utils.bitfield)(value, buf, 0, typeArgs, {}), 2);
      assert.deepEqual(buf, new Buffer([0xff, 0x80]));
    });
    it('Writes an unsigned 12 bit number', function() {
      var buf = new Buffer(2);
      var typeArgs = [
        { "name": "one", "size": 12, "signed": false }
      ];
      var value = { "one": 4088 };
      assert.equal(getWriter(utils.bitfield)(value, buf, 0, typeArgs, {}), 2);
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
      assert.equal(getWriter(utils.bitfield)(value, buf, 0, typeArgs, {}), 8);
      assert.deepEqual(buf, new Buffer([0x00, 0x00, 0x03, 0x05, 0x30, 0x42, 0xE0, 0x65]));
    });
  });
});
