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
 * Initialize the Cloudant connector for the given data source
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
}

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
}

CouchDB.prototype.getDB = function(dbName) {
  var self = this;
  var db = self.couchdb.use(dbName || self.settings.database);
  return db;
}

CouchDB.prototype.create = function(data, cb) {
  var self = this;
  self.getDB().insert(data, cb);
}

/**
 * ddocName: without prefix `_design/`
 */
CouchDB.prototype.createIndex = function(ddocName, indexName, fields, cb) {
  debug('createIndex: ddocName %s, indexName %s, fields %s', ddocName, indexName, fields);

  var self = this;
  var indexBody = {
    index: {
      fields: fields,
    },
    ddoc: ddocName,
    name: indexName,
    type: 'json'
  }

  var requestObject = {
      db: self.settings.database,
      path: '_index',
      method: 'post',
      body: indexBody
  }

  self.couchdb.request(requestObject, cb);
}

CouchDB.prototype.deleteIndex = function(ddocName, cb) {
  var self = this;
  self.getDB().get('_design/' + ddocName, function(err, result) {
    self.getDB().destroy(result._id, result._rev, cb);
  });
}

CouchDB.prototype.queryBuilder = function(model, filter, cb) {

}

CouchDB.prototype._find = function(model, filter, cb) {
    var self = this;
    var selector = {
        'loopback__model__name': model
    }
    _.merge(selector, filter);
    var body = {
      selector: selector
    }

    var requestObject = {
        db: self.settings.database,
        path: '_find',
        method: 'post',
        body: body
    }

    self.couchdb.request(requestObject, cb);
}

CouchDB.prototype.automigrate = function(model, cb) {
 
    // assume automigrate only one model now
    var self = this;

    // create lb model index first. just for demo
    // should have a separate function to do it.

    self.createIndex('loopback__model__name__ddoc',
      'loopback__model__name', ['loopback__model__name'],
        function(err, result) {
          if (err) return cb(err);
          console.log(result);

          var properties = self._models[model].properties;
          async.eachOf(properties, function(value, prop, cb) {
            debug('automigrate iterate props, propertyName %s value %s', prop, util.inspect(value, 4));
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
              ddocName: 'loobpack__model__' + model + '___property__' + prop + '__ddoc',
              indexName: 'loobpack__model__' + model + '___property__' + prop,
              fields: [prop]
            }
            self.createIndex(config.ddocName, config.indexName, config.fields, cb);
          }
        });
}