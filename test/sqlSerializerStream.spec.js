/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const knex = require('knex')
const { SqlSerializerStream } = require('../lib')

const postgres = knex({
  client: 'postgres'
})

describe('SqlSerializerStream', () => {
  it('emits SQL using metadata from data to output stream', (done) => {
    const writer = new SqlSerializerStream('postgres', 'collection:')
    new Promise((resolve, reject) => {
      let data = []
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => {
          let queries = chunk
          queries = queries.map(query => postgres.raw().set(query.sql, query.bindings).toString())
          data = data.concat(queries)
        })
    })
      .should.eventually.be.deep.equal(['insert into "collection:entity" ("property") values (\'value\')'])
      .and.notify(done)

    writer.write({
      entity: {
        metadata: {
          property: {
            type: 'string',
            identity: true
          }
        },
        data: [{
          property: 'value'
        }]
      }
    })
    writer.end()
  })

  it('rejects without metadata', (done) => {
    const writer = new SqlSerializerStream('postgres', 'collection:')
    new Promise((resolve, reject) => {
      let data = []
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => {
          let queries = chunk
          queries = queries.map(query => postgres.raw().set(query.sql, query.bindings).toString())
          data = data.concat(queries)
        })

      writer.write({
        entity: [{
          property: 'value'
        }]
      })
      writer.end()
    })
      .should.eventually.be.rejectedWith(/No metadata/)
      .and.notify(done)
  })

  it('supports epilogue and prologue', (done) => {
    const writer = new SqlSerializerStream('postgres', 'collection:', undefined, {
      prologue: (dbClient, entityName, queries) => {
        queries.push(dbClient.truncate())
      },
      epilogue: (dbClient, entityName, queries) => {
        queries.push(dbClient.update({ property: 'otherValue' }))
      }
    })
    new Promise((resolve, reject) => {
      let data = []
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => {
          let queries = chunk
          queries = queries.map(query => postgres.raw().set(query.sql, query.bindings).toString())
          data = data.concat(queries)
        })
    })
      .should.eventually.be.deep.equal([
        'truncate "collection:entity" restart identity',
        'insert into "collection:entity" ("property") values (\'value\')',
        'update "collection:entity" set "property" = \'otherValue\''
      ])
      .and.notify(done)

    writer.write({
      entity: {
        metadata: {
          property: {
            type: 'string',
            identity: true
          }
        },
        data: [{
          property: 'value'
        }]
      }
    })
    writer.end()
  })

  it('supports \'truncate\' prologue', (done) => {
    const writer = new SqlSerializerStream('postgres', 'collection:', undefined, {
      prologue: 'truncate'
    })
    new Promise((resolve, reject) => {
      let data = []
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => {
          let queries = chunk
          queries = queries.map(query => postgres.raw().set(query.sql, query.bindings).toString())
          data = data.concat(queries)
        })
    })
      .should.eventually.be.deep.equal([
        'truncate "collection:entity" restart identity',
        'insert into "collection:entity" ("property") values (\'value\')'
      ])
      .and.notify(done)

    writer.write({
      entity: {
        metadata: {
          property: {
            type: 'string',
            identity: true
          }
        },
        data: [{
          property: 'value'
        }]
      }
    })
    writer.end()
  })

  it('supports update prologue', (done) => {
    const writer = new SqlSerializerStream('postgres', 'collection:', undefined, {
      prologue: { property: null }
    })
    new Promise((resolve, reject) => {
      let data = []
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => {
          let queries = chunk
          queries = queries.map(query => postgres.raw().set(query.sql, query.bindings).toString())
          data = data.concat(queries)
        })
    })
      .should.eventually.be.deep.equal([
        'update "collection:entity" set "property" = NULL',
        'insert into "collection:entity" ("property") values (\'value\')'
      ])
      .and.notify(done)

    writer.write({
      entity: {
        metadata: {
          property: {
            type: 'string',
            identity: true
          }
        },
        data: [{
          property: 'value'
        }]
      }
    })
    writer.end()
  })

  it('throws on unsupported prologue', () => {
    (() => new SqlSerializerStream('postgres', 'collection:', undefined, {
      prologue: 'unsupported'
    }))
      .should.throw(/not a supported prologue/)
  })

  it('supports update epilogue', (done) => {
    const writer = new SqlSerializerStream('postgres', 'collection:', undefined, {
      prologue: { property: null },
      epilogue: { property: 'override' }
    })
    new Promise((resolve, reject) => {
      let data = []
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => {
          let queries = chunk
          queries = queries.map(query => postgres.raw().set(query.sql, query.bindings).toString())
          data = data.concat(queries)
        })
    })
      .should.eventually.be.deep.equal([
        'update "collection:entity" set "property" = NULL',
        'insert into "collection:entity" ("property") values (\'value\')',
        'update "collection:entity" set "property" = \'override\''
      ])
      .and.notify(done)

    writer.write({
      entity: {
        metadata: {
          property: {
            type: 'string',
            identity: true
          }
        },
        data: [{
          property: 'value'
        }]
      }
    })
    writer.end()
  })

  it('throws on unsupported epilogue', () => {
    (() => new SqlSerializerStream('postgres', 'collection:', undefined, {
      epilogue: 'unsupported'
    }))
      .should.throw(/not a supported epilogue/)
  })
})
