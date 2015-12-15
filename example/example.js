var DataSource = require ('loopback-datasource-juggler').DataSource,
    Cloudant   = require ('../'); //loopback-connector-cloudant

var config = {
    username: 'XXXXX-bluemix',
    password: 'YYYYYYYYYYYYY',
    database: 'test'
};

var db = new DataSource (Cloudant, config);

User = db.define ('User', {
  name: { type: String },
  email: { type: String }
});

User.create ({
  name: "Tony",
  email: "tony@t.com"
}, function (err, user) {
  console.log (user);
});

User.find ({ where: { name: "Tony" }}, function (err, users) {
  console.log (users);
});

User.destroyAll (function () {
  console.log ('test complete');
})

