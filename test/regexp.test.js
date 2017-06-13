// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// Comment test cases to get CI pass,
// will recover them when CI config done

'use strict';

var should = require('should');
require('./init.js');
var db;

describe('cloudant regexp', function() {
  this.timeout(99999);
  var Foo;
  var N = 10;
  before(function(done) {
    db = getSchema();
    Foo = db.define('Foo', {
      bar: {type: String, index: true},
    });
    db.automigrate(done);
  });
  it('create some foo', function(done) {
    var foos = Array.apply(null, {length: N}).map(function(n, i) {
      return {bar: String.fromCharCode(97 + i)};
    });
    Foo.create(foos, function(err, entries) {
      should.not.exist(err);
      entries.should.have.lengthOf(N);
      done();
    });
  });
  it('find all foos beginning with b', function(done) {
    Foo.find({where: {bar: {regexp: '^b'}}}, function(err, entries) {
      if (err) return done(err);
      entries.should.have.lengthOf(1);
      entries[0].bar.should.equal('b');
      done();
    });
  });
  it('find all foos that are case-insensitive B', function(done) {
    Foo.find({where: {bar: {regexp: '/B/i'}}}, function(err, entries) {
      if (err) return done(err);
      entries.should.have.lengthOf(1);
      entries[0].bar.should.equal('b');
      done();
    });
  });
  it('find all foos like b', function(done) {
    Foo.find({where: {bar: {like: 'b'}}}, function(err, entries) {
      if (err) return done(err);
      entries.should.have.lengthOf(1);
      entries[0].bar.should.equal('b');
      done();
    });
  });
  it('find all foos not like b', function(done) {
    Foo.find({where: {bar: {nlike: 'b'}}}, function(err, entries) {
      if (err) return done(err);
      entries.should.have.lengthOf(N - 1);
      done();
    });
  });
  after(function(done) {
    Foo.destroyAll(function() {
      done();
    });
  });
});
