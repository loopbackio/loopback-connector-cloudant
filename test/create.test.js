// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

require('./init.js');
var Cloudant = require('../lib/cloudant');
var _ = require('lodash');
var async = require('async');
var should = require('should');
var testUtil = require('./lib/test-util');
var url = require('url');
var db, Product;

function cleanUpData(done) {
  Product.destroyAll(done);
}

var bread = {
  name: 'bread',
  price: 100,
};

describe('create', function() {
  before(function(done) {
    db = getDataSource();

    Product = db.define('Product', {
      name: {type: String},
      description: {type: String},
      price: {type: Number},
    }, {forceId: false});

    db.once('connected', function() {
      db.automigrate(done);
    });
  });
  it('creates when model instance does not exist', function(done) {
    Product.create(bread, function(err, result) {
      testUtil.hasError(err, result).should.not.be.ok();
      Product.findById(result.id, function(err, result) {
        testUtil.hasError(err, result).should.not.be.ok();
        should.exist(result._rev);
        testUtil.checkModel(bread, result);
        done();
      });
    });
  });

  it('replaces when the instance exists', function(done) {
    Product.create(bread, function(err, result) {
      testUtil.hasError(err, result).should.not.be.ok();
      should.exist(result._rev);
      var updatedBread = _.cloneDeep(result);
      // Make the new record different a subset of the old one.
      delete updatedBread.price;
      Product.create(updatedBread, function(err, result) {
        testUtil.hasError(err, result).should.not.be.ok();
        testUtil.checkModel(updatedBread, result);
        should.notDeepEqual(bread, result);
        done();
      });
    });
  });

  it('throws on update when model exists and _rev is different ',
     function(done) {
       var initialResult;
       async.waterfall([
         function(callback) {
           return Product.create(bread, callback);
         },
         function(result, callback) {
           return Product.findById(result.id, callback);
         },
         function(result, callback) {
           initialResult = _.cloneDeep(result);
           // Simulate the idea of another caller changing the record first!
           result.price = 250;
           return Product.create(result, callback);
         },
         function(result, callback) {
           // Someone beat us to it, but we don't know that yet.
           initialResult.price = 150;
           return Product.create(initialResult, callback);
         },
       ], function(err, result) {
         err.should.be.ok();
         should(_.includes(err.message, 'Document update conflict'));
         done();
       });
     });

  afterEach(cleanUpData);
});
