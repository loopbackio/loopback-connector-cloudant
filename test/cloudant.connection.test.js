// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

'use strict';
require('./init.js');
var should = require('should');

describe('cloudant connection', function() {
  context('with an invalid cloudant connection', function() {
    it('returns error with fake url', function(done) {
      var fakeConfig = {
        url: 'http://fake:foo@localhost:4',
      };
      var fakeDB = global.getDataSource(fakeConfig);
      fakeDB.once('error', function(err) {
        should.exist(err);
        err.message.should.match(/error happened in your connection/);
        done();
      });
    });
  });
});
