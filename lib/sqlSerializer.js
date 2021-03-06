const _ = require('lodash')
const check = require('check-types')
const moment = require('moment')
const pgEscape = require('pg-escape')
const { getEntitiesOrderedByRelations } = require('@dataplug/dataplug-flatters')
const Dialects = require('./dialects')

/**
 * Serializes data and objects to SQL
 */
class SqlSerializer {
  /**
   * @constructor
   * @param {string} dbDialect Database dialect to use
   * @param {SqlSerializer~Options} [options=] Options
   */
  constructor (dbDialect, options = undefined) {
    check.assert.nonEmptyString(dbDialect)
    check.assert.maybe.object(options)

    if (!Dialects.isSupported(dbDialect)) {
      throw new Error(`Dialect "${dbDialect}" not supported`)
    }

    this._dbDialect = dbDialect
    this._options = _.assign({}, SqlSerializer.DEFAULT_OPTIONS, options)
  }

  get dbDialect () {
    return this._dbDialect
  }

  /**
   * Serializes collection data to SQL queries
   *
   * @param {Object} data Data to serialize
   * @param {string} [prefix=] Table names prefix
   * @param {SchemaFlatter~Metadata} [metadata=] Collection metadata to use
   * @param {Array} [queries=] Array of queries to add queries to
   * @return {Array} Array of queries
   */
  serializeData (data, prefix = undefined, metadata = undefined, queries = undefined) {
    check.assert.object(data)
    check.assert.maybe.string(prefix)
    check.assert.maybe.object(metadata)
    check.assert.maybe.array.of.string(queries)

    if (!metadata) {
      metadata = _.mapValues(data, (value) => value.metadata)
    }
    const orderedEntities = getEntitiesOrderedByRelations(metadata)

    queries = queries || []
    _.forEach(orderedEntities, (entityName) => {
      const entity = data[entityName]
      if (!entity) {
        return
      }
      const entityMetadata = metadata[entityName]
      if (!entityMetadata) {
        throw new Error(`No metadata for '${entityName}'`)
      }

      const entries = entity.data || entity
      if (!entries || !_.isArray(entries)) {
        throw new Error(`Invalid data format of '${entityName}'`)
      }

      const entityTableName = prefix
        ? `${prefix}${entityName}`
        : entityName
      entries.forEach(entry => {
        this.serializeObject(entry, entityTableName, entityMetadata, queries)
      })
    })

    return queries
  }

  /**
   * Serializes object to given Knex instance
   *
   * @param {Object} object Object to serialize
   * @param {string} tableName Table name
   * @param {SchemaFlatter~Entity} metadata Object metadata
   * @param {Array} [queries=undefined] Array of queries to add queries to
   * @return {Array} Array of queries
   */
  serializeObject (object, tableName, metadata, queries = undefined) {
    check.assert.object(object)
    check.assert.nonEmptyString(tableName)
    check.assert.object(metadata)
    check.assert.object(metadata.fields)
    check.assert.maybe.array.of.string(queries)

    tableName = pgEscape.ident(tableName)
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

        preprocessor(this, tableName, object, metadata, queries)
      })
    }

    const columns = []
    const values = []
    _.forOwn(object, (value, field) => {
      const fieldMetadata = metadata.fields[field]
      if (!fieldMetadata) {
        throw Error(`No metadata for '${field}' field to serialize it as column in '${tableName}'`)
      }

      columns.push(pgEscape.ident(field))
      values.push(this.serializeValue(fieldMetadata.type, value))
    })

    let insertQuery = ''
    insertQuery += `INSERT INTO ${tableName} (`
    if (columns.length > 0) {
      insertQuery += `\n\t\t${columns.join(',\n\t\t')}`
    }
    insertQuery += '\n\t) VALUES ('
    if (values.length > 0) {
      insertQuery += `\n\t\t${values.join(',\n\t\t')}`
    }
    insertQuery += '\n\t)'

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

        postprocessor(this, tableName, object, metadata, queries)
      })
    }

    return queries
  }

  /**
   * Serializes value
   */
  serializeValue (type, value) {
    check.assert.string(type)

    if (value === null || value === undefined) {
      return 'NULL'
    }

    if (_.isArray(value)) {
      const arrayType = SqlSerializer.resolveType(type)
      type = type.replace(/(\[\d*\])+/g, '')
      const valuesList = _
        .map(value, (valueItem) => this.serializeValue(type, valueItem))
        .join(', ')
      return `ARRAY[${valuesList}]::${arrayType}`
    }

    if (type === 'integer') {
      value = `${value}`
    } else if (type === 'boolean') {
      value = value ? 'TRUE' : 'FALSE'
    } else if (type === 'timestamp') {
      value = moment.parseZone(value).utc().format()
      value = pgEscape.literal(value)
      value = `TIMESTAMP ${value}`
    } else if (type === 'datetime') {
      value = moment.parseZone(value).format()
      value = pgEscape.literal(value)
      value = `TIMESTAMP WITH TIME ZONE ${value}`
    } else if (type === 'date') {
      value = moment.parseZone(value).utc().format().slice(0, 10)
      value = pgEscape.literal(value)
      value = `DATE ${value}`
    } else if (type === 'time') {
      value = moment.parseZone(value).format().slice(11)
      value = pgEscape.literal(value)
      value = `TIME WITH TIME ZONE ${value}`
    } else if (type === 'json') {
      value = JSON.stringify(value)
      value = pgEscape.literal(value)
      value = `${value}::json`
    } else {
      value = pgEscape.literal(_.toString(value))
    }
    return value
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
   * Resolves database data type
   *
   * @param {string} type Type
   */
  static resolveType (type) {
    check.assert.nonEmptyString(type)

    let dbType
    const itemType = type.replace(/(\[\d*\])+/g, '')
    const dimensions = type.length <= itemType.length ? '' : type.slice(itemType.length)
    if (itemType === 'integer') {
      dbType = 'BIGINT'
    } else if (itemType === 'boolean') {
      dbType = 'BOOLEAN'
    } else if (itemType === 'string') {
      dbType = 'TEXT'
    } else if (itemType === 'number') {
      dbType = 'NUMERIC'
    } else if (itemType === 'enum') {
      dbType = 'TEXT'
    } else if (itemType === 'date') {
      dbType = 'DATE'
    } else if (itemType === 'time') {
      dbType = 'TIME WITH TIME ZONE'
    } else if (itemType === 'datetime') {
      dbType = 'TIMESTAMP WITH TIME ZONE'
    } else if (itemType === 'timestamp') {
      dbType = 'TIMESTAMP'
    } else if (itemType === 'json') {
      dbType = 'JSON'
    } else {
      throw new Error(`Unsupported type '${type}'`)
    }
    if (dimensions.length > 0) {
      dbType += dimensions
    }

    return dbType
  }

  /**
   * Deletes object entry by identity
   */
  static deleteByIdentity (serializer, tableName, object, metadata, queries) {
    const identity = _.pickBy(object, (value, field) => {
      return metadata.fields[field] && metadata.fields[field].identity === true
    })
    const whereClause = _
      .map(identity, (value, field) => {
        field = pgEscape.ident(field)
        value = serializer.serializeValue(metadata.fields[field].type, value)
        return `${field} = ${value}`
      })
      .join(',\n\t\t')

    let deleteQuery = ''
    deleteQuery += `DELETE FROM ${tableName}`
    deleteQuery += `\n\tWHERE`
    deleteQuery += `\n\t\t${whereClause}`

    queries.push(deleteQuery)
  }

  /**
   * Ignores new data on conflict
   */
  static skipOnConflict (serializer, tableName, object, metadata, queries) {
    let insertQuery = queries.pop()
    insertQuery += '\n\tON CONFLICT DO NOTHING'
    queries.push(insertQuery)
  }

  /**
   * Updates entry on conflict
   */
  static updateOnConflict (serializer, tableName, object, metadata, queries) {
    let insertQuery = queries.pop()
    const identityFields = _
      .keys(object)
      .filter((field) => {
        const fieldMetadata = metadata.fields[field]
        return fieldMetadata && fieldMetadata.identity
      })
      .map((field) => pgEscape.ident(field))
      .join(',\n\t')
    const valueFieldsSql = _
      .keys(object)
      .filter((field) => {
        const fieldMetadata = metadata.fields[field]
        return !fieldMetadata || !fieldMetadata.identity
      })
      .map((field) => {
        field = pgEscape.ident(field)
        return `${field} = excluded.${field}`
      })
      .join(',\n\t\t')
    insertQuery += `\n\tON CONFLICT (\n\t\t${identityFields}\n\t) DO UPDATE SET\n\t\t${valueFieldsSql}`
    queries.push(insertQuery)
  }
}

/**
 * @typedef {Object} SqlSerializer~Options
 * @property {string|string[]|SqlSerializer~Processor|SqlSerializer~Processor[]} preprocessor Preprocessor(s)
 * @property {string|string[]|SqlSerializer~Processor|SqlSerializer~Processor[]} postprocessor Postprocessor(s)
 */
SqlSerializer.DEFAULT_OPTIONS = {
  preprocessor: undefined,
  postprocessor: undefined
}

/**
 * @callback SqlSerializer~Processor
 * @param {SqlSerializer} serializer
 * @param {string} tableName
 * @param {} object
 * @param {} metadata
 * @param {} queries
 */

module.exports = SqlSerializer
