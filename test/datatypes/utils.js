var describe = require('mocha').describe;
var it = require('mocha').it;
var expect = require('chai').expect;
var stub = require('sinon').stub;
var _ = require('lodash');

var protocols = require('../../lib/protocols');
var utils = require('../../lib/datatypes/utils');
var getReader = require('../../lib/utils').getReader;
var getWriter = require('../../lib/utils').getWriter;
var getSizeOf = require('../../lib/utils').getSizeOf;

describe('Utils', function() {
  describe('.bool', function() {
    it('Has no tests', function() {
      throw new Error('No tests implemented');
    });
  });
  describe('.varint', function() {
    it('Has no tests', function() {
      throw new Error('No tests implemented');
    });
  });
  describe('.string', function() {
    it('Has no tests', function() {
      throw new Error('No tests implemented');
    });
  });
  describe('.cstring', function() {
    it('Has no tests', function() {
      throw new Error('No tests implemented');
    });
  });
});
