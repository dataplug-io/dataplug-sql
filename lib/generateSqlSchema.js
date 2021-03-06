const _ = require('lodash')
const check = require('check-types')
const pgEscape = require('pg-escape')
const { getEntitiesOrderedByRelations } = require('@dataplug/dataplug-flatters')
const Dialects = require('./dialects')
const SqlSerializer = require('./sqlSerializer')

/**
 * Converts JSON schema to SQL schema
 *
 * @param {string} dbDialect Database dialect to use
 * @param {SchemaFlatter~Metadata} metadata Metadata
 * @param {string} [prefix=] Table names prefix
 * @return {Array} Array of queries
 */
function generateSqlSchema (dbDialect, metadata, prefix = undefined) {
  check.assert.nonEmptyString(dbDialect)
  check.assert.object(metadata)
  check.assert.maybe.string(prefix)

  if (!Dialects.isSupported(dbDialect)) {
    throw new Error(`Dialect "${dbDialect}" not supported`)
  }

  prefix = prefix || ''

  const sqlSerializer = new SqlSerializer(dbDialect)
  const orderedEntities = getEntitiesOrderedByRelations(metadata)

  let queries = []
  _.forEach(orderedEntities, (entityName) => {
    const entity = metadata[entityName]
    const tableName = pgEscape.ident(`${prefix}${entityName}`)

    let createQueries = []
    _.forOwn(entity.fields, (field, fieldName) => {
      const columnName = pgEscape.ident(fieldName)

      let columnQuery = ''

      columnQuery += columnName
      let columnConstraints = []

      const columnType = SqlSerializer.resolveType(field.type)
      columnQuery += ` ${columnType}`

      if (field.enum) {
        const enumValues = field.enum
          .map((value) => sqlSerializer.serializeValue(field.type, value))
          .join(', ')
        const expression = columnType.match(/(\[\d*\])+/g)
          ? `<@ ARRAY[${enumValues}]`
          : `IN (${enumValues})`
        columnConstraints.push(`CHECK (${columnName} ${expression})`)
      }

      // SQL doesn't have an "undefined" value, thus no-default would result a nullable column
      columnConstraints.push((field.nullable || (field.default === undefined && !field.identity))
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
      const primaryKeyName = pgEscape.ident(`${prefix}${entityName}_primary`)
      const uniqueName = pgEscape.ident(`${prefix}${entityName}_unique`)

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
      const otherTableName = pgEscape.ident(`${prefix}${otherEntityName}`)
      const constraintName = pgEscape.ident(`${prefix}${entityName}_ref${referencesCount++}`)

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
