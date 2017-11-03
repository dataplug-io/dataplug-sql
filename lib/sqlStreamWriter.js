const { Transform } = require('stream')
const resolveDbClient = require('./resolveDbClient')
const serializeDataToSql = require('./serializeDataToSql')

/**
 * Transforms flattened object stream into a SQL instructions
 */
class SqlStreamWriter extends Transform {
  /**
   * @constructor
   * @param {Object|String} dbClientOrDialect Knex instance or dialect to use
   * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
   * @param {boolean} [deleteBeforeInsert=false] Before inserting, deletes entry by identity
   * @param {boolean} [updateBehavior=undefined] On conflict, updates existing entries if true, ignores new data if false. Fails on conflict if not defined.
   * @param {Object} [collectionMetadata=undefined] Collection metadata to use
   * @param {string} [queriesDelimiter=';'] Queries delimiter
   * @param {string} [chunksDelimiter=';'] Chunks delimiter
   */
  constructor (dbClientOrDialect, collectionName, deleteBeforeInsert = false, updateBehavior = undefined, collectionMetadata = undefined, queriesDelimiter = ';', chunksDelimiter = ';') {
    super({
      objectMode: false,
      readableObjectMode: false,
      writableObjectMode: true
    })

    this._collectionName = collectionName
    this._deleteBeforeInsert = deleteBeforeInsert
    this._updateBehavior = updateBehavior
    this._collectionMetadata = collectionMetadata
    this._queriesDelimiter = queriesDelimiter
    this._chunksDelimiter = chunksDelimiter

    this._dbClient = resolveDbClient(dbClientOrDialect)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    const queries = serializeDataToSql(chunk, this._dbClient, this._collectionName, this._updateBehavior, this._collectionMetadata)
    let sql = queries
      .map(query => query.toString())
      .join(this._queriesDelimiter)
    sql += this._chunksDelimiter
    callback(null, sql)
  }
}

module.exports = SqlStreamWriter
