// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var DataSource = require('loopback-datasource-juggler').DataSource;
var _ = require('lodash');
var should = require('should');
var testUtil = require('./../lib/test-util');
var url = require('url');
var couchConfig, ds;

describe('prototype functions in couchdb.js', function() {
  couchConfig = {
    url: '',
    database: 'dev',
  };
  it('connects', function(done) {
    ds = new DataSource(require('../../').couchdb, couchConfig);
    // make sure we get a valid nano instance by creating a new datasource
    // and also test we can call ds.connector.couchdb.use(dbName) to get
    // available nano apis for a database
    (typeof ds.connector.couchdb.use === 'function').should.equal(true);
    done();
  });
  it('inserts', function(done) {
    ds.connector.create({
      'loopback__model__name':
      'Customer', name: 'foo',
      age: 10,
    }, function(err, result) {
      if (err) return done(err);
      result.ok.should.equal(true);
      should.exist(result.id);
      should.exist(result.rev);
      console.log(result);
      done();
    });
  });
  it('create index for LB models', function(done) {
    ds.connector.createIndex('loopback__model__name__ddoc',
      'loopback__model__name', ['loopback__model__name'],
        function(err, result) {
          if (err) return done(err);
          result.id.should.equal('_design/loopback__model__name__ddoc');
          result.name.should.equal('loopback__model__name');
          console.log(result);
          done();
        });
  });
  it('create index for model property', function(done) {
    ds.connector.createIndex('loopback__model__Customer__property__name__ddoc',
      'loopback__model__Customer__property__name', ['name'],
        function(err, result) {
          if (err) return done(err);
          result.id.should.
            equal('_design/loopback__model__Customer__property__name__ddoc');
          result.name.should.equal('loopback__model__Customer__property__name');
          console.log(result);
          done();
        });
  });
  it('delete index for property', function(done) {
    ds.connector.createIndex('fake', 'fake', ['fake'], function(err, result) {
      if (err) return done(err);
      ds.connector.deleteIndex('fake', function(err, result) {
        if (err) return done(err);
        result.ok.should.equal(true);
        result.id.should.equal('_design/fake');
        console.log(result);
        done();
      });
    });
  });
  it('find by query', function(done) {
    ds.connector._find('Customer', {age: 10}, function(err, result) {
      if (err) return done(err);
      result.docs.length.should.equal(1);
      result.docs[0]['loopback__model__name'].should.equal('Customer');
      result.docs[0].age.should.equal(10);
      console.log(result);
      done();
    });
  });
});

describe.only('model operations', function() {
  before(function(done) {
    ds = new DataSource(require('../../').couchdb, couchConfig);
    ds.define('Customer', {
      name: {type: String, index: true},
      age: {type: Number, index: true},
      wrong: {type: String},
    }, {forceId: false});
    done();
  });

  it('automigrates model', function(done) {
    ds.connector.automigrate('Customer', done);
  });
  it('inserts model instance', function(done) {
    ds.connector.create({
      'loopback__model__name':
      'Customer', name: 'foo',
      age: 10,
    }, function(err, result) {
      console.log(result);
      result.ok.should.equal(true);
      should.exist(result.id);
      should.exist(result.rev);
      done();
    });
  });
  it('finds by query', function(done) {
    ds.connector._find('Customer', {age: 10}, function(err, result) {
      if (err) return done(err);
      result.docs.length.should.equal(1);
      result.docs[0]['loopback__model__name'].should.equal('Customer');
      result.docs[0].age.should.equal(10);
      console.log(result);
      done();
    });
  });
});
