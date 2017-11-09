/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const { SqlSerializer } = require('../lib')

describe('SqlSerializer', () => {
  describe('#serializeObject()', () => {
    it('serializes simple object properly', () => {
      const object = {
        property: 'value'
      }
      const metadata = {
        fields: {
          property: {
            type: 'string',
            identity: true
          }
        }
      }
      new SqlSerializer('pg').serializeObject(object, 'collection', metadata)
        .map(query => query.toString())
        .join('; ')
        .should.be.equal('insert into "collection" ("property") values (\'value\')')
    })

    it('serializes simple object properly (do upsert)', () => {
      const object = {
        property: 'key',
        value: 'value'
      }
      const metadata = {
        fields: {
          property: {
            type: 'string',
            identity: true
          },
          value: {
            type: 'string'
          }
        }
      }
      new SqlSerializer('pg', { postprocessor: 'update-on-conflict' }).serializeObject(object, 'collection', metadata)
        .map(query => query.toString())
        .join('; ')
        .should.be.equal('insert into "collection" ("property", "value") values (\'key\', \'value\') ON CONFLICT DO UPDATE SET "value" = excluded."value"')
    })

    it('serializes simple object properly (do not upsert)', () => {
      const object = {
        property: 'value'
      }
      const metadata = {
        fields: {
          property: {
            type: 'string',
            identity: true
          }
        }
      }
      new SqlSerializer('pg', { postprocessor: 'skip-on-conflict' }).serializeObject(object, 'collection', metadata)
        .map(query => query.toString())
        .join('; ')
        .should.be.equal('insert into "collection" ("property") values (\'value\') ON CONFLICT DO NOTHING')
    })
  })
})
