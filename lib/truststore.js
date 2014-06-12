var debug = require('debug')('nks');


function TrustStore() {
  this._mechs = [];
}

TrustStore.prototype.use = function(fn) {
  this._mechs.push(fn);
};

TrustStore.prototype.key = function(entity, options, cb) {
  if (typeof options == 'function') {
    cb = options;
    options = undefined;
  }
  options = options || {};
  
  var self = this
    , stack = this._mechs
    , idx = 0;
  
  debug('id %s', entity.id);
  
  function next(err, key) {
    if (err || key) { return cb(err, key); }
    
    var layer = stack[idx++];
    if (!layer) { return cb(new Error('Failed to find keys for "' + entity.id + '"')); }
    
    try {
      debug('resolve %s', layer.name || 'anonymous');
      layer(entity, options, next);
    } catch (ex) {
      next(ex);
    }
  }
  next();
};


module.exports = TrustStore;
