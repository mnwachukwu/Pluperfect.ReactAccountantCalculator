// Draws the Open Graph card: serves demo/og.html, which holds the real calculator, and photographs it with headless
// Chrome into demo/public/og.png. The picture depends on the drawing machine's fonts, so it is committed rather than
// built in CI. Run it by hand when the card should change:
//
//     npm run og

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createServer } from 'vite'

// The size Facebook, LinkedIn, Slack, Discord, and X all read.
const WIDTH = 1200
const HEIGHT = 630

const root = resolve(import.meta.dirname, '..')
const out = join(root, 'demo', 'public', 'og.png')
// Beside the target, so the rename onto it stays on one volume and the old picture survives a failed run. Chrome picks
// the image format from the extension, so it ends in .png.
const drawn = join(dirname(out), 'og.new.png')

const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((path): path is string => !!path && existsSync(path))

if (!chrome) {
  console.error('Chrome was not found. Set CHROME_PATH to it.')
  process.exit(1)
}

mkdirSync(dirname(out), { recursive: true })

const server = await createServer({
  configFile: join(root, 'vite.config.ts'),
  root: join(root, 'demo'),
  server: { port: 5199 },
  logLevel: 'warn',
})
await server.listen()
const page = new URL('og.html', server.resolvedUrls?.local[0] ?? 'http://localhost:5199/').href
const profile = mkdtempSync(join(tmpdir(), 'og-'))

let said = ''

try {
  const code = await new Promise<number | null>((done) => {
    const running = spawn(chrome, [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${WIDTH},${HEIGHT}`,
      // Time for React to mount and take its keys, and for the last key's pressed highlight to fade.
      '--virtual-time-budget=5000',
      `--screenshot=${drawn}`,
      `--user-data-dir=${profile}`,
      page,
    ], { stdio: ['ignore', 'ignore', 'pipe'] })
    running.stderr.on('data', (chunk: Buffer) => (said += chunk))
    running.on('exit', done)
  })
  if (code !== 0 || !existsSync(drawn)) {
    throw new Error(`Chrome exited ${code} and drew nothing:\n${said.split('\n').slice(0, 15).join('\n')}`)
  }

  // A PNG's width and height are the big-endian words at bytes 16 and 20.
  const png = readFileSync(drawn)
  const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`
  if (size !== `${WIDTH}x${HEIGHT}`) throw new Error(`Chrome drew ${size}, not ${WIDTH}x${HEIGHT}`)

  renameSync(drawn, out)
  console.log(`drew ${out} at ${size}`)
} finally {
  await server.close()
  rmSync(drawn, { force: true })
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
