/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const { SqlSerializer } = require('../lib')

describe('SqlSerializer', () => {
  describe('#serializeObject()', () => {
    it('serializes simple object properly', () => {
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
      new SqlSerializer('pg').serializeObject(object, 'collection', metadata)
        .map(query => query.toString())
        .join('; ')
        .should.be.equal('insert into "collection" ("property") values (\'value\')')
    })

    it('serializes simple object properly (do upsert)', () => {
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
        .join('; ')
        .should.be.equal('insert into "collection" ("property", "value") values (\'key\', \'value\') ON CONFLICT ("property") DO UPDATE SET "value" = excluded."value"')
    })

    it('serializes simple object properly (do not upsert)', () => {
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
        .join('; ')
        .should.be.equal('insert into "collection" ("property") values (\'value\') ON CONFLICT DO NOTHING')
    })

    it('serializes 2 related entities in parent-first order', () => {
      const data = {
        'collection/array[@]': [
          { id: 42, $value: 0 },
          { id: 42, $value: 1 },
          { id: 42, $value: 1 },
          { id: 42, $value: 2 },
          { id: 42, $value: 3 },
          { id: 42, $value: 5 },
          { id: 42, $value: 8 },
          { id: 42, $value: 13 },
          { id: 42, $value: 21 },
          { id: 42, $value: 34 }
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
            $value: {
              type: 'integer',
              reference: {
                field: ''
              }
            }
          },
          origin: '#/properties/array/items'
        }
      }
      new SqlSerializer('pg').serializeData(data, undefined, metadata)
        .map(query => query.toString())
        .should.be.deep.equal([
          'insert into "collection" ("id") values (42)',
          'insert into "collection/array[@]" ("$value", "id") values (0, 42)',
          'insert into "collection/array[@]" ("$value", "id") values (1, 42)',
          'insert into "collection/array[@]" ("$value", "id") values (1, 42)',
          'insert into "collection/array[@]" ("$value", "id") values (2, 42)',
          'insert into "collection/array[@]" ("$value", "id") values (3, 42)',
          'insert into "collection/array[@]" ("$value", "id") values (5, 42)',
          'insert into "collection/array[@]" ("$value", "id") values (8, 42)',
          'insert into "collection/array[@]" ("$value", "id") values (13, 42)',
          'insert into "collection/array[@]" ("$value", "id") values (21, 42)',
          'insert into "collection/array[@]" ("$value", "id") values (34, 42)'
        ])
    })
  })
})
