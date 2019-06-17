// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

const juggler = require('loopback-datasource-juggler');
const name = require('./package.json').name;

require('../../test/init.js');

describe(name, function() {
  before(function() {
    global.IMPORTED_TEST = true;
    return global.resetDataSourceClass(juggler.DataSource);
  });

  after(function() {
    global.IMPORTED_TEST = false;
    return global.resetDataSourceClass();
  });
  require('loopback-datasource-juggler/test/include.test.js');
  require('loopback-datasource-juggler/test/common.batch.js');
});

/* TODO: run persistence-hooks, default scope test suites too
  var testHooks = require('loopback-datasource-juggler/test/persistence-hooks.suite.js');
  var testDefaultScope = require('loopback-datasource-juggler/test/default-scope.test.js');
  */
