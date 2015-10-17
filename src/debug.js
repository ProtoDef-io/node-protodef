var util = require('util')

var debug;
if(process.env.NODE_DEBUG && /(ProtoDef)/.test(process.env.NODE_DEBUG)) {
  var pid = process.pid;
  debug = function(x) {
    // if console is not set up yet, then skip this.
    if(!console.error)
      return;
    console.error('PROTO: %d', pid,
      util.format.apply(util, arguments).slice(0, 500));
  };
} else {
  debug = function() {
  };
}

module.exports = debug;
