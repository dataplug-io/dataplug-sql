const _ = require('lodash')
const knex = require('knex')
const { URL } = require('url')
const supportsDatabase = require('./supportsDatabase')

/**
 * Resolves connected database client
 * @param {Object|String} dbClientOrConnectionString Knex instance or connection string
 */
function resolveConnectedDbClient (dbClientOrConnectionString) {
  if (!_.isString(dbClientOrConnectionString)) {
    return dbClientOrConnectionString
  }

  const url = new URL(dbClientOrConnectionString)
  const dbType = url.protocol.replace(/:$/, '')

  if (!supportsDatabase(dbType)) {
    throw new Error(`'${dbType}' is not a supported database`)
  }

  return knex({
    client: dbType,
    connection: dbClientOrConnectionString
  })
}

module.exports = resolveConnectedDbClient
