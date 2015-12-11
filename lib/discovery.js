module.exports = mixinDiscovery;

function mixinDiscovery (Cloudant) {

  var debug = require ('debug')('loopback:connector:cloudant:discovery');

  /**
   * Discover model definitions
   *
   * @param {Object} options Options for discovery
   * @param {Function} [cb] The callback function
   */
  Cloudant.prototype.discoverModelDefinitions = function (options, cb) {
    debug ('Cloudant.prototype.discoverModelDefinitions %j', options);

    if (!cb && typeof options === 'function') {
      cb = options;
    }

    this.db.list (function(err, dbs) {
      debug ('Cloudant.prototype.discoverModelDefinitions %j %j', err, dbs);
      if (err) cb (err);
      cb (null, dbs);
    });
  };

  /**
   * @param {String} dbname The database name
   * @param {Object} options The options for discovery
   * @param {Function} [cb] The callback function
   */
  Cloudant.prototype.discoverSchemas = function (dbname, options, cb) {
    debug ('Cloudant.prototype.discoverSchemas %j %j', dbname, options);
    var schema = {
      name: dbname,
      options: {
        idInjection: true,
        dbName: dbname
      },
      properties: {}
    };
    options.visited = options.visited || {};
    if (!options.visited.hasOwnProperty(dbname)) {
      options.visited[dbname] = schema;
    }
    cb && cb(null, options.visited);
  };
};
