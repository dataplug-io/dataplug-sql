/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const logger = require('winston')
const { SqlSerializerStream } = require('../lib')

logger.clear()

describe('SqlSerializerStream', () => {
  it('emits SQL using metadata from data to output stream', (done) => {
    const writer = new SqlSerializerStream('postgres', 'collection:')
    new Promise((resolve, reject) => {
      let data = []
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => data.push(...chunk))
    })
      .should.eventually.be.deep.equal([
        'INSERT INTO "collection:entity" (\n\tproperty\n\t) VALUES (\n\t\'value\'\n\t)'
      ])
      .and.notify(done)

    writer.write({
      entity: {
        metadata: {
          fields: {
            property: {
              type: 'string',
              identity: true
            }
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
    const writer = new SqlSerializerStream('postgres', 'collection:', undefined, {
      abortOnError: true
    })
    new Promise((resolve, reject) => {
      let data = []
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => data.push(...chunk))

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
      prologue: (serializer, tableName, metadata, queries) => {
        queries.push('PROLOGUE')
      },
      epilogue: (serializer, tableName, metadata, queries) => {
        queries.push('EPILOGUE')
      }
    })
    new Promise((resolve, reject) => {
      let data = []
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => data.push(...chunk))
    })
      .should.eventually.be.deep.equal([
        'PROLOGUE',
        'INSERT INTO "collection:entity" (\n\tproperty\n\t) VALUES (\n\t\'value\'\n\t)',
        'EPILOGUE'
      ])
      .and.notify(done)

    writer.write({
      entity: {
        metadata: {
          fields: {
            property: {
              type: 'string',
              identity: true
            }
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
        .on('data', (chunk) => data.push(...chunk))
    })
      .should.eventually.be.deep.equal([
        'TRUNCATE "collection:entity"',
        'INSERT INTO "collection:entity" (\n\tproperty\n\t) VALUES (\n\t\'value\'\n\t)'
      ])
      .and.notify(done)

    writer.write({
      entity: {
        metadata: {
          fields: {
            property: {
              type: 'string',
              identity: true
            }
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
        .on('data', (chunk) => data.push(...chunk))
    })
      .should.eventually.be.deep.equal([
        'UPDATE "collection:entity"\n\tSET\n\t\tproperty = NULL',
        'INSERT INTO "collection:entity" (\n\tproperty\n\t) VALUES (\n\t\'value\'\n\t)'
      ])
      .and.notify(done)

    writer.write({
      entity: {
        metadata: {
          fields: {
            property: {
              type: 'string',
              identity: true
            }
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
        .on('data', (chunk) => data.push(...chunk))
    })
      .should.eventually.be.deep.equal([
        'UPDATE "collection:entity"\n\tSET\n\t\tproperty = NULL',
        'INSERT INTO "collection:entity" (\n\tproperty\n\t) VALUES (\n\t\'value\'\n\t)',
        'UPDATE "collection:entity"\n\tSET\n\t\tproperty = \'override\''
      ])
      .and.notify(done)

    writer.write({
      entity: {
        metadata: {
          fields: {
            property: {
              type: 'string',
              identity: true
            }
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
