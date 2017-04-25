// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

require('./init.js');
var Cloudant = require('../lib/cloudant');
var _ = require('lodash');
var should = require('should');
var db, Product, CustomerSimple;

describe('cloudant connector', function() {
  before(function(done) {
    db = getDataSource();

    Product = db.define('Product', {
      name: {type: String},
      description: {type: String},
      price: {type: Number},
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

    db.automigrate(function cleanUpData(err) {
      // automigrate only removes the design doc, but not instances' doc,
      // so clean up data here just in case previous tests use same models.
      if (err) return done(err);
      Product.destroyAll(function removeModelInstances(err) {
        if (err) return done(err);
        CustomerSimple.destroyAll(function removeModelInstances(err) {
          if (err) return done(err);
          done();
        });
      });
    });
  });

  describe('replaceOrCreate', function() {
    after(function cleanUpData(done) {
      Product.destroyAll(function removeModelInstances(err) {
        if (err) return done(err);
        done();
      });
    });
    it('should replace a model instance if the passing key already exists',
      function(done) {
        Product.create({
          id: 1,
          name: 'bread',
          price: 100,
          undefinedProperty: 'ShouldBeRemoved',
        }, function(err, product) {
          if (err) return done(err);
          Product.replaceOrCreate({
            id: product.id,
            name: 'milk',
          }, function(err, updatedProduct) {
            if (err) return done(err);
            verifyUpdatedData(updatedProduct);
          });
        });

        function verifyUpdatedData(data) {
          // Verify callback data
          should.exist(data.id);
          should.not.exist(data.price);
          // Should remove extraneous properties not defined in the model
          should.not.exist(data.undefinedProperty);
          data.name.should.be.equal('milk');

          // Verify DB data
          verifyDBData(data.id);
        };

        function verifyDBData(id) {
          Product.findById(id, function(err, data) {
            if (err) return done(err);
            should.not.exist(data.price);
            should.not.exist(data.undefinedProperty);
            data.name.should.be.equal('milk');
            done();
          });
        };
      });
  });

  describe('replaceById', function() {
    after(function cleanUpData(done) {
      Product.destroyAll(function removeModelInstances(err) {
        if (err) return done(err);
        done();
      });
    });
    it('should replace the model instance if the provided key already exists',
      function(done) {
        Product.create({
          id: 2,
          name: 'bread',
          price: 100,
          undefinedProperty: 'ShouldBeRemoved',
        }, function(err, product) {
          if (err) return done(err);
          Product.replaceById(product.id, {name: 'apple'},
            function(err, updatedProduct) {
              if (err) return done(err);
              verifyUpdatedData(updatedProduct);
            });
        });

        function verifyUpdatedData(data) {
          // Verify callback data
          should.exist(data.id);
          should.not.exist(data.price);
          // Should remove extraneous properties not defined in the model
          should.not.exist(data.undefinedProperty);
          data.name.should.be.equal('apple');

          // Verify DB data
          verifyDBData(data.id);
        };

        function verifyDBData(id) {
          Product.findById(id, function(err, data) {
            if (err) return done(err);
            should.not.exist(data.price);
            should.not.exist(data.undefinedProperty);
            data.name.should.be.equal('apple');
            done();
          });
        };
      });
  });

  describe('updateAll and updateAttributes', function() {
    var productInstance;
    beforeEach('create Product', function(done) {
      Product.create({
        id: 1,
        name: 'bread',
        price: 100,
      }, function(err, product) {
        if (err) return done(err);
        productInstance = product;
        done();
      });
    });

    afterEach(function(done) {
      Product.destroyById(1, function(err) {
        if (err) return done(err);
        done();
      });
    });

    it('accepts loopback model instance as input data for update',
      function(done) {
        productInstance.setAttribute('name', 'butter');
        Product.updateAll({id: '1'}, productInstance, function(err, res) {
          if (err) return done(err);

          Product.findById('1', function(err, prod) {
            prod.name.should.equal('butter');
            done();
          });
        });
      });
  });

  // the test suite is to make sure when
  // user queries against a non existing property
  // the app won't crash
  describe('nested property', function() {
    before(function createSampleData(done) {
      CustomerSimple.create(seed(), done);
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
            err.message.should.match(/Unspecified or ambiguous sort type/);
            done();
          });
      });
      it('returns result when sorting type provided - missing first level' +
        'property', function(done) {
        // Similar test case exist in juggler, but since it takes time to
        // recover them, I temporarily add it here
        CustomerSimple.find({where: {'address.state': 'CA'},
          order: 'missingProperty:string'}, function(err, customers) {
          if (err) return done(err);
          customers.length.should.be.equal(2);
          var expected1 = ['San Mateo', 'San Jose'];
          var expected2 = ['San Jose', 'San Mateo'];
          var actual = customers.map(function(c) { return c.address.city; });
          should(actual).be.oneOf(expected1, expected2);
          done();
        });
      });
      it('returns result when sorting type provided - nested property',
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
      var connector = Cloudant.initialize(ds, function(err) {
        should.not.exist(err);
        should.exist(result.foobar);
        result.foobar.foo.should.be.equal('bar');
        result.plugin.should.be.equal(ds.settings.plugin);
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
