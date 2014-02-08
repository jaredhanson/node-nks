var debug = require('debug')('nks');


function Finder() {
  this._mechs = [];
}

Finder.prototype.use = function(fn) {
  this._mechs.push(fn);
};

Finder.prototype.find = function(issuer, options, cb) {
  if (typeof options == 'function') {
    cb = options;
    options = undefined;
  }
  options = options || {};
  
  var self = this
    , stack = this._mechs
    , idx = 0;
  
  debug('key %s', issuer);
  
  function next(err, key) {
    if (err || key) { return cb(err, key); }
    
    var layer = stack[idx++];
    if (!layer) { return cb(new Error('Failed to resolve identifier "' + id + '"')); }
    
    try {
      debug('resolve %s', layer.name || 'anonymous');
      layer(issuer, options, next);
    } catch (ex) {
      next(ex);
    }
  }
  next();
};


module.exports = Finder;
