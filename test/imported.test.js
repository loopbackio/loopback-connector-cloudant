// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// Comment test cases to get CI pass,
// will recover them when CI config done

'use strict';

describe('cloudant imported features', function() {
  require('./lib/cloudant.juggler.compatible');
  require('loopback-datasource-juggler/test/basic-querying.test.js');
  require('loopback-datasource-juggler/test/relations.test.js');
  require('loopback-datasource-juggler/test/include.test.js');
  require('./init');
});
