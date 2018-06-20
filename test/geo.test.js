// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

'use strict';

require('./init.js');
var _ = require('lodash');
var async = require('async');
var should = require('should');
var url = require('url');

var db, sampleData;

describe('cloudant geo', function() {
  describe('viewDocs', function(done) {
    before(function(done) {
      db = global.getDataSource();
      var connector = db.connector;
      var driverInstance;

      db.once('connected', function(err) {
        driverInstance = connector[connector.name]
          .use(connector.getDbName(connector));
        async.series([insertSampleData, insertViewDdoc], done);
      });

      function insertSampleData(cb) {
        sampleData = generateSamples();
        driverInstance.bulk({docs: sampleData}, cb);
      };

      function insertViewDdoc(cb) {
        var viewFunction = 'function(doc) { if ' +
          '(doc.geometry && doc.geometry.coordinates) { ' +
          'st_index(doc.geometry); } };';

        var ddoc = {
          _id: '_design/geo',
          'st_indexes': {
            getGeo: {
              index: viewFunction,
            },
          },
        };

        driverInstance.insert(JSON.parse(JSON.stringify(ddoc)), cb);
      };
    });

    it('returns result by quering a view', function(done) {
      db.connector.geoDocs('geo', 'getGeo',
        function(err, results) {
          (results === undefined).should.be.true();
          done(null);
        });
    });

    it('queries a view with radius filter', function(done) {
      db.connector.geoDocs('geo', 'getGeo', {
        lat: 32.646911,
        lon: -96.866988,
        radius: 250000,
        'include_docs': true,
      }, function(err, results) {
        var expectedLocationIds = [1, 2, 3, 4];
        results.rows.forEach(belongsToModelLocation);
        done(err);

        function belongsToModelLocation(elem) {
          var doc = elem.doc;
          doc.geoModel.should.equal('geo');
          _.indexOf(expectedLocationIds, doc.locationId).should.not.equal(-1);
        }
      });
    });
  });
});

function generateSamples() {
  var samples = [
    {
      geoModel: 'geo',
      locationId: 1,
      geometry: {
        type: 'Point',
        coordinates: [-96.691448, 33.158878],
      },
    },
    {
      geoModel: 'geo',
      locationId: 2,
      geometry: {
        type: 'Point',
        coordinates: [-96.691448, 33.158878],
      },
    },
    {
      geoModel: 'geo',
      locationId: 3,
      geometry: {
        type: 'Point',
        coordinates: [-96.691448, 33.158878],
      },
    },
    {
      geoModel: 'geo',
      locationId: 4,
      geometry: {
        type: 'Point',
        coordinates: [-96.691448, 33.158878],
      },
    },
  ];

  return samples;
}
