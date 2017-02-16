# Advanced Queries

This document is currently a work-in-progress. If you see something missing,
please bring it to our attention, or open a Pull Request.

Some queries using the Cloudant connector require steps that differ from
those typically used within Loopback.

## Filtering

### Regex Filtering

When filtering by `$regex` in Cloudant, you must provide at least one target field
that can be filtered with an equality operator.

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
