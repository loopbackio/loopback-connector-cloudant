// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

describe('cloudant imported features', function() {
  before(function() {
    require('./init.js');
  });

  require('loopback-datasource-juggler/test/include.test.js');
  require('loopback-datasource-juggler/test/crud-with-options.test.js');
  require('loopback-datasource-juggler/test/common.batch.js');
});
