'use strict';

var _ = require('lodash');
var async = require('async');
var spawn = require('child_process').spawn;
var docker = new require('dockerode')();
var fmt = require('util').format;
var http = require('http');
var ms = require('ms');

// we don't pass any node flags, so we can call _mocha instead the wrapper
var mochaBin = require.resolve('mocha/bin/_mocha');

process.env.CLOUDANT_DATABASE = 'test-db';
process.env.CLOUDANT_PASSWORD = 'pass';
process.env.CLOUDANT_USERNAME = 'admin';

// these are placeholders. They get set dynamically based on what IP and port
// get assigned by docker.
process.env.CLOUDANT_PORT = 'TBD';
process.env.CLOUDANT_HOST = 'TBD';
process.env.CLOUDANT_URL = 'TBD';

var CONNECT_RETRIES = 30;
var CONNECT_DELAY = ms('5s');

var containerToDelete = null;

async.waterfall([
  dockerStart('ibmcom/cloudant-developer:2.0.1'),
  sleep(ms('2s')),
  setCloudantEnv,
  waitFor('/_all_dbs'),
  createDB('test-db'),
  run([mochaBin, '--timeout', '40000']),
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
    var args = [].slice.call(arguments);
    // last argument is the callback
    var next = args.pop();
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
    var host = _.get(c, 'Node.IP', _.get(docker, 'modem.host', '127.0.0.1'));
    // container's port 80 is dynamically mapped to an external port
    var port = _.get(c,
      ['NetworkSettings', 'Ports', '80/tcp', '0', 'HostPort']);
    process.env.CLOUDANT_PORT = port;
    process.env.CLOUDANT_HOST = host;
    process.env.CLOUDANT_URL = 'http://' + process.env.CLOUDANT_USERNAME + ':' + process.env.CLOUDANT_PASSWORD + '@' + host + ':' + port;
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
    var opts = {
      host: process.env.CLOUDANT_HOST,
      port: process.env.CLOUDANT_PORT,
      auth: process.env.CLOUDANT_USERNAME + ':' + process.env.CLOUDANT_PASSWORD,
      path: path,
    };

    console.log('waiting for instance to respond');
    return ping(null, CONNECT_RETRIES);

    function ping(err, tries) {
      console.log('ping (%d/%d)', CONNECT_RETRIES - tries, CONNECT_RETRIES);
      if (tries < 1) {
        next(err || new Error('failed to contact Cloudant'));
      }
      http.get(opts, function(res) {
        res.on('data', function() {});
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

function createDB(db) {
  return function create(container, next) {
    var opts = {
      method: 'PUT',
      path: '/' + db,
      host: process.env.CLOUDANT_HOST,
      port: process.env.CLOUDANT_PORT,
      auth: process.env.CLOUDANT_USERNAME + ':' + process.env.CLOUDANT_PASSWORD,
    };
    console.log('creating db: %j', db);
    http.request(opts, function(res) {
      res.on('data', function() {});
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
