describe('cloudant imported features', function () {

  before(function () {
    require('./init.js');
  });

  require ('loopback-datasource-juggler/test/basic-querying.test.js');
  require ('loopback-datasource-juggler/test/crud-with-options.test.js');

});
