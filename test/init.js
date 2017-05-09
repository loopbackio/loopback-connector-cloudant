// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

module.exports = require('should');

var DataSource = require('loopback-datasource-juggler').DataSource;

var config = require('rc')('loopback', {test: {cloudant: {}}}).test.cloudant;

console.log('env config ', config);

global.getConfig = function() {
  var dbConf = {
    url: process.env.CLOUDANT_URL || config.url || 'localhost',
    username: process.env.CLOUDANT_USERNAME || config.username || 'admin',
    password: process.env.CLOUDANT_PASSWORD || config.password || 'pass',
    database: process.env.CLOUDANT_DATABASE || config.database || 'test-db',
    plugin: 'retry',
    retryAttempts: 10,
    retryTimeout: 50,
  };
  return dbConf;
};

global.getDataSource = global.getSchema = function(customConfig) {
  var db = new DataSource(require('../'), customConfig || config);
  db.log = function(a) {
    console.log(a);
  };
  return db;
};

global.connectorCapabilities = {
  ilike: false,
  nilike: false,
  nestedProperty: true,
};

global.sinon = require('sinon');
