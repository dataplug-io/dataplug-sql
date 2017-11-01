const _ = require('lodash')
const serializeObjectToSql = require('./serializeObjectToSql')

/**
 * Serializes container with objects to given Knex instance
 *
 * @param {Object} knex Knex instance
 * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
 * @param {Object} container Container with objects to serialize
 * @param {booleam} [updateExisting=undefined] True if to update existing entries, false if to skip. Default to fail.
 * @param {Array} [queries=undefined] Array of queries to add queries to
 * @return {Array} Array of queries
 */
function serializeContainerToSql (knex, collectionName, container, updateExisting = undefined, queries = undefined) {
  const notAnEntity = _.findKey(container, (value) => !_.isArray(value))
  if (notAnEntity !== undefined) {
    throw new Error(`Container includes property '${notAnEntity}' that is not an entity`)
  }

  queries = queries || []
  _.forOwn(container, (entityInstances, entityName) => {
    const entityCollectionName = entityName ? `${collectionName}_${entityName}` : collectionName
    for (let i = 0; i < entityInstances.length; i++) {
      const entityInstance = entityInstances[i]
      if (!_.isPlainObject(entityInstance)) {
        throw new Error(`Container entity '${notAnEntity}' instance is invalid at #${i}`)
      }

      serializeObjectToSql(knex, entityCollectionName, entityInstance, updateExisting, queries)
    }
  })
  return queries
}

module.exports = serializeContainerToSql
