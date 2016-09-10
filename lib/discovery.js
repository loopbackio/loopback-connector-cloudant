// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

module.exports = mixinDiscovery;

function mixinDiscovery(Cloudant) {
  var debug = require('debug')('loopback:connector:cloudant:discovery');

  /**
   * Discover model definitions
   *
   * @param {Object} options Options for discovery
   * @param {Function} [cb] The callback function
   */
  Cloudant.prototype.discoverModelDefinitions = function(options, cb) {
    debug('Cloudant.prototype.discoverModelDefinitions %j', options);

    if (!cb && typeof options === 'function') {
      cb = options;
    }

    this.db.list(function(err, dbs) {
      debug('Cloudant.prototype.discoverModelDefinitions %j %j', err, dbs);
      if (err) cb(err);
      cb(null, dbs);
    });
  };

  /**
   * @param {string} dbname The database name
   * @param {Object} options The options for discovery
   * @param {Function} [cb] The callback function
   */
  Cloudant.prototype.discoverSchemas = function(dbname, options, cb) {
    debug('Cloudant.prototype.discoverSchemas %j %j', dbname, options);
    var schema = {
      name: dbname,
      options: {
        idInjection: true,
        dbName: dbname,
      },
      properties: {},
    };
    options.visited = options.visited || {};
    if (!options.visited.hasOwnProperty(dbname)) {
      options.visited[dbname] = schema;
    }
    if (cb) cb(null, options.visited);
  };
};
