// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-cloudant
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var should = require('should');

/**
 * Helper method to validate top-level properties on a model.
 * @param {object} expected The expected object.
 * @param {object} actual The actual object.
 */
exports.checkModel = function checkModel(expected, actual) {
  exports.checkData(expected.__data, actual.__data);
};

/**
 * Helper method to validate a model's data properties.
 * @param {object} expected The expected object.
 * @param {object} actual The actual object.
 */
exports.checkData = function checkData(expected, actual) {
  for (var i in expected) {
    should.exist(actual[i]);
    actual[i].should.eql(expected[i]);
  }
};

/**
 * Limit for maximum query size.
 */
exports.QUERY_MAX = 1000;

/**
 * Helper function for refining error message if both err and result exist.
 * @param {*} err The error to check.
 * @param {*} result The result to check.
 * @returns {Error} The refined Error message.
 */
exports.refinedError = function refinedError(err, result) {
  var newErr = null;
  if (!!err && result)
    newErr = new Error('both err and result were returned!');
  else if (err) newErr = err;
  return newErr;
};

/**
 * Helper function for checking if error or result was returned.
 * Note that if both err and result exist, this method will return false!
 * @param {*} err The error to check.
 * @param {*} result The result to check.
 * @returns {Boolean} True if there is a result AND no error.
 */
exports.hasResult = function hasResult(err, result) {
  return !err && !!result;
};
