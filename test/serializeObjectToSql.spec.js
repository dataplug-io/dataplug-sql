/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const knex = require('knex')
const { serializeObjectToSql } = require('../lib')

const pg = knex({ client: 'postgres' })

describe('serializeObjectToSql()', () => {
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
    serializeObjectToSql(object, metadata, pg, 'collection')
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
    serializeObjectToSql(object, metadata, pg, 'collection', false, true)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('insert into "collection" ("property", "value") values (\'key\', \'value\') ON CONFLICT DO UPDATE SET "collection"."value" = excluded."value"')
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
    serializeObjectToSql(object, metadata, pg, 'collection', false, false)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('insert into "collection" ("property") values (\'value\') ON CONFLICT DO NOTHING')
  })
})
