const _ = require('lodash')
const check = require('check-types')
const resolveDbClient = require('./resolveDbClient')
const supportsDatabase = require('./supportsDatabase')

/**
 * Serializes data and objects to SQL
 */
class SqlSerializer {
  /**
   * @constructor
   * @param {Object|String} dbClientOrDialect Knex instance or dialect to use
   * @param {SqlSerializer~Options} [options=undefined] Options
   */
  constructor (dbClientOrDialect, options = undefined) {
    // TODO: check dbClientOrDialect

    this._options = _.assign({}, SqlSerializer.DEFAULT_OPTIONS, options)

    this._dbClient = resolveDbClient(dbClientOrDialect)
    this._dbDialect = this._dbClient.client.config.client
    if (!supportsDatabase(this._dbDialect)) {
      throw new Error(`'${this._dbDialect}' is not a supported dialect for serialization`)
    }
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
      const metadata = entity.metadata || (collectionMetadata ? collectionMetadata[entityName] : undefined)
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

    if (this._options.deleteBeforeInsert) {
      const deleteQuery = this._dbClient(tableName)
        .where(_.pickBy(object, (value, field) => metadata.fields[field].identity === true))
        .delete()
      queries.push(deleteQuery)
    }

    const insertQuery = this._dbClient(tableName).insert(object)
    let upsertQuery
    if (this._options.updateBehavior !== undefined) {
      if (this._dbDialect === 'postgres' || this._dbDialect === 'postgresql' || this._dbDialect === 'pg') {
        if (this._options.updateBehavior) {
          const valueFieldsSql = _.keys(object)
            .filter((field) => !metadata.fields[field].identity)
            .map((field) => `"${tableName}"."${field}" = excluded."${field}"`)
            .join(', ')
          upsertQuery = this._dbClient.raw(`? ON CONFLICT DO UPDATE SET ${valueFieldsSql}`, [insertQuery])
        } else {
          upsertQuery = this._dbClient.raw('? ON CONFLICT DO NOTHING', [insertQuery])
        }
      }
    } else {
      upsertQuery = insertQuery
    }

    queries.push(upsertQuery)

    return queries
  }
}

/**
 * @typedef {Object} SqlSerializer~Options
 * @property {boolean} deleteBeforeInsert Delete entry by its identity before inserting it
 * @property {boolean} updateBehavior On conflict, updates existing entries if true, ignores new data if false. Fails on conflict if not defined.
 */
SqlSerializer.DEFAULT_OPTIONS = {
  deleteBeforeInsert: false,
  updateBehavior: undefined
}

module.exports = SqlSerializer
