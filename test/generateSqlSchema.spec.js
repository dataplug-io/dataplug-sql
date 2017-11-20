/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const logger = require('winston')
const { generateSqlSchema } = require('../lib')

logger.clear()

describe('generateSqlSchema()', () => {
  it('generates empty SQL schema', () => {
    const entities = {}
    generateSqlSchema('pg', entities)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal('')
  })

  it('generates SQL schema for single empty entity', () => {
    const entities = {
      entity: {}
    }
    generateSqlSchema('pg', entities)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal('CREATE TABLE entity ()')
  })

  it('generates SQL schema for two empty entity', () => {
    const entities = {
      entityA: {},
      entityB: {}
    }
    generateSqlSchema('pg', entities)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'CREATE TABLE entityA ();\n' +
        'CREATE TABLE entityB ()')
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
    generateSqlSchema('pg', entities)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'CREATE TABLE entity (' +
          '\n\tbooleanProperty BOOLEAN NULL,' +
          '\n\tenumProperty TEXT CHECK (enumProperty IN (\'option1\', \'option2\')) NULL,' +
          '\n\tintegerProperty BIGINT NULL,' +
          '\n\tstringProperty TEXT NULL,' +
          '\n\tobjectProperty JSON NULL' +
          '\n)')
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
    generateSqlSchema('pg', entities)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'CREATE TABLE entity (' +
          '\n\tbooleanProperty BOOLEAN NOT NULL DEFAULT FALSE,' +
          '\n\tenumProperty TEXT CHECK (enumProperty IN (\'option1\', \'option2\')) NOT NULL DEFAULT \'option1\',' +
          '\n\tintegerProperty BIGINT NOT NULL DEFAULT 0,' +
          '\n\tstringProperty TEXT NOT NULL DEFAULT \'value\',' +
          '\n\tobjectProperty JSON NOT NULL DEFAULT \'{}\'::json' +
          '\n)')
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
    generateSqlSchema('pg', entities)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'CREATE TABLE entity (' +
          '\n\tbooleanProperty BOOLEAN NULL,' +
          '\n\tenumProperty TEXT CHECK (enumProperty IN (\'option1\', \'option2\')) NULL,' +
          '\n\tintegerProperty BIGINT NULL,' +
          '\n\tstringProperty TEXT NULL,' +
          '\n\tobjectProperty JSON NULL' +
          '\n)')
  })

  it('generates SQL schema for entity with basic arrays', () => {
    const entities = {
      collection: {
        fields: {
          identityProperty: {
            type: 'integer',
            identity: true
          },
          booleanProperty: {
            type: 'boolean[]'
          },
          integerProperty: {
            type: 'integer[]'
          },
          stringProperty: {
            type: 'string[]'
          },
          enumProperty: {
            type: 'enum[]',
            enum: ['option1', 'option2']
          },
          objectProperty: {
            type: 'json[]'
          }
        },
        origin: '#'
      }
    }
    generateSqlSchema('pg', entities)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'CREATE TABLE collection (' +
        '\n\tidentityProperty BIGINT NOT NULL,' +
        '\n\tbooleanProperty BOOLEAN[] NULL,' +
        '\n\tintegerProperty BIGINT[] NULL,' +
        '\n\tstringProperty TEXT[] NULL,' +
        '\n\tenumProperty TEXT[] CHECK (enumProperty <@ ARRAY[\'option1\', \'option2\']) NULL,' +
        '\n\tobjectProperty JSON[] NULL,' +
        '\n\tCONSTRAINT collection_primary PRIMARY KEY (identityProperty),' +
        '\n\tCONSTRAINT collection_unique UNIQUE (identityProperty)' +
        '\n)')
  })

  it('generates SQL schema for entities (complex array)', () => {
    const entities = {
      collection: {
        fields: {
          id: {
            identity: true,
            type: 'integer'
          }
        },
        origin: '#',
        relations: {
          'collection/array[@]': 'one-to-many'
        }
      },
      'collection/array[@]': {
        fields: {
          '$collection~id': {
            identity: true,
            reference: {
              depth: 2,
              entity: 'collection',
              field: 'id'
            },
            relation: {
              entity: 'collection',
              field: 'id'
            },
            type: 'integer'
          },
          otherId: {
            identity: true,
            type: 'integer'
          },
          value: {
            type: 'string'
          }
        },
        origin: '#/properties/array/items'
      }
    }
    generateSqlSchema('pg', entities)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'CREATE TABLE collection (' +
        '\n\tid BIGINT NOT NULL,' +
        '\n\tCONSTRAINT collection_primary PRIMARY KEY (id),' +
        '\n\tCONSTRAINT collection_unique UNIQUE (id)' +
        '\n);\n' +
        'CREATE TABLE "collection/array[@]" (' +
        '\n\t"$collection~id" BIGINT NOT NULL,' +
        '\n\totherId BIGINT NOT NULL,' +
        '\n\tvalue TEXT NULL,' +
        '\n\tCONSTRAINT "collection/array[@]_primary" PRIMARY KEY ("$collection~id", otherId),' +
        '\n\tCONSTRAINT "collection/array[@]_unique" UNIQUE ("$collection~id", otherId),' +
        '\n\tCONSTRAINT "collection/array[@]_ref0" FOREIGN KEY ("$collection~id")' +
        '\n\t\tREFERENCES collection (id)' +
        '\n\t\tON DELETE CASCADE' +
        '\n\t\tON UPDATE CASCADE' +
        '\n)')
  })

  it('generates SQL schema for entities (composite identity)', () => {
    const entities = {
      collection: {
        fields: {
          idA: {
            identity: true,
            type: 'integer'
          },
          idB: {
            identity: true,
            type: 'integer'
          }
        },
        origin: '#',
        relations: {
          'collection/array[@]': 'one-to-many'
        }
      },
      'collection/array[@]': {
        fields: {
          '$collection~idA': {
            identity: true,
            reference: {
              depth: 2,
              entity: 'collection',
              field: 'idA'
            },
            relation: {
              entity: 'collection',
              field: 'idA'
            },
            type: 'integer'
          },
          '$collection~idB': {
            identity: true,
            reference: {
              depth: 2,
              entity: 'collection',
              field: 'idB'
            },
            relation: {
              entity: 'collection',
              field: 'idB'
            },
            type: 'integer'
          },
          otherId: {
            identity: true,
            type: 'integer'
          },
          value: {
            type: 'string'
          }
        },
        origin: '#/properties/array/items'
      }
    }
    generateSqlSchema('pg', entities)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'CREATE TABLE collection (' +
        '\n\tidA BIGINT NOT NULL,' +
        '\n\tidB BIGINT NOT NULL,' +
        '\n\tCONSTRAINT collection_primary PRIMARY KEY (idA, idB),' +
        '\n\tCONSTRAINT collection_unique UNIQUE (idA, idB)' +
        '\n);\n' +
        'CREATE TABLE "collection/array[@]" (' +
        '\n\t"$collection~idA" BIGINT NOT NULL,' +
        '\n\t"$collection~idB" BIGINT NOT NULL,' +
        '\n\totherId BIGINT NOT NULL,' +
        '\n\tvalue TEXT NULL,' +
        '\n\tCONSTRAINT "collection/array[@]_primary" PRIMARY KEY ("$collection~idA", "$collection~idB", otherId),' +
        '\n\tCONSTRAINT "collection/array[@]_unique" UNIQUE ("$collection~idA", "$collection~idB", otherId),' +
        '\n\tCONSTRAINT "collection/array[@]_ref0" FOREIGN KEY ("$collection~idA", "$collection~idB")' +
        '\n\t\tREFERENCES collection (idA, idB)' +
        '\n\t\tON DELETE CASCADE' +
        '\n\t\tON UPDATE CASCADE' +
        '\n)')
  })

  it('generates SQL schema for entities (complex)', () => {
    const entities = {
      collection: {
        fields: {
          id: {
            identity: true,
            type: 'integer'
          }
        },
        relations: {
          'collection/complexObject': 'one-to-one'
        },
        origin: '#'
      },
      'collection/complexObject': {
        fields: {
          '$collection~id': {
            identity: true,
            type: 'integer',
            reference: {
              entity: 'collection',
              field: 'id',
              depth: 1
            },
            relation: {
              entity: 'collection',
              field: 'id'
            }
          },
          otherSimpleProperty: {
            type: 'integer'
          }
        },
        origin: '#/properties/complexObject',
        foreignFields: [
          '$collection~id'
        ]
      }
    }
    generateSqlSchema('pg', entities)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'CREATE TABLE collection (' +
        '\n\tid BIGINT NOT NULL,' +
        '\n\tCONSTRAINT collection_primary PRIMARY KEY (id),' +
        '\n\tCONSTRAINT collection_unique UNIQUE (id)' +
        '\n);\n' +
        'CREATE TABLE "collection/complexObject" (' +
        '\n\t"$collection~id" BIGINT NOT NULL,' +
        '\n\totherSimpleProperty BIGINT NULL,' +
        '\n\tCONSTRAINT "collection/complexObject_primary" PRIMARY KEY ("$collection~id"),' +
        '\n\tCONSTRAINT "collection/complexObject_unique" UNIQUE ("$collection~id"),' +
        '\n\tCONSTRAINT "collection/complexObject_ref0" FOREIGN KEY ("$collection~id")' +
        '\n\t\tREFERENCES collection (id)' +
        '\n\t\tON DELETE CASCADE' +
        '\n\t\tON UPDATE CASCADE' +
        '\n)')
  })

  it('generates SQL schema for entities (complex with additionalProperties)', () => {
    const entities = {
      collection: {
        fields: {
          id: {
            identity: true,
            type: 'integer'
          }
        },
        origin: '#',
        relations: {
          'collection/complexObject': 'one-to-one'
        }
      },
      'collection/complexObject': {
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
          }
        },
        origin: '#/properties/complexObject',
        relations: {
          'collection/complexObject[@0]': 'one-to-many'
        }
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
          required: ['$property'],
          type: 'object'
        },
        fields: {
          '$collection~id': {
            identity: true,
            reference: {
              depth: 2,
              entity: 'collection',
              field: 'id'
            },
            relation: {
              entity: 'collection/complexObject',
              field: '$collection~id'
            },
            type: 'integer'
          },
          $property: {
            identity: true,
            type: 'string'
          },
          $value: {
            nullable: true,
            type: 'json'
          }
        },
        origin: '#/properties/complexObject/additionalProperties'
      }
    }
    generateSqlSchema('pg', entities)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'CREATE TABLE collection (' +
        '\n\tid BIGINT NOT NULL,' +
        '\n\tCONSTRAINT collection_primary PRIMARY KEY (id),' +
        '\n\tCONSTRAINT collection_unique UNIQUE (id)' +
        '\n);\n' +
        'CREATE TABLE "collection/complexObject" (' +
        '\n\t"$collection~id" BIGINT NOT NULL,' +
        '\n\tCONSTRAINT "collection/complexObject_primary" PRIMARY KEY ("$collection~id"),' +
        '\n\tCONSTRAINT "collection/complexObject_unique" UNIQUE ("$collection~id"),' +
        '\n\tCONSTRAINT "collection/complexObject_ref0" FOREIGN KEY ("$collection~id")' +
        '\n\t\tREFERENCES collection (id)' +
        '\n\t\tON DELETE CASCADE' +
        '\n\t\tON UPDATE CASCADE' +
        '\n);\n' +
        'CREATE TABLE "collection/complexObject[@0]" (' +
        '\n\t"$collection~id" BIGINT NOT NULL,' +
        '\n\t"$property" TEXT NOT NULL,' +
        '\n\t"$value" JSON NULL,' +
        '\n\tCONSTRAINT "collection/complexObject[@0]_primary" PRIMARY KEY ("$collection~id", "$property"),' +
        '\n\tCONSTRAINT "collection/complexObject[@0]_unique" UNIQUE ("$collection~id", "$property"),' +
        '\n\tCONSTRAINT "collection/complexObject[@0]_ref0" FOREIGN KEY ("$collection~id")' +
        '\n\t\tREFERENCES "collection/complexObject" ("$collection~id")' +
        '\n\t\tON DELETE CASCADE' +
        '\n\t\tON UPDATE CASCADE' +
        '\n)')
  })
})
