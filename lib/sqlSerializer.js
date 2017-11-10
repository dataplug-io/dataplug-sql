const _ = require('lodash')
const check = require('check-types')
const knex = require('knex')

/**
 * Serializes data and objects to SQL
 */
class SqlSerializer {
  /**
   * @constructor
   * @param {string} dbDialect Database dialect to use
   * @param {SqlSerializer~Options} [options=undefined] Options
   */
  constructor (dbDialect, options = undefined) {
    check.assert.nonEmptyString(dbDialect)
    check.assert.maybe.object(options)

    this._options = _.assign({}, SqlSerializer.DEFAULT_OPTIONS, options)

    this._dbClient = knex({
      client: dbDialect
    })
  }

  /**
   * Serializes collection data to SQL queries
   *
   * @param {Object} data Data to serialize
   * @param {string} [collectionPrefix=undefined] Collection prefix
   * @param {Object} [metadata=undefined] Collection metadata to use
   * @param {Array} [queries=undefined] Array of queries to add queries to
   * @return {Array} Array of queries
   */
  serializeData (data, collectionPrefix = undefined, collectionMetadata = undefined, queries = undefined) {
    check.assert.object(data)
    check.assert.maybe.string(collectionPrefix)
    check.assert.maybe.object(collectionMetadata)
    check.assert.maybe.array.of.object(queries)

    queries = queries || []
    _.forOwn(data, (entity, entityName) => {
      const metadata = (collectionMetadata ? collectionMetadata[entityName] : undefined) || entity.metadata
      if (!metadata) {
        throw new Error(`No metadata for '${entityName}'`)
      }

      const entries = entity.data || entity
      if (!_.isArray(entries)) {
        throw new Error(`Invalid data format of '${entityName}'`)
      }

      const entityTableName = collectionPrefix
        ? `${collectionPrefix}${entityName}`
        : entityName
      entries.forEach(entry => {
        this.serializeObject(entry, entityTableName, metadata, queries)
      })
    })
    return queries
  }

  /**
   * Serializes object to given Knex instance
   *
   * @param {Object} object Object to serialize
   * @param {string} tableName Table name
   * @param {Object} metadata Object metadata
   * @param {Array} [queries=undefined] Array of queries to add queries to
   * @return {Array} Array of queries
   */
  serializeObject (object, tableName, metadata, queries = undefined) {
    check.assert.object(object)
    check.assert.nonEmptyString(tableName)
    check.assert.object(metadata)
    check.assert.maybe.array.of.object(queries)

    queries = queries || []

    if (this._options.preprocessor) {
      const preprocessors = _.isArray(this._options.preprocessor)
        ? this._options.preprocessor
        : [this._options.preprocessor]
      _.forEach(preprocessors, (preprocessor) => {
        preprocessor = this._resolveProcessor(preprocessor)
        if (!_.isFunction(preprocessor)) {
          throw new TypeError(`'${preprocessor}' preprocessor is not callable`)
        }

        preprocessor(this._dbClient, tableName, object, metadata, queries)
      })
    }

    const insertQuery = this._dbClient(tableName).insert(object)
    queries.push(insertQuery)

    if (this._options.postprocessor) {
      const postprocessors = _.isArray(this._options.postprocessor)
        ? this._options.postprocessor
        : [this._options.postprocessor]
      _.forEach(postprocessors, (postprocessor) => {
        postprocessor = this._resolveProcessor(postprocessor)
        if (!_.isFunction(postprocessor)) {
          throw new TypeError(`'${postprocessor}' postprocessor is not callable`)
        }

        postprocessor(this._dbClient, tableName, object, metadata, queries)
      })
    }

    return queries
  }

  /**
   * Resolves processor to a callable function
   */
  _resolveProcessor (processor) {
    if (_.isFunction(processor)) {
      return processor
    } else if (_.isString(processor)) {
      processor = _.camelCase(processor)
      if (processor in this) {
        processor = this[processor]
      } else if (processor in SqlSerializer) {
        processor = SqlSerializer[processor]
      } else {
        throw new Error(`'${processor}' processor is not supported`)
      }
    } else {
      throw new Error(`'${processor}' processor reference is not supported for resolving`)
    }

    return processor
  }

  /**
   * Deletes object entry by identity
   */
  static deleteByIdentity (dbClient, tableName, object, metadata, queries) {
    const deleteQuery = dbClient(tableName)
      .where(_.pickBy(object, (value, field) => metadata.fields[field] && metadata.fields[field].identity === true))
      .delete()
    queries.push(deleteQuery)
  }

  /**
   * Ignores new data on conflict
   */
  static skipOnConflict (dbClient, tableName, object, metadata, queries) {
    const dbDialect = dbClient.client.dialect
    let insertQuery = queries.pop()
    if (dbDialect === 'postgresql') {
      insertQuery = dbClient.raw('? ON CONFLICT DO NOTHING', [insertQuery])
    } else {
      throw new Error(`'${dbDialect}' database dialect is not supported`)
    }
    queries.push(insertQuery)
  }

  /**
   * Updates entry on conflict
   */
  static updateOnConflict (dbClient, tableName, object, metadata, queries) {
    const dbDialect = dbClient.client.dialect
    let insertQuery = queries.pop()
    if (dbDialect === 'postgresql') {
      const constraintFieldsSql = _.keys(object)
        .filter((field) => {
          const fieldMetadata = metadata.fields[field]
          return fieldMetadata && fieldMetadata.identity
        })
        .map((field) => `"${field}"`)
        .join(', ')
      const valueFieldsSql = _.keys(object)
        .filter((field) => {
          const fieldMetadata = metadata.fields[field]
          return !fieldMetadata || !fieldMetadata.identity
        })
        .map((field) => `"${field}" = excluded."${field}"`)
        .join(', ')
      insertQuery = dbClient.raw(`? ON CONFLICT (${constraintFieldsSql}) DO UPDATE SET ${valueFieldsSql}`, [insertQuery])
    } else {
      throw new Error(`'${dbDialect}' database dialect is not supported`)
    }
    queries.push(insertQuery)
  }
}

/**
 * @typedef {Object} SqlSerializer~Options
 * @property {string|string[]|SqlSerializer~Processor|SqlSerializer~Processor[]} preprocessor Preprocessor(s)
 * @property {string|string[]|SqlSerializer~Processor|SqlSerializer~Processor[]} postprocessor Postprocessor(s)
 * @property {boolean} updateBehavior On conflict, updates existing entries if true, ignores new data if false. Fails on conflict if not defined.
 */
SqlSerializer.DEFAULT_OPTIONS = {
  preprocessor: undefined,
  postprocessor: undefined
}

/**
 * @callback SqlSerializer~Processor
 * @param {object} dbClient
 * @param {string} tableName
 * @param {} object
 * @param {} metadata
 * @param {} queries
 */

module.exports = SqlSerializer
