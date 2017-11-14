const _ = require('lodash')
const check = require('check-types')
const knex = require('knex')
const { Transform } = require('stream')
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

    this._collectionPrefix = collectionPrefix
    this._collectionMetadata = collectionMetadata ? _.cloneDeep(collectionMetadata) : undefined
    this._options = _.assign({}, SqlSerializerStream.DEFAULT_OPTIONS, options)

    this._dbClient = knex({
      client: dbDialect
    })

    this._serializer = new SqlSerializer(this._dbClient.client.dialect, options)

    this._prologue = this._options.prologue
    if (_.isString(this._prologue)) {
      if (this._prologue === 'truncate') {
        this._prologue = (dbClient, entityName, queries) => {
          queries.push(dbClient.truncate())
        }
      } else {
        throw new Error(`'${this._prologue}' is not a supported prologue`)
      }
    } else if (_.isPlainObject(this._prologue)) {
      const data = this._prologue
      this._prologue = (dbClient, entityName, queries) => {
        queries.push(dbClient.update(data))
      }
    }
    this._prologueProcessed = {}

    this._epilogue = this._options.epilogue
    if (_.isString(this._epilogue)) {
      throw new Error(`'${this._epilogue}' is not a supported epilogue`)
    } else if (_.isPlainObject(this._epilogue)) {
      const data = this._epilogue
      this._epilogue = (dbClient, entityName, queries) => {
        queries.push(dbClient.update(data))
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

      if (this._prologue) {
        _.keys(this._collectionMetadata || chunk).forEach((entityName) => {
          if (this._prologueProcessed[entityName]) {
            return
          }

          const tableName = this._collectionPrefix
            ? `${this._collectionPrefix}${entityName}`
            : entityName

          const result = this._prologue(this._dbClient(tableName), entityName, queries)
          this._prologueProcessed[entityName] = result || result === undefined
        })
      }

      queries = this._serializer.serializeData(chunk, this._collectionPrefix, this._collectionMetadata, queries)

      callback(null, queries.length ? queries.map(query => query.toSQL()) : null)
    } catch (error) {
      callback(error, null)
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

          const tableName = this._collectionPrefix
            ? `${this._collectionPrefix}${entityName}`
            : entityName

          this._epilogue(this._dbClient(tableName), entityName, queries)
        })
      }

      callback(null, queries.length ? queries.map(query => query.toSQL()) : null)
    } catch (error) {
      callback(error, null)
    }
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
  epilogue: undefined
})

/**
 * @callback SqlSerializerStream~Prologue
 * @param {Object} dbClient Database client
 * @param {string} entityName Entity name
 * @param {Array} queries Array of queries to add queries to
 * @returns {boolean} Truthy if prologue processed successfully
 */

/**
 * @callback SqlSerializerStream~Epilogue
 * @param {Object} dbClient Database client
 * @param {string} entityName Entity name
 * @param {Array} queries Array of queries to add queries to
 */

module.exports = SqlSerializerStream
