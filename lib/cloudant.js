var Connector = require ('loopback-connector').Connector,
    Driver    = require ('cloudant'),
    debug     = require ('debug')('loopback:connector:cloudant'),
    async     = require ('async'),
    util      = require ('util'),
    _         = require ('lodash');

/**
 * Initialize the Cloudant connector for the given data source
 * @param {DataSource} ds The data source instance
 * @param {Function} [cb] The cb function
 */
exports.initialize = function (ds, cb) {
  ds.connector = new Cloudant (ds.settings, ds);
  if (cb) ds.connector.connect (cb);
};

/**
 * The constructor for the Cloudant LoopBack connector
 * @param {Object} settings The settings object
 * @param {DataSource} ds The data source instance
 * @constructor
 */
function Cloudant (settings, ds) {
  debug ('Cloudant constructor settings: %j', settings);
  Connector.call (this, 'cloudant', settings);
  this.debug = settings.debug || debug.enabled;
  this.dataSource = ds;
  this.creds = settings.url || {
    account: settings.username,
    password: settings.password
  };
  this.cloudant = Driver (this.creds);
  this.pool = {};
}

util.inherits (Cloudant, Connector);

Cloudant.prototype.getTypes = function () {
  return ['db', 'nosql', 'cloudant'];
};

/**
 * Connect to Cloudant
 * @param {Function} [cb] The cb function
 *
 * @callback cb
 * @param {Error} err The error object
 * @param {Db} db The Cloudant DB object
 */
Cloudant.prototype.connect = function (cb) {
  debug ('Cloudant.prototype.connect');
  cb (null, this.cloudant);
};

/**
 * Create a new model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype.create = function (model, data, options, cb) {
  debug ('Cloudant.prototype.create %j %j %j ', model, data, options);
  var self = this,
    mo = self.selectModel (model);
  data[mo.modelView] = model;
  if (data.id) {
    data._id = data.id;
    delete data.id;
  }
  mo.db.insert (data, function (err, result) {
    debug ('Cloudant.prototype.create insert %j %j', err, result);
    cb (err, (result && result.id));
  });
};

/**
 * Find matching model instances by the filter
 *
 * @param {String} model The model name
 * @param {Object} filter The filter
 * @param {Function} [cb] The cb function
 * 
 */
Cloudant.prototype.all = function all (model, filter, options, cb) {
  debug ('Cloudant.prototype.all %j %j %j', model, filter, options);

  var self = this,
    mo = self.selectModel (model),
    query = { selector: self.buildSelector (model, filter.where) };

  if (filter.offset) query.skip  = filter.offset;
  if (filter.limit)  query.limit = filter.limit;
  query.sort  = self.buildSort (mo, model, filter.order);

  mo.db.find (query, function (err, result) {
    debug ('Cloudant.prototype.all results: %j %j', err, result);
    if (err) return cb (err, result);
    if (!options || !options.raw) {
      for (var i = 0; i < result.docs.length; i++) {
        result.docs[i].id = result.docs[i]._id;
        delete result.docs[i]._id;
        delete result.docs[i]._rev;
        delete result.docs[i][mo.modelView];
      }
    }
    cb (null, result.docs);
  });
};

Cloudant.prototype.buildSelector = function (model, where) {
  debug ('Cloudant.prototype.buildSelector %j %j', model, where);
  var self = this;
  var query = { 'loopback__model__name': model };
  if (where === null || (typeof where !== 'object')) {
    return query;
  }
  var idName = self.idName (model);
  Object.keys (where).forEach (function (k) {
    var cond = where[k];
    if (k === 'and' || k === 'or' || k === 'nor') {
      if (Array.isArray (cond)) {
        cond = cond.map (function (c) {
          return self.buildSelector (model, c);
        });
      }
      query['$' + k] = cond;
      delete query[k];
      return;
    }
    if (k === idName) {
      k = '_id';
    }
    var propName = k;
    if (k === '_id') {
      propName = idName;
    }
    var spec = false;
    var options = null;
    if (cond && cond.constructor.name === 'Object') {
      options = cond.options;
      spec = Object.keys (cond)[0];
      cond = cond[spec];
    }
    if (spec) {
      if (spec === 'between') {
        query[k] = { $gte: cond[0], $lte: cond[1] };
      } else if (spec === 'inq') {
        query[k] = {
          $in: cond.map(function (x) { return x; })
        };
      } else if (spec === 'nin') {
        query[k] = {
          $nin: cond.map(function (x) { return x; })
        };
      } else if (spec === 'like') {
        query[k] = { $regex: new RegExp(cond, options) };
      } else if (spec === 'nlike') {
        query[k] = { $not: new RegExp(cond, options) };
      } else if (spec === 'neq') {
        query[k] = { $ne: cond };
      } else if (spec === 'regexp') {
        query[k] = { $regex: cond };
      }
      else {
        query[k] = {};
        query[k]['$' + spec] = cond;
      }
    } else {
      query[k] = cond;
    }
  });
  debug ('Cloudant.prototype.buildSelector selector: %j', query);
  return query;
};

Cloudant.prototype.buildSort = function (mo, model, order) {
  debug ('Cloudant.prototype.buildSort %j', order);
  var sort = [],
    props = mo.mo.properties,
    idName = this.idName (model);

  if (!order) {
    order = idName;
  }
  
  if (typeof order === 'string') {
    order = order.split (',');
  }
  for (var i in order) {
    var k = order[i],
      m = k.match (/\s+(A|DE)SC$/),
      n = k.replace (/\s+(A|DE)SC$/, '').trim();

    if (props[n] && props[n].type === Number)
      n = n.concat (':number');
    if (props[n] && props[n].type === String)
      n = n.concat (':string');
    if (n === idName) {
      n = '_id';
    }

    if (m && m[1] === 'DE') {
      var obj = {}; obj[n] = 'desc';
      sort.push (obj);
    } else {
      var obj = {}; obj[n] = 'asc';
      sort.push (obj);
    }
  }
  debug ('Cloudant.prototype.buildSort order: %j sort: %j', order, sort);
  return sort;
}

/**
 * Delete a model instance by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param [cb] The cb function
 */
Cloudant.prototype.destroy = function destroy (model, id, options, cb) {
  debug ('Cloudant.prototype.destroy %j %j %j', model, id, options);

  var self = this,
      mo = self.selectModel (model);

  mo.db.head (id, function (err, stuff, headers) {
    if (err) return cb (err, []);
    if (headers && !headers.etag) return cb (err, null);
    var rev = headers.etag.substr (1, headers.etag.length - 2);
    mo.db.destroy (id, rev, function (err, result) {
      if (err) return cb (err, null);
      cb (null, { _id: id, _rev: _rev, _deleted: true });
    });
  });
};

/**
 * Delete all instances for the given model
 * @param {String} model The model name
 * @param {Object} [where] The filter for where
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype.destroyAll = function destroyAll (model, where, options, cb) {
  debug ('Cloudant.prototype.destroyAll %j %j %j', model, where, options);

  var self = this, dels = [],
      mo = self.selectModel (model);

  self.all (model, { where: where }, { raw: true }, function (err, docs) {
    if (err) return cb (err, null);
    async.each (docs, function (doc, cb2) {
      mo.db.destroy (doc._id, doc._rev, function (err, result) {
        debug ('Cloudant.prototype.destroyAll db.destroy %j %j', err, result);
        if (result) {
          dels.push ({
            _id: result.id,
            _rev: result.rev,
            _deleted: result.ok
          });
        }
        cb2 (err);
      });
    }, function (err) {
      cb (err, dels);
    });
  });
};

/**
 * Count the number of instances for the given model
 *
 * @param {String} model The model name
 * @param {Function} [cb] The cb function
 * @param {Object} filter The filter for where
 *
 */
Cloudant.prototype.count = function count (model, where, options, cb) {
  debug('Cloudant.prototype.count %j %j %j', model, where, options);
  var self = this;
  self.all (model, { where: where }, {}, function (err, docs) {
    cb (err, (docs && docs.length));
  });
};

/**
 * Check if a model instance exists by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Function} [callback] The callback function
 *
 */
Cloudant.prototype.exists = function (model, id, options, cb) {
  debug ('Cloudant.prototype.exists %j %j %j', model, id, options);
  var self = this;
  self.count (model, { id: id }, {}, function (err, cnt) {
    if (err) return cb (err, 0);
    cb (null, cnt);
  });
};

/**
 * Update properties for the model instance data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype.updateAttributes = function (model, id, data, options, cb) {
  debug ('Cloudant.prototype.updateAttributes %j %j %j', model, id, data, options);
  var self = this,
      mo = self.selectModel (model);
  
  mo.db.get (id, function (err, doc) {
    if (err) cb (err, doc);
    _.merge (doc, data);
    self.create (model, doc, {}, cb);
  });
};

/**
 * Update all matching instances
 * @param {String} model The model name
 * @param {Object} where The search criteria
 * @param {Object} data The property/value pairs to be updated
 * @callback {Function} cb Cb function
 */
Cloudant.prototype.updateAll = function updateAll (model, where, data, options, cb) {
  debug ('Cloudant.prototype.updateAll %j %j %j %j', model, where, data, options);  
  var self = this,
      mo = self.selectModel (model);
  
  self.all (model, { where: where }, { raw: true }, function (err, docs) {
    if (err) return cb (err, docs);

    for (var i = 0; i < docs.length; i++) {
      _.merge (docs[i], data);
    }

    debug ('Cloudant.prototype.updateAll bulk docs: %j', docs);      
    mo.db.bulk ({ docs: docs }, function (err, result) {
      cb (err, result);
    });
  });
};
Cloudant.prototype.update = Cloudant.prototype.updateAll;

/**
 * Ping the DB for connectivity
 * @callback {Function} cb Callback with success or failure
 */
Cloudant.prototype.ping = function (cb) {
  debug ('Cloudant.prototype.ping');
  this.cloudant.db.list (function (err, result) {
    debug ('Cloudant.prototype.ping results %j %j', err, result);
    if (err) cb ('ping failed');
    else cb ();
  });
};

/**
 * Select the correct DB. This is typically specified on the datasource
 * configuration but this connector also supports per model DB config
 * @param {String} model The model name
 */
Cloudant.prototype.selectModel = function (model, migrate) {
  var dbName, modelView, db, mo, s = this.settings;

  db = this.pool[model];
  if (db && !migrate) return db;

  mo = this._models[model];
  if (mo && mo.settings.cloudant) {
    dbName = mo.settings.cloudant.db;
    modelView = mo.settings.cloudant.modelViewName;
  }
  if (!dbName) dbName = (s.database || s.db || 'test');
  if (!modelView) modelView = (s.modelViewName || 'loopback__model__name');

  debug ('Cloudant.prototype.selectModel use %j', dbName);
  this.pool[model] = {
    mo: mo,
    db: this.cloudant.use(dbName),
    modelView: modelView
  };

  return this.pool[model];
}

/**
 * Perform autoupdate for the given models. It basically calls db.index()
 * @param {String[]} [models] A model name or an array of model names. If not
 * present, apply to all models
 * @param {Function} [cb] The callback function
 */
Cloudant.prototype.autoupdate = function (models, cb) {
  debug ('Cloudant.prototype.autoupdate %j', models);
  autoupdate (models, cb);
};

/**
 * Perform automigrate for the given models.
 * @param {String[]} [models] A model name or an array of model names. If not
 * present, apply to all models
 * @param {Function} [cb] The callback function
 */
Cloudant.prototype.automigrate = function (models, cb) {
  debug ('Cloudant.prototype.automigrate %j', models);
  var self = this;
  async.eachSeries (models, function (model, cb2) {
    var mo = self.selectModel (model, true);
    self.updateIndex (mo, model, cb2);
  }, function (err) {
    debug ('Cloudant.prototype.automigrate %j', err);
    cb (err);
  });
};

/*
 * Update the indexes.
 *
 * Properties Example:
 *    "name": { "type": "String", "index": true },
 *
 * Indexes Example:
 * "indexes": {
 *   "ignore": {
 *      "keys": {"name": 1, "age": -1}
 *   },
 *   "ignore": {"age": -1},
 *   "ignore": {"age1": 1, "age2":1}  
 *        "<key2>": -1
 *
*/
Cloudant.prototype.updateIndex = function (mo, modelName, cb) {
  // todo: indexing everything is going to be very resource intensive.
  mo.db.index ({
    "type": "text",
    "index": {}
  }, function (err, result) {
    debug ('Cloudant.prototype.updateIndex index %j %j', err, result);
    cb (err, result);
  });
};

// mixins
require('./discovery')(Cloudant);
