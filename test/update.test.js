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
var url = require('url');
var db, Product;

function cleanUpData(done) {
  Product.destroyAll(done);
}

var bread = {
  name: 'bread',
  price: 100,
};

describe('updateAll', function() {
  before(function(done) {
    db = getDataSource();

    Product = db.define('Product', {
      name: {type: String},
      description: {type: String},
      price: {type: Number},
    }, {forceId: false});

    db.automigrate(function(err) {
      Product.create(bread, done);
    });
  });

  after(cleanUpData);

  it('updates a model instance', function(done) {
    var newData = {
      name: 'bread2',
      price: 250,
    };
    var id;
    Product.find(function(err, result) {
      should.not.exist(err);
      should.exist(result);
      id = result[0].id;
      Product.update({id: id}, newData, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.have.property('count');
        result.count.should.equal(1);
        Product.find(function(err, result) {
          should.not.exist(err);
          should.exist(result);
          newData.id = id;
          should.deepEqual(newData, result[0].__data);
          done();
        });
      });
    });
  });
});
