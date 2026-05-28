import { app } from 'electron'
import { createRequire } from 'module'
import path from 'path'
import fs from 'fs'

const require = createRequire(import.meta.url)

const cwd = path.join(
  process.env.USERPROFILE || '',
  'Documents',
  '码盒',
  'repos',
  'lovewold',
  'ai-knowing',
)

app.whenReady().then(() => {
  console.log('cwd exists', fs.existsSync(cwd), cwd)
  try {
    const pty = require('node-pty')
    console.time('spawn')
    const t = pty.spawn(process.env.COMSPEC || 'cmd.exe', [], {
      cwd: fs.existsSync(cwd) ? cwd : process.cwd(),
      cols: 80,
      rows: 24,
      useConpty: true,
    })
    console.timeEnd('spawn')
    console.log('PTY_OK', t.pid)
    t.onData((d) => console.log('data', d.slice(0, 40).replace(/\n/g, '\\n')))
    setTimeout(() => {
      t.kill()
      app.quit()
    }, 2000)
  } catch (err) {
    console.error('PTY_FAIL', err)
    app.quit()
  }
})
