// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';
var db, Foo, Bar;

describe('cloudant imported features', function() {
  before(function() {
    require('./init.js');
  });
  it('automigrates models attached to db', function(done) {
    db = getSchema();
    Foo = db.define('Foo', {
      name: {type: String},
    });
    Bar = db.define('Bar', {
      id: {type: Number, index: true},
    });
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
