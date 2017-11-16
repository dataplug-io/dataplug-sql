const _ = require('lodash')
const check = require('check-types')
const pgEscape = require('pg-escape')
const Dialects = require('./dialects')
const SqlSerializer = require('./sqlSerializer')

/**
 * Converts JSON schema to SQL schema
 *
 * @param {string} dbDialect Database dialect to use
 * @param {SchemaFlatter~Metadata} metadata Metadata
 * @return {Array} Array of queries
 */
function generateSqlSchema (dbDialect, metadata) {
  check.assert.nonEmptyString(dbDialect)
  check.assert.object(metadata)

  if (!Dialects.isSupported(dbDialect)) {
    throw new Error(`Dialect "${dbDialect}" not supported`)
  }

  const sqlSerializer = new SqlSerializer(dbDialect)

  let queries = []
  _
    .keys(metadata)
    .sort((l, r) => {
      const lMetadata = metadata[l]
      const rMetadata = metadata[r]

      if (lMetadata.relations && lMetadata.relations[r]) {
        return _.startsWith(lMetadata.relations[r], 'one-to-') ? -1 : +1
      } else if (rMetadata.relations && rMetadata.relations[l]) {
        return _.startsWith(rMetadata.relations[l], 'one-to-') ? +1 : -1
      }
      return 0
    })
    .forEach((entityName) => {
      const entity = metadata[entityName]
      const tableName = pgEscape.ident(entityName)

      let createQueries = []
      _.forOwn(entity.fields, (field, fieldName) => {
        const columnName = pgEscape.ident(fieldName)

        let columnQuery = ''

        columnQuery += columnName
        let columnConstraints = []

        const arrayRegExp = /(\[\d*\])+/g
        const type = field.type.replace(arrayRegExp, '')
        const dimensions = field.type.length <= type.length ? '' : field.type.slice(type.length)
        if (type === 'integer') {
          columnQuery += ` BIGINT`
        } else if (type === 'boolean') {
          columnQuery += ` BOOLEAN`
        } else if (type === 'string') {
          columnQuery += ` TEXT`
        } else if (type === 'number') {
          columnQuery += ` NUMERIC`
        } else if (type === 'enum') {
          columnQuery += ` TEXT`
        } else if (type === 'date') {
          columnQuery += ` DATE`
        } else if (type === 'time') {
          columnQuery += ` TIME WITH TIME ZONE`
        } else if (type === 'datetime') {
          columnQuery += ` TIMESTAMP WITH TIME ZONE`
        } else if (type === 'timestamp') {
          columnQuery += ` TIMESTAMP`
        } else if (type === 'json') {
          columnQuery += ` JSON`
        } else {
          throw new Error(`Field '${fieldName}' of entity '${entityName}' has unsupported type '${field.type}'`)
        }
        if (dimensions.length > 0) {
          columnQuery += dimensions
        }

        if (field.enum) {
          const enumValues = field.enum
            .map((value) => pgEscape.literal(value))
            .join(', ')
          const expression = dimensions.length > 0
            ? `<@ ARRAY[${enumValues}]`
            : `IN (${enumValues})`
          columnConstraints.push(`CHECK (${columnName} ${expression})`)
        }

        columnConstraints.push(field.nullable
          ? 'NULL'
          : 'NOT NULL')

        if (field.default !== undefined) {
          const value = sqlSerializer.serializeValue(field.type, field.default)
          columnConstraints.push(`DEFAULT ${value}`)
        }

        if (columnConstraints.length > 0) {
          columnQuery += ` ${columnConstraints.join(' ')}`
        }

        createQueries.push(`\n\t${columnQuery}`)
      })

      const identity = _.chain(entity.fields)
        .pickBy((field) => field.identity)
        .map((field, fieldName) => pgEscape.ident(fieldName))
        .value()
      if (identity.length > 0) {
        const primaryKeyName = pgEscape.ident(`${entityName}_primary`)
        const uniqueName = pgEscape.ident(`${entityName}_unique`)

        const columns = identity.join(', ')
        createQueries.push(`\n\tCONSTRAINT ${primaryKeyName} PRIMARY KEY (${columns})`)
        createQueries.push(`\n\tCONSTRAINT ${uniqueName} UNIQUE (${columns})`)
      }

      let referencesCount = 0
      const references = _.chain(entity.fields)
        .pickBy((field) => field.relation)
        .toPairs()
        .groupBy((pair) => pair[1].relation.entity)
        .value()
      _.forOwn(references, (pairs, otherEntityName) => {
        const otherTableName = pgEscape.ident(otherEntityName)
        const constraintName = pgEscape.ident(`${entityName}_ref${referencesCount++}`)

        pairs = _.zip(...pairs)
        const fieldsList = pairs[0]
          .map((fieldName) => pgEscape.ident(fieldName))
          .join(', ')
        const otherEntityFieldsList = pairs[1]
          .map((field) => pgEscape.ident(field.relation.field))
          .join(', ')

        let foreignConstraint = ''
        foreignConstraint += `\n\tCONSTRAINT ${constraintName} FOREIGN KEY (${fieldsList})`
        foreignConstraint += `\n\t\tREFERENCES ${otherTableName} (${otherEntityFieldsList})`
        foreignConstraint += '\n\t\tON DELETE CASCADE'
        foreignConstraint += '\n\t\tON UPDATE CASCADE'

        createQueries.push(foreignConstraint)
      })

      let createQuery = ''
      createQuery += `CREATE TABLE ${tableName} (`
      createQuery += createQueries.join(',')
      createQuery += createQueries.length > 0 ? '\n)' : ')'

      queries.push(createQuery)
    })

  return queries
}

module.exports = generateSqlSchema
