import postgres from 'postgres'

export interface PostgresClientOverrides {
  /** Pool size; scripts use 1, the app uses DB_POOL_SIZE. */
  max?: number
}

/**
 * Pulls a `host=/socket/path` query param out of the connection string.
 * Returns the socket path and the string without that one param, leaving any
 * other params (sslmode, application_name) in place. A connection string that
 * does not parse, or carries no socket host, comes back untouched.
 */
function extractSocketHost(connectionString: string): { url: string; socketPath: string | null } {
  let url: URL
  try {
    url = new URL(connectionString)
  } catch {
    return { url: connectionString, socketPath: null }
  }

  const host = url.searchParams.get('host')
  if (host === null || !host.startsWith('/')) return { url: connectionString, socketPath: null }

  url.searchParams.delete('host')
  return { url: url.toString(), socketPath: host }
}

/**
 * Builds the postgres-js client the app and the CLI scripts share, so a
 * connection-string quirk only ever has to be handled once.
 *
 * Cloud SQL (Cloud Run) mounts a unix socket at /cloudsql/<conn>. The
 * DATABASE_URL selects it with a `host=/cloudsql/...` query param, but
 * postgres-js does not read that param: it parses the URL and defaults to TCP
 * localhost:5432, and forwards unknown query params as Postgres startup
 * params, which rejects `host`. So strip the param from the URL and pass the
 * socket path through the options object instead.
 */
export function createPostgresClient(connectionString: string, overrides: PostgresClientOverrides = {}) {
  const isProd = process.env.NODE_ENV === 'production'
  const { url, socketPath } = extractSocketHost(connectionString)
  const baseOpts = {
    max: overrides.max ?? Number.parseInt(process.env.DB_POOL_SIZE ?? '10', 10),
    idle_timeout: 20,
    connect_timeout: 10,
  }

  if (socketPath !== null) {
    return postgres(url, {
      ...baseOpts,
      host: socketPath,
      // A unix socket is local: TLS would be pointless and Cloud SQL rejects it.
      ssl: false,
    })
  }

  return postgres(url, {
    ...baseOpts,
    ssl: isProd ? 'require' : false,
  })
}
