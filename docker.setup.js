// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// This script is for creating database for couchdb3 instance that created by
// `sh setup.sh`. The setup is separated to two files is because this step
// is hard to achieve by curl. See README for database configuration.

'use strict';

const async = require('async');
const http = require('http');
const chalk = require('chalk');
const fs = require('fs');

process.env.CLOUDANT_PARTITIONED_DATABASE = 'test-partitioned-db';
process.env.CLOUDANT_DATABASE = process.env.CLOUDANT_DATABASE || 'testdb';
process.env.CLOUDANT_PASSWORD = process.env.CLOUDANT_PASSWORD || 'pass';
process.env.CLOUDANT_USERNAME = process.env.CLOUDANT_USERNAME || 'admin';

process.env.CLOUDANT_PORT = process.env.CLOUDANT_PORT || 5984;
process.env.CLOUDANT_HOST = process.env.CLOUDANT_HOST || 'localhost';
process.env.CLOUDANT_URL = 'TBD';

// create database and log the status if success
async.waterfall(
  [
    createDB(process.env.CLOUDANT_DATABASE),
    createPartitionedDB(process.env.CLOUDANT_PARTITIONED_DATABASE),
    logStatus(),
  ],
  function(testErr) {
    if (testErr) {
      console.error('error running tests:', testErr);
      process.exit(1);
    }
  },
);

function createDB(db) {
  return function create(next) {
    const usr = process.env.CLOUDANT_USERNAME;
    const pass = process.env.CLOUDANT_PASSWORD;
    const host = process.env.CLOUDANT_HOST;
    const port = process.env.CLOUDANT_PORT;
    process.env.CLOUDANT_URL =
      'http://' + usr + ':' + pass + '@' + host + ':' + port;

    const opts = {
      method: 'PUT',
      path: '/' + db,
      host: process.env.CLOUDANT_HOST,
      port: process.env.CLOUDANT_PORT,
      auth: process.env.CLOUDANT_USERNAME + ':' + process.env.CLOUDANT_PASSWORD,
    };

    http
      .request(opts, function(res) {
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
    console.log(chalk.red.bold(`>> Creating partitioned db: ${db}`));
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

function logStatus() {
  return function status(next) {
    const content =
      "export CLOUDANT_URL='" +
      process.env.CLOUDANT_URL +
      "'\n" +
      "export CLOUDANT_DATABASE='" +
      process.env.CLOUDANT_DATABASE +
      "'\n" +
      "export CLOUDANT_PARTITIONED_DATABASE='" +
      process.env.CLOUDANT_PARTITIONED_DATABASE +
      "'\n" +
      "export CLOUDANT_USERNAME='" +
      process.env.CLOUDANT_USERNAME +
      "'\n" +
      "export CLOUDANT_PASSWORD='" +
      process.env.CLOUDANT_PASSWORD +
      "'\n" +
      'export CLOUDANT_PORT=' +
      process.env.CLOUDANT_PORT +
      '\n' +
      "export CLOUDANT_HOST='" +
      process.env.CLOUDANT_HOST +
      "'";
    fs.writeFileSync('cloudant-config.sh', content, 'utf8');
    console.log(chalk.blue.bold('Done.\n\n'));
    console.log(
      chalk.yellow.bold(
        `Status: ${chalk.green('Set up completed successfully.\n')}`,
      ),
    );
    console.log(
      chalk.white.bold(
        `Instance url: ${chalk.blue(process.env.CLOUDANT_URL)}\n`,
      ),
    );
    /* eslint-disable quotes */
    console.log(
      chalk.white.bold(`To run the test suite: ` +
      `${chalk.blue(`source cloudant-config.sh && npm run mocha`)}\n\n`),
    );
    next();
  };
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
