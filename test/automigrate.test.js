// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';
var db, Foo, NotExist;

describe('cloudant automigrate', function() {
  before(function() {
    require('./init.js');
  });
  it('automigrates models attached to db', function(done) {
    db = getSchema();
    // Make sure automigrate doesn't destroy model doesn't exist
    NotExist = db.define('NotExist', {
      id: {type: Number, index: true},
    });
    Foo = db.define('Foo', {
      name: {type: String},
    });
    db.once('connected', function() {
      db.automigrate(function verifyMigratedModel(err) {
        if (err) return done(err);
        Foo.create({name: 'foo'}, function(err, r) {
          if (err) return done(err);
          r.should.not.be.empty();
          r.name.should.equal('foo');
          done();
        });
      });
    });
  });
  it('autoupdates models attached to db', function(done) {
    db = getSchema();
    // each test case gets a new db since it should not contain models attached
    // to old db
    Foo = db.define('Foo', {
      updatedName: {type: String},
    });
    db.autoupdate(function(err) {
      if (err) return done(err);
      Foo.find(function(err, results) {
        if (err) return done(err);
        // Verify autoupdate doesn't destroy existing data
        results.length.should.equal(1);
        results[0].name.should.equal('foo');
        done();
      });
    });
  });
  it('destroy existing model when automigrates', function(done) {
    db = getSchema();
    Foo = db.define('Foo', {
      updatedName: {type: String},
    });
    db.automigrate(function(err) {
      if (err) return done(err);
      Foo.find(function(err, result) {
        if (err) return done(err);
        result.length.should.equal(0);
        done();
      });
    });
  });
});
