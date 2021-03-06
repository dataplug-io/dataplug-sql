const _ = require('lodash')
const check = require('check-types')
const { Writable } = require('stream')
const Promise = require('bluebird')
const { Client } = require('pg')
const logger = require('winston')

/**
 * Writes SQL queries stream into a specified SQL database
 */
class SqlStreamWriter extends Writable {
  /**
   * @constructor
   * @param {string} connectionString Database connection string
   * @param {boolean} [singleTransaction=false] If true, use single transaction for entire batch
   */
  constructor (connectionString, singleTransaction = false) {
    check.assert.nonEmptyString(connectionString)
    check.assert.boolean(singleTransaction)

    super({
      objectMode: true
    })

    this._connectionString = connectionString
    this._dbClient = null
    this._singleTransaction = singleTransaction
    this._singleTransactionOpened = false
  }

  /**
   * https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback_1
   * @override
   */
  _write (chunk, encoding, callback) {
    if (!this._dbClient) {
      logger.log('verbose', 'SqlStreamWriter is going to open connection')

      this._dbClient = new Client({
        connectionString: this._connectionString
      })
      this._dbClient
        .connect()
        .then(() => {
          this._dbClient
            .on('notice', (notice) => logger.log('warn', 'Notice from database in SqlStreamWriter:', notice))

          this._doWrite(chunk, callback)
        })
        .catch((error) => {
          logger.log('error', 'Error in SqlStreamWriter while connecting to database:', error)
          callback(error)
          this.emit('close')
        })
      return
    }

    this._doWrite(chunk, callback)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_writable_final_callback
   */
  _final (callback) {
    logger.log('verbose', 'SqlStreamWriter is performing final actions')

    this._doFlush()
      .then(() => this._doDisconnect())
      .then(callback)
      .catch(callback)
  }

  /**
   * Does actual writing
   */
  _doWrite (queries, callback) {
    if (this._singleTransaction && !this._singleTransactionOpened) {
      this._dbClient
        .query('BEGIN')
        .then(() => {
          this._singleTransactionOpened = true
          this._doWrite(queries, callback)
        })
        .catch((error) => {
          logger.log('error', 'Error in SqlStreamWriter while starting main transaction:', error)
          callback(error)
          this.emit('close')
        })
      return
    }

    const transactionId = _.uniqueId('trx')
    const startTransactionQuery = this._singleTransaction
      ? `SAVEPOINT ${transactionId}`
      : 'BEGIN'
    const rollbackTransactionQuery = this._singleTransaction
      ? `ROLLBACK TO SAVEPOINT ${transactionId}`
      : 'ROLLBACK'
    const commitTransactionQuery = this._singleTransaction
      ? `RELEASE SAVEPOINT ${transactionId}`
      : 'COMMIT'

    this._dbClient
      .query(startTransactionQuery)
      .then(() => Promise.mapSeries(queries, (query) => this._dbClient.query(query)))
      .then(() => this._dbClient.query(commitTransactionQuery))
      .then(() => undefined)
      .catch((error) => {
        logger.log('warn', 'Error in SqlStreamWriter while doing transaction:', error)
        return this._dbClient
          .query(rollbackTransactionQuery)
          .then(() => undefined)
      })
      .catch((error) => {
        logger.log('warn', 'Error in SqlStreamWriter while rolling transaction back:', error)
        return error
      })
      .then((result) => {
        callback(result)
      })
  }

  /**
   * Does flushing
   */
  _doFlush () {
    logger.log('verbose', 'SqlStreamWriter is going to flush connection')

    if (!this._singleTransaction || !this._singleTransactionOpened) {
      return Promise.resolve()
    }

    return this._dbClient
      .query('COMMIT')
      .then(() => {
        logger.log('verbose', 'SqlStreamWriter closed main transaction')
        this._singleTransactionOpened = false
      })
      .catch((error) => {
        logger.log('error', 'Error in SqlStreamWriter while committing main transaction:', error)
        return this._dbClient
          .query('ROLLBACK')
          .then(() => {
            this._singleTransactionOpened = false
          })
      })
      .catch((error) => {
        logger.log('error', 'Error in SqlStreamWriter while rolling main transaction back:', error)
        return error
      })
  }

  /**
   * Does disconnect
   */
  _doDisconnect () {
    logger.log('verbose', 'SqlStreamWriter is going to close connection')

    if (!this._dbClient) {
      return Promise.resolve()
    }

    return this._dbClient
      .end()
      .catch((error) => {
        logger.log('error', 'Error in SqlStreamWriter while connecting to database:', error)
        return error
      })
      .then(() => {
        logger.log('verbose', 'SqlStreamWriter closed the connection')
        this._dbClient = null
      })
  }
}

module.exports = SqlStreamWriter
