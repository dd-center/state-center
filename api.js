const EventEmitter = require('events')
const io = require('socket.io-client')

const { port } = require('./config')

const baseURL = new URL('http://0.0.0.0')

baseURL.port = port
class CState extends EventEmitter {
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

    this.stateTable = {}
    this.queryTable = {}

    this.liveInterval = setInterval(() => {
      // console.log(233)
      if (this.connected) {
        this.socket.emit('uptime', process.uptime())
      }
    }, 1000)

    const socket = this.socket
    socket.on('connect', () => this.emit('connect'))
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
    socket.on('log', (...params) => this.emit('log', ...params))
    socket.on('error', (...params) => this.emit('error', ...params))
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

  /**
   * @param { string } raw
   * @param { object } extra
   */
  log = (raw, extra = {}) => this.socket.emit('log', { raw, ...extra })
  /**
   * @param { string } type
   */
  join = type => this.socket.emit('join', type)
  /**
   * @param { string } name
   */
  ask = name => key => new Promise(resolve => this.socket.emit('state', { name, key }, resolve))
  /**
   * @param { string } name
   */
  query = name => key => (...params) => new Promise(resolve => this.socket.emit('query', { name, key, params }, resolve))
}

module.exports = CState
