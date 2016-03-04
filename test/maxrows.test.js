var should = require('should');
describe('cloudant max rows', function() {
  var Foo;
  var N = 201;
  before(function(done) {
    require('./init.js');
    db = getSchema();
    Foo = db.define('Foo', {
      bar: {type: Number, index: true}
    });
    Thing = db.define('Thing', {
      title: Number
    });
    Thing.belongsTo('foo', {model: Foo});
    Foo.hasMany('things', {foreignKey: 'fooId'});
    db.automigrate(done);
  });
  it('create two hundred and one', function(done) {
    var foos = Array.apply(null, {length: N}).map(function(n, i) {
      return {bar:i};
    });
    Foo.create(foos, function(err, entries) {
      should.not.exist(err);
      entries.should.have.lengthOf(N);
      done();
    });
  });
  it('find all two hundred and one', function(done) {
    Foo.all(function(err, entries) {
      entries.should.have.lengthOf(N);
      var things = Array.apply(null, {length: N}).map(function(n, i) {
        return {title:i, fooId:entries[i].id};
      });
      Thing.create(things, function(err, things) {
        things.should.have.lengthOf(N);
        done();
      });
    });
  });
  it('find all limt ten', function(done) {
    Foo.all({limit: 10, order: 'bar'}, function(err, entries) {
      entries.should.have.lengthOf(10);
      entries[0].bar.should.equal(0);
      done();
    });
  });
  it('find all skip ten limit ten', function(done) {
    Foo.all({skip: 10, limit: 10, order: 'bar'}, function(err, entries) {
      entries.should.have.lengthOf(10);
      entries[0].bar.should.equal(10);
      done();
    });
  });
  it('find all skip two hundred', function(done) {
    Foo.all({skip: 200, order: 'bar'}, function(err, entries) {
      entries.should.have.lengthOf(1);
      entries[0].bar.should.equal(200);
      done();
    });
  });
  it('find all things include foo', function(done) {
    Thing.all({include: 'foo'}, function(err, entries) {
      entries.forEach(function(t) {
        t.__cachedRelations.should.have.property('foo');
        var foo = t.__cachedRelations.foo;
        foo.should.have.property('id');
      });
      done();
    });
  });
  after (function(done) {
    Foo.destroyAll(function() {
      Thing.destroyAll(function() {
        done();
      });
    });
  });
});
