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

  it('has "serializeContainerToSql" function', () => {
    dataplugSql
      .should.have.property('serializeContainerToSql')
      .that.is.an('function')
  })

  it('has "serializeObjectToSql" function', () => {
    dataplugSql
      .should.have.property('serializeObjectToSql')
      .that.is.an('function')
  })

  it('has "SqlStreamWriter" class', () => {
    dataplugSql
      .should.have.property('SqlStreamWriter')
      .that.is.an('function')
  })

  it('has "SqlDataWriter" class', () => {
    dataplugSql
      .should.have.property('SqlDataWriter')
      .that.is.an('function')
  })
})
