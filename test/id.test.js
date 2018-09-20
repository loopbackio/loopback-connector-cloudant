// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var Cloudant = require('../lib/cloudant');
var should = require('should');
var db, Task;

describe('using _id as id', function() {
  before(function(done) {
    db = getDataSource();

    Task = db.define('Task', {
      task: {type: String},
      owner: {type: String},
      _id: {type: String, id: true},
    }, {forceId: true});

    // A workaround for 1.x version calling the async function `define`
    // in a synchronous way. The fix for it resulted in a major version
    // bump.
    setTimeout(done, 3000);
  });

  after(function(done) {
    Task.destroyAll(done);
  });

  it('result should include _id', function(done) {
    var ownerName = 'John Smith';
    Task.create({
      task: 'some random task',
      owner: ownerName,
    }, function(err, task) {
      if (err) return done(err);

      should.exist(task);
      should.exist(task._id);

      var taskId = task._id;
      Task.find({where: {owner: ownerName}}, function(err, tasks) {
        if (err) return done(err);

        tasks.should.have.lengthOf(1);
        var task = tasks[0];
        task.should.have.property('_id');
        task._id.should.equal(taskId);
        done();
      });
    });
  });
});
