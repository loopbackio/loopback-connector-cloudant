var Connector = require('loopback-connector').Connector,
  Driver = require('cloudant'),
  debug = require('debug')('loopback:connector:cloudant'),
  util = require('util');

/**
 * Initialize the Cloudant connector for the given data source
 * @param {DataSource} ds The data source instance
 * @param {Function} [cb] The cb function
 */
exports.initialize = function (ds, cb) {
  ds.connector = new Cloudant(ds.settings, ds);
  if (cb) {
    ds.connector.connect(cb);
  }
};

/**
 * The constructor for the Cloudant LoopBack connector
 * @param {Object} settings The settings object
 * @param {DataSource} ds The data source instance
 * @constructor
 */
function Cloudant(settings, ds) {
  settings.database = (settings.database || settings.db || 'test');
  Connector.call(this, 'cloudant', settings);
  this.debug = settings.debug || debug.enabled;
  this.dataSource = ds;
  debug('Settings: %j', settings);
}

util.inherits(Cloudant, Connector);

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
 *
 * Todo:
 *   check for parallel connect attempts
 */
Cloudant.prototype.connect = function (cb) {
  debug('Cloudant.prototype.connect');
  var self = this;
  if (self.db) {
    process.nextTick(function () {
      cb && cb(null, self.db);
    });
  } else {
    var creds = null;
    if (self.settings.url) creds = self.settings.url;
    else {
      creds = {
        account: self.settings.username,
        password: self.settings.password
      };
    }
    debug('Cloudant.prototype.connect connect driver: ', creds);
    Driver(creds, function (err, cloudant) {
      self.cloudant = cloudant
      self.db = cloudant.use(self.settings.database);
      debug('Using database: ', self.settings.database);
      self.db.index({
        name: 'loopback__model__name',
        type: 'json',
        index: { fields: ['loopback__model__name'] }
      }, function (err, response) {
        debug('Cloudant.prototype.connect index: ', err, response);
        if (err) cb(err, null);
        else cb(null, self.db);
      });
    });
  }
};

/**
 * Create a new model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype.create = function (model, data, options, cb) {
  debug('Cloudant.prototype.create ', model, data, options);
  var self = this;
  data.loopback__model__name = model;
  if (data.id) {
    data._id = data.id;
    delete data.id;
  }
  self.db.insert(data, function (err, result) {
    cb(err, (result && result.id));
  });
};

/**
 * Find matching model instances by the filter
 *
 * @param {String} model The model name
 * @param {Object} filter The filter
 * @param {Function} [cb] The cb function
 * 
 * TODO
 *    Implement "order", this will prevent skip and limit occurring
 *    on the database.
 */
Cloudant.prototype.all = function all(model, filter, options, cb) {
  debug('Cloudant.prototype.all ', model, filter, options);

  var self = this,
    query = { selector: self.buildSelector(model, filter.where) };
  if (filter.offset) query.skip = filter.offset;
  if (filter.limit) query.limit = filter.limit;

  self.db.find(query, function (err, result) {
    if (err) return cb(err, result);
    debug('Cloudant.prototype.all results: ', result);
    if (!options || !options.raw) {
      for (var i = 0; i < result.docs.length; i++) {
        result.docs[i].id = result.docs[i]._id;
        delete result.docs[i]._id;
        delete result.docs[i]._rev;
        delete result.docs[i].loopback__model__name;
      }
    }
    cb(null, result.docs);
  });
};

Cloudant.prototype.buildSelector = function (model, where) {
  debug('Cloudant.prototype.buildSelector ', model, where);
  var self = this;
  var query = { 'loopback__model__name': model };
  if (where === null || (typeof where !== 'object')) {
    return query;
  }
  var idName = self.idName(model);
  Object.keys(where).forEach(function (k) {
    var cond = where[k];
    if (k === 'and' || k === 'or' || k === 'nor') {
      if (Array.isArray(cond)) {
        cond = cond.map(function (c) {
          return self.buildSelector(model, c);
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
      spec = Object.keys(cond)[0];
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
      if (cond === null) {
        query[k] = { $type: 10 };
      } else {
        query[k] = cond;
      }
    }
  });
  debug('Cloudant.prototype.buildSelector selector=', query);
  return query;
};

/**
 * Delete a model instance by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param [cb] The cb function
 */
Cloudant.prototype.destroy = function destroy(model, id, options, cb) {
  debug('Cloudant.prototype.destroy ', model, id, options);
  var self = this;
  self.db.head(id, function (err, stuff, headers) {
    if (err) return cb(err, []);
    if (headers && !headers.etag) return cb(err, null);
    var rev = headers.etag.substr(1, headers.etag.length - 2);
    self.db.destroy(id, rev, function (err, result) {
      if (err) return cb(err, null);
      cb(null, { _id: id, _rev: _rev, _deleted: true });
    });
  });
};

/**
 * Delete all instances for the given model
 * @param {String} model The model name
 * @param {Object} [where] The filter for where
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype.destroyAll = function destroyAll(model, where, options, cb) {
  debug('Cloudant.prototype.destroyAll ', model, where, options);
  var self = this, dels = [];
  self.all(model, { where: where }, { raw: true }, function (err, docs) {
    if (err) return cb(err, null);
    for (var i = 0; i < docs.length; i++) {
      self.db.destroy(docs[i]._id, docs[i]._rev, function (err, result) {
        debug('Cloudant.prototype.destroyAll db.destroy ', err, result);
        dels.push({
          _id: result.id,
          _rev: result.rev,
          _deleted: result.ok
        });
      });
    }
    cb(null, dels);
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
Cloudant.prototype.count = function count(model, where, options, cb) {
  debug('Cloudant.prototype.count ', model, where, options);
  var self = this;
  self.all(model, { where: where }, {}, function (err, docs) {
    cb(err, (docs && docs.length));
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
  debug('Cloudant.prototype.exists ', model, id, options);
  var self = this;
  self.count(model, { id: id }, {}, function (err, cnt) {
    if (err) return cb(err, 0);
    cb(null, cnt);
  });
};

/**
 * Update properties for the model instance data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype.updateAttributes = function updateAttrs(model, id, data, options, cb) {
  debug('Cloudant.prototype.updateAttributes ', model, id, data, options);
  var self = this;
  // TODO
  cb();
};

/**
 * Update all matching instances
 * @param {String} model The model name
 * @param {Object} where The search criteria
 * @param {Object} data The property/value pairs to be updated
 * @callback {Function} cb Cb function
 */
Cloudant.prototype.updateAll = function updateAll(model, where, data, options, cb) {
  debug('Cloudant.prototype.updateAll ', model, where, data, options);
  var self = this;
  // TOOD
  cb();
};
Cloudant.prototype.update = Cloudant.prototype.updateAll;

/**
 * Ping the DB for connectivity
 * @callback {Function} cb Callback with success or failure
 */
Cloudant.prototype.ping = function (cb) {
  debug('Cloudant.prototype.ping');
  return cb();

  var self = this;
  if (self.db) {
    self.db.list(function (err, result) {
      debug('Cloudant.prototype.ping failed: ', err, result);
      if (err) cb('ping failed');
      else cb();
    });
  } else {
    self.dataSource.once('connected', function () {
      debug('Cloudant.prototype.ping connected');
      self.ping(cb);
    });
    self.dataSource.once('error', function (err) {
      debug('Cloudant.prototype.ping failed: ', err);
      cb(err);
    });
    self.connect(function () { });
  }
};
