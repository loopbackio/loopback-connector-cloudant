// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

require('../init.js');
module.exports = require('should');
var DataSource = require('loopback-datasource-juggler').DataSource;
var _ = require('lodash');

global.getDataSource = global.getSchema = function(customConfig) {
  var db = new DataSource(require('../../'), customConfig || config);
  var originalConnector = _.clone(db.connector);
  var overrideConnector = {};

  overrideConnector.automigrate = function(models, cb) {
    if (db.connected) return originalConnector.automigrate(models, cb);
    else {
      db.once('connected', function() {
        originalConnector.cloudant = db.connector.cloudant;
        originalConnector.automigrate(models, cb);
      });
    };
  };

  db.connector.automigrate = overrideConnector.automigrate;
  return db;
};

