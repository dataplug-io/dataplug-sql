const _ = require('lodash')

/**
 * Converts JSON schema to SQL schema
 *
 * @param {Object} knex Knex instance
 * @param {Object} flattenedEntities Object with flattened entities
 * @return {Array} Array of queries
 */
function generateSqlSchema (knex, flattenedEntities) {
  let queries = []
  _.forOwn(flattenedEntities, (entity, entityName) => {
    const query = knex.schema.createTable(entityName, (table) => {
      let identityFields = []
      _.forOwn(entity.fields, (field, fieldName) => {
        let column

        // Type
        if (field.type === 'integer') {
          column = table.integer(fieldName)
        } else if (field.type === 'boolean') {
          column = table.boolean(fieldName)
        } else if (field.type === 'string') {
          column = table.string(fieldName)
        } else if (field.type === 'number') {
          column = table.float(fieldName)
        } else if (field.type === 'enum') {
          column = table.enum(fieldName, field.enum)
        } else if (field.type === 'date') {
          column = table.date(fieldName)
        } else if (field.type === 'time') {
          column = table.time(fieldName)
        } else if (field.type === 'datetime') {
          column = table.dateTime(fieldName)
        } else if (field.type === 'timestamp') {
          column = table.timestamp(fieldName)
        } else if (field.type === 'json') {
          column = table.json(fieldName)
        } else {
          throw new Error(`Field '${fieldName}' of entity '${entityName}' has unsupported type '${field.type}'`)
        }

        // Nullable
        if (field.nullable) {
          column.nullable()
        } else {
          column.notNullable()
        }

        // Default
        if (field.default) {
          column.defaultTo(field.default)
        }

        // Identity
        if (field.identity) {
          identityFields.push(fieldName)
        }

        // Reference
        if (field.reference) {
          column
            .index()
            .references(field.reference.field)
            .inTable(field.reference.entity)
        }
      })

      // Primary key
      if (identityFields.length > 0) {
        table.primary(identityFields)
      }
    })
    queries.push(query)
  })
  return queries
}

module.exports = generateSqlSchema
