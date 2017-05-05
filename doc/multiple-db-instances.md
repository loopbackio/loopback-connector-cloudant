# Multiple database instance

Whenever the connector calls a driver method inside a model level function, it first detects the datasource that model attached to, then gets the driver instance in that datasource, instead of just calling `this.methodName`.

For example, in function `Cloudant.prototype.destroy`, we call driver function by [`mo.db.destroy`](https://github.com/strongloop/loopback-connector-cloudant/blob/a62f72f291ed6fd7a5c318ceea3220cf19a2f2fe/lib/cloudant.js#L612), `mo` is the model.

More code example & test case to demo/verify this feature are in progress.