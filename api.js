const EventEmitter = require('events')
const io = require('socket.io-client')

const { port } = require('./config')

const baseURL = new URL('http://0.0.0.0')

baseURL.port = port
class CState extends EventEmitter {
  stateTable = {}
  queryTable = {}
  emitters = new Map()
  joins = new Set()
  /**
   * @param { { name:string, group:string } | string } option
   */
  constructor(option) {
    super()

    if (typeof option === 'string') {
      this.socket = io(option)
    } else {
      const { name = 'unknow', group = 'unknow' } = option
      const url = new URL(baseURL)
      url.searchParams.set('name', name)
      url.searchParams.set('group', group)
      this.socket = io(url.href)
    }

    const socket = this.socket
    const emitters = this.emitters

    socket.on('connect', () => this.emit('connect'))
    socket.on('connect', () => this.emit('open'))
    socket.on('connect', () => {
      [...this.joins].forEach(type => {
        socket.emit('join', type)
      })
    })
    socket.on('disconnect', () => this.emit('disconnect'))
    socket.on('disconnect', () => this.emit('close'))

    socket.on('state', async (key, ack) => {
      if (typeof ack === 'function') {
        ack(await this.getStateRoute(key)())
      }
    })
    socket.on('query', async ({ key, params }, ack) => {
      if (typeof ack === 'function') {
        ack(await this.getQueryRoute(key)(...params))
      }
    })
    socket.on('event', (...params) => {
      this.emit('event', ...params)
    })
    socket.on('event', (name, ...params) => {
      if (emitters.has(name)) {
        emitters.get(name).emit(...params)
      }
    })
    socket.on('log', (...params) => this.emit('log', ...params))
    socket.on('error', (...params) => this.emit('error', ...params))

    this.open()
  }

  stateRoute = stateTable => {
    this.stateTable = { ...this.stateTable, ...stateTable }
  }

  getStateRoute = key => this.stateTable[key] || (() => undefined)

  queryRoute = queryTable => {
    this.queryTable = { ...this.queryTable, ...queryTable }
  }

  getQueryRoute = key => this.queryTable[key] || (() => undefined)

  close = () => {
    clearInterval(this.liveInterval)
    this.socket.close()
  }

  open = () => {
    this.socket.open()
    this.liveInterval = setInterval(() => {
      if (this.socket.connected) {
        this.update({ uptime: process.uptime() })
      }
    }, 1000)
  }

  /**
   * @param { string } raw
   * @param { object } extra
   */
  log = (raw, extra = {}) => this.socket.emit('log', { raw, ...extra })

  /**
   * @param { string } type
   */
  join = type => {
    this.joins.add(type)
    this.socket.emit('join', type)
  }

  /**
   * @param { string } name
   */
  ask = name => key => new Promise(resolve => this.socket.emit('state', { name, key }, resolve))

  /**
   * @param { string } name
   */
  query = name => key => (...params) => new Promise(resolve => this.socket.emit('query', { name, key, params }, resolve))

  /**
   * @param { object } stats
   */
  update = stats => this.socket.emit('stats', stats)

  /**
   * @param { string } eventName
   */
  publish = eventName => (...params) => {
    this.socket.emit('event', eventName, ...params)
  }

  /**
   * @param { string } name
   */
  subscribe = name => {
    const emitters = this.emitters
    if (!emitters.has(name)) {
      const emitter = new EventEmitter()
      this.join(name)
      emitters.set(name, emitter)
    }
    return emitters.get(name)
  }
}

module.exports = CState
