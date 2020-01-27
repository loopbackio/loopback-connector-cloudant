// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

const _ = require('lodash');
const inspect = require('util').inspect;
const debug = require('debug')('loopback:connector:cloudant');

module.exports = mixinMigrate;

function mixinMigrate(Cloudant) {
  /**
    * Used in function `migrateOrUpdateIndex`.
    * Create index with index object.
    * @param {Object} mo  The model configuration
    * @param {String} model  The model name.
    * @param {String} name  The index name.
    * @param {Object} indexObj The index object
    * e.g. {fields: [{"foo": "asc"}, {"bar": "asc"}], partitioned: true}
    * @param {Function} cb
  */
  Cloudant.prototype._createIndex = function(mo, model, name, indexObj, cb) {
    const self = this;
    debug('createIndex fields before coercion: %s', inspect(indexObj.fields));
    let fields = self.coerceIndexFields(indexObj.fields);
    debug('createIndex fields after coercion: %s', inspect(fields));
    fields = self.addModelViewToIndex(mo.modelView, fields);
    debug('createIndex fields after add model index: %s', inspect(fields));
    // naming convertion: '_design/LBModel__Foo__LBIndex__foo_index',
    // here the driver api takes in the name without prefix '_design/'
    const config = {
      ddocName: self.getIndexModelPrefix(mo) + '__' + model + '__' +
      self.getIndexPropertyPrefix(mo) + '__' + name,
      indexName: name,
      fields: fields,
      partitioned: indexObj.partitioned,
    };
    self.createIndexWithConfig(config, cb);
  };

  /**
   * Used in function `getModifyIndexes()`.
   * Generate indexes for model properties that are configured as
   * `{index: true}`, return model property indexes as objects,
   * e.g. {fields: [{name: 'asc'}], partitioned: true}.
   *
   * @param {Object} indexes indexes from model config, retrieved in
   * `getModifyIndexes()`
   */
  Cloudant.prototype._generatePropertyLevelIndexes = function(indexes) {
    const results = {};
    for (const key in indexes) {
      const field = {};
      // By default the order will be `asc`, partitioned is false,
      // please create Model level index if you need `desc` or partitioned index
      field[key.split('_index')[0]] = 'asc';
      const fields = [field];
      results[key] = {fields: fields, partitioned: false};
    }
    return results;
  };

  /**
   * Used in function `getModifyIndexes()`.
   * Generate indexes for indexes defined in the model config.
   * Return indexes as objects, e.g.
   * {fields: [{foo: 'asc'}, {bar: 'desc'}], partitioned: true}
   *
   * @param {Object} indexes indexes from model config, provided by
   * `getModifyIndexes()`
   */
  Cloudant.prototype._generateModelLevelIndexes = function(indexes, cb) {
    const results = {};
    for (const key in indexes) {
      const keys = indexes[key].keys;
      if (!keys || typeof keys !== 'object') return cb(new Error(
        'the keys in your model index are not well defined! please see' +
      'https://loopback.io/doc/en/lb3/Model-definition-JSON-file.html#indexes',
      ));

      const partitioned = indexes[key].partitioned || false;

      const fields = [];
      _.forEach(keys, function(value, key) {
        const obj = {};
        let order;
        if (keys[key] === 1) order = 'asc';
        else order = 'desc';
        obj[key] = order;
        fields.push(obj);
      });
      results[key] = {fields, partitioned};
    }
    return results;
  };

  /**
 * Perform the indexes comparison for `autoupdate`.
 * @param {Object} newIndexes
 * newIndexes in format:
 * ```js
 * {
  *   indexName: {fields: [{afield: 'asc'}], partitioned: false},
  *   compositeIndexName: {fields: [{field1: 'asc'}, {field2: 'asc'}], partitioned: true}
  * }
  * ```
  * @param {Object} oldIndexes
  * oldIndexes in format:
  * ```js
  * {
  *   indexName: {
  *     ddoc: '_design/LBModel__Foo__LBIndex__bar_index',
  *     fields: [{afield: 'asc'}],
  *     partitioned: true
  *   }
  * }
  * ```
  * @callback {Function} cb The callback function
  * @param {Object} result indexes to add and drop after comparison
  * ```js
  * result: {indexesToAdd: {$someIndexes}, indexesToDrop: {$someIndexes}}
  * ```
  */
  Cloudant.prototype.compare = function(newIndexes, oldIndexes, cb) {
    debug('Cloudant.prototype.compare');
    const result = {};
    let indexesToDrop = {};
    let indexesToAdd = {};
    let iAdd;
    for (const niKey in newIndexes) {
      if (!oldIndexes.hasOwnProperty(niKey)) {
        // Add item to `indexesToAdd` if it's new
        iAdd = {};
        iAdd[niKey] = newIndexes[niKey];
        indexesToAdd = _.merge(indexesToAdd, iAdd);
      } else {
        if (arrEqual(newIndexes[niKey].fields, oldIndexes[niKey].fields)) {
          // Don't change it if index already exists
          delete oldIndexes[niKey];
        } else {
          // Update index if fields change
          iAdd = {};
          const iDrop = {};
          iAdd[niKey] = newIndexes[niKey];
          indexesToAdd = _.merge(indexesToAdd, iAdd);
        }

        function arrEqual(arr1, arr2) {
          if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
          let isEqual = true;
          for (const item in arr1) {
            const i = _.findIndex(arr2, arr1[item]);
            isEqual = isEqual && (i > -1);
          }
          return isEqual;
        }
      }
    }
    indexesToDrop = oldIndexes;
    result.indexesToAdd = indexesToAdd;
    result.indexesToDrop = indexesToDrop;
    debug('result for compare: %s', inspect(result, {depth: null}));
    return result;
  };

  /**
    * Create an index in cloudant with the configuration properties of an index body.
    * This method is created to replace `createIndex`, which only takes in
    * limited parameters(ddocName, indexName, fields).
    * @param {Object} config The index config properties in format
    * ```
    * {
    *   fields: Array,
    *   ddocName: String,
    *   indexName: String,
    *   partitioned: Boolean,
    *   ...otherProperties: any
    * }
    * ```
    * @callback {Function} cb The callback function
  */
  Cloudant.prototype.createIndexWithConfig = function(config, cb) {
    debug('createIndexWithConfig: config %s', config);
    const self = this;
    const indexBody = {
      index: {
        fields: config.fields,
      },
      partitioned: config.partitioned || false,
      ddoc: config.ddocName,
      name: config.indexName,
      type: 'json',
    };

    const requestObject = {
      db: self.settings.database,
      path: '_index',
      method: 'post',
      body: indexBody,
    };

    self.getDriverInst().request(requestObject, cb);
  };
}
