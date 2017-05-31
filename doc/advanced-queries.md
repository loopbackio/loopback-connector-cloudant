# Advanced Queries

This document is currently a work-in-progress. If you see something missing,
please bring it to our attention, or open a Pull Request.

Some queries using the Cloudant connector require steps that differ from
those typically used within Loopback.

## Filtering

### Regex Filtering

LoopBack filter uses `regexp` as the regular expression field name, the connector converts it to a cloudant syntax name, which is `$regex`, then sends the corresponding query to database. Therefore, please provide `regexp` instead of `$regex` or `regex` in the filter of a LoopBack api, for example:

```
MyModel.find({where: { afieldname: {regexp: '^A'}}}, cb);
```

More details of the LoopBack syntax regexp filter, refer to [document of where filter](https://loopback.io/doc/en/lb2/Where-filter.html#regular-expressions)

When filtering by `$regex` in Cloudant, you must provide at least one target field that can be filtered with an equality operator.

See the [Cloudant Query Docs](https://docs.cloudant.com/cloudant_query.html#sort-syntax)
for more information.

The following equality operators are valid:
`$gt`, `$lt`, `$eq`, `$gte`, and `$lte`

If you do not provide this as a part of the query, the connector will automatically
add a filter to your query using the `_id` field.
Example:
```
// This query...
{
  "selector": {
    "afieldname": {
      "$regex": "^A"
    }
  }
}

// ...will be transformed into this query:
{
  "selector": {
    "_id": { 
      "$gt": null 
    },
    "afieldname": {
      "$regex": "^A"
    }
  }
}
```
### Nested Filtering

Cloudant connector accepts the nested property as a single property of fields joined by `.`. 

Example: a `Customer` model has a nested property `address.tags.tag`, the correct filter would be:
```js
// Correct
{where: {address.tags.tag: 'home'}}
```
not 
```js
// Wrong
{where: {address: {tags.tag: 'home'}}}
```
or
```js
// Wrong
{where: {address: {tags: {tag: 'home'}}}}
```

#### Filtering array type property

When a field in a nested property is an array, for example:

In `field1.field2.field3`, `field2` is an array, Cloudant requires an operator `$elemMatch` after it to make the query work: `field1.field2.$elemMatch.field3`.

[Loopback filtering nested properties](http://loopback.io/doc/en/lb3/Querying-data.html#filtering-nested-properties) explains how to define nested properties in a model.

To make it consistent with other connectors, user don't need to add `$elemMatch` if they define the type of each nested property in the model properly. Cloudant connector detects their data type then inserts an `$elemMatch` for array property. So take the example above, `field1.field2.field3` will work.

In case any of the nested property's type is not detectable, user still have the flexibility to provide a completed query that matches Cloudant's criteria: `field1.field2.$elemMatch.field3`. The connector will send that original query to the database. For details, refer to [Cloudant Query Combination Operator](https://docs.cloudant.com/cloudant_query.html#combination-operators)

### Ordering

Cloudant requires data type appended with the property ordered by. User don't need to provide the appendant since connector will do it for you. But if the sorting property's data type is not detectable in model, user can specify the type.
 
For example: order by a string type property `{order: propertyName:string}`. 

For more details about the syntax to specify data type, please check [Cloudant Query Sort Syntax](https://docs.cloudant.com/cloudant_query.html#sort-syntax)