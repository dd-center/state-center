/* global describe */
/* global context */
/* global it */
/* global after */
const { once } = require('events')
const { assert } = require('chai')

const { io, clients } = require('..')
const CState = require('../api')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

describe('State Center', function() {
  context('state.io', function() {
    it('io is object', function() {
      assert.isObject(io)
    })
  })

  context('api', function() {
    const runner = new CState({ name: 'runner' })

    it('connect and disconnect with name', async function() {
      const cState = new CState({ name: 'test' })
      await once(cState, 'connect')
      await wait(10)
      assert.isTrue(clients.has('test'))
      cState.close()
      await wait(500)
      assert.isFalse(clients.has('test'))
    })

    after(function() {
      runner.close()
    })
  })

  after(function() {
    io.close()
  })
})
