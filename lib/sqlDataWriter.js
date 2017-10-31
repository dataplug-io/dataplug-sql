const { Writable } = require('stream')
const { URL } = require('url')
const knex = require('knex')
const serializeContainerToSql = require('./serializeContainerToSql')
const serializeObjectToSql = require('./serializeObjectToSql')
const supportsDatabase = require('./supportsDatabase')

/**
 * Writes object stream into a specified SQL database
 *
 * Supports both flat and regular modes.
 * Flat mode expects incoming object to be a set of entities with 0-depth properties, like:
 * object = {
 *   "entity": {
 *     "property": "value"
 *   }
 * }
 *
 * TODO: https://github.com/tgriesser/knex/issues/1344
 */
class SqlDataWriter extends Writable {
  /**
   * @constructor
   * @param {string} connectionString Database connection string
   * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
   * @param {boolean} containerMode True if incoming objects are containers, false otherwise
   */
  constructor (connectionString, collectionName, containerMode) {
    super({
      objectMode: true
    })

    const url = new URL(connectionString)
    const dbType = url.protocol.replace(/:$/, '')
    if (!supportsDatabase(dbType)) {
      throw new Error(`'${dbType}' is not a supported database`)
    }

    this._collectionName = collectionName
    this._containerMode = containerMode
    this._knex = knex({
      client: dbType,
      connection: connectionString
    })
  }

  /**
   * https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback_1
   * @override
   */
  _write (chunk, encoding, callback) {
    knex
    .transaction((transaction) => {
      if (this._containerMode) {
        serializeContainerToSql(transaction, this._collectionName, chunk)
      } else {
        serializeObjectToSql(transaction, this._collectionName, chunk)
      }
    })
    .then(() => {
      callback()
    })
    .catch((error) => {
      callback(error)
    })
  }
}

module.exports = SqlDataWriter
