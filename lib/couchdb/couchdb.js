// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var nano = require('nano');
var util = require('util');
var debug = require('debug')('loopback:connector:couchdb');
var async = require('async');
var _ = require('lodash');
var Connector = require('loopback-connector').Connector;

/**
 * Initialize the Couchdb connector for the given data source
 *
 * @param {DataSource} ds The data source instance
 * @param {Function} [cb] The cb function
 */
exports.initialize = function(ds, cb) {
  ds.connector = new CouchDB(ds.settings, ds);
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

function CouchDB(settings, ds) {
  this.CouchDBDriver = settings.Driver || nano;
  debug('CouchDB constructor settings: %j', settings);
  Connector.call(this, 'couchdb', settings);
  this.debug = settings.debug || debug.enabled;
  this.dataSource = ds;
  this.options = _.merge({}, settings);
  this.pool = {};
}

util.inherits(CouchDB, Connector);

CouchDB.prototype.connect = function(cb) {
  var self = this;
  self.couchdb = self.CouchDBDriver(self.options);
  cb();
};

/**
 * To use a database level nano api, you need to specify the db name
 * then call couchdb.use(dbName)
 *
 * @param {String} dbName The database name
 * @return {Object} The db instance that contains all db level apis
 */
CouchDB.prototype.getDB = function(dbName) {
  var self = this;
  var db = self.couchdb.use(dbName || self.settings.database);
  return db;
};

/**
 * This is actually a nano 'insert()'
 *
 */

CouchDB.prototype.create = function(data, cb) {
  var self = this;
  self.getDB().insert(data, cb);
};

/**
 * Create an index in couchdb,
 * you can specify the ddocName and indexName,
 * regarding how to create model/property index, see discussion in
 * https://github.com/strongloop/loopback-connector-cloudant/pull/153#issuecomment-307177910
 * @param {String} ddocName without prefix `_design/`
 * @param {String} indexName index name
 * @param {Array} fields we only allow single field atm,
 * so it should be a string actually
 */
CouchDB.prototype.createIndex = function(ddocName, indexName, fields, cb) {
  debug('createIndex: ddocName %s, indexName %s, fields %s', ddocName,
    indexName, fields);

  var self = this;
  var indexBody = {
    index: {
      fields: fields,
    },
    ddoc: ddocName,
    name: indexName,
    type: 'json',
  };

  var requestObject = {
    db: self.settings.database,
    path: '_index',
    method: 'post',
    body: indexBody,
  };

  self.couchdb.request(requestObject, cb);
};

/**
 * Delete an index by its ddocName
 * This function makes sure we can cleanUp an existing model when automigrate
 *
 * @param {String} ddocName design doc name without prefix '_design/'
 */
CouchDB.prototype.deleteIndex = function(ddocName, cb) {
  var self = this;
  self.getDB().get('_design/' + ddocName, function(err, result) {
    self.getDB().destroy(result._id, result._rev, cb);
  });
};

/**
 * Finally _find should call queryBuilder to build the selector, sort, etc...
 *
 * @param {String} model model name
 * @param {Object} filter a loopback filter
 */
CouchDB.prototype.queryBuilder = function(model, filter, cb) {

};

/**
 * sends to couchdb endpoint `_find`
 *
 * @param {String} model model name
 * @param {Object} filter a loopback filter
 */
CouchDB.prototype._find = function(model, filter, cb) {
  var self = this;

  // For demo purpose, I hardcoded the selector to something like
  // `{loopback__model__name: 'modelName', propName: 'foo'}`
  // This should be built by `self.queryBuilder` actually
  var selector = {
    'loopback__model__name': model,
  };
  _.merge(selector, filter);

  var body = {
    selector: selector,
  };

  var requestObject = {
    db: self.settings.database,
    path: '_find',
    method: 'post',
    body: body,
  };

  self.couchdb.request(requestObject, cb);
};

/**
 * Send request to couchdb endpoint `_find`, this endpoint provides a Cloduant
 * query similar system, the sadness is it requires all properties in the query
 * be indexable.
 *
 * @param {String} model model name
 * @param {Object} filter a loopback filter
 */
CouchDB.prototype.automigrate = function(model, cb) {
  // for easier demo, assume automigrate only one model now
  var self = this;

    // Create model level index first(used by all lb models). just for demo
    // should have a separate function to do it.

  self.createIndex('loopback__model__name__ddoc',
      'loopback__model__name', ['loopback__model__name'],
        function(err, result) {
          if (err) return cb(err);
          console.log(result);

          // Omit cleanUp existing data for easier demo, while function
          // `deleteIndex` proves there is no technical problem for it.
          // Create property level index for a model.
          var properties = self._models[model].properties;
          async.eachOf(properties, function(value, prop, cb) {
            debug('automigrate iterate props, propertyName %s value %s',
              prop, util.inspect(value, 4));
            if (value.index) {
              createPropIndex(prop, cb);
            } else {
              cb(null);
            };
          }, function(err) {
            cb(err);
          });
          function createPropIndex(prop, cb) {
            var config = {
              ddocName: 'loobpack__model__' + model + '___property__' +
              prop + '__ddoc',
              indexName: 'loobpack__model__' + model + '___property__' +
              prop, fields: [prop],
            };
            self.createIndex(config.ddocName, config.indexName,
              config.fields, cb);
          }
        });
};
