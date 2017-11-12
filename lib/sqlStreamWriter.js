const _ = require('lodash')
const check = require('check-types')
const knex = require('knex')
const { Writable } = require('stream')
const Promise = require('bluebird')

/**
 * Writes SQL queries stream into a specified SQL database
 */
class SqlStreamWriter extends Writable {
  /**
   * @constructor
   * @param {function|string} dbClientOrConnectionString Database connection string or connected client
   * @param {boolean} [singleTransaction=false] If true, use single transaction for entire batch
   */
  constructor (dbClientOrConnectionString, singleTransaction = false) {
    check.assert(check.any([
      check.function(dbClientOrConnectionString),
      check.string(dbClientOrConnectionString)
    ]))
    check.assert.boolean(singleTransaction)

    super({
      objectMode: true
    })

    this._dbClient = dbClientOrConnectionString
    if (_.isString(this._dbClient)) {
      this._dbClient = knex(this._dbClient)
    }
    this._singleTransaction = singleTransaction
    this._singleTransactionPromise = null
    this._resolveSingleTransactionBody = null
    this._rejectSingleTransactionBody = null
    this._singleTransactionBodyChain = null
  }

  /**
   * https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback_1
   * @override
   */
  _write (chunk, encoding, callback) {
    const queries = this._adoptQueries(chunk)

    if (!this._singleTransaction) {
      this._dbClient
        .transaction((transaction) => {
          _.forEach(queries, (query) => query.transacting(transaction))
          return Promise.each(queries, (query) => query)
        })
        .then(() => {
          callback()
        })
        .catch((error) => {
          callback(error)
        })
      return
    }

    // Initialize single transaction if needed
    if (_.isBoolean(this._singleTransaction)) {
      this._singleTransactionPromise = this._dbClient.transaction((transaction) => {
        this._singleTransaction = transaction

        this._processQueries(queries, callback)

        return new Promise((resolve, reject) => {
          this._resolveSingleTransactionBody = resolve
          this._rejectSingleTransactionBody = reject
        })
      })
      return
    }

    // Process queries
    this._processQueries(queries, callback)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_writable_final_callback
   */
  _final (callback) {
    if (!this._singleTransaction || !this._singleTransactionPromise) {
      if (this._dbClient.client.pool) {
        this._dbClient.destroy(() => callback())
      } else {
        callback()
      }
      return
    }

    if (this._singleTransactionBodyChain) {
      this._singleTransactionBodyChain
        .then(() => this._resolveSingleTransactionBody())
        .catch((error) => this._rejectSingleTransactionBody(error))
    } else {
      this._resolveSingleTransactionBody()
    }

    this._singleTransactionPromise
      .then(() => {
        if (this._dbClient.client.pool) {
          this._dbClient.destroy(() => callback())
        } else {
          callback()
        }
      })
      .catch((error) => {
        if (this._dbClient.client.pool) {
          this._dbClient.destroy(() => callback(error))
        } else {
          callback(error)
        }
      })
  }

  /**
   * Adopts foreign queries
   */
  _adoptQueries (queries) {
    if (!_.isArray(queries)) {
      queries = [queries]
    }
    queries = queries.map((query) => {
      if (_.isString(query)) {
        return this._dbClient
          .raw()
          .set(query)
      }

      return this._dbClient
        .raw()
        .set(query.sql, query.bindings)
    })
    return queries
  }

  /**
   * Process queries
   */
  _processQueries (queries, callback) {
    _.forEach(queries, (query) => query.transacting(this._singleTransaction))
    const chainElement = Promise.each(queries, (query) => query)
    if (this._singleTransactionBodyChain) {
      this._singleTransactionBodyChain = this._singleTransactionBodyChain
        .then(() => chainElement)
    } else {
      this._singleTransactionBodyChain = chainElement
    }

    this._singleTransactionBodyChain
      .then(() => {
        callback()
      })
      .catch((error) => {
        callback(error)
      })
  }
}

module.exports = SqlStreamWriter
