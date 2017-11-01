const _ = require('lodash')
const supportsDatabase = require('./supportsDatabase')

/**
 * Serializes object to given Knex instance
 *
 * @param {Object} knex Knex instance
 * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
 * @param {Object} object Object to serialize
 * @param {booleam} [updateExisting=undefined] True if to update existing entries, false if to skip. Default to fail.
 * @param {Array} [queries=undefined] Array of queries to add queries to
 * @return {Array} Array of queries
 */
function serializeObjectToSql (knex, collectionName, object, updateExisting = undefined, queries = undefined) {
  const dialect = knex.client.config.client
  if (!supportsDatabase(dialect)) {
    throw new Error(`'${dialect}' is not a supported dialect`)
  }

  queries = queries || []

  const insertQuery = knex(collectionName).insert(object)
  let upsertQuery
  if (updateExisting !== undefined) {
    if (dialect === 'postgres' || dialect === 'postgresql' || dialect === 'pg') {
      if (updateExisting) {
        const fieldsSql = _
          .keys(object)
          .map((field) => `"${collectionName}"."${field}" = excluded."${field}"`)
          .join(', ')
        upsertQuery = knex.raw(`? ON CONFLICT DO UPDATE SET ${fieldsSql}`, [insertQuery])
      } else {
        upsertQuery = knex.raw('? ON CONFLICT DO NOTHING', [insertQuery])
      }
    }
  } else {
    upsertQuery = insertQuery
  }

  queries.push(upsertQuery)

  return queries
}

module.exports = serializeObjectToSql
