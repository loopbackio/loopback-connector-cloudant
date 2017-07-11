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
var url = require('url');
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
  this.CloudantDriver = settings.Driver || Driver;
  debug('Cloudant constructor settings: %j', settings);
  Connector.call(this, 'cloudant', settings);
  this.debug = settings.debug || debug.enabled;
  this.dataSource = ds;
  if (!settings.url && (!settings.username || !settings.password)) {
    throw new Error(g.f('Invalid settings: "url" OR "username"' +
    ' AND "password" required'));
  }
  this.options = _.merge({}, settings);
  // If settings.url is not set, then setup account/password props.
  if (!this.options.url) {
    this.options.account = settings.username;
    this.options.password = settings.password;
  }
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
  var self = this;
 // strip db name if defined in path of url before
  // sending it to our driver
  if (self.options.url) {
    var parsedUrl = url.parse(self.options.url);
    if (parsedUrl.path && parsedUrl.path !== '/') {
      self.options.url = self.options.url.replace(parsedUrl.path, '');
      if (!self.options.database)
        self.options.database = parsedUrl.path.split('/')[1];
    }
  }
  self.CloudantDriver(self.options, function(err, nano) {
    if (err) return cb(err);
    self.cloudant = nano;
    if (self.options.database) {
      // check if database exists
      self.cloudant.db.get(self.options.database, function(err) {
        if (err) return cb(err);
        return cb(err, self.cloudant);
      });
    } else return cb(err, self.cloudant);
  });
};

/**
 * Prepare the data for the save/insert DB operation
 *
 * @param {String} modelName The model name
 * @param {Object} modelObject The model properties etc
 * @param {Object} doc The model document/data
 * @returns {Object} doc The model document/data
 */
Cloudant.prototype.toDB = function(modelName, modelObject, doc) {
  // toString() this value because IDs must be strings: https://docs.cloudant.com/document.html
  var idValue = this.getIdValue(modelName, doc);
  if (idValue) idValue = idValue.toString();
  var idName = this.idName(modelName);
  if (!doc) doc = {};
  for (var i in doc) {
    if (typeof doc[i] === 'undefined') delete doc[i];
  }
  if (idValue === null) delete doc[idName];
  else {
    if (idValue) doc._id = idValue;
    if (idName !== '_id') delete doc[idName];
  }
  if (modelObject.modelView) doc[modelObject.modelView] = modelName;
  return doc;
};

/**
 * Preserve round-trip type information, etc.
 *
 * @param {String} modelName The model name
 * @param {Object} modelObject The model properties etc
 * @param {Object} doc The model document/data
 * @returns {Object} doc The model document/data
 */
Cloudant.prototype.fromDB = function(modelName, modelObject, doc) {
  var idName = this.idName(modelName);
  // we should return the `id` as an int if the user specified the property as an int
  if (idName)
    var idType = modelObject.mo.properties[idName].type.name;
  if (!doc) return doc;
  assert(doc._id);
  if (doc._id) {
    if (idType === 'Number')
      doc[idName] = parseInt(doc._id);
    else
      doc[idName] = doc._id;
    delete doc._id;
  }
  for (var i = 0; i < modelObject.dateFields.length; i++) {
    var dateField = modelObject.dateFields[i];
    var dateValue = doc[dateField];
    if (dateValue) doc[dateField] = new Date(dateValue);
  }
  if (modelObject.modelView) delete doc[modelObject.modelView];
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
      if (err.statusCode === 409) err.message = err.message + ' (duplicate?)';
      return cb(err);
    }
    data[idName] = result.id;
    cb(null, result.id, result.rev);
  });
};

/**
 * Create a new model instance for the given data
 *
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Object} options The options object
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
 * @param {Object} options The options object
 * @callback {Function} cb The callback function
 * @returns {Function} [_insert] model insert function
 */
Cloudant.prototype.save = function(model, data, options, cb) {
  debug('Cloudant.prototype.save %j %j %j', model, data, options);
  var self = this;
  var idName = self.idName(model);
  var id = data[idName];
  var mo = self.selectModel(model);
  data[idName] = id.toString();

  var saveHandler = function(err, id) {
    if (err) return cb(err);
    mo.db.get(id, function(err, doc) {
      if (err) return cb(err);
      cb(null, self.fromDB(model, mo, doc));
    });
  };
  self._insert(model, data, saveHandler);
};

/**
 * Get the current document revision
 *
 * @param {String} model The model name
 * @param {String} id Instance id
 * @callback {Function} cb The callback function
 */
Cloudant.prototype.getCurrentRevision = function(model, id, cb) {
  var mo = this.selectModel(model);
  mo.db.head(id, function(err, stuff, headers) {
    if (err) {
      if (err.statusCode === 404) {
        err.message = g.f('No instance with id %s found for %s', id, model);
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
 * @param {Object} options The options object
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
  if (filter.order) query.sort = self.buildSort(mo, model, filter.order);
  debug('Cloudant.prototype.all %j %j %j', model, filter, query);
  include = function(docs, cb) {
    if (!options || !options.raw) {
      for (var i = 0; i < docs.length; i++) {
        self.fromDB(model, mo, docs[i]);
      }
    }
    if (filter && filter.include) {
      self._models[model].model.include(docs, filter.include, options, cb);
    } else {
      cb();
    }
  };
  self._findRecursive(mo, query, docs, include, function(err, result) {
    if (err) return cb(err, result);
    cb(null, result.docs);
  });
};

/**
 * Build query selector
 *
 * @param {String} model The model name
 * @param {Object} mo The model object generated by selectModel()
 * @param {Object} where The where filter
 */
Cloudant.prototype.buildSelector = function(model, mo, where) {
  var self = this;
  var query = (mo.modelSelector || {});
  if (mo.modelSelector === null) query[mo.modelView] = model;
  if (where === null || (typeof where !== 'object')) return query;

  var idName = self.idName(model);

  return self._buildQuery(model, idName, query, where);
};

/**
 * Build a sort query using order filter
 *
 * @param {Object} mo The model object
 * @param {String} model The model name
 * @param {Object} order The order filter
 */
Cloudant.prototype.buildSort = function(mo, model, order) {
  debug('Cloudant.prototype.buildSort %j', order);
  var field, fieldType, nestedFields, obj;
  var sort = [];
  var props = mo.mo.properties;
  var idName = this.idName(model);

  if (!order) order = idName;
  if (typeof order === 'string') order = order.split(',');

  for (var i in order) {
    var k = order[i];
    var m = k.match(/\s+(A|DE)SC$/);
    var n = k.replace(/\s+(A|DE)SC$/, '').trim();
    obj = {};

    if (typeof n === 'string')
      nestedFields = n.split('.');

    if (nestedFields.length > 1) {
      var begin = props;
      for (var f in nestedFields) {
        field = nestedFields[f];
        // Continue the nested type search only when
        // current property is an object
        if (begin[field] && typeof begin[field] === 'object') {
          begin = begin[field];
        } else if (begin[field]) fieldType = begin[field];
      }
    } else fieldType = props[n] && props[n].type;

    if (n === idName) n = '_id';
    if (fieldType === Number) n = n.concat(':number');
    if (isString(fieldType) || isDate(fieldType)) n = n.concat(':string');

    if (m && m[1] === 'DE') obj[n] = 'desc';
    else obj[n] = 'asc';
    sort.push(obj);
  }
  debug('Cloudant.prototype.buildSort order: %j sort: %j', order, sort);
  return sort;
};

/**
 * Delete a model instance by id
 *
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Object} options The options object
 * @param [cb] The cb function
 */
Cloudant.prototype.destroy = function destroy(model, id, options, cb) {
  var mo = this.selectModel(model);
  this.all(model, {where: {id: id}}, {raw: true}, function(err, doc) {
    if (doc.length > 1) cb(new Error(
      'instance method destroy tries to delete more than one item!'));
    else if (doc.length === 1) {
      mo.db.destroy(doc[0]._id, doc[0]._rev, function(err, result) {
        debug('Cloudant.prototype.destroy db.destroy %j %j', err, result);
        if (err) return cb(err);
        cb(err, result && result.ok ? {count: 1} : {count: 0});
      });
    } else {
      cb(new Error('could not find matching item in database!'));
    }
  });
};

/**
 * Delete all instances for the given model
 *
 * @param {String} model The model name
 * @param {Object} [where] The filter for where
 * @param {Object} options The options object
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
 * @param {Object} options The options Object
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
 * @param {Object} options The options Object
 * @callback {Function} cb The callback function
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
 * @param {Object} options The options object
 * @callback {Function} cb The callback function
 */
Cloudant.prototype.find =
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

/**
 * Update properties for the model instance data
 *
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Object} options The options Object
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype.updateAttributes = function(model, id, data, options, cb) {
  debug('Cloudant.prototype.updateAttributes %j %j %j',
        model, id, data, options);
  var self = this;
  var mo = self.selectModel(model);
  mo.db.get(id, function(err, doc) {
    if (err) return cb(err);
    data = self._getPlainJSONData.call(self, model, data);
    _.mergeWith(doc, data, function(dest, src) { return src; });
    self.create(model, doc, options, function(err, id, rev) {
      if (err) return cb(err);
      doc._rev = rev;
      return cb(err, self.fromDB(model, mo, doc));
    });
  });
};

/**
 * Update if the model instance exists with the same id or create a
 * new instance
 *
 * @param {String} model The model name
 * @param {Object} data The model instance data
 * @callback {Function} cb The callback function
 */
Cloudant.prototype.updateOrCreate = function(model, data, cb) {
  debug('Cloudant.prototype.updateOrCreate %j %j', model, data);
  var self = this;
  var idName = self.idName(model);
  var mo = self.selectModel(model);
  var id = data[idName].toString();

  // Callback handler for both create calls.
  var createHandler = function(err, id) {
    if (err) return cb(err);
    mo.db.get(id, function(err, doc) {
      if (err) return cb(err);
      return cb(err, self.fromDB(model, mo, doc), {isNewInstance: true});
    });
  };

  if (id) {
    self.updateAttributes(model, id, data, {}, function(err, docs) {
      if (err && err.statusCode !== 404) return cb(err);
      else if (err && err.statusCode === 404) {
        self.create(model, data, {}, createHandler);
      } else {
        return cb(err, docs, {isNewInstance: false});
      }
    });
  } else {
    self.create(model, data, {}, createHandler);
  }
};

/**
 * Update all matching instances
 * @param {String} model The model name
 * @param {Object} where The search criteria
 * @param {Object} data The property/value pairs to be updated
 * @param {Object} options The options Object
 * @callback {Function} cb The callback function
 */
Cloudant.prototype.update =
Cloudant.prototype.updateAll = function(model, where, data, options, cb) {
  debug('Cloudant.prototype.updateAll %j %j %j %j',
          model, where, data, options);
  var self = this;
  var mo = self.selectModel(model);
  self.all(model, {where: where}, {raw: true}, function(err, docs) {
    if (err) return cb(err, docs);
    if (docs.length === 0) return cb(null, {count: 0});

    data = self._getPlainJSONData.call(self, model, data);
    async.each(docs, function(doc, cb) {
      _.mergeWith(doc, data, function(dest, src) { return src; });
      return cb();
    }, function(err) {
      if (err) return cb(err);
      mo.db.bulk({docs: docs}, function(err, result) {
        if (err) return cb(err);
        var errorArray = _.filter(result, 'error');
        if (errorArray.length > 0) {
          err = new Error(g.f(util.format('Unable to update 1 or more ' +
          'document(s): %s', util.inspect(result, 2))));
          return cb(err);
        } else {
          return cb(err, {count: result.length});
        }
      });
    });
  });
};

/**
 * Perform a bulk update on a model instance
 *
 * @param {String} model The model name
 * @param {Array} dataList List of data to be updated
 * @callback {Function} cb The callback function
 */
Cloudant.prototype.bulkReplace = function(model, dataList, cb) {
  debug('Cloudant.prototype.bulkReplace %j %j', model,
          dataList);
  var self = this;
  var mo = self.selectModel(model);

  var dataToBeUpdated = _.map(dataList, function(data) {
    return self.toDB(model, mo, data);
  });

  mo.db.bulk({docs: dataToBeUpdated}, function(err, result) {
    if (err) return cb(err);
    var errorArray = _.filter(result, 'error');
    if (errorArray.length > 0) {
      err = new Error(g.f(util.format('Unable to update 1 or more ' +
          'document(s): %s', util.inspect(result, 2))));
      return cb(err);
    } else {
      return cb(err, result);
    }
  });
};

/**
 * Ping the DB for connectivity
 * @callback {Function} cb The callback function
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
 * @param {Object} options The options Object
 * @callback {Function} cb The callback function
 */
Cloudant.prototype.replaceOrCreate = function(model, data, options, cb) {
  debug('Cloudant.prototype.replaceOrCreate %j %j', model, data);
  var self = this;
  var idName = self.idName(model);
  var mo = self.selectModel(model);
  var id = data[idName].toString();

  // Callback handler for both create calls.
  var createHandler = function(err, id) {
    if (err) return cb(err);
    mo.db.get(id, function(err, doc) {
      if (err) return cb(err);
      cb(err, self.fromDB(model, mo, doc), {isNewInstance: true});
    });
  };

  self.exists(model, id, {}, function(err, count) {
    if (err) return cb(err);
    else if (count > 0) {
      self._insert(model, data, function(err) {
        if (err) return cb(err);
        mo.db.get(id, function(err, doc) {
          if (err) return cb(err);
          cb(err, self.fromDB(model, mo, doc), {isNewInstance: false});
        });
      });
    } else {
      self.create(model, data, options, createHandler);
    }
  });
};

/**
 * Replace properties for the model instance data
 *
 * @param {String} model The name of the model
 * @param {*} id The instance id
 * @param {Object} data The model data
 * @param {Object} options The options object
 * @callback {Function} cb The callback function
 */

Cloudant.prototype.replaceById = function(model, id, data, options, cb) {
  debug('Cloudant.prototype.replaceById %j %j %j', model, id, data);
  var self = this;
  var mo = self.selectModel(model);
  var idName = self.idName(model);
  data[idName] = id.toString();

  var replaceHandler = function(err, id) {
    if (err) return cb(err);
    mo.db.get(id, function(err, doc) {
      if (err) return cb(err);
      cb(null, self.fromDB(model, mo, doc));
    });
  };
  self._insert(model, data, replaceHandler);
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

  var idName = this.idName(model);
  debug('Cloudant.prototype.selectModel use %j', dbName);
  this.pool[model] = {
    mo: mo,
    dateFields: dateFields,
    db: this.cloudant.use(dbName),
    idName: idName,
    modelView: modelView,
    modelSelector: modelSelector,
  };

  return this.pool[model];
};

/**
 * Perform autoupdate for the given models. It basically calls db.index()
 * It does NOT destroy previous model instances if model exists, only
 * `automigrate` does that.
 *
 * @param {String[]} [models] A model name or an array of model names. If not
 * present, apply to all models
 * @callback {Function} cb The callback function
 */
Cloudant.prototype.autoupdate = function(models, cb) {
  debug('Cloudant.prototype.autoupdate %j', models);
  var self = this;
  async.eachSeries(models, function(model, cb2) {
    debug('Cloudant.prototype.autoupdate model %j', model);
    var mo = self.selectModel(model, true);
    self.updateIndex(mo, model, cb2);
  }, function(err) {
    debug('Cloudant.prototype.autoupdate %j', err);
    cb(err);
  });
};

/**
 * Perform automigrate for the given models.
 * Notes: Cloudant stores a Model as a design doc in database,
 * `ddoc` is the doc's _id, auto-generated as 'lb-index-ddoc' + modelName,
 * `name` is the index name, auto-generated as 'lb-index' + modelName.
 * It does NOT store properties in the doc.
 * `automigrate` destroys model data if the model exists.
 * @param {String|String[]} [models] A model name or an array of model names.
 * If not present, apply to all models
 * @callback {Function} cb The callback function
 */
Cloudant.prototype.automigrate = function(models, cb) {
  debug('Cloudant.prototype.automigrate models %j', models);
  var self = this;
  var existingModels = [];
  async.series([
    function(callback) {
      checkExistingModels(callback);
    },
    function(callback) {
      destroyData(callback);
    },
    function(callback) {
      self.autoupdate(models, callback);
    }], cb);
  function checkExistingModels(checkCb) {
    async.eachSeries(models, function(model, cb) {
      self.isActual(model, function(err, exist) {
        if (err) return cb(err);
        if (exist) existingModels.push(model);
        cb();
      });
    }, function(err) {
      debug('Cloudant.prototype.automigrate checkExistingModels %j', err);
      checkCb(err);
    });
  };
  function destroyData(destroyCb) {
    async.eachSeries(existingModels, function(model, cb) {
      self.destroyAll(model, {}, {}, cb);
    }, function(err) {
      debug('Cloudant.prototype.automigrate %j', err);
      destroyCb(err);
    });
  };
};

/**
  * Replaces the new revalue
  *
  * @param {Object} [context] Juggler defined context data.
  * @param {Object} [data] The real data sent out by the connector.
  */
Cloudant.prototype.generateContextData = function(context, data) {
  context.data._rev = data._rev;
  return context;
};

/**
  * Check if the models exist
  * @param {String|String[]} [models] A model name or an array of model names.
  * If not present, apply to all models
  * @callback {Function} cb The callback function
  */

Cloudant.prototype.isActual = function(models, cb) {
  var self = this;
  var ok = true;

  if ((!cb) && ('function' === typeof models)) {
    cb = models;
    models = undefined;
  }
  // First argument is a model name
  if ('string' === typeof models) {
    models = [models];
  }

  models = models || Object.keys(this._models);

  async.eachSeries(models, function(model, finish) {
    // when use `done` instead of `finish`, cloudant run into socket hang up
    // error, rename it to solve the problem, but still worth investigate why
    var mo = self.selectModel(model);
    if (mo.db && (typeof mo.db.index === 'function')) {
      mo.db.index(function(err, result) {
        if (err) return finish(err);
        var indexName = 'lb-index-' + model;
        var indexes = result.indexes || {};
        var isFound = _.find(indexes, function(i) {
          return i.name === indexName;
        });
        ok = ok && !!isFound;
        finish();
      });
    } else {
      var errMsg = 'Fail to detect the database of model ' + model;
      finish(new Error(errMsg));
    }
  }, function(err) {
    cb(err, ok);
  });
};

/**
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
 * @param {Object} mo The model object
 * @param {String} modelName The model name
 * @callback {Function} cb The callback function
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
  var indexView = util.inspect(idx, 4);
  debug('Cloudant.prototype.updateIndex -- modelName %s, idx %s', modelName,
    indexView);
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

/**
 * If input is a model instance, convert to a plain JSON object
 * The input would be a model instance when the request is made from
 * REST endpoint as remoting converts it to model if endpoint expects a
 * model instance
 *
 * @param {String} model The model name
 * @param {Object} data The model data
 */
Cloudant.prototype._getPlainJSONData = function(model, data) {
  if (this._models[model] && data instanceof this._models[model].model)
    return data.toJSON();
  return data;
};

/** Build query for selection
 *
 * @param {Object} mo The model object
 * @param {String} model The model name
 * @param {Object} query The query object
 * @param {Object} where The where filter
 */
Cloudant.prototype._buildQuery = function(model, idName, query, where) {
  var self = this;
  var containsRegex = false;
  var mo = self.selectModel(model);

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
      cond = (typeof cond === 'object' || Array.isArray(cond)) ? cond :
        cond.toString();
    }
    var spec = false;
    var options = null;
    if (cond && cond.constructor.name === 'Object') {
      options = cond.options;
      spec = Object.keys(cond)[0];
      cond = cond[spec];
    }
    if (spec) {
      var selectedOperator = self._selectOperator(spec, cond, containsRegex);
      query[k] = selectedOperator[0];
      containsRegex = selectedOperator[1];
    } else query[k] = cond;

    var filterWithArray = self._buildFilterArr(k, mo.mo.properties);

    // unfold the string filter to nested object
    // e.g. {'address.tags.$elemMatch.tag': 'business'} =>
    // {address: {tags: {$elemMatch: {tag: 'business'}}}}
    if (typeof filterWithArray === 'string') {
      var kParser = filterWithArray.split('.');
      if (kParser.length > 1) {
        query[kParser.shift()] = buildUnfold(kParser);
      } else {
        if (filterWithArray === k) return;
        query[filterWithArray] = query[k];
      }
      function buildUnfold(props) {
        var obj = {};
        if (props.length === 1) {
          obj[props[0]] = query[k];
          return obj;
        }
        obj[props.shift()] = buildUnfold(props);
        return obj;
      }
    } else {
      if (filterWithArray === k) return;
      query[filterWithArray] = query[k];
    }
    delete query[k];
  });

  if (containsRegex && !query['_id']) {
    query['_id'] = {
      '$gt': null,
    };
  }
  return query;
};

/** Select operator with a condition
 *
 * @param {String} op The spec operator
 * @param {Object[]} cond Array of conditions
 * @param {Boolean} regex If the condition is regex
 */
Cloudant.prototype._selectOperator = function(op, cond, regex) {
  var newQuery = {};
  var containsRegex = regex;
  switch (op) {
    case 'between':
      newQuery = {$gte: cond[0], $lte: cond[1]};
      break;
    case 'inq':
      newQuery = {$in: cond.map(function(x) { return x; })};
      break;
    case 'nin':
      newQuery = {$nin: cond.map(function(x) { return x; })};
      break;
    case 'neq':
      newQuery = {$ne: cond};
      break;
    case 'like':
      newQuery = {$regex: cond};
      containsRegex = true;
      break;
    case 'nlike':
      newQuery = {$regex: '[^' + cond + ']'};
      containsRegex = true;
      break;
    case 'regexp':
      if (cond.constructor.name === 'RegExp') {
        if (cond.global)
          g.warn('Cloudant {{regex}} syntax does not support global');
        var expression = cond.source;
        if (cond.ignoreCase) expression = '(?i)' + expression;
        newQuery = {$regex: expression};
        containsRegex = true;
      } else {
        newQuery = {$regex: cond};
        containsRegex = true;
      }
      break;
    default:
      newQuery = {};
      newQuery['$' + op] = cond;
  }
  return [newQuery, containsRegex];
};

/** Build an array of filter
 *
 * @param {String} k Keys from the filter
 * @param {Object[]} props List of model properties
 * @param {Boolean} regex If the condition is regex
 */
Cloudant.prototype._buildFilterArr = function(k, props) {
  // return original k if k is not a String OR there is no properties OR k is not a nested property
  if (typeof k !== 'string' || !props) return k;
  var fields = k.split('.');
  var len = fields.length;
  if (len <= 1) return k;

  var newFields = [];
  var currentProperty = props;
  var field = '';
  var propIsArr = false;
  var propIsObjWithTypeArr = false;

  for (var i = 0; i < len; i++) {
    if (propIsArr) {
      // when Array.isArray(property) is true
      currentProperty = currentProperty.filter(containsField);
      if (currentProperty.length < 1) field = null;
      else {
        currentProperty = currentProperty[0];
        field = currentProperty[fields[i]];
      }
      function containsField(obj) {
        return obj.hasOwnProperty(fields[i]);
      };
      // reset the flag
      propIsArr = false;
    } else if (propIsObjWithTypeArr) {
      // when property is an Object but its type is Array
      // e.g. my_prop: {
      //  type: 'array',
      //  0: {nestedprop1: 'string'},
      //  1: {nestedprop2: 'number'}
      // }
      field = null;
      for (var property in currentProperty) {
        if (property === 'type') continue;
        if (currentProperty[property].hasOwnProperty(fields[i])) {
          currentProperty = currentProperty[property];
          field = currentProperty[fields[i]];
          break;
        }
      }
      // reset the flag
      propIsObjWithTypeArr = false;
    } else field = currentProperty[fields[i]];
    // if a nested field doesn't exist, return k. therefore if $elemMatch provided we don't add anything
    if (!field) return k;

    newFields.push(fields[i]);
    if (isArray(field)) newFields.push('$elemMatch');
    currentProperty = field;
  };
  function isArray(elem) {
    if (Array.isArray(elem)) {
      propIsArr = true;
      return true;
    }
    if (typeof elem === 'object' &&
      (Array.isArray(elem.type) || elem.type === 'Array')) {
      propIsObjWithTypeArr = true;
      return true;
    }
    return false;
  }
  return newFields.join('.');
};

/**
 *  Apply find queries function
 *
 * @param {Object} mo The selected model
 * @param {Object} query The query to filter
 * @param {Object[]} docs Model document/data
 * @param {Object} include Include filter
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype._findRecursive = function(mo, query, docs, include, cb) {
  var self = this;
  mo.db.find(query, function(err, rst) {
    debug('Cloudant.prototype.all (findRecursive) results: %j %j', err, rst);
    if (err) return cb(err);

    // only sort numeric id if the id type is of Number
    var idName = self.getIdName(mo.mo.model.modelName);
    if (!!idName && mo.mo.properties[idName].type.name === 'Number' &&
      query.sort)
      self._sortNumericId(rst.docs, query.sort);

    // work around for issue
    // https://github.com/strongloop/loopback-connector-cloudant/issues/73
    if (!rst.docs) {
      var queryView = util.inspect(query, 4);
      debug('findRecursive query: %s', queryView);
      var errMsg = util.format('No documents returned for query: %s',
        queryView);
      return cb(new Error(g.f(errMsg)));
    }
    include(rst.docs, function() {
      self._extendDocs(rst, docs, query, mo, include, cb);
    });
  });
};

/**
 * extend docs function
 *
 * @param {Object} rst the resulting query
 * @param {Object[]} docs Model document/data
 * @param {Function} [cb] The cb function
 */
Cloudant.prototype._extendDocs = function(rst, docs, query, mo, include, cb) {
  var self = this;
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
      self._findRecursive(mo, query, docs, include, cb);
    }
  } else {
    cb(null, rst);
  }
};

/**
  * Sort ids in numerical order
  *
  * @param {Object} docs Model document/data
  * @param {Object[]} filter Sorting filter
 */
Cloudant.prototype._sortNumericId = function(docs, filter) {
  filter.forEach(function(f) {
    if (f.hasOwnProperty('_id:number')) {
      var sortType = f['_id:number'];
      if (Array.isArray(docs))
        if (sortType === 'desc')
          docs.sort(function(a, b) {
            return parseInt(a._id) - parseInt(b._id);
          }).reverse();
        else
          docs.sort(function(a, b) {
            return parseInt(a._id) - parseInt(b._id);
          });
    }
  });
};

/**
 * Return idName for model existing in this.pool
 *
 * Apply to the following scenario:
 * ```javascript
 * var Test;
 * Test = db.define('Test', {oldid: String});
 * db.automigrate('Test', function(err) {
 *   Test = db.define('Test', {newid: String});
 *   db.automigrate('Test', cb);
 * });
 * ```
 *
 * `automigrate` first destroy all old data then autoupdate, which
 * also updates `this.pool` with the new model config, but it still
 * needs the old id name when destroy the data.
 *
 * @param {String} model The model name
 */
Cloudant.prototype.getIdName = function(model) {
  var self = this;
  var cachedModel = self.pool[model];
  if (!!cachedModel) return cachedModel.idName;
  else return self.idName(model);
};

/**
 * Check if a type is string
 *
 * @param {String} type The property type
 */
function isString(type) {
  return (type === String || type === 'string' || type === 'String');
}

/**
 * Check if a type is a Date
 *
 * @param {String} type The property type
 */
function isDate(type) {
  return (type === Date || type === 'date' || type === 'Date');
}

// mixins
require('./discovery')(Cloudant);
require('./view')(Cloudant);
