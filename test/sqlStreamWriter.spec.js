/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const { PassThrough } = require('stream')
const logger = require('winston')
const { SqlStreamWriter } = require('../lib')

logger.clear()

describe('SqlStreamWriter', () => {
  it('handles empty input stream (single transaction)', (done) => {
    const input = new PassThrough({ objectMode: true })
    const writer = new SqlStreamWriter('postgres://', true)
    input
      .pipe(writer)
      .on('finish', done)
    input.end()
  })

  it('handles empty input stream (multiple transactions)', (done) => {
    const input = new PassThrough({ objectMode: true })
    const writer = new SqlStreamWriter('postgres://', false)
    input
      .pipe(writer)
      .on('finish', done)
    input.end()
  })
})
