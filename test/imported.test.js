describe('cloudant imported features', function () {

  before(function () {
    require('./init.js');
  });

  require ('loopback-datasource-juggler/test/include.test.js');
  require ('loopback-datasource-juggler/test/crud-with-options.test.js');
  require ('loopback-datasource-juggler/test/common.batch.js');

});
