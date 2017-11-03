const _ = require('lodash')
const knex = require('knex')
const supportsDatabase = require('./supportsDatabase')

/**
 * Resolves database client
 * @param {Object|String} dbClientOrDialect Knex instance or dialect to use
 */
function resolveDbClient (dbClientOrDialect) {
  if (!_.isString(dbClientOrDialect)) {
    return dbClientOrDialect
  }

  if (!supportsDatabase(dbClientOrDialect)) {
    throw new Error(`'${dbClientOrDialect}' is not a supported dialect`)
  }

  return knex({
    client: dbClientOrDialect
  })
}

module.exports = resolveDbClient
