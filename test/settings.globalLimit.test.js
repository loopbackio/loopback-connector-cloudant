// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

'use strict';

var _ = require('lodash');
var COUNT_OF_SAMPLES = 70;
var db, TestCountUser;

function createSamples() {
  var r = [];
  for (var i = 0; i < COUNT_OF_SAMPLES; i++) {
    r.push({name: 'user'.concat(i)});
  }
  return r;
}

function cleanUpData(done) {
  TestCountUser.destroyAll(done);
}

describe('global Limit', function() {
  before(function(done) {
    // globalLimit is greater than COUNT_OF_SAMPLES
    var config = _.assign(global.config, {globalLimit: 100});
    var samples = createSamples();
    db = global.getDataSource(config);

    TestCountUser = db.define(
      'TestCountUser',
      {
        name: {type: String},
      },
      {forceId: false}
    );

    TestCountUser.create(samples, done);
  });

  it('find - returns more than 25 results', function(done) {
    TestCountUser.find(function(err, r) {
      if (err) return done(err);
      r.length.should.equal(COUNT_OF_SAMPLES);
      done();
    });
  });

  it('find - limit in filter overrides the globalLimit', function(done) {
    TestCountUser.find({limit: 1}, function(err, r) {
      if (err) return done(err);
      r.length.should.equal(1);
      done();
    });
  });

  it('count - returns more than 25 results', function(done) {
    TestCountUser.count(function(err, r) {
      if (err) return done(err);
      r.should.equal(COUNT_OF_SAMPLES);
      done();
    });
  });

  it('destroyAll - destroys more than 25 results', function(done) {
    cleanUpData(function(err) {
      if (err) return done(err);
      TestCountUser.count(function(err, r) {
        if (err) return done(err);
        r.should.equal(0);
        done();
      });
    });
  });
});
