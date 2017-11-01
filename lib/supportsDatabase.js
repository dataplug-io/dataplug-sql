function supportsDatabase (database) {
  return [
    'postgres', 'pg', 'postgresql'
  ].includes(database)
}

module.exports = supportsDatabase
