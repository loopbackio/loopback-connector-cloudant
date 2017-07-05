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
  require('loopback-datasource-juggler/test/datatype.test.js');
  require('loopback-datasource-juggler/test/basic-querying.test.js');
  require('loopback-datasource-juggler/test/hooks.test.js');
  require('loopback-datasource-juggler/test/relations.test.js');
  require('loopback-datasource-juggler/test/include.test.js');
});
