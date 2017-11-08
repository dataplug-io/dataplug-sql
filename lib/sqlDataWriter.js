const _ = require('lodash')
const check = require('check-types')
const { Writable } = require('stream')
const Promise = require('bluebird')
const resolveConnectedDbClient = require('./resolveConnectedDbClient')
const SqlSerializer = require('./sqlSerializer')

/**
 * Writes object stream into a specified SQL database
 *
 * TODO: https://github.com/tgriesser/knex/issues/1344
 */
class SqlDataWriter extends Writable {
  /**
   * @constructor
   * @param {Object|string} dbClientOrConnectionString Database connection string or connected client
   * @param {string} [collectionPrefix=undefined] Collection prefix
   * @param {Object} [collectionMetadata=undefined] Collection metadata to use
   * @param {SqlDataWriter~Options} [options=undefined] Options
   */
  constructor (dbClientOrConnectionString, collectionPrefix, collectionMetadata = undefined, options = undefined) {
    check.assert.string(collectionPrefix)
    check.assert.maybe.object(collectionMetadata)

    super({
      objectMode: true
    })

    this._dbClient = resolveConnectedDbClient(dbClientOrConnectionString)
    this._collectionPrefix = collectionPrefix
    this._collectionMetadata = collectionMetadata ? _.cloneDeep(collectionMetadata) : undefined
    this._options = _.assign({}, SqlDataWriter.DEFAULT_OPTIONS, options)

    this._dbDialect = this._dbClient.client.config.client
    this._serializer = new SqlSerializer(this._dbDialect, options)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback_1
   * @override
   */
  _write (chunk, encoding, callback) {
    this._dbClient
      .transaction((transaction) => {
        const queries = this._serializer.serializeData(chunk, this._collectionPrefix, this._collectionMetadata)
        _.forEach(queries, (query) => query.transacting(transaction))
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

/**
 * @typedef {SqlSerializer~Options} SqlDataWriter~Options
 */
SqlDataWriter.DEFAULT_OPTIONS = _.assign({}, SqlSerializer.DEFAULT_OPTIONS, {
})

module.exports = SqlDataWriter
