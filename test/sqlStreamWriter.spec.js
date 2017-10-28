/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const { SqlStreamWriter } = require('../lib')

describe('SqlStreamWriter', () => {
  it('emits SQL to output stream', (done) => {
    const writer = new SqlStreamWriter('postgres', 'collection', false)
    new Promise((resolve, reject) => {
      let data = ''
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => { data += chunk })
    })
      .should.eventually.be.equal('insert into "collection" ("property") values (\'value\');')
      .and.notify(done)

    writer.write({property: 'value'})
    writer.end()
  })
})
