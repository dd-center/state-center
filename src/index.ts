import SocketIO, { Socket } from 'socket.io'
import CState from './api'
import { port } from './config'

export { CState }

export const io = SocketIO(port, {
  serveClient: false,
})

const clients = new Map<string, Socket>()

const clientsStats = new Map<string, ClientsStat>()

interface ClientsStat {
  uptime?: number
  lastSeen?: number
}

export const stateCState = new CState({ name: 'state' })

declare module './api' {
  interface StateTable {
    clients?: () => string[]
    stats?: () => Record<string, ClientsStat>
  }

  interface QueryTable {
    stats?: (name: string) => ClientsStat
  }
}

stateCState.stateRoute({
  clients: () => [...clients.keys()],
  stats: () => [...clientsStats.entries()].reduce((prev, [key, value]) => ({ ...prev, [key]: value }), {}),
})

stateCState.queryRoute({
  stats: name => clientsStats.get(name)
})

io.on('connect', socket => {
  const { name } = socket.handshake.query
  if (!name || clients.has(name)) return

  clients.set(name, socket)
  clientsStats.set(name, { lastSeen: Date.now() })

  socket.on('log', data => {
    io.to('all').to('log').to(name).emit('log', { name, data })
  })

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

  socket.on('query', ({ name, key, params }, ack) => {
    if (typeof ack === 'function') {
      if (clients.has(name)) {
        clients.get(name).emit('query', { key, params }, ack)
      } else {
        ack(undefined)
      }
    }
  })

  socket.on('stats', stats => clientsStats.set(name, { ...clientsStats.get(name), ...stats, lastSeen: Date.now() }))

  socket.on('event', (...params) => io.to(name).emit('event', name, ...params))

  stateCState.log('connected', { name })

  socket.on('disconnect', () => {
    clients.delete(name)
    clientsStats.delete(name)
    stateCState.log('disconnect', { name })
  })
})

console.log('State is here!')
