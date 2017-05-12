// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var URL = require('url');
var assert = require('assert');
var util = require('util');
var _ = require('lodash');

module.exports = mixinView;

function mixinView(Cloudant) {
  var debug = require('debug')('loopback:connector:cloudant:view');

  /**
   * Get data returned by querying a view
   *
   * @param {String} ddocName The design doc name
   * @param {String} viewName The view name
   * @param {Object} options The cloudant view filter
   * @param {Function} [cb] The callback function
   */
  Cloudant.prototype.viewDocs = function(ddocName, viewName, options, cb) {
    // ds.viewDocs(ddocName, viewName, cb);
    if (typeof options === 'function' && !cb) {
      cb = options;
      options = {};
    }
    debug('Cloudant.prototype.view ddocName %s viewName %s options %s',
      ddocName, viewName, options);

    var dbName = this.settings.database || this.settings.db ||
      getDbFromUrl(this.settings.url);
    var db = this.cloudant.use(dbName);
    assert(db && typeof db.view === 'function',
      'model is not attached to a datasource supporting function view');

    db.view(ddocName, viewName, options, cb);
  };
};

/**
 * Parse url and return the database name if provided
 * @param {String} url The cloudant connection url
 * @return {String} The database name
 */
function getDbFromUrl(url) {
  var parsedUrl = URL.parse(url);
  if (parsedUrl.path && parsedUrl.path !== '/')
    return parsedUrl.path.split('/')[1];
  else return '';
}
