const io = require('socket.io-client')

const { port } = require('./config')

const baseURL = new URL('http://0.0.0.0')

baseURL.port = port

class CState extends io {
  /**
   * @param { { name:string, group:string } | string } option
   */
  constructor(option) {
    if (typeof option === 'string') {
      super(option)
    } else {
      const { name = 'unknow', group = 'unknow' } = option
      const url = new URL(baseURL)
      url.searchParams.set('name', name)
      url.searchParams.set('group', group)
      super(url.href)
    }

    setInterval(() => {
      if (this.connected) {
        this.emit('uptime', process.uptime())
      }
    }, 1)
  }
}

module.exports = CState
