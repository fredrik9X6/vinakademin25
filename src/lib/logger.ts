import pino, { type Logger } from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: { service: 'vinakademin' },
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname,service' },
    },
  }),
})

export const loggerFor = (module: string): Logger => logger.child({ module })
