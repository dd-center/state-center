/* global describe */
/* global context */
/* global it */
/* global after */
const { once } = require('events')
const { assert } = require('chai')

const { io, stateCState } = require('..')
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
    const stateAsker = runner.ask('state')

    it('connect and disconnect with name', async function() {
      const cState = new CState({ name: 'test' })
      await once(cState, 'connect')
      await wait(10)
      assert.isTrue((await stateAsker('clients')).includes('test'))
      cState.close()
      await wait(500)
      assert.isFalse((await stateAsker('clients')).includes('test'))
    })

    context('join()', function() {
      runner.join('all')

      it('log()', async function() {
        const name = 'tester'
        const cState = new CState({ name })
        await wait(10)
        const log = await new Promise(resolve => {
          cState.log('nice')
          runner.on('log', ({ name: n, data: { raw } }) => {
            if (n === name) {
              resolve(raw)
            }
          })
        })
        cState.close()
        assert.strictEqual(log, 'nice')
      })
    })

    it('ask()', async function() {
      const name = 'answer'
      const cState = new CState({ name })
      cState.stateRoute({ testQ: () => Promise.resolve(233) })
      await wait(10)
      const result = await runner.ask(name)('testQ')
      cState.close()
      assert.strictEqual(result, 233)
    })

    it('query()', async function() {
      const name = 'answer'
      const num = 233
      const cState = new CState({ name })
      cState.queryRoute({ plus: n => n + 1 })
      await wait(10)
      const result = await runner.query(name)('plus')(num)
      cState.close()
      assert.strictEqual(result, num + 1)
    })

    after(function() {
      runner.close()
    })
  })

  after(function() {
    io.close()
    stateCState.close()
  })
})
