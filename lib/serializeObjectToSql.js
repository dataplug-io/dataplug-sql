const _ = require('lodash')
const resolveDbClient = require('./resolveDbClient')
const supportsDatabase = require('./supportsDatabase')

/**
 * Serializes object to given Knex instance
 *
 * @param {Object} object Object to serialize
 * @param {Object} metadata Object metadata
 * @param {Object|String} dbClientOrDialect Knex instance or dialect to use
 * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
 * @param {boolean} [deleteBeforeInsert=false] Before inserting, deletes entry by identity
 * @param {boolean} [updateBehavior=undefined] On conflict, updates existing entries if true, ignores new data if false. Fails on conflict if not defined.
 * @param {Array} [queries=undefined] Array of queries to add queries to
 * @return {Array} Array of queries
 */
function serializeObjectToSql (object, metadata, dbClientOrDialect, collectionName, deleteBeforeInsert = false, updateBehavior = undefined, queries = undefined) {
  const dbClient = resolveDbClient(dbClientOrDialect)

  const dialect = dbClient.client.config.client
  if (!supportsDatabase(dialect)) {
    throw new Error(`'${dialect}' is not a supported dialect for serialization`)
  }

  queries = queries || []

  if (deleteBeforeInsert) {
    const deleteQuery = dbClient(collectionName)
      .where(_.pickBy(object, (value, field) => metadata[field].identity === true))
      .delete()
    queries.push(deleteQuery)
  }

  const insertQuery = dbClient(collectionName).insert(object)
  let upsertQuery
  if (updateBehavior !== undefined) {
    if (dialect === 'postgres' || dialect === 'postgresql' || dialect === 'pg') {
      if (updateBehavior) {
        const valueFieldsSql = _.keys(object)
          .filter((field) => !metadata[field].identity)
          .map((field) => `"${collectionName}"."${field}" = excluded."${field}"`)
          .join(', ')
        upsertQuery = dbClient.raw(`? ON CONFLICT DO UPDATE SET ${valueFieldsSql}`, [insertQuery])
      } else {
        upsertQuery = dbClient.raw('? ON CONFLICT DO NOTHING', [insertQuery])
      }
    }
  } else {
    upsertQuery = insertQuery
  }

  queries.push(upsertQuery)

  return queries
}

module.exports = serializeObjectToSql
