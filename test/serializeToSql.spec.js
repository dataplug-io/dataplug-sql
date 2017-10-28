/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const knex = require('knex')
const { serializeToSql } = require('../lib')

const pg = knex({ client: 'postgres' })

describe('serializeToSql()', () => {
  it('serializes simple object properly', () => {
    serializeToSql(pg, 'collection', { property: 'value' })
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('insert into "collection" ("property") values (\'value\')')
  })

  it('fails on fake flat object with scalar value', () => {
    (() => {
      serializeToSql(pg, 'collection', { '': 'value' })
    }).should.throw(/not a plain object/)
  })

  it('fails on fake flat object with array value', () => {
    (() => {
      serializeToSql(pg, 'collection', { '': [] })
    }).should.throw(/not a plain object/)
  })

  it('fails on fake flat object with function value', () => {
    (() => {
      serializeToSql(pg, 'collection', { '': () => {} })
    }).should.throw(/not a plain object/)
  })

  it('serializes single-entity flat object properly', () => {
    serializeToSql(pg, 'collection', { '': { property: 'value' } })
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('insert into "collection" ("property") values (\'value\')')
  })

  it('serializes multi-entity flat object properly', () => {
    const object = {
      '': { property: 'value' },
      'entityA': { propertyA: 'valueA' },
      'entityB': { propertyB: 'valueB' }
    }
    serializeToSql(pg, 'collection', object)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('insert into "collection" ("property") values (\'value\'); insert into "collection_entityA" ("propertyA") values (\'valueA\'); insert into "collection_entityB" ("propertyB") values (\'valueB\')')
  })
})
