const _ = require('lodash')
const check = require('check-types')
const knex = require('knex')
const { Transform } = require('stream')

/**
 * Transforms SQL queries stream into a SQL commands
 */
class SqlCommandsWriter extends Transform {
  /**
   * @constructor
   * @param {string} dbDialect Database dialect to use
   * @param {SqlCommandsWriter~Options} [options=undefined] Options
   */
  constructor (dbDialect, options = undefined) {
    check.assert.maybe.object(options)

    super({
      objectMode: false,
      readableObjectMode: false,
      writableObjectMode: true
    })

    this._dbClient = knex({
      client: dbDialect
    })
    this._options = _.assign({}, SqlCommandsWriter.DEFAULT_OPTIONS, options)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    const queries = this._adoptQueries(chunk)

    let sql = queries
      .map((query) => query.toString())
      .join(this._options.queriesDelimiter ? `;${this._options.queriesDelimiter}` : ';')
    sql += this._options.chunksDelimiter ? `;${this._options.chunksDelimiter}` : ';'
    callback(null, sql)
  }

  /**
   * Adopts foreign queries
   */
  _adoptQueries (queries) {
    if (!_.isArray(queries)) {
      queries = [queries]
    }
    queries = queries.map((query) => {
      if (_.isString(query)) {
        return this._dbClient
          .raw()
          .set(query)
      }

      return this._dbClient
        .raw()
        .set(query.sql, query.bindings)
    })
    return queries
  }
}

/**
 * @typedef {Object} SqlCommandsWriter~Options
 * @property {string} queriesDelimiter Queries delimiter
 * @property {string} chunksDelimiter Chunks delimiter
 */
SqlCommandsWriter.DEFAULT_OPTIONS = {
  queriesDelimiter: undefined,
  chunksDelimiter: undefined
}

module.exports = SqlCommandsWriter
