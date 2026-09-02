import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingdrama-storage-'))
process.env.STORAGE_PATH = path.join(tempDir, 'static')

const { downloadFile } = await import('../src/utils/storage.js')

test('remote downloads enforce protocol, timeout and streamed byte limits', async () => {
  const server = http.createServer((request, response) => {
    if (request.url === '/ok') {
      response.writeHead(200, { 'content-length': '4' })
      response.end('safe')
      return
    }
    if (request.url === '/declared-too-large') {
      response.writeHead(200, { 'content-length': '10' })
      response.end('0123456789')
      return
    }
    if (request.url === '/stream-too-large') {
      response.writeHead(200, { 'content-type': 'application/octet-stream' })
      response.write('1234')
      response.end('5678')
      return
    }
    if (request.url === '/hang') {
      response.writeHead(200, { 'content-type': 'application/octet-stream' })
      response.write('x')
      return
    }
    response.writeHead(404).end()
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const base = `http://127.0.0.1:${address.port}`

  try {
    const saved = await downloadFile(`${base}/ok`, 'images', { maxBytes: 4, timeoutMs: 1_000 })
    assert.equal(fs.readFileSync(path.join(tempDir, saved), 'utf8'), 'safe')
    await assert.rejects(
      downloadFile(`${base}/declared-too-large`, 'images', { maxBytes: 5, timeoutMs: 1_000 }),
      /exceeds 5 bytes/,
    )
    await assert.rejects(
      downloadFile(`${base}/stream-too-large`, 'images', { maxBytes: 5, timeoutMs: 1_000 }),
      /exceeds 5 bytes/,
    )
    await assert.rejects(
      downloadFile(`${base}/hang`, 'images', { maxBytes: 5, timeoutMs: 50 }),
      /abort|timeout/i,
    )
    await assert.rejects(downloadFile('file:///etc/passwd', 'images'), /Only HTTP\(S\)/)
    const parts = fs.existsSync(path.join(tempDir, 'static', 'images'))
      ? fs.readdirSync(path.join(tempDir, 'static', 'images')).filter(name => name.endsWith('.part'))
      : []
    assert.deepEqual(parts, [])
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }))
