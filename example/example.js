var DataSource = require('loopback-datasource-juggler').DataSource;
var Cloudant = require('../'); // loopback-connector-cloudant

var config = {
  username: process.env.CLOUDANT_USERNAME,
  password: process.env.CLOUDANT_PASSWORD,
  database: process.env.CLOUDANT_DATABASE,
};

var db = new DataSource(Cloudant, config);

var User = db.define('User', {
  name: {type: String},
  email: {type: String},
});

db.autoupdate('User', function(err) {
  if (err) return console.log(err);
  User.create({
    name: 'Tony',
    email: 'tony@t.com',
  }, function(err, user) {
    console.log(err, user);
  });

  User.find({where: {name: 'Tony'}}, function(err, users) {
    console.log(err, users);
  });

  User.destroyAll(function() {
    console.log('example complete');
  });
});

