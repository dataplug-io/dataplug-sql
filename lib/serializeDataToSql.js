const _ = require('lodash')
const serializeObjectToSql = require('./serializeObjectToSql')

/**
 * Serializes collection data to SQL queries
 *
 * @param {Object|String} dbClientOrDialect Knex instance or dialect to use
 * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
 * @param {boolean} [deleteBeforeInsert=false] Before inserting, deletes entry by identity
 * @param {boolean} [updateBehavior=undefined] On conflict, updates existing entries if true, ignores new data if false. Fails on conflict if not defined.
 * @param {Array} [queries=undefined] Array of queries to add queries to
 * @param {Object} [collectionMetadata=undefined] Collection metadata to use
 * @return {Array} Array of queries
 */
function serializeDataToSql (data, dbClientOrDialect, collectionName, deleteBeforeInsert = false, updateBehavior = undefined, queries = undefined, collectionMetadata = undefined) {
  if (!_.isPlainObject(data)) {
    throw new TypeError('Invalid data')
  }

  queries = queries || []
  _.forOwn(data, (entity, entityName) => {
    const metadata = entity.metadata || (collectionMetadata ? collectionMetadata[entityName] : undefined)
    if (!metadata) {
      throw new Error(`No metadata for '${entityName}'`)
    }

    const entries = entity.data || entity
    if (!_.isArray(entries)) {
      throw new Error(`Invalid data format of '${entityName}'`)
    }

    const entityCollectionName = collectionName && collectionName.length
      ? `${collectionName}:${entityName}`
      : entityName
    entries.forEach(entry => {
      serializeObjectToSql(entry, metadata, dbClientOrDialect, entityCollectionName, deleteBeforeInsert, updateBehavior, queries)
    })
  })
  return queries
}

module.exports = serializeDataToSql
