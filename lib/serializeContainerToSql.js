const _ = require('lodash')
const serializeObjectToSql = require('./serializeObjectToSql')

/**
 * Serializes container with objects to given Knex instance
 *
 * @param {Object} knex Knex instance
 * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
 * @param {Object} container Container with objects to serialize
 * @param {Array} [queries=undefined] Array of queries to add queries to
 * @return {Array} Array of queries
 */
function serializeContainerToSql (knex, collectionName, container, queries = undefined) {
  const invalidEntity = _.findKey(container, (value) => !_.isPlainObject(value))
  if (invalidEntity !== undefined) {
    throw new TypeError(`'${invalidEntity}' entity of multi-entity object is not a plain object`)
  }

  queries = queries || []
  _.forOwn(container, (entity, entityName) => {
    serializeObjectToSql(knex, entityName ? `${collectionName}_${entityName}` : collectionName, entity, queries)
  })
  return queries
}

module.exports = serializeContainerToSql
