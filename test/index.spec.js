/* eslint-env node, mocha */
require('chai')
  .should()
const dataplugSql = require('../lib')

describe('dataplug-sql', () => {
  it('has "generateSqlSchema" function', () => {
    dataplugSql
      .should.have.property('generateSqlSchema')
      .that.is.an('function')
  })

  it('has "SqlCommandsWriter" class', () => {
    dataplugSql
      .should.have.property('SqlCommandsWriter')
      .that.is.an('function')
  })

  it('has "SqlSerializerStream" class', () => {
    dataplugSql
      .should.have.property('SqlSerializerStream')
      .that.is.an('function')
  })

  it('has "SqlSerializer" class', () => {
    dataplugSql
      .should.have.property('SqlSerializer')
      .that.is.an('function')
  })

  it('has "SqlStreamWriter" class', () => {
    dataplugSql
      .should.have.property('SqlStreamWriter')
      .that.is.an('function')
  })
})
