// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var g = require('strong-globalize')();
var Connector = require('loopback-connector').Connector;
var Driver = require('cloudant');
var assert = require('assert');
var debug = require('debug')('loopback:connector:cloudant');
var async = require('async');
var util = require('util');
var _ = require('lodash');

/**
 * Initialize the Cloudant connector for the given data source
 *
 * @param {DataSource} ds The data source instance
 * @param {Function} [cb] The cb function
 */
exports.initialize = function(ds, cb) {
  ds.connector = new Cloudant(ds.settings, ds);
  if (cb) {
    if (ds.settings.lazyConnect) {
      process.nextTick(function() {
        cb();
      });
    } else {
      ds.connector.connect(cb);
    }
  }
};

/**
 * The constructor for the Cloudant LoopBack connector
 *
 * @param {Object} settings The settings object
 * @param {DataSource} ds The data source instance
 * @constructor
 */
function Cloudant(settings, ds) {
  // Injection for tests
  var CloudantDriver = settings.Driver || Driver;
  debug('Cloudant constructor settings: %j', settings);
  Connector.call(this, 'cloudant', settings);
  this.debug = settings.debug || debug.enabled;
  this.dataSource = ds;
  if (!settings.url && (!settings.username || !settings.password)) {
    throw new Error('Invalid settings: "url" OR "username"' +
    ' AND "password" required');
  }

  this.options = _.merge({}, settings);
  // If settings.url is not set, then setup account/password props.
  if (!this.options.url) {
    this.options.account = settings.username;
    this.options.password = settings.password;
  }
  this.cloudant = CloudantDriver(this.options);
  this.pool = {};
}

util.inherits(Cloudant, Connector);

Cloudant.prototype.getTypes = function() {
  return ['db', 'nosql', 'cloudant'];
};

/**
 * Connect to Cloudant
 *
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype.connect = function(cb) {
  debug('Cloudant.prototype.connect');
  cb(null, this.cloudant);
};

/**
 * Prepare the data for the save/insert DB operation
 *
 * @param {String} modelName The model name
 * @param {Object} modelObject The model properties etc
 * @param {Object} doc The model document/data
 */
Cloudant.prototype.toDB = function(modelName, modelObject, doc) {
  var idValue = this.getIdValue(modelName, doc);
  var idName = this.idName(modelName);
  if (!doc) {
    doc = {};
  }
  for (var i in doc) {
    if (typeof doc[i] === 'undefined') {
      delete doc[i];
    }
  }
  if (idValue === null) {
    delete doc[idName];
  } else {
    if (idValue) doc._id = idValue;
    if (idName !== '_id') delete doc[idName];
  }
  if (doc._rev === null) {
    delete doc._rev;
  }
  if (modelObject.modelView) {
    doc[modelObject.modelView] = modelName;
  }
  return doc;
};

/**
 * Preserve round-trip type information, etc.
 *
 * @param {String} modelName The model name
 * @param {Object} modelObject The model properties etc
 * @param {Object} doc The model document/data
 */
Cloudant.prototype.fromDB = function(modelName, modelObject, doc) {
  var idName = this.idName(modelName);
  if (!doc) {
    return doc;
  }
  assert(doc._id);
  if (idName !== '_id' && doc._id) {
    doc[idName] = doc._id.toString();
    delete doc._id;
  }
  if (doc._rev) {
    delete doc._rev;
  }
  for (var i = 0; i < modelObject.dateFields.length; i++) {
    var dateField = modelObject.dateFields[i];
    var dateValue = doc[dateField];
    if (dateValue) {
      doc[dateField] = new Date(dateValue);
    }
  }
  if (modelObject.modelView) {
    delete doc[modelObject.modelView];
  }
  return doc;
};

/**
 * Insert a model instance
 *
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype._insert = function(model, data, cb) {
  var self = this;
  var idName = self.idName(model);
  var mo = self.selectModel(model);
  mo.db.insert(self.toDB(model, mo, data), function(err, result) {
    debug('Cloudant.prototype.insert %j %j', err, result);
    if (err) {
      if (err.statusCode === 409) {
        err.message = err.message + ' (duplicate?)';
      }
      return cb(err);
    }
    data[idName] = result.id;
    cb(null, result.id);
  });
};

/**
 * Create a new model instance for the given data
 *
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype.create = function(model, data, options, cb) {
  debug('Cloudant.prototype.create %j %j %j ', model, data, options);
  this._insert(model, data, cb);
};

/**
 * Save the model instance for the given data
 *
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
Cloudant.prototype.save = function(model, data, options, cb) {
  debug('Cloudant.prototype.save %j %j %j', model, data, options);
  var self = this;
  var idName = self.idName(model);
  var id = data[idName];
  if (id) {
    self.getCurrentRevision(model, id, function(err, rev) {
      if (err) return cb (err, null);
      if (rev) data._rev = rev;
      self.create(model, data, options, cb);
    });
  } else {
    self.create(model, data, options, cb);
  }
};

/**
 * Get the current document revision
 *
 * @param {String} model The model name
 * @param {String} id Instance id
 * @param {Function} [callback] The callback function
 */
Cloudant.prototype.getCurrentRevision = function(model, id, cb) {
  var mo = this.selectModel(model);
  mo.db.head(id, function(err, stuff, headers) {
    if (err) {
      if (err.statusCode === 404) {
        err.message = 'No instance with id ' + id + ' found for ' + model;
        err.code = 'NOT_FOUND';
      }
      return cb(err, null);
    }
    if (headers && !headers.etag) return cb(err, null);
    cb(null, headers.etag.substr(1, headers.etag.length - 2));
  });
};

/**
 * Find matching model instances by the filter
 *
 * @param {String} model The model name
 * @param {Object} filter The filter
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype.all = function all(model, filter, options, cb) {
  var self = this;
  var docs = [];
  var include = null;
  var mo = self.selectModel(model);
  /* eslint-disable camelcase */
  var query = {
    selector: self.buildSelector(model, mo, filter.where),
    use_index: ['lb-index-ddoc-' + model, 'lb-index-' + model],
  };
  /* eslint-enable camelcase */
  if (filter.offset) query.skip = filter.offset;
  if (filter.limit) query.limit = filter.limit;
  query.sort = self.buildSort(mo, model, filter.order);
  debug('Cloudant.prototype.all %j %j %j', model, filter, query);
  include = function(docs, cb) {
    if (!options || !options.raw) {
      for (var i = 0; i < docs.length; i++) {
        self.fromDB(model, mo, docs[i]);
      }
    }
    if (filter && filter.include) {
      self._models[model].model.include(docs,
                                        filter.include,
                                        options, cb);
    } else {
      cb();
    }
  };
  findRecursive(mo, query, docs, include, function(err, result) {
    if (err) return cb(err, result);
    cb(null, result.docs);
  });
};
function findRecursive(mo, query, docs, include, cb) {
  mo.db.find(query, function(err, rst) {
    debug('Cloudant.prototype.all (findRecursive) results: %j %j', err, rst);
    if (err) return cb(err);
    // work around for issue
    // https://github.com/strongloop/loopback-connector-cloudant/issues/73
    if (!rst.docs) {
      var queryView = util.inspect(query, 4);
      debug('findRecursive query: %s', queryView);
      var errMsg = util.format('No documents returned for query: %s',
        queryView);
      return cb(new Error(errMsg));
    }
    include(rst.docs, function() {
      extendDocs(rst);
    });
  });
  function extendDocs(rst) {
    if (docs.length === 0 && rst.docs.length < 200) return cb(null, rst);
    for (var i = 0; i < rst.docs.length; i++) {
      docs.push(rst.docs[i]);
    }
    if (rst.bookmark) {
      if (query.bookmark === rst.bookmark) {
        rst.docs = docs;
        cb(null, rst);
      } else {
        query.bookmark = rst.bookmark;
        findRecursive(mo, query, docs, include, cb);
      }
    } else {
      cb(null, rst);
    }
  };
};

Cloudant.prototype.buildSelector = function(model, mo, where) {
  var self = this;
  var query = (mo.modelSelector || {});
  if (mo.modelSelector === null) {
    query[mo.modelView] = model;
  }

  if (where === null || (typeof where !== 'object')) {
    return query;
  }
  var idName = self.idName(model);
  Object.keys(where).forEach(function(k) {
    var cond = where[k];
    if (k === 'and' || k === 'or' || k === 'nor') {
      if (Array.isArray(cond)) {
        cond = cond.map(function(c) {
          return self.buildSelector(model, mo, c);
        });
      }
      query['$' + k] = cond;
      delete query[k];
      return;
    }
    if (k === idName) {
      k = '_id';
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
        query[k] = {$gte: cond[0], $lte: cond[1]};
      } else if (spec === 'inq') {
        query[k] = {
          $in: cond.map(function(x) { return x; }),
        };
      } else if (spec === 'nin') {
        query[k] = {
          $nin: cond.map(function(x) { return x; }),
        };
      } else if (spec === 'neq') {
        query[k] = {$ne: cond};
      } else if (spec === 'like') {
        query[k] = {$regex: cond};
      } else if (spec === 'nlike') {
        query[k] = {$regex: '[^' + cond + ']'};
      } else if (spec === 'regexp') {
        if (cond.constructor.name === 'RegExp') {
          if (cond.global)
            g.warn('Cloudant {{regex}} syntax does not support global');
          var expression = cond.source;
          if (cond.ignoreCase) expression = '(?i)' + expression;
          query[k] = {$regex: expression};
        } else {
          query[k] = {$regex: cond};
        }
      } else {
        query[k] = {};
        query[k]['$' + spec] = cond;
      }
    } else {
      query[k] = cond;
    }
  });
  return query;
};

Cloudant.prototype.buildSort = function(mo, model, order) {
  debug('Cloudant.prototype.buildSort %j', order);
  var obj;
  var sort = [];
  var props = mo.mo.properties;
  var idName = this.idName(model);

  if (!order) {
    order = idName;
  }

  if (typeof order === 'string') {
    order = order.split(',');
  }
  for (var i in order) {
    var k = order[i];
    var m = k.match(/\s+(A|DE)SC$/);
    var n = k.replace(/\s+(A|DE)SC$/, '').trim();

    if (props[n] && props[n].type === Number)
      n = n.concat(':number');
    if (props[n] && (props[n].type === String || props[n].type === Date))
      n = n.concat(':string');
    if (n === idName) {
      n = '_id';
    }

    if (m && m[1] === 'DE') {
      obj = {}; obj[n] = 'desc';
      sort.push(obj);
    } else {
      obj = {}; obj[n] = 'asc';
      sort.push(obj);
    }
  }
  debug('Cloudant.prototype.buildSort order: %j sort: %j', order, sort);
  return sort;
};

/**
 * Delete a model instance by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param [cb] The cb function
 */
Cloudant.prototype.destroy = function destroy(model, id, options, cb) {
  debug('Cloudant.prototype.destroy %j %j %j', model, id, options);
  var self = this;
  var mo = self.selectModel(model);
  self.getCurrentRevision(model, id, function(err, rev) {
    if (err) return cb(err, []);
    mo.db.destroy(id, rev, function(err, result) {
      if (err) return cb(err, null);
      cb(null, {id: id, rev: rev, count: 1});
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
  debug('Cloudant.prototype.destroyAll %j %j %j', model, where, options);

  var self = this;
  var dels = 0;
  var mo = self.selectModel(model);

  self.all(model, {where: where}, {raw: true}, function(err, docs) {
    if (err) return cb(err, null);
    async.each(docs, function(doc, cb2) {
      mo.db.destroy(doc._id, doc._rev, function(err, result) {
        debug('Cloudant.prototype.destroyAll db.destroy %j %j', err, result);
        if (result && result.ok) dels++;
        cb2(err);
      });
    }, function(err) {
      cb(err, {count: dels});
    });
  });
};

/**
 * Count the number of instances for the given model
 *
 * @param {String} model The model name
 * @param {Function} [cb] The cb function
 * @param {Object} filter The filter for where
 */
Cloudant.prototype.count = function count(model, where, options, cb) {
  debug('Cloudant.prototype.count %j %j %j', model, where, options);
  var self = this;
  self.all(model, {where: where}, {}, function(err, docs) {
    cb(err, (docs && docs.length));
  });
};

/**
 * Check if a model instance exists by id
 *
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Function} [callback] The callback function
 */
Cloudant.prototype.exists = function(model, id, options, cb) {
  debug('Cloudant.prototype.exists %j %j %j', model, id, options);
  var self = this;
  var idName = self.idName(model);
  var where = {}; where[idName] = id;
  self.count(model, where, {}, function(err, cnt) {
    if (err) return cb(err, 0);
    cb(null, cnt);
  });
};

/**
 * Find a model instance by id
 *
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Function} [callback] The callback function
 */
Cloudant.prototype.findById = function(model, id, options, cb) {
  debug('Cloudant.prototype.find %j %j %j', model, id, options);
  var self = this;
  var mo = self.selectModel(model);
  mo.db.get(id, function(err, doc) {
    if (err && err.statusCode === 404) return cb(null, []);
    if (err) return cb(err);
    cb(null, self.fromDB(model, mo, doc));
  });
};
Cloudant.prototype.find = Cloudant.prototype.findById;

/**
 * Update properties for the model instance data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype.updateAttributes = function(model, id, data, options, cb) {
  debug('Cloudant.prototype.updateAttributes %j %j %j',
        model, id, data, options);
  var self = this;
  var mo = self.selectModel(model);
  mo.db.get(id, function(err, doc) {
    if (err) return cb(err, doc);
    _.merge(doc, data);
    self.create(model, doc, options, function(err) {
      cb(err, self.fromDB(model, mo, doc));
    });
  });
};

/**
 * Update if the model instance exists with the same id or create a
 * new instance
 *
 * @param {String} model The model name
 * @param {Object} data The model instance data
 * @param {Function} [cb] The callback function
 */
Cloudant.prototype.updateOrCreate = function(model, data, cb) {
  debug('Cloudant.prototype.updateOrCreate %j %j', model, data);
  var self = this;
  var idName = self.idName(model);
  var id = data[idName];
  if (id) {
    self.getCurrentRevision(model, id, function(err, rev) {
      if (err && err.statusCode !== 404) {
        return cb(err);
      }
      if (rev) data._rev = rev;
      self.create(model, data, {}, function(err) {
        if (err) return cb(err);
        cb(err, data, {isNewInstance: !rev});
      });
    });
  } else {
    self.create(model, data, {}, function(err, id) {
      if (err) return cb(err);
      cb(err, data, {isNewInstance: true});
    });
  }
};

/**
 * Update all matching instances
 * @param {String} model The model name
 * @param {Object} where The search criteria
 * @param {Object} data The property/value pairs to be updated
 * @callback {Function} cb Cb function
 */
Cloudant.prototype.updateAll = function updateAll(model, where,
                                                  data, options, cb) {
  debug('Cloudant.prototype.updateAll %j %j %j %j',
          model, where, data, options);
  var self = this;
  var mo = self.selectModel(model);

  self.all(model, {where: where}, {raw: true}, function(err, docs) {
    if (err) return cb(err, docs);
    if (docs.length === 0) {
      return cb(null, {count: 0});
    }
    for (var i = 0; i < docs.length; i++) {
      _.merge(docs[i], data);
    }
    debug('Cloudant.prototype.updateAll bulk docs: %j', docs);
    mo.db.bulk({docs: docs}, function(err) {
      if (err) return cb(err);
      var res = {};
      res.count = docs.length;
      return cb(err, res);
    });
  });
};
Cloudant.prototype.update = Cloudant.prototype.updateAll;

/**
 * Ping the DB for connectivity
 * @callback {Function} cb Callback with success or failure
 */
Cloudant.prototype.ping = function(cb) {
  debug('Cloudant.prototype.ping');
  this.cloudant.db.list(function(err, result) {
    debug('Cloudant.prototype.ping results %j %j', err, result);
    if (err) cb('ping failed');
    else cb();
  });
};

/**
 * Replace if the model instance exists with the same id or create a
 * new instance
 *
 * @param {String} model The model name
 * @param {Object} data The model instance data
 * @param {Function} [cb] The callback function
 */
Cloudant.prototype.replaceOrCreate = function replaceOrCreate(
  model, data, options, cb) {
  debug('Cloudant.prototype.replaceOrCreate %j %j', model, data);
  var self = this;
  var idName = self.idName(model);
  var mo = self.selectModel(model);

  var id = data[idName];
  if (id) {
    self.getCurrentRevision(model, id, function(err, rev) {
      if (err) return cb(err);
      if (rev) data._rev = rev;
      self._insert(model, data, function(err) {
        if (err) return cb(err);
        mo.db.get(id, function(err, doc) {
          if (err) return cb(err);
          cb(err, self.fromDB(model, mo, doc), {isNewInstance: !rev});
        });
      });
    });
  } else {
    self.create(model, data, options, function(err, id) {
      if (err) return cb(err);
      mo.db.get(id, function(err, doc) {
        if (err) return cb(err);
        cb(err, self.fromDB(model, mo, doc), {isNewInstance: true});
      });
    });
  }
};

/**
 * Replace properties for the model instance data
 * @param {String} model The name of the model
 * @param {*} id The instance id
 * @param {Object} data The model data
 * @param {Object} options The options object
 * @param {Function} [cb] The callback function
 */

Cloudant.prototype.replaceById = function replaceById(
  model, id, data, options, cb) {
  debug('Cloudant.prototype.replaceById %j %j %j', model, id, data);
  var self = this;
  var mo = self.selectModel(model);
  var idName = self.idName(model);
  data[idName] = id;

  self.getCurrentRevision(model, id, function(err, rev) {
    if (err) return cb(err);
    if (rev) data._rev = rev;
    self._insert(model, data, function(err, id) {
      if (err) return cb(err);
      mo.db.get(id, function(err, doc) {
        if (err) return cb(err);
        cb(null, self.fromDB(model, mo, doc));
      });
    });
  });
};

/**
 * Select the correct DB. This is typically specified on the datasource
 * configuration but this connector also supports per model DB config
 * @param {String} model The model name
 */
Cloudant.prototype.selectModel = function(model, migrate) {
  var dbName, db, mo;
  var modelView = null;
  var modelSelector = null;
  var dateFields = [];
  var s = this.settings;

  db = this.pool[model];
  if (db && !migrate) return db;

  mo = this._models[model];
  if (mo && mo.settings.cloudant) {
    dbName = (mo.settings.cloudant.db || mo.settings.cloudant.database);
    if (mo.settings.cloudant.modelSelector) {
      modelSelector = mo.settings.cloudant.modelSelector;
    } else {
      modelView = mo.settings.cloudant.modelIndex;
    }
  }
  if (!dbName) dbName = (s.database || s.db || 'test');
  if (!modelView && modelSelector === null) {
    modelView = (s.modelIndex || 'loopback__model__name');
  }

  for (var p in mo.properties) {
    if (mo.properties[p].type.name === 'Date') {
      dateFields.push(p);
    }
  }

  debug('Cloudant.prototype.selectModel use %j', dbName);
  this.pool[model] = {
    mo: mo,
    db: this.cloudant.use(dbName),
    modelView: modelView,
    modelSelector: modelSelector,
    dateFields: dateFields,
  };

  return this.pool[model];
};

/**
 * Hook to be called by DataSource for defining a model
 *
 * @param {Object} modelDefinition The model definition
 */
Cloudant.prototype.define = function(modelDefinition) {
  var modelName = modelDefinition.model.modelName;
  modelDefinition.settings = modelDefinition.settings || {};
  this._models[modelName] = modelDefinition;
  var mo = this.selectModel(modelName, true);
  this.updateIndex(mo, modelName);
};

/**
 * Perform autoupdate for the given models. It basically calls db.index()
 *
 * @param {String[]} [models] A model name or an array of model names. If not
 * present, apply to all models
 * @param {Function} [cb] The callback function
 */
Cloudant.prototype.autoupdate = function(models, cb) {
  debug('Cloudant.prototype.autoupdate %j', models);
  this.automigrate(models, cb);
};

/**
 * Perform automigrate for the given models.
 *
 * @param {String[]} [models] A model name or an array of model names. If not
 * present, apply to all models
 * @param {Function} [cb] The callback function
 */
Cloudant.prototype.automigrate = function(models, cb) {
  debug('Cloudant.prototype.automigrate %j', models);
  var self = this;
  async.eachSeries(models, function(model, cb2) {
    var mo = self.selectModel(model, true);
    self.updateIndex(mo, model, cb2);
  }, function(err) {
    debug('Cloudant.prototype.automigrate %j', err);
    cb(err);
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
Cloudant.prototype.updateIndex = function(mo, modelName, cb) {
  /* eslint-disable camelcase */
  var idx = {
    type: 'text',
    name: 'lb-index-' + modelName,
    ddoc: 'lb-index-ddoc-' + modelName,
    index: {
      default_field: {
        enabled: false,
      },
      selector: (mo.modelSelector || {}),
    },
  };
  /* eslint-enable camelcase */

  if (mo.modelSelector === null) {
    idx.index.selector[mo.modelView] = modelName;
  }
  mo.db.index(idx, function(err, result) {
    debug('Cloudant.prototype.updateIndex index %j %j', err, result);
    if (cb) {
      cb(err, result);
    }
  });
};

// mixins
require('./discovery')(Cloudant);
