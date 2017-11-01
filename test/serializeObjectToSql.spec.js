/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const knex = require('knex')
const { serializeObjectToSql } = require('../lib')

const pg = knex({ client: 'postgres' })

describe('serializeObjectToSql()', () => {
  it('serializes simple object properly', () => {
    serializeObjectToSql(pg, 'collection', { property: 'value' })
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('insert into "collection" ("property") values (\'value\')')
  })

  it('serializes simple object properly (do upsert)', () => {
    serializeObjectToSql(pg, 'collection', { property: 'value' }, true)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('insert into "collection" ("property") values (\'value\') ON CONFLICT DO UPDATE SET "collection"."property" = excluded."property"')
  })

  it('serializes simple object properly (do not upsert)', () => {
    serializeObjectToSql(pg, 'collection', { property: 'value' }, false)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('insert into "collection" ("property") values (\'value\') ON CONFLICT DO NOTHING')
  })
})
