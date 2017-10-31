const _ = require('lodash')
const supportsDatabase = require('./supportsDatabase')

/**
 * Converts JSON schema to SQL schema
 *
 * @param {Object|String} knexOrDialect Knex instance or dialect to use
 * @param {Object} flattenedEntities Object with flattened entities
 * @return {Array} Array of queries
 */
function generateSqlSchema (knexOrDialect, flattenedEntities) {
  let knex = knexOrDialect
  if (_.isString(knexOrDialect)) {
    if (!supportsDatabase(knexOrDialect)) {
      throw new Error(`'${knexOrDialect}' is not a supported dialect`)
    }
    knex = require('knex')({
      client: knexOrDialect
    })
  }

  let queries = []
  _.forOwn(flattenedEntities, (entity, entityName) => {
    const query = knex.schema.createTable(entityName, (table) => {
      let identityFields = []
      let referencesByEntity = {}
      _.forOwn(entity.fields, (field, fieldName) => {
        let column

        // Type
        if (field.type === 'integer') {
          column = table.integer(fieldName)
        } else if (field.type === 'boolean') {
          column = table.boolean(fieldName)
        } else if (field.type === 'string') {
          column = table.text(fieldName)
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
          column.index()

          const entityReferences = referencesByEntity[field.reference.entity] = referencesByEntity[field.reference.entity] || []
          entityReferences.push({
            referenceField: fieldName,
            referencedField: field.reference.field
          })
        }
      })

      // Primary key
      if (identityFields.length > 0) {
        table
          .primary(identityFields)
          .unique(identityFields)
      }

      // Foreign keys
      _.forOwn(referencesByEntity, (references, otherEntityName) => {
        const referenceFields = _.map(references, (reference) => reference.referenceField)
        const referencedFields = _.map(references, (reference) => reference.referencedField)
        table
          .foreign(referenceFields)
          .references(referencedFields)
          .on(otherEntityName)
          .onDelete('RESTRICT')
          .onUpdate('RESTRICT')
      })
    })
    queries.push(query)
  })
  return queries
}

module.exports = generateSqlSchema