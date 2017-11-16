/* eslint-env node, mocha */
require('chai')
  .should()
const logger = require('winston')
const { Dialects } = require('../lib')

logger.clear()

describe('Dialects()', () => {
  it('has "isSupported" static method', () => {
    Dialects
      .should.have.property('isSupported')
      .that.is.an('function')
  })

  it('supports "pg" dialect', () => {
    Dialects.isSupported('pg')
      .should.be.equal(true)
  })

  it('supports "postgresql" dialect', () => {
    Dialects.isSupported('postgresql')
      .should.be.equal(true)
  })

  it('supports "postgres" dialect', () => {
    Dialects.isSupported('postgres')
      .should.be.equal(true)
  })
})
