// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

describe('cloudant imported features', function() {
  before(function() {
    IMPORTED_TEST = true;
  });

  after(function() {
    IMPORTED_TEST = false;
  });

  require('loopback-datasource-juggler/test/include.test.js');
  require('loopback-datasource-juggler/test/common.batch.js');
});

// Run the COUCHDB2 Test Suite.
require('./init.js');

process.env.COUCHDB2_TEST_SKIP_INIT = true;

describe('cloudant automigrate.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/automigrate.test.js');
});

describe('cloudant autoupdate.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/autoupdate.test.js');
});

describe('cloudant connection.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/connection.test.js');
});

describe('cloudant count.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/count.test.js');
});

describe('cloudant create.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/create.test.js');
});

describe('cloudant find.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/find.test.js');
});

describe('cloudant index.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/index.test.js');
});

describe('cloudant maxrows.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/maxrows.test.js');
});

describe('cloudant regexp.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/regexp.test.js');
});

describe('cloudant replace.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/replace.test.js');
});

describe('cloudant update.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/update.test.js');
});

describe('cloudant view.test - imported from couchdb2', function() {
  require('loopback-connector-couchdb2/test/view.test.js');
});

delete process.env.COUCHDB2_TEST_SKIP_INIT;
