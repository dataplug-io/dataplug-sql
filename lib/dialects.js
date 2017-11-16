const _ = require('lodash')
const check = require('check-types')

class Dialects {
  /**
   * Checks if dialect is supported
   *
   * @param {string|URL} dialect Name of dialect to check
   */
  static isSupported (dialect) {
    check.assert.nonEmptyString(dialect)

    return Dialects.ALL.includes(dialect)
  }
}

Dialects.SUPPORTED = [
  'postgres'
]

Dialects.ALIASES = {
  'pg': 'postgres',
  'postgresql': 'postgres'
}

Dialects.ALL = Dialects.SUPPORTED.concat(_.keys(Dialects.ALIASES))

module.exports = Dialects
