/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const { SqlStreamWriter } = require('../lib')

describe('SqlStreamWriter', () => {
  it('emits SQL using metadata from data to output stream', (done) => {
    const writer = new SqlStreamWriter('postgres', 'collection:')
    new Promise((resolve, reject) => {
      let data = ''
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => { data += chunk })
    })
      .should.eventually.be.equal('insert into "collection:entity" ("property") values (\'value\');')
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
    const writer = new SqlStreamWriter('postgres', 'collection:')
    new Promise((resolve, reject) => {
      let data = ''
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => { data += chunk })

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
})
