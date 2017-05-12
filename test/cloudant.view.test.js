// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

require('./init.js');
var Cloudant = require('../lib/cloudant');
var _ = require('lodash');
var url = require('url');
var should = require('should');
var async = require('async');
var db, TestView, Random, samples;

describe('cloudant view', function() {
  describe('viewDocs', function(done) {
    before(function(done) {
      db = getDataSource();
      TestView = db.define('TestView', {
        name: {type: String},
      }, {forceId: false});
      Random = db.define('Random', {
        foo: {type: String},
      }, {forceId: false});
      db.on('connected', function() {
        async.series([createModelTestView, seedData, insertViewDdoc], done);
      });

      function createModelTestView(cb) {
        db.automigrate(cb);
      };
      function seedData(cb) {
        samples = [{name: 'John'}, {name: 'Tom'}, {name: 'Zoe'}];
        var randomSamples = [{foo: 'bar1'}, {foo: 'bar2'}];
        TestView.create(samples, function(err) {
          if (err) return cb(err);
          Random.create(randomSamples, cb);
        });
      };
      function insertViewDdoc(cb) {
        // The design doc must be stored with double quote,
        // and map function cannot join by '+'
        /* eslint-disable */
        var ddoc = {
          "_id": "_design/getModel",
          "views": {
            "returnModelInstances": {
              "map": "function(doc) { if(doc.loopback__model__name) { emit(doc.loopback__model__name, doc); }}"
            }
          }
        };
        /* eslint-enable */
        // We test everything in a single db, so the view ddoc
        // and model 'TestView' should be in same db.
        db.connector.selectModel('TestView').db.insert(ddoc, cb);
      };
    });
    after(function(done) {
      TestView.destroyAll(function(err) {
        if (err) return done(err);
        Random.destroyAll(done);
      });
    });

    it('returns result by query a view', function(done) {
      db.connector.viewDocs('getModel', 'returnModelInstances',
        function(err, results) {
          results.total_rows.should.equal(5);
          results.rows.forEach(isLBModelInstance);
          done(err);

          function isLBModelInstance(elem) {
            elem.value.hasOwnProperty('loopback__model__name').
              should.equal(true);
          };
        });
    });

    it('queries a view with key filter', function(done) {
      db.connector.viewDocs('getModel', 'returnModelInstances', {
        'key': 'TestView',
      }, function(err, results) {
        var expectedNames = _.map(samples, function(obj) {
          return obj.name;
        });
        results.rows.forEach(isTestViewInstance);
        done(err);

        function isTestViewInstance(elem) {
          elem.key.should.equal('TestView');
          _.indexOf(expectedNames, elem.value.name).should.not.equal(-1);
        }
      });
    });
  });
});
