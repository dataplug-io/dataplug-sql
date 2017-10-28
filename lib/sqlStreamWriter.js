const { Transform } = require('stream')
const knex = require('knex')
const serializeToSql = require('./serializeToSql')
const supportsDatabase = require('./supportsDatabase')

/**
 * Transforms object stream into a SQL instructions
 *
 * Supports both flat and regular modes.
 * Flat mode expects incoming object to be a set of entities with 0-depth properties, like:
 * object = {
 *   "entity": {
 *     "property": "value"
 *   }
 * }
 */
class SqlStreamWriter extends Transform {
  /**
   * @constructor
   * @param {string} dialect SQL dialect to use
   * @param {string} collectionName Name of the collection, would be used as table name or table name prefix
   */
  constructor (dialect, collectionName) {
    super({
      objectMode: false,
      readableObjectMode: false,
      writableObjectMode: true
    })

    if (!supportsDatabase(dialect)) {
      throw new Error(`'${dialect}' is not a supported dialect`)
    }

    this._collectionName = collectionName
    this._knex = knex({
      client: dialect
    })
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    const queries = serializeToSql(this._knex, this._collectionName, chunk)
    const sql = queries.join(';')
    callback(null, sql)
  }
}

module.exports = SqlStreamWriter
