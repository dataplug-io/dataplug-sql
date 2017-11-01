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
  _.forOwn(flattenedEntities, (entity, entityFqName) => {
    const query = knex.schema.createTable(entityFqName, (table) => {
      let identityFields = []
      let relationsByEntity = {}
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
          throw new Error(`Field '${fieldName}' of entity '${entityFqName}' has unsupported type '${field.type}'`)
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

        // Relation
        if (field.relation) {
          const relations = relationsByEntity[field.relation.entity] = relationsByEntity[field.relation.entity] || {}
          relations[fieldName] = field.relation.field
        }
      })

      // Primary key
      if (identityFields.length > 0) {
        table
          .primary(identityFields, `${entityFqName}_primary`)
          .unique(identityFields, `${entityFqName}_unique`)
      }

      // Foreign keys
      _.forOwn(relationsByEntity, (relations, otherEntityFqName) => {
        const foreignFields = []
        const referencedFields = []
        _.forOwn(relations, (referencedField, foreignField) => {
          foreignFields.push(foreignField)
          referencedFields.push(referencedField)
        })
        table
          .foreign(foreignFields)
          .references(referencedFields)
          .on(otherEntityFqName)
          .withKeyName(`${entityFqName}_${otherEntityFqName}`)
          .onDelete('RESTRICT')
          .onUpdate('RESTRICT')
      })
    })
    queries.push(query)
  })
  return queries
}

module.exports = generateSqlSchema
