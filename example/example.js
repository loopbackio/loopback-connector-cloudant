// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var g = require('strong-globalize')();
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
    g.log('example complete');
  });
});

