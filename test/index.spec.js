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

  it('has "resolveConnectedDbClient" function', () => {
    dataplugSql
      .should.have.property('resolveConnectedDbClient')
      .that.is.an('function')
  })

  it('has "resolveDbClient" function', () => {
    dataplugSql
      .should.have.property('resolveDbClient')
      .that.is.an('function')
  })

  it('has "SqlStreamWriter" class', () => {
    dataplugSql
      .should.have.property('SqlStreamWriter')
      .that.is.an('function')
  })

  it('has "SqlSerializer" class', () => {
    dataplugSql
      .should.have.property('SqlSerializer')
      .that.is.an('function')
  })

  it('has "SqlDataWriter" class', () => {
    dataplugSql
      .should.have.property('SqlDataWriter')
      .that.is.an('function')
  })
})
