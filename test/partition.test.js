// Copyright IBM Corp. 2016,2019. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

require('./init.js');
const _ = require('lodash');
const should = require('should');
const uuid = require('uuid/v4');
const DEFAULT_MODEL_VIEW = 'loopback__model__name';
let Product, db, connector;

const config = {
  url: process.env.CLOUDANT_URL,
  username: process.env.CLOUDANT_USERNAME,
  password: process.env.CLOUDANT_PASSWORD,
  database: process.env.CLOUDANT_PARTITIONED_DATABASE,
  plugin: 'retry',
  retryAttempts: 10,
  retryTimeout: 50,
};

describe('cloudant - partitioned db', () => {
  before(function(done) {
    db = global.getDataSource(config);
    connector = db.connector;
    db.automigrate(done);
  });

  context('index tests', ()=> {
    it('property level - create global index by default', (done) => {
      Product = db.define('Product', {
        prodName: {type: String, index: true},
        desc: {type: String},
      });
      db.autoupdate('Product', (err) => {
        if (err) return done(err);
        connector.getIndexes(connector.getDbName(connector), (e, results) => {
          if (e) return done(e);
          const indexes = results.indexes;
          const indexName = 'prodName_index';
          should.exist(indexes);

          const index = _.find(indexes, function(index) {
            return index.name === indexName;
          });
          should.exist(index);
          index.name.should.equal(indexName);
          index.def.fields[0]['prodName'].should.equal('asc');
          index.def.fields[1][DEFAULT_MODEL_VIEW].should.equal('asc');
          // should be a global index
          index.partitioned.should.equal(false);
          done();
        });
      });
    });

    it('index entry - create global index by default', (done) => {
      Product = db.define('Product', {
        prodName: {type: String},
        desc: {type: String},
      }, {
        indexes: {
          'prodName1_index': {
            keys: {
              prodName: -1,
            },
          },
        },
      });
      db.autoupdate('Product', (err) => {
        if (err) return done(err);
        connector.getIndexes(connector.getDbName(connector), (e, results) => {
          if (e) return done(e);
          const indexes = results.indexes;
          const indexName = 'prodName1_index';
          should.exist(indexes);

          const index = _.find(indexes, function(index) {
            return index.name === indexName;
          });
          should.exist(index);
          index.name.should.equal(indexName);
          index.def.fields[0]['prodName'].should.equal('desc');
          index.def.fields[1][DEFAULT_MODEL_VIEW].should.equal('desc');
          // should be a global index
          index.partitioned.should.equal(false);
          done();
        });
      });
    });

    it('index entry - ' +
      'create partitioned index for when `partitioned` is configured as true',
    (done) => {
      Product = db.define('Product', {
        prodName: {type: String},
        desc: {type: String},
      }, {
        indexes: {
          'prodName2_index': {
            partitioned: true,
            keys: {
              prodName: 1,
            },
          },
        },
      });
      db.autoupdate('Product', (err) => {
        if (err) return done(err);
        connector.getIndexes(connector.getDbName(connector), (e, results) => {
          if (e) return done(e);
          const indexes = results.indexes;
          const indexName = 'prodName2_index';
          should.exist(indexes);

          const index = _.find(indexes, function(index) {
            return index.name === indexName;
          });
          should.exist(index);
          index.name.should.equal(indexName);
          index.def.fields[0]['prodName'].should.equal('asc');
          index.def.fields[1][DEFAULT_MODEL_VIEW].should.equal('asc');
          // should be a global index
          index.partitioned.should.equal(true);
          done();
        });
      });
    });

    it('index entry - ' +
      'create global index for when `partitioned` is configured as false',
    (done) => {
      Product = db.define('Product', {
        prodName: {type: String},
        desc: {type: String},
      }, {
        indexes: {
          'prodName3_index': {
            partitioned: false,
            keys: {
              prodName: 1,
            },
          },
        },
      });
      db.automigrate('Product', (err) => {
        if (err) return done(err);
        connector.getIndexes(connector.getDbName(connector), (e, results) => {
          if (e) return done(e);
          const indexes = results.indexes;
          const indexName = 'prodName3_index';
          should.exist(indexes);

          const index = _.find(indexes, function(index) {
            return index.name === indexName;
          });
          should.exist(index);
          index.name.should.equal(indexName);
          index.def.fields[0]['prodName'].should.equal('asc');
          index.def.fields[1][DEFAULT_MODEL_VIEW].should.equal('asc');
          // should be a global index
          index.partitioned.should.equal(false);
          done();
        });
      });
    });
  });

  context('findAll tests', ()=> {
    it('find all records by partition key from option', (done) => {
      Product = db.define('Product', {
        name: {type: String},
        tag: {type: String},
      }, {
        forceId: false,
        indexes: {
          'product_name_index': {
            partitioned: true,
            keys: {
              city: 1,
            },
          },
        },
      });
      db.automigrate('Product', () => {
        Product.create(SEED_DATA, function(err) {
          if (err) return done(err);
          Product.find({where: {tag: 'food'}}, {partitionKey: 'toronto'},
            (err, results) => {
              if (err) return done(err);
              should.exist(results);
              results.length.should.equal(2);
              const resultTaggedFood = _.filter(results,
                function(r) {
                  return r.tag === 'food';
                });
              resultTaggedFood.length.should.equal(2);
              done();
            });
        });
      });
    });
  });
});

const SEED_DATA = [
  {id: `toronto: ${uuid()}`, name: 'beer', tag: 'drink'},
  {id: `toronto: ${uuid()}`, name: 'salad', tag: 'food'},
  {id: `toronto: ${uuid()}`, name: 'soup', tag: 'food'},
  {id: `london: ${uuid()}`, name: 'beer', tag: 'drink'},
  {id: `london: ${uuid()}`, name: 'salad', tag: 'food'},
  {id: `london: ${uuid()}`, name: 'salad', tag: 'food'},
];
