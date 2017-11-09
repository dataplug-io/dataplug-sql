/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const knex = require('knex')
const { SqlCommandsWriter } = require('../lib')

const postgres = knex({
  client: 'postgres'
})

describe('SqlCommandsWriter', () => {
  it('emits SQL commands', (done) => {
    const writer = new SqlCommandsWriter('postgres')
    new Promise((resolve, reject) => {
      let data = []
      writer
        .on('end', () => resolve(data))
        .on('error', reject)
        .on('data', (chunk) => data.push(chunk.toString()))
    })
      .should.eventually.be.deep.equal([
        'insert into "collection:entity" ("property") values (\'value\');',
        'insert into "collection:entity" ("property") values (\'value\');'
      ])
      .and.notify(done)

    writer.write(postgres('collection:entity').insert({ property: 'value' }).toSQL())
    writer.write('insert into "collection:entity" ("property") values (\'value\')')
    writer.end()
  })
})
