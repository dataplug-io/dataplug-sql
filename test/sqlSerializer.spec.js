/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const logger = require('winston')
const { SqlSerializer } = require('../lib')

logger.clear()

describe('SqlSerializer', () => {
  it('serializes basic data', () => {
    const metadata = {
      collection: {
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
        },
        origin: '#'
      }
    }
    const data = {
      collection: [{
        booleanProperty: true,
        integerProperty: 0,
        stringProperty: 'value',
        enumProperty: 'option1',
        objectProperty: {}
      }]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tbooleanProperty,' +
        '\n\tintegerProperty,' +
        '\n\tstringProperty,' +
        '\n\tenumProperty,' +
        '\n\tobjectProperty' +
        '\n\t) VALUES (' +
        '\n\tTRUE,' +
        '\n\t0,' +
        '\n\t\'value\',' +
        '\n\t\'option1\',' +
        '\n\t\'{}\'::json' +
        '\n\t)')
  })

  it('serializes basic data with defaults', () => {
    const metadata = {
      collection: {
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
        },
        origin: '#'
      }
    }
    const data = {
      collection: [{
        booleanProperty: true,
        integerProperty: 0,
        stringProperty: 'value',
        enumProperty: 'option1',
        objectProperty: {}
      }]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tbooleanProperty,' +
        '\n\tintegerProperty,' +
        '\n\tstringProperty,' +
        '\n\tenumProperty,' +
        '\n\tobjectProperty' +
        '\n\t) VALUES (' +
        '\n\tTRUE,' +
        '\n\t0,' +
        '\n\t\'value\',' +
        '\n\t\'option1\',' +
        '\n\t\'{}\'::json' +
        '\n\t)')
  })

  it('serializes basic data with nullables', () => {
    const metadata = {
      collection: {
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
        },
        origin: '#'
      }
    }
    const data = {
      collection: [{
        booleanProperty: null,
        integerProperty: null,
        stringProperty: null,
        enumProperty: null,
        objectProperty: null
      }]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tbooleanProperty,' +
        '\n\tintegerProperty,' +
        '\n\tstringProperty,' +
        '\n\tenumProperty,' +
        '\n\tobjectProperty' +
        '\n\t) VALUES (' +
        '\n\tNULL,' +
        '\n\tNULL,' +
        '\n\tNULL,' +
        '\n\tNULL,' +
        '\n\tNULL' +
        '\n\t)')
  })

  it('serializes basic data with basic arrays', () => {
    const metadata = {
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
    const data = {
      collection: [{
        identityProperty: 42,
        booleanProperty: [true],
        integerProperty: [0],
        stringProperty: ['value'],
        enumProperty: ['option1'],
        objectProperty: [{}]
      }]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tidentityProperty,' +
        '\n\tbooleanProperty,' +
        '\n\tintegerProperty,' +
        '\n\tstringProperty,' +
        '\n\tenumProperty,' +
        '\n\tobjectProperty' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\tARRAY[TRUE]::BOOLEAN[],' +
        '\n\tARRAY[0]::BIGINT[],' +
        '\n\tARRAY[\'value\']::TEXT[],' +
        '\n\tARRAY[\'option1\']::TEXT[],' +
        '\n\tARRAY[\'{}\'::json]::JSON[]' +
        '\n\t)')
  })

  it('serializes data with nullable complex property', () => {
    const metadata = {
      collection: {
        fields: {
          id: {
            identity: true,
            type: 'integer'
          }
        },
        origin: '#',
        relations: {
          'collection/complex': 'one-to-one'
        }
      },
      'collection/complex': {
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
          property: {
            type: 'string'
          }
        },
        origin: '#/properties/complex'
      }
    }
    const data = {
      collection: [{
        id: 42
      }]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tid' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t)')
  })

  it('serializes data with basic nullable array', () => {
    const metadata = {
      collection: {
        fields: {
          id: {
            identity: true,
            type: 'integer'
          },
          array: {
            type: 'integer[]',
            nullable: true
          }
        },
        origin: '#'
      }
    }
    const data = {
      collection: [{
        id: 42,
        array: null
      }]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tid,' +
        '\n\t"array"' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\tNULL' +
        '\n\t)')
  })

  it('serializes data with complex array', () => {
    const metadata = {
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
    const data = {
      collection: [{
        id: 42
      }],
      'collection/array[@]': [{
        '$collection~id': 42,
        otherId: 1,
        value: 'value'
      }]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tid' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/array[@]" (' +
        '\n\t"$collection~id",' +
        '\n\totherId,' +
        '\n\tvalue' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t1,' +
        '\n\t\'value\'' +
        '\n\t)')
  })

  it('serializes complex data', () => {
    const metadata = {
      collection: {
        fields: {
          simpleProperty: {
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
        origin: '#/properties/complexObject'
      }
    }
    const data = {
      collection: [{
        simpleProperty: 0
      }],
      'collection/complexObject': [{
        '$collection~simpleProperty': 0,
        otherSimpleProperty: 0
      }]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tsimpleProperty' +
        '\n\t) VALUES (' +
        '\n\t0' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t"$collection~simpleProperty",' +
        '\n\totherSimpleProperty' +
        '\n\t) VALUES (' +
        '\n\t0,' +
        '\n\t0' +
        '\n\t)')
  })

  it('serializes complex data with default additionalProperties', () => {
    const metadata = {
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
            type: 'string',
            reference: {
              fieldName: true
            }
          },
          $value: {
            nullable: true,
            type: 'json',
            reference: {
              field: ''
            }
          }
        },
        origin: '#/properties/complexObject/additionalProperties'
      }
    }
    const data = {
      collection: [{
        id: 42
      }],
      'collection/complexObject': [{
        '$collection~id': 42
      }],
      'collection/complexObject[@0]': [
        { '$collection~id': 42, $property: 'booleanProperty', $value: true },
        { '$collection~id': 42, $property: 'integerProperty', $value: 0 },
        { '$collection~id': 42, $property: 'stringProperty', $value: 'value' },
        { '$collection~id': 42, $property: 'enumProperty', $value: 'option1' },
        { '$collection~id': 42, $property: 'objectProperty', $value: {} }
      ]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tid' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t"$collection~id"' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'booleanProperty\',' +
        '\n\t\'true\'::json' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'integerProperty\',' +
        '\n\t\'0\'::json' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'stringProperty\',' +
        '\n\t\'"value"\'::json' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'enumProperty\',' +
        '\n\t\'"option1"\'::json' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'objectProperty\',' +
        '\n\t\'{}\'::json' +
        '\n\t)')
  })

  it('serializes complex data with basic custom additionalProperties', () => {
    const metadata = {
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
            type: 'string',
            reference: {
              fieldName: true
            }
          },
          $value: {
            type: 'integer',
            reference: {
              field: ''
            }
          }
        },
        origin: '#/properties/complexObject/additionalProperties'
      }
    }
    const data = {
      collection: [{
        id: 42
      }],
      'collection/complexObject': [{
        '$collection~id': 42
      }],
      'collection/complexObject[@0]': [
        { '$collection~id': 42, $property: 'integerProperty0', $value: 0 },
        { '$collection~id': 42, $property: 'integerProperty1', $value: 1 }
      ]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tid' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t"$collection~id"' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'integerProperty0\',' +
        '\n\t0' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'integerProperty1\',' +
        '\n\t1' +
        '\n\t)')
  })

  it('serializes complex data with complex custom additionalProperties', () => {
    const metadata = {
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
            type: 'string',
            reference: {
              fieldName: true
            }
          },
          otherValue: {
            type: 'integer'
          }
        },
        origin: '#/properties/complexObject/additionalProperties'
      }
    }
    const data = {
      collection: [{
        id: 42
      }],
      'collection/complexObject': [{
        '$collection~id': 42
      }],
      'collection/complexObject[@0]': [
        { '$collection~id': 42, $property: 'objectProperty0', otherValue: 0 },
        { '$collection~id': 42, $property: 'objectProperty1', otherValue: 1 }
      ]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tid' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t"$collection~id"' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\totherValue' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'objectProperty0\',' +
        '\n\t0' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\totherValue' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'objectProperty1\',' +
        '\n\t1' +
        '\n\t)')
  })

  it('serializes complex data with basic custom patternProperties', () => {
    const metadata = {
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
            type: 'string',
            reference: {
              fieldName: true
            }
          },
          $value: {
            type: 'integer',
            reference: {
              field: ''
            }
          }
        },
        origin: '#/properties/complexObject/patternProperties/^.*$'
      }
    }
    const data = {
      collection: [{
        id: 42
      }],
      'collection/complexObject': [{
        '$collection~id': 42
      }],
      'collection/complexObject[@0]': [
        { '$collection~id': 42, $property: 'integerProperty0', $value: 0 },
        { '$collection~id': 42, $property: 'integerProperty1', $value: 1 }
      ]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tid' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t"$collection~id"' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'integerProperty0\',' +
        '\n\t0' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'integerProperty1\',' +
        '\n\t1' +
        '\n\t)')
  })

  it('serializes complex data with complex custom patternProperties', () => {
    const metadata = {
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
            type: 'string',
            reference: {
              fieldName: true
            }
          },
          otherValue: {
            type: 'integer'
          }
        },
        origin: '#/properties/complexObject/patternProperties/^.*$'
      }
    }
    const data = {
      collection: [{
        id: 42
      }],
      'collection/complexObject': [{
        '$collection~id': 42
      }],
      'collection/complexObject[@0]': [
        { '$collection~id': 42, $property: 'objectProperty0', otherValue: 0 },
        { '$collection~id': 42, $property: 'objectProperty1', otherValue: 1 }
      ]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tid' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t"$collection~id"' +
        '\n\t) VALUES (' +
        '\n\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\totherValue' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'objectProperty0\',' +
        '\n\t0' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t"$collection~id",' +
        '\n\t"$property",' +
        '\n\totherValue' +
        '\n\t) VALUES (' +
        '\n\t42,' +
        '\n\t\'objectProperty1\',' +
        '\n\t1' +
        '\n\t)')
  })

  it('supports "delete-by-identity"', () => {
    const object = {
      property: 'value'
    }
    const metadata = {
      fields: {
        property: {
          type: 'string',
          identity: true
        }
      }
    }
    new SqlSerializer('pg', { preprocessor: 'delete-by-identity' }).serializeObject(object, 'collection', metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'DELETE FROM collection' +
        '\n\tWHERE' +
        '\n\t\tproperty = \'value\';\n' +
        'INSERT INTO collection (' +
        '\n\tproperty' +
        '\n\t) VALUES (' +
        '\n\t\'value\'' +
        '\n\t)')
  })

  it('supports "update-on-conflict"', () => {
    const object = {
      property: 'key',
      value: 'value'
    }
    const metadata = {
      fields: {
        property: {
          type: 'string',
          identity: true
        },
        value: {
          type: 'string'
        }
      }
    }
    new SqlSerializer('pg', { postprocessor: 'update-on-conflict' }).serializeObject(object, 'collection', metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tproperty,' +
        '\n\tvalue' +
        '\n\t) VALUES (' +
        '\n\t\'key\',' +
        '\n\t\'value\'' +
        '\n\t)' +
        '\n\tON CONFLICT (' +
        '\n\t\tproperty' +
        '\n\t) DO UPDATE SET' +
        '\n\t\tvalue = excluded.value')
  })

  it('supports "skip-on-conflict"', () => {
    const object = {
      property: 'value'
    }
    const metadata = {
      fields: {
        property: {
          type: 'string',
          identity: true
        }
      }
    }
    new SqlSerializer('pg', { postprocessor: 'skip-on-conflict' }).serializeObject(object, 'collection', metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\tproperty' +
        '\n\t) VALUES (' +
        '\n\t\'value\'' +
        '\n\t)' +
        '\n\tON CONFLICT DO NOTHING')
  })

  it('serializes 2 related entities in parent-first order', () => {
    const data = {
      'collection/array[@]': [
        { '$collection~id': 42, otherId: 1, value: 0 },
        { '$collection~id': 42, otherId: 2, value: 1 },
        { '$collection~id': 42, otherId: 3, value: 1 },
        { '$collection~id': 42, otherId: 4, value: 2 },
        { '$collection~id': 42, otherId: 5, value: 3 },
        { '$collection~id': 42, otherId: 6, value: 5 },
        { '$collection~id': 42, otherId: 7, value: 8 },
        { '$collection~id': 42, otherId: 8, value: 13 },
        { '$collection~id': 42, otherId: 9, value: 21 }
      ],
      collection: [{
        id: 42
      }]
    }
    const metadata = {
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
            type: 'integer'
          }
        },
        origin: '#/properties/array/items'
      }
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .should.be.deep.equal([
        'INSERT INTO collection (\n\tid\n\t) VALUES (\n\t42\n\t)',
        'INSERT INTO "collection/array[@]" (\n\t"$collection~id",\n\totherId,\n\tvalue\n\t) VALUES (\n\t42,\n\t1,\n\t0\n\t)',
        'INSERT INTO "collection/array[@]" (\n\t"$collection~id",\n\totherId,\n\tvalue\n\t) VALUES (\n\t42,\n\t2,\n\t1\n\t)',
        'INSERT INTO "collection/array[@]" (\n\t"$collection~id",\n\totherId,\n\tvalue\n\t) VALUES (\n\t42,\n\t3,\n\t1\n\t)',
        'INSERT INTO "collection/array[@]" (\n\t"$collection~id",\n\totherId,\n\tvalue\n\t) VALUES (\n\t42,\n\t4,\n\t2\n\t)',
        'INSERT INTO "collection/array[@]" (\n\t"$collection~id",\n\totherId,\n\tvalue\n\t) VALUES (\n\t42,\n\t5,\n\t3\n\t)',
        'INSERT INTO "collection/array[@]" (\n\t"$collection~id",\n\totherId,\n\tvalue\n\t) VALUES (\n\t42,\n\t6,\n\t5\n\t)',
        'INSERT INTO "collection/array[@]" (\n\t"$collection~id",\n\totherId,\n\tvalue\n\t) VALUES (\n\t42,\n\t7,\n\t8\n\t)',
        'INSERT INTO "collection/array[@]" (\n\t"$collection~id",\n\totherId,\n\tvalue\n\t) VALUES (\n\t42,\n\t8,\n\t13\n\t)',
        'INSERT INTO "collection/array[@]" (\n\t"$collection~id",\n\totherId,\n\tvalue\n\t) VALUES (\n\t42,\n\t9,\n\t21\n\t)'
      ])
  })
})
