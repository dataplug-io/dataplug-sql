const _ = require('lodash')

/**
 * Serializes object to given Knex instance
 *
 * @param {Object} knex Knex instance
 * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
 * @param {Object} object Object to serialize
 * @param {Array} queries Array of queries to add queries to
 * @return {Array} Array of queries
 */
function serializeToSql (knex, collectionName, object, queries = []) {
  const isMultiEntity = object.hasOwnProperty('')
  if (isMultiEntity) {
    const invalidEntity = _.findKey(object, (value) => !_.isPlainObject(value))
    if (invalidEntity !== undefined) {
      throw new TypeError(`'${invalidEntity}' entity of multi-entity object is not a plain object`)
    }
  }

  // Insert a complex object directry
  if (!isMultiEntity) {
    queries.push(knex(collectionName).insert(object))
    return queries
  }

  // Iterate over the entities and recursively insert them
  _.keys(object).forEach((entity) => {
    serializeToSql(knex, entity ? `${collectionName}_${entity}` : collectionName, object[entity], queries)
  })

  return queries
}

module.exports = serializeToSql
