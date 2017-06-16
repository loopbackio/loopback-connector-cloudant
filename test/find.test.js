// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

require('./init.js');
var CouchDB = require('../lib/couchdb');
var _ = require('lodash');
var async = require('async');
var should = require('should');
var testUtil = require('./lib/test-util');
var url = require('url');
var db, Product;

function cleanUpData(done) {
  Product.destroyAll(done);
}

var bread = [{
  id: 1,
  name: 'bread1',
  price: 100,
}, {
  id: 2,
  name: 'bread2',
  price: 50,
}, {
  id: 5,
  name: 'bread3',
  price: 250,
}];

describe('find', function() {
  before(function(done) {
    db = getDataSource();

    Product = db.define('Product', {
      id: {type: Number, required: true, id: true},
      name: {type: String},
      description: {type: String},
      price: {type: Number},
    }, {forceId: false});

    db.automigrate(function(err) {
      should.not.exist(err);
      Product.create(bread, done);
    });
  });

  after(cleanUpData);

  it('find all model instance', function(done) {
    Product.find(function(err, result) {
      err = testUtil.refinedError(err, result);
      if (err) return done(err);
      should.exist(result);
      result.length.should.equal(bread.length);
      for (var i = 0; i < bread.length; i++) {
        should.exist(result[i]._rev);
        testUtil.checkModel(bread[i], result);
      }
      done();
    });
  });

  it('findById all model instance', function(done) {
    Product.findById(1, function(err, result) {
      err = testUtil.refinedError(err, result);
      if (err) return done(err);
      should.exist(result);
      should.exist(result._rev);
      testUtil.checkModel(bread[0], result);
      done();
    });
  });
});
