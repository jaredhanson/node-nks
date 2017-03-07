var sort = require('stable');
var Parallel = require('node-parallel');
var debug = require('debug')('nks');


function parallelize(fn, q) {
  
  return function(done) {
    fn(q, function(err, results) {
      if (err) { return done(err); }
      return done(null, results);
    });
  }
}

function Client() {
  this.timeout = 5000;
  this._mechs = [];
  this._stages = [];
  this._prio = 0;
}

Client.prototype.use = function(mech, options) {
  options = options || {};
  
  var prio = options.priority;
  if (prio === undefined) {
    prio = this._prio++;
  } else {
    this._prio = options.priority + 1;
  }
  this._mechs.push({ impl: mech, prio: prio });
  
  // Sort, in a stable manner, the mechanisms by priority.
  var sorted = sort(this._mechs, function(lhs, rhs) {
    return rhs.prio < lhs.prio;
  });
  
  // Group the mechanisms into a 2-dimensional array of stages.  Each stage
  // contains an array of mechanisms of equal priority.  When resolving, all
  // mehanisms within a stage will be run in parallel.  If resolution succeeds
  // at that stage, lower priority mechanisms will not be attempted.  If
  // resolution fails at that stage, the mechanisms in the next highest priority
  // stage will be attempted.
  var stages = []
    , mechs = []
    , sp = sorted[0].prio
    , mech, i, len;
  for (i = 0, len = sorted.length; i < len; ++i) {
    mech = sorted[i];
    if (mech.prio == sp) {
      mechs.push(mech);
    } else {
      stages.push(mechs);
      mechs = [ mech ];
      sp = mech.prio;
    }
    
  }
  stages.push(mechs);
  this._stages = stages;
};

Client.prototype.find = function(q, cb) {
  console.log('KeyFinder#find');
  console.log(q);
  
  var self = this
    , stages = this._stages
    , stage
    , i = 0;
  
  (function iter(err) {
    if (err) { return cb(err); }

    var stage = stages[i++];
    if (!stage) {
      return cb(null);
    }
  
    var parallel = new Parallel();
    parallel.timeout(self.timeout);
  
    var mech
      , j, len;
    for (j = 0, len = stage.length; j < len; ++j) {
      mech = stage[j];
      parallel.add(parallelize(mech.impl, q));
    }
  
    parallel.done(function(err, results) {
      console.log('NKS PARALLEL DONE');
      console.log(err);
      console.log(results);
      // TODO: Handle err.  If no results, iterate
      
      var keys = []
        , j, len;
      for (j = 0, len = results.length; j < len; ++j) {
        Array.prototype.push.apply(keys, results[j]);
      }
      return cb(null, keys);
    });
  })();
};


module.exports = Client;
