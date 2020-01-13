import { EventEmitter } from 'events'
import { assert } from 'chai'
import { io, stateCState } from '../src'
import CState from '../src/api'

const { once } = EventEmitter

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('State Center', function() {
  context('state.io', function() {
    it('io is object', function() {
      assert.isObject(io)
    })
  })

  context('api', function() {
    const runner = new CState({ name: 'runner' })
    const stateAsker = runner.ask('state')
    const stateQuerier = runner.query('state')

    it('connect and disconnect with name', async function() {
      const cState = new CState({ name: 'test' })
      await once(cState, 'connect')
      await wait(10)
      assert.isTrue((await stateAsker('clients')).includes('test'))
      cState.close()
      await wait(500)
      assert.isFalse((await stateAsker('clients')).includes('test'))
    })

    it('connect and disconnect with url', async function() {
      const cState = new CState('http://0.0.0.0:9200?name=hi')
      await once(cState, 'connect')
      await wait(10)
      assert.isTrue((await stateAsker('clients')).includes('hi'))
      cState.close()
      await wait(500)
      assert.isFalse((await stateAsker('clients')).includes('hi'))
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

    it('ask() -> null', async function() {
      const result = await runner.ask('who?')('www')
      assert.isNull(result)
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

    it('query() -> null', async function() {
      const result = await runner.query('who?')('plus')(233)
      assert.isNull(result)
    })

    it('subscribe()', function() {
      const cState = new CState({ name: 'subs' })
      const emitter = cState.subscribe('nice')
      cState.close()
      assert.instanceOf(emitter, EventEmitter)
    })

    it('subscribe() x2', function() {
      const cState = new CState({ name: 'subs' })
      const emitter = cState.subscribe('nice')
      const emitter2 = cState.subscribe('nice')
      cState.close()
      assert.strictEqual(emitter, emitter2)
    })

    it('publish/subscribe', async function() {
      const subState = new CState({ name: 'sub' })
      const pubEmitter = subState.subscribe('pub')
      const pubState = new CState({ name: 'pub' })
      const aPublisher = pubState.publish('a')
      await wait(10)
      aPublisher(233)
      const [num] = await once(pubEmitter, 'a')
      subState.close()
      pubState.close()
      assert.strictEqual(num, 233)
    })

    it('publish/subscribe after close', async function() {
      const subState = new CState({ name: 'sub' })
      const pubEmitter = subState.subscribe('pub')
      const pubState = new CState({ name: 'pub' })
      const aPublisher = pubState.publish('a')
      await wait(100)
      subState.close()
      await wait(100)
      subState.open()
      await wait(100)
      aPublisher(233)
      const [num] = await once(pubEmitter, 'a')
      subState.close()
      pubState.close()
      assert.strictEqual(num, 233)
    })

    context('state center api', function() {
      context('state', function() {
        it('clients', async function() {
          const clients = await stateAsker('clients')
          assert.isArray(clients)
          assert.isAbove(clients.length, 0)
        })
        it('stats', async function() {
          const clientsStats = await stateAsker('stats')
          assert.isObject(clientsStats)
          assert.isAbove(Object.keys(clientsStats).length, 0)
        })
      })

      context('query', function() {
        it('stats', async function() {
          const runnerStats = await stateQuerier('stats')('runner')
          assert.isObject(runnerStats)
        })
        it('stats.uptime', async function() {
          await wait(1000)
          const runnerStats = await stateQuerier('stats')('runner')
          assert.isNumber(runnerStats.uptime)
        })
        it('stats.lastSeen', async function() {
          const runnerStats = await stateQuerier('stats')('runner')
          assert.isNumber(runnerStats.lastSeen)
        })
      })
    })

    it('update()', async function() {
      const name = 'c'
      const k = 233
      const cState = new CState({ name })
      cState.update({ k })
      await wait(10)
      const cStats = await stateQuerier('stats')(name)
      cState.close()
      // @ts-ignore
      assert.strictEqual(cStats.k, k)
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
