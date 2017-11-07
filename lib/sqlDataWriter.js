const { Writable } = require('stream')
const Promise = require('bluebird')
const resolveConnectedDbClient = require('./resolveConnectedDbClient')
const serializeDataToSql = require('./serializeDataToSql')

/**
 * Writes object stream into a specified SQL database
 *
 * TODO: https://github.com/tgriesser/knex/issues/1344
 */
class SqlDataWriter extends Writable {
  /**
   * @constructor
   * @param {Object|string} dbClientOrConnectionString Database connection string or connected client
   * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
   * @param {boolean} [deleteBeforeInsert=false] Before inserting, deletes entry by identity
   * @param {boolean} [updateBehavior=undefined] On conflict, updates existing entries if true, ignores new data if false. Fails on conflict if not defined.
   * @param {Object} [collectionMetadata=undefined] Collection metadata to use
   */
  constructor (dbClientOrConnectionString, collectionName, deleteBeforeInsert = false, updateBehavior = undefined, collectionMetadata = undefined) {
    super({
      objectMode: true
    })

    this._collectionName = collectionName
    this._deleteBeforeInsert = deleteBeforeInsert
    this._updateBehavior = updateBehavior
    this._collectionMetadata = collectionMetadata
    this._dbClient = resolveConnectedDbClient(dbClientOrConnectionString)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback_1
   * @override
   */
  _write (chunk, encoding, callback) {
    this._dbClient
      .transaction((transaction) => {
        const queries = serializeDataToSql(chunk, transaction, this._collectionName, this._deleteBeforeInsert, this._updateBehavior, undefined, this._collectionMetadata)
        return Promise.all(queries)
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
