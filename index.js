const Server = require('socket.io')
const io = new Server(9200, { serveClient: false })

let clients = new Map()

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
