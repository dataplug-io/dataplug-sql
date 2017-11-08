const _ = require('lodash')
const check = require('check-types')
const { Transform } = require('stream')
const SqlSerializer = require('./sqlSerializer')

/**
 * Transforms flattened object stream into a SQL instructions
 */
class SqlStreamWriter extends Transform {
  /**
   * @constructor
   * @param {Object|String} dbClientOrDialect Knex instance or dialect to use
   * @param {string} [collectionPrefix=undefined] Collection prefix
   * @param {Object} [collectionMetadata=undefined] Collection metadata to use
   * @param {SqlStreamWriter~Options} [options=undefined] Options
   */
  constructor (dbClientOrDialect, collectionPrefix, collectionMetadata = undefined, options = undefined) {
    check.assert.string(collectionPrefix)
    check.assert.maybe.object(collectionMetadata)

    super({
      objectMode: false,
      readableObjectMode: false,
      writableObjectMode: true
    })

    this._collectionPrefix = collectionPrefix
    this._collectionMetadata = collectionMetadata ? _.cloneDeep(collectionMetadata) : undefined
    this._options = _.assign({}, SqlStreamWriter.DEFAULT_OPTIONS, options)

    this._serializer = new SqlSerializer(dbClientOrDialect, options)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    const queries = this._serializer.serializeData(chunk, this._collectionPrefix, this._collectionMetadata)
    let sql = queries
      .map(query => query.toString())
      .join(this._options.queriesDelimiter)
    sql += this._options.chunksDelimiter
    callback(null, sql)
  }
}

/**
 * @typedef {SqlSerializer~Options} SqlStreamWriter~Options
 * @property {string} queriesDelimiter Queries delimiter
 * @property {string} chunksDelimiter Chunks delimiter
 */
SqlStreamWriter.DEFAULT_OPTIONS = _.assign({}, SqlSerializer.DEFAULT_OPTIONS, {
  queriesDelimiter: ';',
  chunksDelimiter: ';'
})

module.exports = SqlStreamWriter
