import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import Database from 'better-sqlite3'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingdrama-publish-'))
const dbPath = path.join(tempDir, 'candidate.db')
const storagePath = path.join(tempDir, 'static')
const publishScript = path.resolve('scripts/publish-flagship.ts')
const tsx = path.resolve('node_modules/.bin/tsx')

const media = [
  'flagship-59s/masters/the-59th-second-16x9.mp4',
  'flagship-59s/masters/the-59th-second-9x16.mp4',
  'flagship-59s/posters/the-59th-second-16x9.jpg',
  'flagship-59s/posters/the-59th-second-9x16.jpg',
  'flagship-59s/subtitles/the-59th-second.zh-CN.srt',
  'flagship-59s/subtitles/the-59th-second.en-US.srt',
  'flagship-59s/frames/panel-07.jpg',
  ...Array.from({ length: 6 }, (_, i) => `flagship-59s/frames/panel-${String(i + 1).padStart(2, '0')}.jpg`),
  ...Array.from({ length: 6 }, (_, i) => `flagship-59s/masters/final-shot-${String(i + 1).padStart(2, '0')}.mp4`),
  'videos/0a9ddf7e-3581-41b1-9f10-d95237380a89.mp4',
  'videos/cb4c1b16-18c7-45c7-b11f-fc8f33a0d9ff.mp4',
  'videos/b56ab28e-fb51-498c-9262-cdf45e9e409d.mp4',
]

for (const relative of media) {
  const absolute = path.join(storagePath, relative)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, 'verified-fixture')
}

const candidate = new Database(dbPath)
candidate.exec(`
  CREATE TABLE dramas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER, created_by INTEGER,
    is_public INTEGER NOT NULL DEFAULT 0, title TEXT NOT NULL, description TEXT,
    genre TEXT, style TEXT, total_episodes INTEGER, total_duration INTEGER,
    status TEXT, thumbnail TEXT, tags TEXT, metadata TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
  );
  CREATE TABLE episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, drama_id INTEGER NOT NULL,
    episode_number INTEGER NOT NULL, title TEXT NOT NULL, content TEXT,
    script_content TEXT, description TEXT, duration INTEGER, status TEXT,
    video_url TEXT, thumbnail TEXT, created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL, deleted_at TEXT
  );
  CREATE TABLE characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT, drama_id INTEGER NOT NULL, name TEXT NOT NULL,
    role TEXT, description TEXT, appearance TEXT, personality TEXT, voice_style TEXT,
    image_url TEXT, reference_images TEXT, seed_value TEXT, sort_order INTEGER,
    local_path TEXT, voice_sample_url TEXT, voice_provider TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
  );
  CREATE TABLE scenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, drama_id INTEGER NOT NULL, episode_id INTEGER,
    location TEXT NOT NULL, time TEXT NOT NULL, prompt TEXT NOT NULL,
    storyboard_count INTEGER, image_url TEXT, status TEXT, local_path TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
  );
  CREATE TABLE episode_scenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, episode_id INTEGER NOT NULL,
    scene_id INTEGER NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE storyboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT, episode_id INTEGER NOT NULL,
    scene_id INTEGER, storyboard_number INTEGER NOT NULL, title TEXT,
    location TEXT, time TEXT, shot_type TEXT, angle TEXT, movement TEXT,
    action TEXT, result TEXT, atmosphere TEXT, image_prompt TEXT,
    video_prompt TEXT, bgm_prompt TEXT, sound_effect TEXT, dialogue TEXT,
    description TEXT, duration INTEGER, composed_image TEXT,
    first_frame_image TEXT, last_frame_image TEXT, reference_images TEXT,
    video_url TEXT, tts_audio_url TEXT, subtitle_url TEXT,
    composed_video_url TEXT, status TEXT, created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL, deleted_at TEXT
  );
  CREATE TABLE storyboard_characters (
    storyboard_id INTEGER NOT NULL, character_id INTEGER NOT NULL,
    PRIMARY KEY (storyboard_id, character_id)
  );
  CREATE TABLE video_generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, storyboard_id INTEGER, drama_id INTEGER,
    provider TEXT, prompt TEXT, model TEXT, image_gen_id INTEGER,
    reference_mode TEXT, image_url TEXT, first_frame_url TEXT,
    last_frame_url TEXT, reference_image_urls TEXT, duration INTEGER,
    fps INTEGER, resolution TEXT, aspect_ratio TEXT, style TEXT,
    motion_level INTEGER, camera_motion TEXT, seed INTEGER, video_url TEXT,
    minio_url TEXT, local_path TEXT, status TEXT, task_id TEXT, error_msg TEXT,
    width INTEGER, height INTEGER, created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL, completed_at TEXT, deleted_at TEXT
  );
  CREATE TABLE video_merges (
    id INTEGER PRIMARY KEY AUTOINCREMENT, episode_id INTEGER, drama_id INTEGER,
    title TEXT, provider TEXT, model TEXT, status TEXT, scenes TEXT,
    merged_url TEXT, duration INTEGER, task_id TEXT, error_msg TEXT,
    created_at TEXT NOT NULL, completed_at TEXT, deleted_at TEXT
  );
  CREATE TABLE ai_activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT);
`)

const oldTime = '2026-08-12T00:00:00.000Z'
candidate.prepare(`
  INSERT INTO dramas (id, title, status, created_at, updated_at)
  VALUES (1, 'Legacy', 'draft', ?, ?)
`).run(oldTime, oldTime)
candidate.prepare('UPDATE dramas SET workspace_id=10 WHERE id=1').run()
candidate.prepare(`
  INSERT INTO episodes (id, drama_id, episode_number, title, status, created_at, updated_at)
  VALUES (1, 1, 1, 'Legacy episode', 'draft', ?, ?)
`).run(oldTime, oldTime)
candidate.prepare(`
  INSERT INTO characters (id, drama_id, name, created_at, updated_at)
  VALUES (1, 1, '林墨', ?, ?), (2, 1, '苏岚', ?, ?)
`).run(oldTime, oldTime, oldTime, oldTime)
candidate.prepare(`
  INSERT INTO scenes (id, drama_id, episode_id, location, time, prompt, created_at, updated_at)
  VALUES (1, 1, 1, '灵动工作室', '白天', 'legacy', ?, ?),
         (2, 1, 1, '办公室', '白天', 'legacy', ?, ?)
`).run(oldTime, oldTime, oldTime, oldTime)
candidate.prepare(`
  INSERT INTO episode_scenes (episode_id, scene_id, created_at) VALUES (1, 1, ?), (1, 2, ?)
`).run(oldTime, oldTime)
for (let number = 1; number <= 3; number++) {
  candidate.prepare(`
    INSERT INTO storyboards (episode_id, storyboard_number, title, status, created_at, updated_at)
    VALUES (1, ?, ?, 'legacy', ?, ?)
  `).run(number, `Legacy shot ${number}`, oldTime, oldTime)
}
candidate.prepare(`
  INSERT INTO video_merges (episode_id, drama_id, title, status, task_id, created_at)
  VALUES (1, 1, 'Legacy merge', 'completed', 'legacy-merge', ?)
`).run(oldTime)
candidate.prepare('INSERT INTO ai_activity_logs DEFAULT VALUES').run()
candidate.close()

function publish(overrides: Record<string, string> = {}) {
  const output = execFileSync(tsx, [publishScript], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DB_PATH: dbPath,
      STORAGE_PATH: storagePath,
      LINGDRAMA_FLAGSHIP_DRAMA_ID: '1',
      LINGDRAMA_FLAGSHIP_EPISODE_ID: '1',
      LINGDRAMA_FLAGSHIP_WORKSPACE_ID: '10',
      LINGDRAMA_FLAGSHIP_EXPECTED_TITLE: 'Legacy',
      LINGDRAMA_FLAGSHIP_CONFIRM: 'lingdrama-flagship-59s-20260814',
      LINGDRAMA_FLAGSHIP_BACKUP_CONFIRMED: 'true',
      ...overrides,
    },
    encoding: 'utf8',
  })
  return JSON.parse(output)
}

test('flagship publication is media-gated, transactional, and idempotent', () => {
  const first = publish()
  const second = publish()
  assert.equal(first.ok, true)
  assert.equal(first.media_validated, 22)
  assert.equal(second.verification.active_storyboards, 6)
  assert.equal(second.verification.source_video_tasks, 3)
  assert.equal(second.verification.merge_rows, 1)
  assert.equal(second.verification.other_active_merges, 0)
  assert.equal(second.verification.active_characters, 1)
  assert.equal(second.verification.active_scenes, 1)
  assert.equal(second.verification.episode_scene_links, 1)
  assert.equal(second.verification.storyboard_character_links, 6)
  assert.equal(second.verification.ai_activity_rows, 1)

  const db = new Database(dbPath, { readonly: true })
  const drama = db.prepare('SELECT * FROM dramas WHERE id=1').get() as any
  const episode = db.prepare('SELECT * FROM episodes WHERE id=1').get() as any
  assert.equal(drama.title, '第59秒｜灵动 AI 原创短剧')
  assert.equal(drama.is_public, 1)
  assert.equal(drama.total_duration, 48)
  assert.equal(episode.video_url, 'static/flagship-59s/masters/the-59th-second-16x9.mp4')
  assert.equal(episode.duration, 48)
  assert.equal((db.prepare("SELECT COUNT(*) count FROM storyboards WHERE status='flagship_published' AND deleted_at IS NULL").get() as any).count, 6)
  assert.equal((db.prepare("SELECT COUNT(*) count FROM storyboards WHERE status='legacy' AND deleted_at IS NOT NULL").get() as any).count, 3)
  assert.equal((db.prepare('SELECT COUNT(*) count FROM video_generations').get() as any).count, 3)
  assert.equal((db.prepare('SELECT COUNT(*) count FROM video_merges').get() as any).count, 2)
  assert.equal((db.prepare('SELECT COUNT(*) count FROM video_merges WHERE deleted_at IS NULL').get() as any).count, 1)
  assert.equal((db.prepare('SELECT COUNT(*) count FROM ai_activity_logs').get() as any).count, 1)
  assert.equal((db.prepare('SELECT COUNT(DISTINCT composed_video_url) count FROM storyboards WHERE deleted_at IS NULL').get() as any).count, 6)
  assert.deepEqual(
    db.prepare('SELECT name, role FROM characters WHERE drama_id=1 AND deleted_at IS NULL').get(),
    { name: '她', role: '主角 / 59 秒后的自己' },
  )
  assert.deepEqual(
    db.prepare('SELECT location, time, storyboard_count, status FROM scenes WHERE drama_id=1 AND deleted_at IS NULL').get(),
    { location: '高层公寓', time: '雨夜深夜', storyboard_count: 6, status: 'completed' },
  )
  db.close()
})

test('wrong workspace precondition aborts before any database write', () => {
  const beforeDb = new Database(dbPath, { readonly: true })
  const before = beforeDb.prepare('SELECT updated_at FROM dramas WHERE id=1').get() as { updated_at: string }
  beforeDb.close()
  assert.throws(() => publish({ LINGDRAMA_FLAGSHIP_WORKSPACE_ID: '999' }), /preconditions do not match/)
  const afterDb = new Database(dbPath, { readonly: true })
  const after = afterDb.prepare('SELECT updated_at FROM dramas WHERE id=1').get() as { updated_at: string }
  assert.equal(after.updated_at, before.updated_at)
  afterDb.close()
})

test('missing media aborts before any database write', () => {
  const required = path.join(storagePath, 'flagship-59s/masters/final-shot-06.mp4')
  fs.unlinkSync(required)
  const beforeDb = new Database(dbPath, { readonly: true })
  const before = beforeDb.prepare('SELECT updated_at FROM dramas WHERE id=1').get() as { updated_at: string }
  beforeDb.close()
  assert.throws(() => publish(), /Missing or empty media/)
  const afterDb = new Database(dbPath, { readonly: true })
  const after = afterDb.prepare('SELECT updated_at FROM dramas WHERE id=1').get() as { updated_at: string }
  assert.equal(after.updated_at, before.updated_at)
  afterDb.close()
})

test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }))
