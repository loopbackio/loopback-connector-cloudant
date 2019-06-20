// Copyright IBM Corp. 2018,2019. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

const URL = require('url');
const assert = require('assert');
const util = require('util');
const _ = require('lodash');

module.exports = mixinGeo;

function mixinGeo(Cloudant) {
  const debug = require('debug')('loopback:connector:cloudant:geo');

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

    const self = this;
    const db = this.cloudant.use(self.getDbName(self));

    db.geo(ddocName, indexName, options, cb);
  };
}

