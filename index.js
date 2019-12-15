const Server = require('socket.io')

const { port } = require('./config')

const io = new Server(port, { serveClient: false })

const clients = new Map()

io.on('connect', socket => {
  const { name } = socket.handshake.query
  if (name && !clients.has(name)) {
    clients.set(name, socket)
    const log = data => io.to('all').to('log').to(name).emit('log', { name, data })
    socket.on('log', log)
    socket.on('join', room => socket.join(room))
    socket.on('state', ({ name, key }, ack) => {
      if (typeof ack === 'function') {
        if (clients.has(name)) {
          clients.get(name).emit('state', key, ack)
        } else {
          ack(undefined)
        }
      }
    })
    console.log(name, 'connected')
    socket.on('disconnect', () => {
      clients.delete(name)
    })
  }
})

module.exports = io
