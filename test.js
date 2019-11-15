// Copyright IBM Corp. 2017,2019. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

const _ = require('lodash');
const async = require('async');
const spawn = require('child_process').spawn;
const docker = new require('dockerode')();
const fmt = require('util').format;
const http = require('http');
const ms = require('ms');

// we don't pass any node flags, so we can call _mocha instead the wrapper
const mochaBin = require.resolve('mocha/bin/_mocha');

process.env.CLOUDANT_DATABASE = 'test-db';
process.env.CLOUDANT_PARTITIONED_DATABASE = 'test-partitioned-db';
process.env.CLOUDANT_PASSWORD = 'pass';
process.env.CLOUDANT_USERNAME = 'admin';

// these are placeholders. They get set dynamically based on what IP and port
// get assigned by docker.
process.env.CLOUDANT_PORT = 'TBD';
process.env.CLOUDANT_HOST = 'TBD';
process.env.CLOUDANT_URL = 'TBD';

const CONNECT_RETRIES = 30;
const CONNECT_DELAY = ms('5s');

let containerToDelete = null;

async.waterfall([
  dockerStart('ibmcom/couchdb3:latest'),
  sleep(ms('2s')),
  setCloudantEnv,
  waitFor('/_all_dbs'),
  createAdmin(),
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

function sleep(n) {
  return function delayedPassThrough() {
    const args = [].slice.call(arguments);
    // last argument is the callback
    const next = args.pop();
    // prepend `null` to indicate no error
    args.unshift(null);
    setTimeout(function() {
      next.apply(null, args);
    }, n);
  };
}

function dockerStart(imgName) {
  return function pullAndStart(next) {
    console.log('pulling image: %s', imgName);
    docker.pull(imgName, function(err, stream) {
      docker.modem.followProgress(stream, function(err, output) {
        if (err) {
          return next(err);
        }
        console.log('starting container from image: %s', imgName);
        docker.createContainer({
          Image: imgName,
          HostConfig: {
            PublishAllPorts: true,
          },
        }, function(err, container) {
          console.log('recording container for later cleanup: ', container.id);
          containerToDelete = container;
          if (err) {
            return next(err);
          }
          container.start(function(err, data) {
            next(err, container);
          });
        });
      });
    });
  };
}

function setCloudantEnv(container, next) {
  container.inspect(function(err, c) {
    // if swarm, Node.Ip will be set to actual node's IP
    // if not swarm, but remote docker, use docker host's IP
    // if local docker, use localhost
    const host = _.get(c, 'Node.IP', _.get(docker, 'modem.host', '127.0.0.1'));
    // couchdb uses TCP/IP port 5984
    // container's port 5984 is dynamically mapped to an external port
    const port = _.get(c,
      ['NetworkSettings', 'Ports', '5984/tcp', '0', 'HostPort']);
    process.env.CLOUDANT_PORT = port;
    process.env.CLOUDANT_HOST = host;
    const usr = process.env.CLOUDANT_USERNAME;
    const pass = process.env.CLOUDANT_PASSWORD;
    process.env.CLOUDANT_URL = 'http://' + usr + ':' + pass + '@' +
      host + ':' + port;
    console.log('env:', _.pick(process.env, [
      'CLOUDANT_URL',
      'CLOUDANT_HOST',
      'CLOUDANT_PORT',
      'CLOUDANT_USERNAME',
      'CLOUDANT_PASSWORD',
      'CLOUDANT_DATABASE',
    ]));
    next(null, container);
  });
}

function waitFor(path) {
  return function waitForPath(container, next) {
    const opts = {
      host: process.env.CLOUDANT_HOST,
      port: process.env.CLOUDANT_PORT,
      path: path,
    };

    console.log(`waiting for instance to respond: ${opts}`);
    return ping(null, CONNECT_RETRIES);

    function ping(err, tries) {
      console.log('ping (%d/%d)', CONNECT_RETRIES - tries, CONNECT_RETRIES);
      if (tries < 1) {
        next(err || new Error('failed to contact Cloudant'));
      }
      http.get(opts, function(res) {
        res.pipe(devNull());
        res.on('error', tryAgain);
        res.on('end', function() {
          if (res.statusCode === 200) {
            setImmediate(next, null, container);
          } else {
            tryAgain();
          }
        });
      }).on('error', tryAgain);
      function tryAgain(err) {
        setTimeout(ping, CONNECT_DELAY, err, tries - 1);
      }
    }
  };
}

function createAdmin() {
  return function createAdminUser(container, next) {
    const data = '\"pass\"';
    const uri = '/_node/couchdb@127.0.0.1/_config/admins/' +
      process.env.CLOUDANT_USERNAME;
    const opts = {
      method: 'PUT',
      path: uri,
      header: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      host: process.env.CLOUDANT_HOST,
      port: process.env.CLOUDANT_PORT,
      body: data,
    };

    const req = http.request(opts, function(res) {
      res.pipe(devNull());
      res.on('error', next);
      res.on('end', function() {
        setImmediate(next, null, container);
      });
    });
    req.write(data);
    req.end();
  };
}

function createDB(db) {
  return function create(container, next) {
    const opts = {
      method: 'PUT',
      path: '/' + db,
      host: process.env.CLOUDANT_HOST,
      port: process.env.CLOUDANT_PORT,
      auth: process.env.CLOUDANT_USERNAME + ':' + process.env.CLOUDANT_PASSWORD,
    };
    console.log('creating db: %j', db);
    http.request(opts, function(res) {
      res.pipe(devNull());
      res.on('error', next);
      res.on('end', function() {
        setImmediate(next, null, container);
      });
    })
      .on('error', next)
      .end();
  };
}

function createPartitionedDB(db) {
  return function create(container, next) {
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
        setImmediate(next, null, container);
      });
    })
      .on('error', next)
      .end();
  };
}

function run(cmd) {
  return function spawnNode(container, next) {
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
