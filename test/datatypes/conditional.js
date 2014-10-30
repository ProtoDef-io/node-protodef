var describe = require('mocha').describe;
var it = require('mocha').it;
var expect = require('chai').expect;
var stub = require('sinon').stub;
var _ = require('lodash');

var protocols = require('../../lib/protocols');
var conditionals = require('../../lib/datatypes/conditionals');
var getReader = require('../../lib/utils').getReader;
var getWriter = require('../../lib/utils').getWriter;
var getSizeOf = require('../../lib/utils').getSizeOf;

describe('Conditional', function() {
  describe('.switch', function() {
    it('Has no tests', function() {
      throw new Error('No tests implemented');
    });
  });
  describe('.range', function() {
    it('Has no tests', function() {
      throw new Error('No tests implemented');
    });
  });
});

