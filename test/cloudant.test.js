// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

require('./init.js');
var Cloudant = require('../lib/cloudant');
var _ = require('lodash');
var should = require('should');
var testUtil = require('./lib/test-util');
var url = require('url');
var db, Product, CustomerSimple, SimpleEmployee;

describe('cloudant connector', function() {
  before(function(done) {
    db = getDataSource();

    Product = db.define('Product', {
      name: {type: String},
      description: {type: String},
      price: {type: Number},
      releases: {type: ['number']},
      type: {type: [String]},
      foo: {type: [Object]},
    }, {forceId: false});

    // CustomerSimple means some nested property defs are missing in modelDef,
    // tests for CustomerSimple are created to make sure the typeSearch algorithm
    // won't crash when iterating
    CustomerSimple = db.define('CustomerSimple', {
      name: {
        type: String,
      },
      seq: {
        type: Number,
      },
      address: {
        street: String,
        state: String,
        zipCode: String,
        tags: [],
      },
      friends: [],
      favorate: {
        labels: [
          {label: String},
        ],
      },
    });

    SimpleEmployee = db.define('SimpleEmployee', {
      id: {
        type: Number,
        id: true,
        required: true,
        generated: false,
      },
      name: {
        type: String,
      },
      age: {
        type: Number,
      },
    });

    db.automigrate(done);
  });

  describe('model with array props gets updated properly', function() {
    var prod1, prod2;
    before('create Product', function(done) {
      Product.create({
        id: 1,
        name: 'bread',
        price: 100,
        releases: [1, 2, 3],
        type: ['plain', 'sesame', 'whole wheat'],
        foo: [{id: 1, name: 'bread1'}, {id: 2, name: 'bread2'}],
      }, function(err, product) {
        if (err) return done(err);
        prod1 = product;
        Product.create({
          id: 2,
          name: 'bagel',
          price: 100,
          releases: [1, 2, 3],
          type: ['plain', 'sesame', 'whole wheat'],
          foo: [{id: 1, name: 'bagel1'}, {id: 2, name: 'bagel2'}],
        }, function(err, product) {
          if (err) return done(err);
          prod2 = product;
          delete prod1._rev;
          delete prod2._rev;
          done();
        });
      });
    });

    after(function(done) {
      Product.destroyAll(null, {limit: testUtil.QUERY_MAX}, done);
    });

    it('updates a single instance with array props',
      function(done) {
        prod1.setAttribute('type', ['cinnamon raisin']);
        prod1.setAttribute('releases', [4, 5, 6]);
        prod1.setAttribute('foo', [{id: 3, name: 'bread3'}]);
        Product.updateAll({id: 1}, prod1, function(err, res) {
          if (err) return done(err);
          Product.findById('1', function(err, res) {
            if (err) done(err);
            res.name.should.equal(prod1.name);
            res.price.should.equal(prod1.price);
            res.releases.should.deepEqual([4, 5, 6]);
            res.type.should.deepEqual(['cinnamon raisin']);
            res.foo.should.deepEqual([{id: 3, name: 'bread3'}]);
            Product.findById('2', function(err, res) {
              if (err) done(err);
              res.name.should.equal(prod2.name);
              res.price.should.equal(prod2.price);
              res.releases.should.deepEqual(prod2.releases);
              res.type.should.deepEqual(prod2.type);
              res.foo.should.deepEqual(prod2.foo);
              done();
            });
          });
        });
      });

    it('updates all matching instances with array props',
   function(done) {
     var data = {
       price: 200,
       releases: [7],
       type: ['everything'],
       foo: [{id: 1, name: 'bar'}],
     };

     Product.updateAll({price: 100}, data, function(err, res) {
       if (err) done(err);
       Product.find(function(err, res) {
         if (err) done(err);
         res.length.should.equal(2);
         res[0].name.should.oneOf(prod1.name, prod2.name);
         res[0].price.should.equal(data.price);
         res[0].releases.should.deepEqual(data.releases);
         res[0].type.should.deepEqual(data.type);
         res[0].foo.should.deepEqual(data.foo);
         res[1].name.should.oneOf(prod1.name, prod2.name);
         res[1].price.should.equal(data.price);
         res[1].releases.should.deepEqual(data.releases);
         res[1].type.should.deepEqual(data.type);
         res[1].foo.should.deepEqual(data.foo);
         done();
       });
     });
   });
  });

  // the test suite is to make sure when
  // user queries against a non existing property
  // the app won't crash
  describe('nested property', function() {
    var seedCount = 0;
    before(function createSampleData(done) {
      var seedItems = seed();
      seedCount = seedItems.length;
      CustomerSimple.create(seedItems, done);
    });

    after(function(done) {
      CustomerSimple.destroyAll(null, {limit: seedCount}, done);
    });

    describe('missing in modelDef', function() {
      it('returns result when nested property is not an array type',
        function(done) {
          CustomerSimple.find({where: {'address.city': 'San Jose'}},
            function(err, customers) {
              if (err) return done(err);
              customers.length.should.be.equal(1);
              customers[0].address.city.should.be.eql('San Jose');
              done();
            });
        });
      it('returns null when first level property is array', function(done) {
        CustomerSimple.find({where: {'friends.name': {regexp: /^Ringo/}}},
        function(err, customers) {
          if (err) return done(err);
          customers.should.be.empty();
          done();
        });
      });
      it('returns result when first level property is array type' +
      ' and $elemMatch provided', function(done) {
        CustomerSimple.find({where: {
          'friends.$elemMatch.name': {regexp: /^Ringo/}}},
        function(err, customers) {
          if (err) return done(err);
          customers.length.should.be.equal(2);
          var expected1 = ['John Lennon', 'Paul McCartney'];
          var expected2 = ['Paul McCartney', 'John Lennon'];
          var actual = customers.map(function(c) { return c.name; });
          should(actual).be.oneOf(expected1, expected2);
          done();
        });
      });
      it('returns null when multi-level nested property' +
      ' contains array type', function(done) {
        CustomerSimple.find({where: {'address.tags.tag': 'business'}},
        function(err, customers) {
          if (err) return done(err);
          customers.should.be.empty();
          done();
        });
      });
      it('returns result when multi-level nested property contains array type' +
      ' and $elemMatch provided', function(done) {
        CustomerSimple.find({
          where: {'address.tags.$elemMatch.tag': 'business'}},
        function(err, customers) {
          if (err) return done(err);
          customers.length.should.be.equal(1);
          customers[0].address.tags[0].tag.should.be.equal('business');
          customers[0].address.tags[1].tag.should.be.equal('rent');
          done();
        });
      });
      it('returns error missing data type when sorting', function(done) {
        CustomerSimple.find({where: {'address.state': 'CA'},
        order: 'address.city DESC'},
          function(err, customers) {
            should.exist(err);
            err.message.should.match(/no_usable_index,missing_sort_index/);
            done();
          });
      });
      it.skip('returns result when sorting type provided - ' +
        'missing first level property', function(done) {
        // Similar test case exist in juggler, but since it takes time to
        // recover them, I temporarily add it here
        CustomerSimple.find({where: {'address.state': 'CA'},
          order: 'missingProperty'}, function(err, customers) {
          if (err) return done(err);
          customers.length.should.be.equal(2);
          var expected1 = ['San Mateo', 'San Jose'];
          var expected2 = ['San Jose', 'San Mateo'];
          var actual = customers.map(function(c) { return c.address.city; });
          should(actual).be.oneOf(expected1, expected2);
          done();
        });
      });
      it.skip('returns result when sorting type provided - nested property',
        function(done) {
          CustomerSimple.find({where: {'address.state': 'CA'},
            order: 'address.city:string DESC'},
            function(err, customers) {
              if (err) return done(err);
              customers.length.should.be.equal(2);
              customers[0].address.city.should.be.eql('San Mateo');
              customers[1].address.city.should.be.eql('San Jose');
              done();
            });
        });
    });
    describe('defined in modelDef', function() {
      it('returns result when complete query of' +
      ' multi-level nested property provided', function(done) {
        CustomerSimple.find({
          where: {'favorate.labels.$elemMatch.label': 'food'}},
        function(err, customers) {
          if (err) return done(err);
          customers.length.should.be.equal(1);
          customers[0].favorate.labels[0].label.should.be.equal('food');
          customers[0].favorate.labels[1].label.should.be.equal('drink');
          done();
        });
      });
    });
  });

  describe('allow numerical `id` value', function() {
    var data = [{
      id: 1,
      name: 'John Chow',
      age: 45,
    }, {
      id: 5,
      name: 'Kelly Johnson',
      age: 25,
    }, {
      id: 12,
      name: 'Michael Santer',
      age: 30,
    }];
    var rev;

    before(function(done) {
      SimpleEmployee.create(data, function(err, result) {
        should.not.exist(err);
        rev = result[1]._rev;
        done();
      });
    });

    after(function(done) {
      SimpleEmployee.destroyAll(null, {limit: testUtil.QUERY_MAX}, done);
    });

    it('find instances with numeric id (findById)', function(done) {
      SimpleEmployee.findById(data[1].id, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        testUtil.checkData(data[1], result.__data);
        done();
      });
    });

    it('find instances with "where" filter', function(done) {
      SimpleEmployee.find({where: {id: data[0].id}}, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should.equal(result.length, 1);
        testUtil.checkData(data[0], result[0].__data);
        done();
      });
    });

    it.skip('find instances with "order" filter (ASC)', function(done) {
      SimpleEmployee.find({order: 'id ASC'}, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should(result[0].id).equal(data[0].id);
        should(result[1].id).equal(data[1].id);
        should(result[2].id).equal(data[2].id);
        done();
      });
    });

    it.skip('find instances with "order" filter (DESC)', function(done) {
      SimpleEmployee.find({order: 'id DESC'}, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should(result[0].id).equal(data[2].id);
        should(result[1].id).equal(data[1].id);
        should(result[2].id).equal(data[0].id);
        done();
      });
    });

    it('replace instances with numerical id (replaceById)',
       function(done) {
         var updatedData = {
           id: data[1].id,
           name: 'Christian Thompson',
           age: 32,
           _rev: rev,
         };
         data[1].name = updatedData.name;
         data[1].age = updatedData.age;

         SimpleEmployee.replaceById(data[1].id, updatedData,
        function(err, result) {
          should.not.exist(err);
          should.exist(result);
          should.equal(result.id, data[1].id);
          should.equal(result.name, updatedData.name);
          should.equal(result.age, updatedData.age);

          SimpleEmployee.find(function(err, result) {
            should.not.exist(err);
            should.exist(result);
            should.equal(result.length, 3);
            // checkData ignoring its order
            data.forEach(function(item, index) {
              var r = _.find(result, function(o) {
                return o.__data.id === item.id;
              });
              testUtil.checkData(data[index], r.__data);
            });
            done();
          });
        });
       });

    it('destroy instances with numerical id (destroyById)', function(done) {
      SimpleEmployee.destroyById(data[1].id, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        should(result).have.property('count');
        should.equal(result.count, 1);

        SimpleEmployee.find(function(err, result) {
          should.not.exist(err);
          should.exist(result);
          should.equal(result.length, 2);
          testUtil.checkData(data[0], result[0].__data);
          testUtil.checkData(data[2], result[1].__data);
          done();
        });
      });
    });

    it('destroy instances with "where" filter', function(done) {
      SimpleEmployee.destroyAll({id: data[2].id}, {limit: testUtil.QUERY_MAX},
        function(err, result) {
          should.not.exist(err);
          should.exist(result);
          should(result).have.property('count');
          should.equal(result.count, 1);

          SimpleEmployee.find(function(err, result) {
            should.not.exist(err);
            should.exist(result);
            should.equal(result.length, 1);
            testUtil.checkData(data[0], result[0].__data);
            done();
          });
        });
    });

    after(function(done) {
      SimpleEmployee.destroyAll(null, {limit: 1000}, function(err) {
        return done(err);
      });
    });
  });
});

describe('cloudant constructor', function() {
  it('should allow passthrough of properties in the settings object',
    function() {
      var ds = getDataSource();
      ds.settings = _.clone(ds.settings) || {};
      var result = {};
      ds.settings.Driver = function(options) {
        result = options;
      };
      ds.settings.foobar = {
        foo: 'bar',
      };
      ds.settings.plugin = 'whack-a-mole';
      ds.settings.requestDefault = {proxy: 'http://localhost:8080'};
      var connector = Cloudant.initialize(ds, function(err) {
        should.not.exist(err);
        should.exist(result.foobar);
        result.foobar.foo.should.be.equal('bar');
        result.plugin.should.be.equal(ds.settings.plugin);
        should.exist(result.requestDefault);
        result.requestDefault.proxy.should.be.equal('http://localhost:8080');
      });
    });

  it('should pass the url as an object property', function() {
    var ds = getDataSource();
    ds.settings = _.clone(ds.settings) || {};
    var result = {};
    ds.settings.Driver = function(options) {
      result = options;
    };
    ds.settings.url = 'https://totallyfakeuser:fakepass@definitelynotreal.cloudant.com';
    var connector = Cloudant.initialize(ds, function() {
      // The url will definitely cause a connection error, so ignore.
      should.exist(result.url);
      result.url.should.equal(ds.settings.url);
    });
  });
  it('should convert first part of url path to database name', function(done) {
    var myConfig = _.clone(global.config);
    myConfig.url = myConfig.url + '/some/random/path';
    myConfig.database = '';
    var result = {};
    myConfig.Driver = function(options) {
      result = options;
      var fakedb = {db: {}};
      fakedb.db.get = function(opts, cb) {
        cb();
      };
      return fakedb;
    };
    var ds = getDataSource(myConfig);
    result.url.should.equal(global.config.url);
    result.database.should.equal('some');
    done();
  });

  it('should give 401 error for wrong creds', function(done) {
    var myConfig = _.clone(global.config);
    var parsedUrl = url.parse(myConfig.url);
    parsedUrl.auth = 'foo:bar';
    myConfig.url = parsedUrl.format();
    var ds = getDataSource(myConfig);
    ds.once('error', function(err) {
      should.exist(err);
      err.statusCode.should.equal(401);
      err.error.should.equal('unauthorized');
      err.reason.should.equal('Name or password is incorrect.');
      done();
    });
  });
  it('should give 404 error for nonexistant db', function(done) {
    var myConfig = _.clone(global.config);
    var parsedUrl = url.parse(myConfig.url);
    parsedUrl.path = '';
    myConfig.url = parsedUrl.format();
    myConfig.database = 'idontexist';
    var ds = getDataSource(myConfig);
    ds.once('error', function(err) {
      should.exist(err);
      err.statusCode.should.equal(404);
      err.error.should.equal('not_found');
      err.reason.should.equal('Database does not exist.');
      done();
    });
  });
});

function seed() {
  var beatles = [
    {
      seq: 0,
      name: 'John Lennon',
      email: 'john@b3atl3s.co.uk',
      role: 'lead',
      birthday: new Date('1980-12-08'),
      order: 2,
      vip: true,
      address: {
        street: '123 A St',
        city: 'San Jose',
        state: 'CA',
        zipCode: '95131',
        tags: [
          {tag: 'business'},
          {tag: 'rent'},
        ],
      },
      friends: [
        {name: 'Paul McCartney'},
        {name: 'George Harrison'},
        {name: 'Ringo Starr'},
      ],
    },
    {
      seq: 1,
      name: 'Paul McCartney',
      email: 'paul@b3atl3s.co.uk',
      role: 'lead',
      birthday: new Date('1942-06-18'),
      order: 1,
      vip: true,
      address: {
        street: '456 B St',
        city: 'San Mateo',
        state: 'CA',
        zipCode: '94065',
      },
      friends: [
        {name: 'John Lennon'},
        {name: 'George Harrison'},
        {name: 'Ringo Starr'},
      ],
    },
    {
      seq: 2,
      name: 'George Harrison',
      order: 5,
      vip: false,
      favorate: {
        labels: [
          {label: 'food'},
          {label: 'drink'},
        ],
      },
    },
    {seq: 3, name: 'Ringo Starr', order: 6, vip: false},
    {seq: 4, name: 'Pete Best', order: 4},
    {seq: 5, name: 'Stuart Sutcliffe', order: 3, vip: true},
  ];
  return beatles;
}
