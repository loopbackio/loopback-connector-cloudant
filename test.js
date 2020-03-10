// Copyright IBM Corp. 2017,2020. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// This script is for creating database for couchdb3 instance that created by
// `sh setup.sh`. The setup is separated to two files is because this step
// is hard to achieve by curl.

'use strict';

const _ = require('lodash');
const async = require('async');
const spawn = require('child_process').spawn;
const fmt = require('util').format;
const http = require('http');

// we don't pass any node flags, so we can call _mocha instead the wrapper
const mochaBin = require.resolve('mocha/bin/_mocha');

process.env.CLOUDANT_PARTITIONED_DATABASE = 'test-partitioned-db';
process.env.CLOUDANT_DATABASE = process.env.CLOUDANT_DATABASE || 'testdb';
process.env.CLOUDANT_PASSWORD = process.env.CLOUDANT_PASSWORD || 'pass';
process.env.CLOUDANT_USERNAME = process.env.CLOUDANT_USERNAME || 'admin';

// these are placeholders. They get set dynamically based on what IP and port
// get assigned by docker.
process.env.CLOUDANT_PORT = process.env.CLOUDANT_PORT || 5984;
process.env.CLOUDANT_HOST = process.env.CLOUDANT_HOST || 'localhost';
const usr = process.env.CLOUDANT_USERNAME;
const pass = process.env.CLOUDANT_PASSWORD;
const host = process.env.CLOUDANT_HOST;
const port = process.env.CLOUDANT_PORT;
process.env.CLOUDANT_URL = 'http://' + usr + ':' + pass + '@' +
  host + ':' + port;

const containerToDelete = null;

async.waterfall([
  createDB(process.env.CLOUDANT_DATABASE),
  createPartitionedDB(process.env.CLOUDANT_PARTITIONED_DATABASE),
  run([mochaBin, 'test/*.test.js', 'node_modules/juggler-v3/test.js',
    'node_modules/juggler-v4/test.js', '--timeout', '40000',
    '--require', 'strong-mocha-interfaces', '--require', 'test/init.js',
    '--ui', 'strong-bdd']),
], function(testErr) {
  dockerCleanup(function(cleanupErr) {
    if (cleanupErr) {
      console.error('error cleaning up:', cleanupErr);
    }
    if (testErr) {
      console.error('error running tests:', testErr);
      process.exit(1);
    }
  });
});

function createDB(db) {
  return function create(next) {
    const opts = {
      method: 'PUT',
      path: '/' + db,
      host: process.env.CLOUDANT_HOST,
      port: process.env.CLOUDANT_PORT,
      auth: process.env.CLOUDANT_USERNAME + ':' + process.env.CLOUDANT_PASSWORD,
    };
    http.request(opts, function(res) {
      res.pipe(devNull());
      res.on('error', next);
      res.on('end', function() {
        setImmediate(next, null);
      });
    })
      .on('error', function() {
        try {
          // retry if socket hangs up too early
          create(next);
        } catch (error) {
          throw new Error(error);
        }
      })
      .end();
  };
}

function createPartitionedDB(db) {
  return function create(next) {
    const opts = {
      method: 'PUT',
      path: '/' + db + '?partitioned=true',
      host: process.env.CLOUDANT_HOST,
      port: process.env.CLOUDANT_PORT,
      auth: process.env.CLOUDANT_USERNAME + ':' + process.env.CLOUDANT_PASSWORD,
    };
    console.log('creating db: %j', db);
    http.request(opts, function(res) {
      res.pipe(devNull());
      res.on('error', next);
      res.on('end', function() {
        setImmediate(next);
      });
    })
      .on('error', function() {
        try {
          // retry if socket hangs up too early
          create(next);
        } catch (error) {
          throw new Error(error);
        }
      })
      .end();
  };
}

function run(cmd) {
  return function spawnNode(next) {
    console.log('running mocha...');
    spawn(process.execPath, cmd, {stdio: 'inherit'})
      .on('error', next)
      .on('exit', onExit);

    function onExit(code, sig) {
      if (code) {
        next(new Error(fmt('mocha exited with code: %j, sig: %j', code, sig)));
      } else {
        next();
      }
    }
  };
}

// clean up any previous containers
function dockerCleanup(next) {
  if (containerToDelete) {
    console.log('cleaning up container: %s', containerToDelete.id);
    containerToDelete.remove({force: true}, function(err) {
      next(err);
    });
  } else {
    setImmediate(next);
  }
}

// A Writable Stream that just consumes a stream. Useful for draining readable
// streams so that they 'end' properly, like sometimes-empty http responses.
function devNull() {
  return new require('stream').Writable({
    write: function(_chunk, _encoding, cb) {
      return cb(null);
    },
  });
}
