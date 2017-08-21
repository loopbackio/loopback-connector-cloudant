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
 * Return the driver instance, so cloudant can override this function,
 * and call driver functions as `this.getDriverInst().foo`
 */
Cloudant.prototype.getDriverInst = function() {
  return this.cloudant;
};

 /**
  * Called by function CouchDB.prototype.selectModel, overriden by Cloudant
  */
Cloudant.prototype.getModelObjectSettings = function(mo) {
  if (mo) return mo.settings.cloudant;
  return undefined;
};

// /**
//  * Build a sort query using order filter
//  *
//  * @param {Object} mo The model object
//  * @param {String} model The model name
//  * @param {Object} order The order filter
//  */
// Cloudant.prototype.buildSort = function(mo, model, order) {
//   debug('Cloudant.prototype.buildSort %j', order);
//   var field, fieldType, nestedFields, obj;
//   var sort = [];
//   var props = mo.mo.properties;
//   var idName = this.idName(model);

//   if (!order) order = idName;
//   if (typeof order === 'string') order = order.split(',');

//   for (var i in order) {
//     var k = order[i];
//     var m = k.match(/\s+(A|DE)SC$/);
//     var n = k.replace(/\s+(A|DE)SC$/, '').trim();
//     obj = {};

//     if (typeof n === 'string')
//       nestedFields = n.split('.');

//     if (nestedFields.length > 1) {
//       var begin = props;
//       for (var f in nestedFields) {
//         field = nestedFields[f];
//         // Continue the nested type search only when
//         // current property is an object
//         if (begin[field] && typeof begin[field] === 'object') {
//           begin = begin[field];
//         } else if (begin[field]) fieldType = begin[field];
//       }
//     } else fieldType = props[n] && props[n].type;

//     if (n === idName) n = '_id';
//     if (fieldType === Number) n = n.concat(':number');
//     if (isString(fieldType) || isDate(fieldType)) n = n.concat(':string');

//     if (m && m[1] === 'DE') obj[n] = 'desc';
//     else obj[n] = 'asc';
//     sort.push(obj);
//   }
//   debug('Cloudant.prototype.buildSort order: %j sort: %j', order, sort);
//   return sort;
// };

// /**
//  * Check if a type is string
//  *
//  * @param {String} type The property type
//  */
// function isString(type) {
//   return (type === String || type === 'string' || type === 'String');
// }

// /**
//  * Check if a type is a Date
//  *
//  * @param {String} type The property type
//  */
// function isDate(type) {
//   return (type === Date || type === 'date' || type === 'Date');
// }

// mixins
require('./view')(Cloudant);
