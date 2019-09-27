const Server = require('socket.io')
const io = new Server(9200, { serveClient: false })

io.on('connect', socket => {
  const { name } = socket.handshake.query
  if (name) {
    console.log(name, 'connected')
  }
})
