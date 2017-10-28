function supportsDatabase (database) {
  return [
    'maria',
    'mssql',
    'mysql',
    'mysql2',
    'oracle',
    'oracledb',
    'postgres',
    'sqlite3',
    'strong-oracle',
    'websql'
  ].includes(database)
}

// TODO: autodetect?
module.exports = supportsDatabase
