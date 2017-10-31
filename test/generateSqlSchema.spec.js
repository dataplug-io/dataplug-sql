/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const knex = require('knex')
const { generateSqlSchema } = require('../lib')

const pg = knex({ client: 'postgres' })

describe('generateSqlSchema()', () => {
  it('generates empty SQL schema', () => {
    const entities = {}
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('')
  })

  it('generates SQL schema for single empty entity', () => {
    const entities = {
      entity: {

      }
    }
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('create table "entity" ()')
  })

  it('generates SQL schema for two empty entity', () => {
    const entities = {
      entityA: {
      },
      entityB: {
      }
    }
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal(
        'create table "entityA" (); ' +
        'create table "entityB" ()')
  })

  it('generates SQL schema for entity with fields', () => {
    const entities = {
      entity: {
        fields: {
          booleanProperty: {
            type: 'boolean'
          },
          enumProperty: {
            enum: [
              'option1',
              'option2'
            ],
            type: 'enum'
          },
          integerProperty: {
            type: 'integer'
          },
          stringProperty: {
            type: 'string'
          },
          objectProperty: {
            type: 'json'
          }
        }
      }
    }
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal(
        'create table "entity" ("booleanProperty" boolean not null, "enumProperty" text check ("enumProperty" in (\'option1\', \'option2\')) not null, "integerProperty" integer not null, "stringProperty" varchar(255) not null, "objectProperty" json not null)')
  })

  it('generates SQL schema for entity with default-value fields', () => {
    const entities = {
      entity: {
        fields: {
          booleanProperty: {
            type: 'boolean',
            default: false
          },
          enumProperty: {
            enum: [
              'option1',
              'option2'
            ],
            type: 'enum',
            default: 'option1'
          },
          integerProperty: {
            type: 'integer',
            default: 0
          },
          stringProperty: {
            type: 'string',
            default: 'value'
          },
          objectProperty: {
            type: 'json',
            default: {}
          }
        }
      }
    }
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('create table "entity" ("booleanProperty" boolean not null, "enumProperty" text check ("enumProperty" in (\'option1\', \'option2\')) not null default \'option1\', "integerProperty" integer not null, "stringProperty" varchar(255) not null default \'value\', "objectProperty" json not null {})')
  })

  it('generates SQL schema for entity with nullable fields', () => {
    const entities = {
      entity: {
        fields: {
          booleanProperty: {
            type: 'boolean',
            nullable: true
          },
          enumProperty: {
            enum: [
              'option1',
              'option2'
            ],
            type: 'enum',
            nullable: true
          },
          integerProperty: {
            type: 'integer',
            nullable: true
          },
          stringProperty: {
            type: 'string',
            nullable: true
          },
          objectProperty: {
            type: 'json',
            nullable: true
          }
        }
      }
    }
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('create table "entity" ("booleanProperty" boolean null, "enumProperty" text check ("enumProperty" in (\'option1\', \'option2\')) null, "integerProperty" integer null, "stringProperty" varchar(255) null, "objectProperty" json null)')
  })

  it('generates SQL schema for entities (array)', () => {
    const entities = {
      collection: {
        fields: {
          id: {
            identity: true,
            type: 'integer'
          }
        },
        origin: '#',
        relatedEntities: [
          'collection/array[@]'
        ]
      },
      'collection/array[@]': {
        fields: {
          $foreign$id$collection: {
            identity: true,
            reference: {
              depth: 1,
              entity: 'collection',
              field: 'id'
            },
            type: 'integer'
          },
          $value: {
            identity: true,
            type: 'integer'
          }
        },
        foreignFields: [
          '$foreign$id$collection'
        ],
        origin: '#/properties/array/items',
        customSchema: {
          properties: {
            $value: {
              type: 'integer'
            }
          },
          required: [
            '$value'
          ],
          type: 'object'
        }
      }
    }
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal(
        'create table "collection" ("id" integer not null);\n' +
        'alter table "collection" add constraint "collection_pkey" primary key ("id"); ' +
        'create table "collection/array[@]" ("$foreign$id$collection" integer not null, "$value" integer not null);\n' +
        'create index "collection/array[@]_$foreign$id$collection_index" on "collection/array[@]" ("$foreign$id$collection");\n' +
        'alter table "collection/array[@]" add constraint "collection/array[@]_$foreign$id$collection_foreign" foreign key ("$foreign$id$collection") references "collection" ("id");\n' +
        'alter table "collection/array[@]" add constraint "collection/array[@]_pkey" primary key ("$foreign$id$collection", "$value")')
  })

  it('generates SQL schema for entities (complex array)', () => {
    const entities = {
      'collection': {
        'fields': {
          'id': {
            'identity': true,
            'type': 'integer'
          }
        },
        'origin': '#',
        'relatedEntities': [
          'collection/array[@]'
        ]
      },
      'collection/array[@]': {
        'fields': {
          '$foreign$id$collection': {
            'identity': true,
            'reference': {
              'depth': 1,
              'entity': 'collection',
              'field': 'id'
            },
            'type': 'integer'
          },
          'value': {
            'type': 'string'
          }
        },
        'foreignFields': [
          '$foreign$id$collection'
        ],
        'origin': '#/properties/array/items'
      }
    }
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal(
        'create table "collection" ("id" integer not null);\n' +
        'alter table "collection" add constraint "collection_pkey" primary key ("id"); ' +
        'create table "collection/array[@]" ("$foreign$id$collection" integer not null, "value" varchar(255) not null);\n' +
        'create index "collection/array[@]_$foreign$id$collection_index" on "collection/array[@]" ("$foreign$id$collection");\n' +
        'alter table "collection/array[@]" add constraint "collection/array[@]_$foreign$id$collection_foreign" foreign key ("$foreign$id$collection") references "collection" ("id");\n' +
        'alter table "collection/array[@]" add constraint "collection/array[@]_pkey" primary key ("$foreign$id$collection")')
  })

  it('generates SQL schema for entities (complex)', () => {
    const entities = {
      'collection': {
        fields: {
          simpleProperty: {
            identity: true,
            type: 'integer'
          }
        },
        relatedEntities: [
          'collection/complexObject'
        ],
        origin: '#'
      },
      'collection/complexObject': {
        fields: {
          '$foreign$simpleProperty$collection': {
            identity: true,
            type: 'integer',
            reference: {
              entity: 'collection',
              field: 'simpleProperty',
              depth: 1
            }
          },
          otherSimpleProperty: {
            type: 'integer'
          }
        },
        origin: '#/properties/complexObject',
        foreignFields: [
          '$foreign$simpleProperty$collection'
        ]
      }
    }
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal(
        'create table "collection" ("simpleProperty" integer not null);\n' +
        'alter table "collection" add constraint "collection_pkey" primary key ("simpleProperty"); ' +
        'create table "collection/complexObject" ("$foreign$simpleProperty$collection" integer not null, "otherSimpleProperty" integer not null);\n' +
        'create index "collection/complexobject_$foreign$simpleproperty$collection_index" on "collection/complexObject" ("$foreign$simpleProperty$collection");\n' +
        'alter table "collection/complexObject" add constraint "collection/complexobject_$foreign$simpleproperty$collection_foreign" foreign key ("$foreign$simpleProperty$collection") references "collection" ("simpleProperty");\n' +
        'alter table "collection/complexObject" add constraint "collection/complexObject_pkey" primary key ("$foreign$simpleProperty$collection")')
  })
})
