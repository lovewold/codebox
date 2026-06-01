import { session } from 'electron'

const PROXY_BYPASS = '<local>,localhost,127.0.0.1,*.local'

/** 将环境变量中的代理 URL 转为 Chromium proxyRules */
function toProxyRules(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed

  if (trimmed.startsWith('http=') || trimmed.includes(';')) {
    return trimmed
  }

  if (trimmed.startsWith('socks5://')) {
    return trimmed
  }

  if (trimmed.startsWith('socks4://')) {
    return trimmed
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const host = trimmed.replace(/^https?:\/\//, '')
    return `http=${host};https=${host}`
  }

  return `http=${trimmed};https=${trimmed}`
}

/**
 * 配置渲染进程网络代理。
 * - CODEBOX_NO_PROXY=1 → 直连
 * - CODEBOX_PROXY=http://127.0.0.1:7890 → 固定代理（Clash 等建议用 http 端口，非 socks5）
 * - 未设置 → 跟随系统代理，并绕过 localhost（避免 dev server SSL 报错）
 */
export async function configureSessionProxy(): Promise<void> {
  const ses = session.defaultSession

  if (process.env.CODEBOX_NO_PROXY === '1') {
    await ses.setProxy({ mode: 'direct' })
    return
  }

  const explicit = process.env.CODEBOX_PROXY?.trim()
  if (explicit) {
    await ses.setProxy({
      mode: 'fixed_servers',
      proxyRules: toProxyRules(explicit),
      proxyBypassRules: PROXY_BYPASS,
    })
    return
  }

  await ses.setProxy({
    mode: 'system',
    proxyBypassRules: PROXY_BYPASS,
  })
}
