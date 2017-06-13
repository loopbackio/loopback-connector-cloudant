// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';
var db, Foo, Bar, NotExist, isActualTestFoo, isActualTestBar;
require('./init.js');
var describe = require('./describe.js');

describe('cloudant automigrate', function() {
  it('automigrates models attached to db', function(done) {
    db = getSchema();
    // Make sure automigrate doesn't destroy model doesn't exist
    NotExist = db.define('NotExist', {
      id: {type: Number, index: true},
    });
    Foo = db.define('Foo', {
      name: {type: String},
    });
    Bar = db.define('Bar', {
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
    db.once('connected', function() {
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
  });
  it('destroy existing model when automigrates', function(done) {
    db = getSchema();
    Foo = db.define('Foo', {
      updatedName: {type: String},
    });
    db.once('connected', function() {
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
  describe('isActual', function() {
    db = getSchema();
    it('returns true only when all models exist', function(done) {
      // `isActual` requires the model be attached to a db,
      // therefore use db.define here
      Foo = db.define('Foo', {
        name: {type: String},
      });
      Bar = db.define('Bar', {
        name: {type: String},
      });
      db.isActual(['Foo', 'Bar'], function(err, ok) {
        if (err) return done(err);
        ok.should.equal(true);
        done();
      });
    });
    it('returns false when one or more models not exist', function(done) {
      // model isActualTestFoo and isActualTestBar are not
      // defined/used elsewhere, so they don't exist in database
      isActualTestFoo = db.define('isActualTestFoo', {
        name: {type: String},
      });
      isActualTestBar = db.define('isActualTestBar', {
        name: {type: String},
      });
      db.isActual(['Foo', 'isActualTestFoo', 'isActualTestBar'],
        function(err, ok) {
          if (err) return done(err);
          ok.should.equal(false);
          done();
        });
    });
    it('accepts string type single model as param', function(done) {
      db.isActual('Foo', function(err, ok) {
        if (err) return done(err);
        ok.should.equal(true);
        done();
      });
    });
  });
});
