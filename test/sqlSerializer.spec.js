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
        '\n\t\tbooleanProperty,' +
        '\n\t\tintegerProperty,' +
        '\n\t\tstringProperty,' +
        '\n\t\tenumProperty,' +
        '\n\t\tobjectProperty' +
        '\n\t) VALUES (' +
        '\n\t\tTRUE,' +
        '\n\t\t0,' +
        '\n\t\t\'value\',' +
        '\n\t\t\'option1\',' +
        '\n\t\t\'{}\'::json' +
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
        '\n\t\tbooleanProperty,' +
        '\n\t\tintegerProperty,' +
        '\n\t\tstringProperty,' +
        '\n\t\tenumProperty,' +
        '\n\t\tobjectProperty' +
        '\n\t) VALUES (' +
        '\n\t\tTRUE,' +
        '\n\t\t0,' +
        '\n\t\t\'value\',' +
        '\n\t\t\'option1\',' +
        '\n\t\t\'{}\'::json' +
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
        '\n\t\tbooleanProperty,' +
        '\n\t\tintegerProperty,' +
        '\n\t\tstringProperty,' +
        '\n\t\tenumProperty,' +
        '\n\t\tobjectProperty' +
        '\n\t) VALUES (' +
        '\n\t\tNULL,' +
        '\n\t\tNULL,' +
        '\n\t\tNULL,' +
        '\n\t\tNULL,' +
        '\n\t\tNULL' +
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
        '\n\t\tidentityProperty,' +
        '\n\t\tbooleanProperty,' +
        '\n\t\tintegerProperty,' +
        '\n\t\tstringProperty,' +
        '\n\t\tenumProperty,' +
        '\n\t\tobjectProperty' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\tARRAY[TRUE]::BOOLEAN[],' +
        '\n\t\tARRAY[0]::BIGINT[],' +
        '\n\t\tARRAY[\'value\']::TEXT[],' +
        '\n\t\tARRAY[\'option1\']::TEXT[],' +
        '\n\t\tARRAY[\'{}\'::json]::JSON[]' +
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
        '\n\t\tid' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
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
        '\n\t\tid,' +
        '\n\t\t"array"' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\tNULL' +
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
        '\n\t\tid' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/array[@]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\totherId,' +
        '\n\t\tvalue' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t1,' +
        '\n\t\t\'value\'' +
        '\n\t)')
  })

  it('serializes complex data', () => {
    const metadata = {
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
        origin: '#/properties/complexObject'
      }
    }
    const data = {
      collection: [{
        id: 0
      }],
      'collection/complexObject': [{
        '$collection~id': 0,
        otherSimpleProperty: 0
      }]
    }
    new SqlSerializer('pg').serializeData(data, undefined, metadata)
      .map(query => query.toString())
      .join(';\n')
      .should.be.equal(
        'INSERT INTO collection (' +
        '\n\t\tid' +
        '\n\t) VALUES (' +
        '\n\t\t0' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\totherSimpleProperty' +
        '\n\t) VALUES (' +
        '\n\t\t0,' +
        '\n\t\t0' +
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
        '\n\t\tid' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t\t"$collection~id"' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'booleanProperty\',' +
        '\n\t\t\'true\'::json' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'integerProperty\',' +
        '\n\t\t\'0\'::json' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'stringProperty\',' +
        '\n\t\t\'"value"\'::json' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'enumProperty\',' +
        '\n\t\t\'"option1"\'::json' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'objectProperty\',' +
        '\n\t\t\'{}\'::json' +
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
        '\n\t\tid' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t\t"$collection~id"' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'integerProperty0\',' +
        '\n\t\t0' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'integerProperty1\',' +
        '\n\t\t1' +
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
        '\n\t\tid' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t\t"$collection~id"' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\totherValue' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'objectProperty0\',' +
        '\n\t\t0' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\totherValue' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'objectProperty1\',' +
        '\n\t\t1' +
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
        '\n\t\tid' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t\t"$collection~id"' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'integerProperty0\',' +
        '\n\t\t0' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\t"$value"' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'integerProperty1\',' +
        '\n\t\t1' +
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
        '\n\t\tid' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject" (' +
        '\n\t\t"$collection~id"' +
        '\n\t) VALUES (' +
        '\n\t\t42' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\totherValue' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'objectProperty0\',' +
        '\n\t\t0' +
        '\n\t);\n' +
        'INSERT INTO "collection/complexObject[@0]" (' +
        '\n\t\t"$collection~id",' +
        '\n\t\t"$property",' +
        '\n\t\totherValue' +
        '\n\t) VALUES (' +
        '\n\t\t42,' +
        '\n\t\t\'objectProperty1\',' +
        '\n\t\t1' +
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
        '\n\t\tproperty' +
        '\n\t) VALUES (' +
        '\n\t\t\'value\'' +
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
        '\n\t\tproperty,' +
        '\n\t\tvalue' +
        '\n\t) VALUES (' +
        '\n\t\t\'key\',' +
        '\n\t\t\'value\'' +
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
        '\n\t\tproperty' +
        '\n\t) VALUES (' +
        '\n\t\t\'value\'' +
        '\n\t)' +
        '\n\tON CONFLICT DO NOTHING')
  })
})
