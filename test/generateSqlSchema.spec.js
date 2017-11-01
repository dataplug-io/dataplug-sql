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
        'create table "entity" ("booleanProperty" boolean not null, "enumProperty" text check ("enumProperty" in (\'option1\', \'option2\')) not null, "integerProperty" integer not null, "stringProperty" text not null, "objectProperty" json not null)')
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
      .should.be.equal(
        'create table "entity" ("booleanProperty" boolean not null, "enumProperty" text check ("enumProperty" in (\'option1\', \'option2\')) not null default \'option1\', "integerProperty" integer not null, "stringProperty" text not null default \'value\', "objectProperty" json not null {})')
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
      .should.be.equal(
        'create table "entity" ("booleanProperty" boolean null, "enumProperty" text check ("enumProperty" in (\'option1\', \'option2\')) null, "integerProperty" integer null, "stringProperty" text null, "objectProperty" json null)')
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
          '$collection~id': {
            identity: true,
            reference: {
              depth: 1,
              entity: 'collection',
              field: 'id'
            },
            relation: {
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
          '$collection~id'
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
        'alter table "collection" add constraint "collection_primary" primary key ("id");\n' +
        'alter table "collection" add constraint "collection_unique" unique ("id"); ' +
        'create table "collection/array[@]" ("$collection~id" integer not null, "$value" integer not null);\n' +
        'alter table "collection/array[@]" add constraint "collection/array[@]_primary" primary key ("$collection~id", "$value");\n' +
        'alter table "collection/array[@]" add constraint "collection/array[@]_unique" unique ("$collection~id", "$value");\n' +
        'alter table "collection/array[@]" add constraint "collection/array[@]_collection" foreign key ("$collection~id") references "collection" ("id") on update RESTRICT on delete RESTRICT')
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
          '$collection~id': {
            'identity': true,
            'reference': {
              'depth': 1,
              'entity': 'collection',
              'field': 'id'
            },
            relation: {
              entity: 'collection',
              field: 'id'
            },
            'type': 'integer'
          },
          'value': {
            'type': 'string'
          }
        },
        'foreignFields': [
          '$collection~id'
        ],
        'origin': '#/properties/array/items'
      }
    }
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal(
        'create table "collection" ("id" integer not null);\n' +
        'alter table "collection" add constraint "collection_primary" primary key ("id");\n' +
        'alter table "collection" add constraint "collection_unique" unique ("id"); ' +
        'create table "collection/array[@]" ("$collection~id" integer not null, "value" text not null);\n' +
        'alter table "collection/array[@]" add constraint "collection/array[@]_primary" primary key ("$collection~id");\n' +
        'alter table "collection/array[@]" add constraint "collection/array[@]_unique" unique ("$collection~id");\n' +
        'alter table "collection/array[@]" add constraint "collection/array[@]_collection" foreign key ("$collection~id") references "collection" ("id") on update RESTRICT on delete RESTRICT')
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
          '$collection~simpleProperty': {
            identity: true,
            type: 'integer',
            reference: {
              entity: 'collection',
              field: 'simpleProperty',
              depth: 1
            },
            relation: {
              entity: 'collection',
              field: 'simpleProperty'
            }
          },
          otherSimpleProperty: {
            type: 'integer'
          }
        },
        origin: '#/properties/complexObject',
        foreignFields: [
          '$collection~simpleProperty'
        ]
      }
    }
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal(
        'create table "collection" ("simpleProperty" integer not null);\n' +
        'alter table "collection" add constraint "collection_primary" primary key ("simpleProperty");\n' +
        'alter table "collection" add constraint "collection_unique" unique ("simpleProperty"); ' +
        'create table "collection/complexObject" ("$collection~simpleProperty" integer not null, "otherSimpleProperty" integer not null);\n' +
        'alter table "collection/complexObject" add constraint "collection/complexObject_primary" primary key ("$collection~simpleProperty");\n' +
        'alter table "collection/complexObject" add constraint "collection/complexObject_unique" unique ("$collection~simpleProperty");\n' +
        'alter table "collection/complexObject" add constraint "collection/complexObject_collection" foreign key ("$collection~simpleProperty") references "collection" ("simpleProperty") on update RESTRICT on delete RESTRICT')
  })

  it('generates SQL schema for entities (complex with additionalProperties)', () => {
    const entities = {
      collection: {
        fields: {
          simpleProperty: {
            identity: true,
            type: 'integer'
          }
        },
        origin: '#',
        relatedEntities: [
          'collection/complexObject'
        ]
      },
      'collection/complexObject': {
        fields: {
          '$collection~simpleProperty': {
            identity: true,
            reference: {
              depth: 1,
              entity: 'collection',
              field: 'simpleProperty'
            },
            relation: {
              entity: 'collection',
              field: 'simpleProperty'
            },
            type: 'integer'
          }
        },
        origin: '#/properties/complexObject',
        relatedEntities: [
          'collection/complexObject[@0]'
        ]
      },
      'collection/complexObject[@0]': {
        customSchema: {
          properties: {
            $property: {
              type: 'string'
            },
            $value: {
              type: ['object', 'null']
            }
          },
          required: ['$property', '$value'],
          type: 'object'
        },
        fields: {
          '$collection~simpleProperty': {
            identity: true,
            reference: {
              depth: 2,
              entity: 'collection',
              field: 'simpleProperty'
            },
            relation: {
              entity: 'collection/complexObject',
              field: '$collection~simpleProperty'
            },
            type: 'integer'
          },
          $property: {
            identity: true,
            type: 'string'
          },
          $value: {
            identity: true,
            nullable: true,
            type: 'json'
          }
        },
        origin: '#/properties/complexObject/additionalProperties'
      }
    }
    generateSqlSchema(pg, entities)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal(
        'create table "collection" ("simpleProperty" integer not null);\n' +
        'alter table "collection" add constraint "collection_primary" primary key ("simpleProperty");\n' +
        'alter table "collection" add constraint "collection_unique" unique ("simpleProperty"); ' +
        'create table "collection/complexObject" ("$collection~simpleProperty" integer not null);\n' +
        'alter table "collection/complexObject" add constraint "collection/complexObject_primary" primary key ("$collection~simpleProperty");\n' +
        'alter table "collection/complexObject" add constraint "collection/complexObject_unique" unique ("$collection~simpleProperty");\n' +
        'alter table "collection/complexObject" add constraint "collection/complexObject_collection" foreign key ("$collection~simpleProperty") references "collection" ("simpleProperty") on update RESTRICT on delete RESTRICT; ' +
        'create table "collection/complexObject[@0]" ("$collection~simpleProperty" integer not null, "$property" text not null, "$value" json null);\n' +
        'alter table "collection/complexObject[@0]" add constraint "collection/complexObject[@0]_primary" primary key ("$collection~simpleProperty", "$property", "$value");\n' +
        'alter table "collection/complexObject[@0]" add constraint "collection/complexObject[@0]_unique" unique ("$collection~simpleProperty", "$property", "$value");\n' +
        'alter table "collection/complexObject[@0]" add constraint "collection/complexObject[@0]_collection/complexObject" foreign key ("$collection~simpleProperty") references "collection/complexObject" ("$collection~simpleProperty") on update RESTRICT on delete RESTRICT')
  })
})
