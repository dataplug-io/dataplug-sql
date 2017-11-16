const _ = require('lodash')
const check = require('check-types')
const { Transform } = require('stream')
const logger = require('winston')

/**
 * Transforms SQL queries stream into a SQL commands
 */
class SqlCommandsWriter extends Transform {
  /**
   * @constructor
   *
   * @param {SqlCommandsWriter~Options} [options=] Options
   */
  constructor (options = undefined) {
    check.assert.maybe.object(options)

    super({
      objectMode: false,
      readableObjectMode: false,
      writableObjectMode: true
    })

    this._options = _.assign({}, SqlCommandsWriter.DEFAULT_OPTIONS, options)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    const queries = _.isArray(chunk) ? chunk : [chunk]

    logger.log('verbose', 'SqlCommandsWriter emitted %d queries', queries.length)

    let sql = queries
      .join(this._options.queriesDelimiter ? `;${this._options.queriesDelimiter}` : ';')
    sql += this._options.chunksDelimiter ? `;${this._options.chunksDelimiter}` : ';'
    callback(null, sql)
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
