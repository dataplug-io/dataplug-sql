/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const knex = require('knex')
const { PassThrough } = require('stream')
const { SqlStreamWriter } = require('../lib')

const postgres = knex({
  client: 'postgres'
})

describe('SqlStreamWriter', () => {
  it('handles empty input stream (single transaction)', (done) => {
    const input = new PassThrough({ objectMode: true })
    const writer = new SqlStreamWriter(postgres, true)
    input
      .pipe(writer)
      .on('finish', done)
    input.end()
  })
})
