import { EventEmitter } from 'events'
import { port } from './config'
import io, { Socket } from 'socket.io-client'

const baseURL = new URL(`http://0.0.0.0:${port}`)

interface CStateOption {
  name: string
  group?: string 
}

export interface StateTable extends Record<string, () => any> {}

export interface QueryTable extends Record<string, (...params: any[]) => any> {}

export default class CState extends EventEmitter {
  stateTable: StateTable = {}
  queryTable: QueryTable = {}
  emitters = new Map<string, EventEmitter>()
  joins = new Set()
  socket: typeof Socket
  liveInterval: NodeJS.Timeout

  constructor (option: string | CStateOption) {
    super()

    if (typeof option === 'string') {
      this.socket = io(option)
    } else {
      const { name = 'unknow', group = 'unknow' } = option
      const url = new URL('', baseURL)
      url.searchParams.set('name', name)
      url.searchParams.set('group', group)
      this.socket = io(url.href)
    }

    const socket = this.socket
    const emitters = this.emitters

    socket.on('connect', () => {
      this.emit('connect')
      this.emit('open')
      this.joins.forEach(type => {
        socket.emit('join', type)
      })
    })

    socket.on('disconnect', () => {
      this.emit('disconnect')
      this.emit('close')
    })

    socket.on('state', async (key: string, ack: (value: any) => void) => {
      if (typeof ack === 'function') {
        ack(await this.stateTable[key]?.())
      }
    })

    socket.on('query', async ({ key, params }, ack: (value: any) => void) => {
      if (typeof ack === 'function') {
        ack(await this.queryTable[key]?.(...params))
      }
    })

    socket.on('event', (...params) => {
      this.emit('event', ...params)
    })

    socket.on('event', (name, event, ...params) => {
      if (emitters.has(name)) {
        emitters.get(name).emit(event, ...params)
      }
    })

    socket.on('log', (...params) => this.emit('log', ...params))

    socket.on('error', (...params) => this.emit('error', ...params))

    this.open()
  }

  stateRoute = (stateTable: Partial<StateTable>) => {
    this.stateTable = { ...this.stateTable, ...stateTable }
  }

  queryRoute = (queryTable: Partial<QueryTable>) => {
    this.queryTable = { ...this.queryTable, ...queryTable }
  }

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

  log = (raw: string, extra: object = {}) => this.socket.emit('log', { raw, ...extra })

  join = (type: string) => {
    this.joins.add(type)
    this.socket.emit('join', type)
  }

  ask = (name: string) => {
    return <T extends keyof StateTable>(key: T) => {
      return new Promise<ReturnType<StateTable[T]>>((resolve) => {
        this.socket.emit('state', { name, key }, resolve)
      })
    }
  }

  query = <T = any>(name: string) => {
    return <T extends keyof QueryTable>(key: T) => {
      return (...params: Parameters<QueryTable[T]>) => {
        return new Promise<ReturnType<QueryTable[T]>>((resolve) => {
          this.socket.emit('query', { name, key, params }, resolve)
        })
      }
    }
  }

  update = (stats: object) => this.socket.emit('stats', stats)

  publish = (eventName: string) => (...params) => {
    this.socket.emit('event', eventName, ...params)
  }

  subscribe = (name: string) => {
    const emitters = this.emitters
    if (!emitters.has(name)) {
      const emitter = new EventEmitter()
      this.join(name)
      emitters.set(name, emitter)
    }
    return emitters.get(name)
  }
}