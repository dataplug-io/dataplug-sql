/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const knex = require('knex')
const { serializeContainerToSql } = require('../lib')

const pg = knex({ client: 'postgres' })

describe('serializeContainerToSql()', () => {
  it('fails on fake flat object with scalar value', () => {
    (() => {
      serializeContainerToSql(pg, 'collection', { '': 'value' })
    }).should.throw(/not an entity/)
  })

  it('fails on fake flat object with array value', () => {
    (() => {
      serializeContainerToSql(pg, 'collection', { '': [[]] })
    }).should.throw(/instance is invalid/)
  })

  it('fails on fake flat object with function value', () => {
    (() => {
      serializeContainerToSql(pg, 'collection', { '': () => {} })
    }).should.throw(/not an entity/)
  })

  it('serializes single-entity flat object properly', () => {
    serializeContainerToSql(pg, 'collection', { '': [{ property: 'value' }] })
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('insert into "collection" ("property") values (\'value\')')
  })

  it('serializes multi-entity flat object properly', () => {
    const object = {
      '': [{ property: 'value' }],
      'entityA': [{ propertyA: 'valueA' }],
      'entityB': [{ propertyB: 'valueB' }]
    }
    serializeContainerToSql(pg, 'collection', object)
      .map(query => query.toString())
      .join('; ')
      .should.be.equal('insert into "collection" ("property") values (\'value\'); insert into "collection_entityA" ("propertyA") values (\'valueA\'); insert into "collection_entityB" ("propertyB") values (\'valueB\')')
  })
})
