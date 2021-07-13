# Partitioned Database

When creating a Cloudant database, you can configure it as non-partitioned or partitioned.
A partitioned database offers significant performance and cost advantages. It requires you to specify a logical partitioning of your data.

To get familiar with this feature, you can read the following references as the background of our new epic:

- The Cloudant official document for database partitioning: https://cloud.ibm.com/docs/services/Cloudant/guides?topic=cloudant-database-partitioning
- The related APIs' document from our driver module `nodejs-cloudant`: https://github.com/cloudant/nodejs-cloudant#partitioned-databases

_To use the following partition features, please make sure the Cloudant database that you connects to is created as partitioned._

_And also make sure you are above `loopback-connector-cloudant@2.4.0` to support partition features, and if you have `@cloudant/cloudant` installed, please upgrade it to version 4.x._

Now let's start with a user scenario to see how you can:
- add partitioned index
- create document in Partitioned Database
- define partitioned field
- perform partitioned find

Suppose you have a Product model, with properties `id`, `name`, `tag`, `city`, and specify `city` as your partition key. You can define your model as

```js
Product = db.define('Product', {
  name: {type: String},
  tag: {type: String},
  // specify `city` as the partitionKey
  city: {type: String, isPartitionKey: true},
  }, {
    // include `id` field when creating a new product
    forceId: false,
    indexes: {
      // create a partitioned index for frequently queried
      // fields like `name`
      'product_name_index': {
        partitioned: true,
        keys: {
            name: 1
        },
      },
    }
  });
```

When creating a new product, you can generate its `id` field as `${city_name}: ${uuid()}`, and perform partitioned query by placing `city` in the query as follows: 

```js
const filter = {
  where: {
    city: 'toronto',
    name: 'food'
  }
}
Product.find(filter);
```

or provide it in query options as follows:

```js
const filter = {
  where: {
    name: 'food'
  }
};
const options = {
  partitionKey: 'toronto'
}
Product.find(filter, options);
```

Other than leveraging partitioned find, you can have a secondary query optimization by creating partitioned index for the frequently queried fields as follows:

```js
  // ...other model configuration fields
  indexes: {
    'product_name_index': {
      partitioned: true,
      keys: {
          name: 1
      },
    },
  }
```

Next, let's take a look at the details of each functionality.

## Creating document in Partitioned Database

Before supporting the composite id, the `id` field must be provided when creating a model instance (which essentially is a document stored in the partitioned database). The format of `id` is:

```js
`<partitionKey>: <uuid>`
```

For example, creating a new product:

```js
const uuid = require('uuid/v4');

const id = `toronto: ${uuid()}`;
Product.create({id, name: 'salad', manufacturer: 'somefactory'});
```

In the future we will support composing the `id` by joining the value of id field and partition key field from the payload, details see [issue 218](https://github.com/loopbackio/loopback-connector-cloudant/issues/218).

## Adding Partitioned Index

Other than leveraging partitions to optimize the search, you can also create partition based indexes for frequently visited fields.

The indexes in a partitioned database could be global (configured as `{partitioned: false}`) or partition based (configured as `{partitioned: true}`). For a LoopBack model, all the property level indexes are created as global, to create partitioned index, you must add it in the model configuration `indexes`:

```js
Product = db.define('Product', {
  name: {type: String},
  // PROPERTY LEVEL indexes are always global
  tag: {type: String, index: true},
  manufacturer: {type: String},
  }, {
    forceId: false,
    indexes: {
      // CONFIGURATION LEVEL indexes 
      // can be configured as PARTITIONED
      'product_name_index': {
        // partitioned index
        partitioned: true,
        keys: {
          name: 1
        },
      },
      // CONFIGURATION LEVEL indexes 
      // are GLOBAL by default
      'product_manufacture_index': {
        // omitting field `partitioned` or 
        // specifying it as `false` to 
        // create global index
        keys: {
          manufacturer: 1
        },
      },
    }
  });
```

Cloudant will automatically find the best matched index for you.

## Defining Partitioned Property and Performing Partitioned Find

When performing partitioned find by `Model.find()`, you can provide the value of a partition key in two ways:

- in the FILTER with a partitionKey field properly defined in the model definition. 
- in the OPTIONS

### Filter

You can mark a partition key field in model definition by specifying `{isPartitionKey: true}` as follows:

```js
  Product = db.define('Product', {
  id: {type: String, id: true},
  name: String,
  // partition key field
  city: {type: String, isPartitionKey: true},
});
```

Then you can do a partitioned find as 
```js
const filter = {
  where: {
    city: 'toronto',
    name: 'food'
  }
}
Product.find(filter);
```

The driver api triggered underlying is `db.partitionFind('toronto', {selector: {city: 'toronto, name: 'food'}})`.

### Options

You can also provide the value of the partition key directly in query options as follows:

```js
const filter = {
  where: {
    name: 'food'
  }
};
const options = {
  // specify `partitionKey` here
  // please note the field is just called `partitionKey`
  // not your model field like `city`
  partitionKey: 'toronto'
}
Product.find(filter, options);
```

The driver api triggered underlying is `db.partitionFind('toronto', {selector: {name: 'food'}})`

**Please note the partition key in options will override the one in the filter.**