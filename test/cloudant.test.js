// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// Comment test cases to get CI pass,
// will recover them when CI config done

'use strict';

var should = require('should');
var describe = require('./describe');
var db, Product;

describe('cloudant connector', function() {
  before(function(done) {
    db = getDataSource();

    Product = db.define('Product', {
      name: {type: String},
      description: {type: String},
      price: {type: Number},
    }, {forceId: false});

    Product.destroyAll(function(err) {
      done();
    });
  });

  describe('replaceOrCreate', function() {
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
});
