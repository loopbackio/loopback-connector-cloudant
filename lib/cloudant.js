// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var g = require('strong-globalize')();
var CouchDB = require('loopback-connector-couchdb2').CouchDB;
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
  CouchDB.call(this, 'cloudant', settings);
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

util.inherits(Cloudant, CouchDB);

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

    // Convert ID to Number if Model defines ID as type Number
    var idType = mo.mo.properties[idName].type.name;
    if (idType === 'Number') {
      result.id = parseInt(result.id);
    }

    cb(null, result.id, result.rev);
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
    // use_index: ['lb-index-ddoc-' + model, 'lb-index-' + model],
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
require('./view')(Cloudant);
