// Copyright IBM Corp. 2018,2019. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

require('./init.js');
const _ = require('lodash');
const async = require('async');
const should = require('should');
const url = require('url');

let db, sampleData;

describe('cloudant geo', function() {
  describe('viewDocs', function(done) {
    before(function(done) {
      db = global.getDataSource();
      const connector = db.connector;
      let driverInstance;

      db.once('connected', function(err) {
        driverInstance = connector[connector.name]
          .use(connector.getDbName(connector));
        async.series([insertSampleData, insertViewDdoc], done);
      });

      function insertSampleData(cb) {
        sampleData = generateSamples();
        driverInstance.bulk({docs: sampleData}, cb);
      }

      function insertViewDdoc(cb) {
        const viewFunction = function(doc) {
          if (doc.geometry && doc.geometry.coordinates) {
            // eslint-disable-next-line no-undef
            st_index(doc.geometry);
          }
        };

        const ddoc = {
          _id: '_design/geo',
          'st_indexes': {
            getGeo: {
              index: viewFunction,
            },
          },
        };

        driverInstance.insert(ddoc, cb);
      }
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
        lat: 42.447222,
        lon: -71.225,
        radius: 250000,
        'include_docs': true,
      }, function(err, results) {
        const expectedLocationIds = [1, 2, 3, 4];
        results.rows.forEach(belongsToModelLocation);
        done(err);

        function belongsToModelLocation(elem) {
          const doc = elem.doc;
          doc.geoModel.should.equal('geo');
          _.indexOf(expectedLocationIds, doc.locationId).should.not.equal(-1);
        }
      });
    });
  });
});

function generateSamples() {
  const samples = [
    {
      geoModel: 'geo',
      locationId: 1,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-71.063611, 42.358056],
      },
    },
    {
      geoModel: 'geo',
      locationId: 2,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-71.063611, 42.358056],
      },
    },
    {
      geoModel: 'geo',
      locationId: 3,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-71.063611, 42.358056],
      },
    },
    {
      geoModel: 'geo',
      locationId: 4,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-71.063611, 42.358056],
      },
    },
  ];

  return samples;
}
