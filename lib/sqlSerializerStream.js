const _ = require('lodash')
const check = require('check-types')
const { Transform } = require('stream')
const logger = require('winston')
const pgEscape = require('pg-escape')
const Dialects = require('./dialects')
const SqlSerializer = require('./sqlSerializer')

/**
 * Transforms flattened object stream into a SQL queries
 */
class SqlSerializerStream extends Transform {
  /**
   * @constructor
   * @param {string} dbDialect Database dialect to use
   * @param {string} [collectionPrefix=undefined] Collection prefix
   * @param {Object} [collectionMetadata=undefined] Collection metadata to use
   * @param {SqlSerializerStream~Options} [options=undefined] Options
   */
  constructor (dbDialect, collectionPrefix, collectionMetadata = undefined, options = undefined) {
    check.assert.nonEmptyString(dbDialect)
    check.assert.string(collectionPrefix)
    check.assert.maybe.object(collectionMetadata)
    check.assert.maybe.object(options)

    super({
      objectMode: true
    })

    if (!Dialects.isSupported(dbDialect)) {
      throw new Error(`Dialect "${dbDialect}" not supported`)
    }

    this._dbDialect = dbDialect
    this._collectionPrefix = collectionPrefix
    this._metadata = collectionMetadata ? _.cloneDeep(collectionMetadata) : undefined
    this._options = _.assign({}, SqlSerializerStream.DEFAULT_OPTIONS, options)

    this._serializer = new SqlSerializer(dbDialect, options)

    this._prologue = this._options.prologue
    if (_.isString(this._prologue)) {
      if (this._prologue === 'truncate') {
        this._prologue = SqlSerializerStream.truncate
      } else {
        throw new Error(`'${this._prologue}' is not a supported prologue`)
      }
    } else if (_.isPlainObject(this._prologue)) {
      const data = this._prologue
      this._prologue = (serializer, tableName, metadata, queries) => {
        SqlSerializerStream.updateAllWithData(data, serializer, tableName, metadata, queries)
      }
    }
    this._prologueProcessed = {}
    this._prologueMetadata = {}

    this._epilogue = this._options.epilogue
    if (_.isString(this._epilogue)) {
      throw new Error(`'${this._epilogue}' is not a supported epilogue`)
    } else if (_.isPlainObject(this._epilogue)) {
      const data = this._epilogue
      this._epilogue = (serializer, tableName, metadata, queries) => {
        SqlSerializerStream.updateAllWithData(data, serializer, tableName, metadata, queries)
      }
    }
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    try {
      let queries = []

      logger.log('verbose', 'SqlSerializerStream serializing data...')
      logger.log('silly', 'Data:', chunk)

      if (this._prologue) {
        _.forOwn(this._metadata || chunk, (entity, entityName) => {
          if (this._prologueProcessed[entityName]) {
            return
          }

          let metadata
          if (!metadata && this._metadata) {
            metadata = this._metadata[entityName]
          }
          if (!metadata && entity) {
            metadata = entity.metadata
          }
          if (!metadata) {
            throw new Error(`No metadata for '${entityName}'`)
          }
          this._prologueMetadata[entityName] = metadata

          const tableName = this._collectionPrefix
            ? `${this._collectionPrefix}${entityName}`
            : entityName

          const result = this._prologue(this._serializer, pgEscape.ident(tableName), metadata, queries)
          this._prologueProcessed[entityName] = result || result === undefined
        })
      }

      queries = this._serializer.serializeData(chunk, this._collectionPrefix, this._metadata, queries)

      logger.log('verbose', 'SqlSerializerStream serialized data into %d queries', queries.length)
      logger.log('silly', 'Queries:', queries)

      callback(null, queries.length ? queries : null)
    } catch (error) {
      logger.log('error', 'Error in SqlSerializerStream', error)
      callback(this._options.abortOnError ? error : null, null)
    }
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_flush_callback
   * @override
   */
  _flush (callback) {
    try {
      let queries = []

      if (this._prologue && this._epilogue) {
        _.keys(this._prologueProcessed).forEach((entityName) => {
          if (!this._prologueProcessed[entityName]) {
            return
          }

          const metadata = this._prologueMetadata[entityName]
          if (!metadata) {
            throw new Error(`No metadata for '${entityName}'`)
          }

          const tableName = this._collectionPrefix
            ? `${this._collectionPrefix}${entityName}`
            : entityName

          this._epilogue(this._serializer, pgEscape.ident(tableName), metadata, queries)
        })
      }

      callback(null, queries.length ? queries : null)
    } catch (error) {
      logger.log('error', 'Error in SqlSerializerStream', error)
      callback(this._options.abortOnError ? error : null)
    }
  }

  /**
   * Truncates table
   */
  static truncate (serializer, tableName, metadata, queries) {
    const truncateQuery = `TRUNCATE ${tableName}`
    queries.push(truncateQuery)
  }

  /**
   * Updates all table with specified data
   */
  static updateAllWithData (data, serializer, tableName, metadata, queries) {
    const updateStatements = []
    _.forOwn(data, (value, field) => {
      const fieldMetadata = metadata.fields[field]
      if (!fieldMetadata) {
        throw Error(`No metadata for '${field}' field to serialize it as column in '${tableName}'`)
      }

      field = pgEscape.ident(field)
      value = serializer.serializeValue(fieldMetadata.type, value)

      updateStatements.push(`${field} = ${value}`)
    })

    let updateQuery = ''
    updateQuery += `UPDATE ${tableName}`
    updateQuery += `\n\tSET`
    updateQuery += `\n\t\t${updateStatements.join(',\n\t\t')}`
    queries.push(updateQuery)
  }
}

/**
 * @typedef {SqlSerializer~Options} SqlSerializerStream~Options
 * @property {boolean} transactions True to use transaction(s) to ensure data integrity, false to omit transaction(s)
 * @property {boolean} batch True to write all stream within single batch
 * @property {SqlSerializerStream~Prologue|string|object} prologue Prologue per entity callback,
 * @property {SqlSerializerStream~Epilogue|string|object} epilogue Epilogue per entity callback
 */
SqlSerializerStream.DEFAULT_OPTIONS = _.assign({}, SqlSerializer.DEFAULT_OPTIONS, {
  prologue: undefined,
  epilogue: undefined,
  abortOnError: false
})

/**
 * @callback SqlSerializerStream~Prologue
 * @param {SqlSerializer} serializer SQL serializer
 * @param {string} tableName Table name
 * @param {SchemaFlatter~Entity} metadata Entity metadata
 * @param {Array} queries Array of queries to add queries to
 * @returns {boolean} Truthy if prologue processed successfully
 */

/**
 * @callback SqlSerializerStream~Epilogue
 * @param {SqlSerializer} serializer SQL serializer
 * @param {string} tableName Table name
 * @param {SchemaFlatter~Entity} metadata Entity metadata
 * @param {Array} queries Array of queries to add queries to
 */

module.exports = SqlSerializerStream
