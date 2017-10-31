/**
 * Serializes object to given Knex instance
 *
 * @param {Object} knex Knex instance
 * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
 * @param {Object} object Object to serialize
 * @param {Array} [queries=undefined] Array of queries to add queries to
 * @return {Array} Array of queries
 */
function serializeObjectToSql (knex, collectionName, object, queries = undefined) {
  queries = queries || []
  queries.push(knex(collectionName).insert(object))
  return queries
}

module.exports = serializeObjectToSql
