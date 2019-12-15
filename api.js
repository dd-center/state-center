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

    this.liveInterval = setInterval(() => {
      // console.log(233)
      if (this.connected) {
        this.socket.emit('uptime', process.uptime())
      }
    }, 1000)

    const socket = this.socket
    socket.on('connect', () => this.emit('connect'))
  }

  close = () => {
    clearInterval(this.liveInterval)
    this.socket.close()
  }
}

module.exports = CState
