const { Transform } = require('stream')
const knex = require('knex')
const serializeContainerToSql = require('./serializeContainerToSql')
const serializeObjectToSql = require('./serializeObjectToSql')
const supportsDatabase = require('./supportsDatabase')

/**
 * Transforms object stream into a SQL instructions
 */
class SqlStreamWriter extends Transform {
  /**
   * @constructor
   * @param {string} dialect SQL dialect to use
   * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
   * @param {boolean} containerMode True if incoming objects are containers, false otherwise
   * @param {booleam} [updateExisting=undefined] True if to update existing entries, false if to skip. Default to fail.
   */
  constructor (dialect, collectionName, containerMode, updateExisting = undefined, queriesDelimiter = ';', chunksDelimiter = ';') {
    super({
      objectMode: false,
      readableObjectMode: false,
      writableObjectMode: true
    })

    if (!supportsDatabase(dialect)) {
      throw new Error(`'${dialect}' is not a supported dialect`)
    }

    this._collectionName = collectionName
    this._containerMode = containerMode
    this._updateExisting = updateExisting
    this._queriesDelimiter = queriesDelimiter
    this._chunksDelimiter = chunksDelimiter

    this._knex = knex({
      client: dialect
    })
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    const queries = this._containerMode
      ? serializeContainerToSql(this._knex, this._collectionName, chunk, this._updateExisting)
      : serializeObjectToSql(this._knex, this._collectionName, chunk, this._updateExisting)
    const sql = queries.join(this._queriesDelimiter) + this._chunksDelimiter
    callback(null, sql)
  }
}

module.exports = SqlStreamWriter
