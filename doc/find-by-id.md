# Find By Id

When find an instance by its id, you can invoke the connector level method `findById` to use the lookup instead of query under the hood.

*/server/script.js*
```javascript
module.exports = function(server) {
  // Get Cloudant dataSource as `ds`
  // 'cloudantDB' is the name of Cloudant datasource created in 
  // 'server/datasources.json' file
  var ds = server.datasources.cloudantDB;

  ds.once('connected', function() {
    // 1. Please note `ds.connector.findById()` is the correct way to call it.
    // 2. This api matches the Cloudant driver's function db.get(),
    //    instead of db.find()
    ds.connector.findById(model_name, your_instance_id, function(err, results) {
      // `results` would be the raw data returned from the driver
    });
};
```
