// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

'use strict';

var URL = require('url');
var assert = require('assert');
var util = require('util');
var _ = require('lodash');

module.exports = mixinGeo;

function mixinGeo(Cloudant) {
  var debug = require('debug')('loopback:connector:cloudant:geo');

  /**
   * Gets data at `/{db}/_design/{ddocName}/_geo/{indexName}?{options}`
   *
   * Example:
   * User has a geo index called `getIndex` in design document /{db}/_design/model/_geo,
   * to query the geo index, user can call function:
   * ```
   * ds.geoDocs(model, getIndex, {radius: 2000}, cb);
   * ```
   *
   * @param {String} ddocName The design doc name without {db}/_design/ prefix
   * @param {String} indexName The index name
   * @param {Object} options The Cloudant index params
   * @callback
   * @param {Function} cb
   */
  Cloudant.prototype.geoDocs = function(ddocName, indexName, options, cb) {
    // omit options, e.g. ds.geoDocs(ddocName, indexName, cb);
    if (typeof options === 'function' && !cb) {
      cb = options;
      options = {};
    }
    debug('Cloudant.prototype.geoDocs ddocName %s indexName %s options %s',
      ddocName, indexName, options);

    var self = this;
    var db = this.cloudant.use(self.getDbName(self));

    db.geo(ddocName, indexName, options, cb);
  };
};

