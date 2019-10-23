const Server = require('socket.io')
const io = new Server(9200, { serveClient: false })

io.on('connect', socket => {
  const { name } = socket.handshake.query
  if (name) {
    const log = data => io.to('all').to('log').to(name).emit('log', { name, data })
    socket.on('log', log)
    socket.on('join', room => socket.join(room))
    console.log(name, 'connected')
  }
})
