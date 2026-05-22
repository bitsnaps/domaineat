/**
 * DNS and SSL verification utilities for domain checking.
 * Uses Node.js built-in dns and tls modules — no external deps.
 */
import dns from 'node:dns/promises'
import tls from 'node:tls'

export interface DnsCheckResult {
  domain: string
  resolved: boolean
  ip: string | null
  nameservers: string[]
  ssl_expiry: string | null
  checked_at: string
}

/**
 * Resolve A record for a domain.
 */
export async function resolveIp(domain: string): Promise<string | null> {
  try {
    const addresses = await dns.resolve4(domain)
    return addresses[0] ?? null
  } catch {
    return null
  }
}

/**
 * Resolve NS records for a domain.
 */
export async function resolveNameservers(domain: string): Promise<string[]> {
  try {
    const records = await dns.resolveNs(domain)
    return records
  } catch {
    return []
  }
}

/**
 * Check SSL certificate expiry for a domain by connecting on port 443.
 * Returns ISO date string or null if unavailable.
 */
export async function checkSslExpiry(domain: string): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = 5000
    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false, // Accept self-signed for expiry check
      },
      () => {
        const cert = socket.getPeerCertificate()
        socket.destroy()
        if (cert?.valid_to) {
          resolve(new Date(cert.valid_to).toISOString())
        } else {
          resolve(null)
        }
      }
    )

    socket.setTimeout(timeout, () => {
      socket.destroy()
      resolve(null)
    })

    socket.on('error', () => {
      socket.destroy()
      resolve(null)
    })
  })
}

/**
 * Full DNS + SSL check for a domain.
 */
export async function fullDnsCheck(domain: string): Promise<DnsCheckResult> {
  const [ip, nameservers, sslExpiry] = await Promise.all([
    resolveIp(domain),
    resolveNameservers(domain),
    checkSslExpiry(domain),
  ])

  return {
    domain,
    resolved: ip !== null,
    ip,
    nameservers,
    ssl_expiry: sslExpiry,
    checked_at: new Date().toISOString(),
  }
}
