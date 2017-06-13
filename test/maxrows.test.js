// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var should = require('should');
var db, Thing;
var describe = require('./describe.js');

describe('cloudant max rows', function() {
  // This test suite creates large number of data,
  // require more time to complete data cleanUp
  // There is no batchDestroy in cloudant, so `automigrate`
  // fetches all instances then delete them one by one
  this.timeout(99999);
  var Foo;
  var N = 201;
  before(function(done) {
    require('./init.js');
    db = getSchema();
    Foo = db.define('Foo', {
      bar: {type: Number, index: true},
    });
    Thing = db.define('Thing', {
      title: Number,
    });
    Thing.belongsTo('foo', {model: Foo});
    Foo.hasMany('things', {foreignKey: 'fooId'});
    db.automigrate(done);
  });
  it('create two hundred and one', function(done) {
    var foos = Array.apply(null, {length: N}).map(function(n, i) {
      return {bar: i};
    });
    Foo.create(foos, function(err, entries) {
      should.not.exist(err);
      entries.should.have.lengthOf(N);
      done();
    });
  });
  it('find all two hundred and one', function(done) {
    Foo.all({limit: N}, function(err, entries) {
      if (err) return done(err);
      entries.should.have.lengthOf(N);
      var things = Array.apply(null, {length: N}).map(function(n, i) {
        return {title: i, fooId: entries[i].id};
      });
      Thing.create(things, function(err, things) {
        if (err) return done(err);
        things.should.have.lengthOf(N);
        done();
      });
    });
  });
  it.skip('find all limt ten', function(done) {
    Foo.all({limit: 10, order: 'bar'}, function(err, entries) {
      if (err) return done(err);
      entries.should.have.lengthOf(10);
      entries[0].bar.should.equal(0);
      done();
    });
  });
  it.skip('find all skip ten limit ten', function(done) {
    Foo.all({skip: 10, limit: 10, order: 'bar'}, function(err, entries) {
      if (err) return done(err);
      entries.should.have.lengthOf(10);
      entries[0].bar.should.equal(10);
      done();
    });
  });
  it.skip('find all skip two hundred', function(done) {
    Foo.all({skip: 200, order: 'bar'}, function(err, entries) {
      if (err) return done(err);
      entries.should.have.lengthOf(1);
      entries[0].bar.should.equal(200);
      done();
    });
  });
  it('find all things include foo', function(done) {
    Thing.all({include: 'foo'}, function(err, entries) {
      if (err) return done(err);
      entries.forEach(function(t) {
        t.__cachedRelations.should.have.property('foo');
        var foo = t.__cachedRelations.foo;
        foo.should.have.property('id');
      });
      done();
    });
  });
  after(function(done) {
    Foo.destroyAll(function() {
      Thing.destroyAll(function() {
        done();
      });
    });
  });
});
