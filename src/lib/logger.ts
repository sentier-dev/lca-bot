import pino from 'pino'

const IS_PROD = process.env.NODE_ENV === 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (IS_PROD ? 'info' : 'debug'),
  ...(IS_PROD
    ? {
        // JSON output in production for log aggregation
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Pretty output in development
        transport: {
          target: 'pino/file',
          options: { destination: 1 },
        },
      }),
})

export type Logger = typeof logger
