module.exports = require('should');

var DataSource = require('loopback-datasource-juggler').DataSource;

var config = {
    username: '991359a8-1d3d-485f-9455-cb3f2f0f3b56-bluemix',
    password: '71433e28da3ce70f900d90f2b8b32226f86d1cc4f7ea7ba1af0a8de558779c71',
    database: 'test'
};

global.config = config;

global.getDataSource = global.getSchema = function (customConfig) {
  var db = new DataSource(require('../'), customConfig || config);
  db.log = function (a) {
    console.log(a);
  };

  return db;
};

global.sinon = require('sinon');
