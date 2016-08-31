// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var should = require('should');
describe('cloudant regexp', function() {
  var Foo;
  var N = 10;
  before(function(done) {
    require('./init.js');
    db = getSchema();
    Foo = db.define('Foo', {
      bar: {type: String, index: true}
    });
    db.automigrate(done);
  });
  it('create some foo', function(done) {
    var foos = Array.apply(null, {length: N}).map(function(n, i) {
      return {bar: String.fromCharCode(97+i)};
    });
    Foo.create(foos, function(err, entries) {
      should.not.exist(err);
      entries.should.have.lengthOf(N);
      done();
    });
  });
  it('find all foos begining with b', function(done) {
    Foo.find({where: {bar: {regexp: '^b'}}}, function(err, entries) {
      console.log (entries);
      entries.should.have.lengthOf(1);
      entries[0].bar.should.equal('b');
      done();
    });
  });
  it('find all foos that are case-insensitive B', function(done) {
    Foo.find({where: {bar: {regexp: '/B/i'}}}, function(err, entries) {
      console.log (entries);
      entries.should.have.lengthOf(1);
      entries[0].bar.should.equal('b');
      done();
    });
  });
  it('find all foos like b', function(done) {
    Foo.find({where: {bar: {like: 'b'}}}, function(err, entries) {
      console.log (entries);
      entries.should.have.lengthOf(1);
      entries[0].bar.should.equal('b');
      done();
    });
  });
  it('find all foos not like b', function(done) {
    Foo.find({where: {bar: {nlike: 'b'}}}, function(err, entries) {
      console.log (entries);
      entries.should.have.lengthOf(N-1);
      done();
    });
  });
  after (function(done) {
    Foo.destroyAll(function() {
      done();
    });
  });
});
