import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), '../data/lingdrama.db')
const STATIC_ROOT = process.env.STORAGE_PATH || path.resolve(process.cwd(), '../data/static')
const PUBLISH_TASK_ID = 'lingdrama-flagship-59s-20260814'
const FINAL_TITLE = '第59秒｜灵动 AI 原创短剧'

function requiredPositiveInteger(name: string) {
  const value = Number(process.env[name])
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be an explicit positive integer`)
  return value
}

function requiredString(name: string) {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

const DRAMA_ID = requiredPositiveInteger('LINGDRAMA_FLAGSHIP_DRAMA_ID')
const EPISODE_ID = requiredPositiveInteger('LINGDRAMA_FLAGSHIP_EPISODE_ID')
const WORKSPACE_ID = requiredPositiveInteger('LINGDRAMA_FLAGSHIP_WORKSPACE_ID')
const EXPECTED_TITLE = requiredString('LINGDRAMA_FLAGSHIP_EXPECTED_TITLE')
if (process.env.LINGDRAMA_FLAGSHIP_CONFIRM !== PUBLISH_TASK_ID) {
  throw new Error('LINGDRAMA_FLAGSHIP_CONFIRM does not match the publication task id')
}
if (process.env.LINGDRAMA_FLAGSHIP_BACKUP_CONFIRMED !== 'true') {
  throw new Error('LINGDRAMA_FLAGSHIP_BACKUP_CONFIRMED=true is required')
}
const DRY_RUN = process.env.LINGDRAMA_FLAGSHIP_DRY_RUN === 'true'

const media = {
  master16x9: 'static/flagship-59s/masters/the-59th-second-16x9.mp4',
  master9x16: 'static/flagship-59s/masters/the-59th-second-9x16.mp4',
  poster16x9: 'static/flagship-59s/posters/the-59th-second-16x9.jpg',
  poster9x16: 'static/flagship-59s/posters/the-59th-second-9x16.jpg',
  subtitleZh: 'static/flagship-59s/subtitles/the-59th-second.zh-CN.srt',
  subtitleEn: 'static/flagship-59s/subtitles/the-59th-second.en-US.srt',
  characterPortrait: 'static/flagship-59s/frames/panel-07.jpg',
  panels: Array.from({ length: 6 }, (_, index) => `static/flagship-59s/frames/panel-${String(index + 1).padStart(2, '0')}.jpg`),
  shots: Array.from({ length: 6 }, (_, index) => `static/flagship-59s/masters/final-shot-${String(index + 1).padStart(2, '0')}.mp4`),
}

const requiredMedia = [
  media.master16x9,
  media.master9x16,
  media.poster16x9,
  media.poster9x16,
  media.subtitleZh,
  media.subtitleEn,
  media.characterPortrait,
  ...media.panels,
  ...media.shots,
]

function absoluteMediaPath(relative: string) {
  return path.join(STATIC_ROOT, relative.replace(/^\/?static\//, ''))
}

function validateMedia() {
  const allRequiredMedia = [...requiredMedia, ...sourceVideoRows.map(row => row.localPath)]
  const invalid = allRequiredMedia.filter((relative) => {
    const absolute = absoluteMediaPath(relative)
    return !fs.existsSync(absolute) || !fs.statSync(absolute).isFile() || fs.statSync(absolute).size === 0
  })
  if (invalid.length) {
    throw new Error(`Flagship publish aborted. Missing or empty media:\n${invalid.map(item => `- ${item}`).join('\n')}`)
  }
  return allRequiredMedia.length
}

function assertTable(db: Database.Database, table: string) {
  const exists = db.prepare(`SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=?`).get(table)
  if (!exists) throw new Error(`Required database table is missing: ${table}`)
}

const projectMetadata = {
  title_en: 'The 59th Second',
  subtitle: '灵动 AI 原创悬疑短片',
  subtitle_en: 'A LingDrama Original AI Thriller',
  duration_seconds: 48,
  deliverables: {
    landscape_master: media.master16x9,
    vertical_master: media.master9x16,
    poster_landscape: media.poster16x9,
    poster_vertical: media.poster9x16,
    subtitles: { zh_CN: media.subtitleZh, en_US: media.subtitleEn },
  },
  production: {
    text_model: 'DeepSeek v4 Pro',
    image_model: 'Seedream 5.0 Pro',
    video_model: 'Seedance 2.0',
    structure: '6 × 8-second shots',
    generated_motion_shots: [1, 4, 6],
    continuity_still_shots: [2, 3, 5],
    local_post: ['UI', 'countdown', 'bilingual subtitles', 'voice', 'sound design', 'music', 'mix', 'delivery encoding'],
  },
  provenance: 'LingDrama original production. AI activity remains sourced only from real platform calls.',
}

const scriptContent = `## S1 | 内景 · 高层公寓 | 雨夜深夜

雨水沿落地窗缓慢滑落。她独自站在石墨黑的客厅里，手机突然震动。屏幕亮起一条来自自己号码的语音留言，发送时间却在五十九秒之后。

未来的她：（手机窄频，克制而急促）听好，我是五十九秒后的你。门响之后，千万别开。

她抬眼看向深色木门。低沉的倒计时脉冲开始，电梯抵达的提示音从走廊尽头传来，脚步声一步一步逼近。

三下敲门。门外传来与她完全相同的声音。

门外的她：（近在门后）是我。开门。

她看向门禁监视器。雨夜蓝黑的画面里，另一个她穿着同样的炭灰毛衣，留着同样的黑色短发，左耳戴着同一枚银色耳骨夹，正一动不动地望向镜头。

未来的她：（语音末尾）她会和我长得一模一样。

倒计时归零。门把手从外侧缓慢压下，她退进黑暗。画面切黑。

片名：第59秒 / THE 59TH SECOND`

const beats = [
  {
    title: '来自未来的语音',
    description: '雨夜公寓里，她的手机收到来自自己号码、时间标记在五十九秒后的语音。',
    action: '手机轻震，她由窗边的安静转为警觉，视线移向入口。',
    dialogue: '',
    shotType: '中远景', angle: '平视', movement: '缓慢推近',
    atmosphere: '石墨黑、雨夜蓝与一处钨丝暖光，克制真实。',
    imagePrompt: 'Rain-night premium high-rise apartment, lone East Asian woman, graphite concrete, charcoal sweater, restrained cinematic thriller lighting, no text or UI.',
    videoPrompt: '0-3秒：稳定缓慢推近雨夜公寓中的她。3-5秒：手中空白屏手机轻震。5-8秒：她低头后警觉望向入口。',
    bgmPrompt: '低频持续音与微弱雨声，末尾加入一次手机提示。', soundEffect: '持续雨声、手机轻震',
  },
  {
    title: '同一个号码',
    description: '手机玻璃映出她的眼睛，她听见五十九秒后的自己发出警告。',
    action: '焦点从空白手机玻璃中的倒影移到她真实的眼睛，呼吸突然停住。',
    dialogue: '未来的她：听好，我是五十九秒后的你。门响之后，千万别开。',
    shotType: '微距特写', angle: '平视', movement: '微距推近与焦点转换',
    atmosphere: '冷蓝暗部压住空间，脸部仅有克制的手机反光。',
    imagePrompt: 'Macro reflection of alert eyes in a blank phone screen, original East Asian woman, natural hand anatomy, cinematic shallow depth of field, no text or UI.',
    videoPrompt: '0-3秒：微距靠近空白手机玻璃。3-6秒：焦点由眼睛倒影切到真人眼睛。6-8秒：拇指停在屏幕上方。',
    bgmPrompt: '雨声下加入极轻倒计时低频脉冲。', soundEffect: '手机窄频语音、呼吸停顿',
  },
  {
    title: '脚步正在靠近',
    description: '她走向深色木门，走廊电梯灯亮起，脚步声沿门外靠近。',
    action: '她缓慢转身走向门口，手停在门把附近，不敢触碰。',
    dialogue: '',
    shotType: '中景', angle: '侧后方', movement: '近乎不可见的推镜',
    atmosphere: '走廊冷光从门缝渗入，室内仍保持雨夜蓝与钨丝暖光。',
    imagePrompt: 'Woman approaching a dark oak apartment door, cold elevator light beyond fluted corridor glass, restrained premium thriller, no stranger visible.',
    videoPrompt: '0-3秒：她从手机转向门。3-5秒：门外电梯冷光变亮。5-8秒：脚步阴影靠近，她保持静止。',
    bgmPrompt: '倒计时低频脉冲逐渐清晰，保持极简。', soundEffect: '电梯提示音、由远及近的脚步、雨声',
  },
  {
    title: '是我，开门',
    description: '三下克制的敲门声落在木门上，门外传来与她完全相同的声音。',
    action: '她抬手靠近门锁却停在半空，目光转向门禁监视器。',
    dialogue: '门外的她：是我。开门。',
    shotType: '侧面中景', angle: '平视', movement: '极轻横移',
    atmosphere: '深色木门占据画面，蓝色走廊漏光让悬停的手更孤立。',
    imagePrompt: 'Profile of the same woman at a dark oak entry door, hand suspended before the lock, rain-blue corridor spill, cinematic realism, no text.',
    videoPrompt: '0-2秒：她靠近门口停下。2-4秒：三下敲门令门与把手轻微震动。4-6秒：手抬起却停住。6-8秒：目光移向监视器。',
    bgmPrompt: '敲门前主动留白，门外声音后恢复低频持续音。', soundEffect: '三下沉稳敲门、门禁扬声器轻微电流声',
  },
  {
    title: '门外的另一个她',
    description: '监视器画面逐渐解析，门外站着与她外貌、衣着和耳骨夹完全一致的另一个她。',
    action: '她望向监视器，焦点在门外替身与前景真实面孔之间切换。',
    dialogue: '',
    shotType: '过肩近景', angle: '平视', movement: '缓慢推近与焦点转换',
    atmosphere: '监视器冷光成为最冷的光源，恐惧来自完全一致而非夸张变形。',
    imagePrompt: 'Over-shoulder view of a physical door monitor showing one identical woman outside, exact same bob haircut, charcoal sweater and silver left ear cuff, no interface or text.',
    videoPrompt: '0-3秒：缓慢推近无界面监视器。3-6秒：画面解析出门外一模一样的她。6-8秒：焦点切回前景真人的眼睛。',
    bgmPrompt: '持续次低频与细小电流声，保持克制。', soundEffect: '监视器电流底噪、受控呼吸、雨声',
  },
  {
    title: '第59秒',
    description: '警告在倒计时归零时结束，门把从外侧缓慢压下，黑场切出片名。',
    action: '门把机械转动，她后退进黑暗；画面在门打开前硬切片名。',
    dialogue: '未来的她：她会和我长得一模一样。',
    shotType: '极端特写', angle: '平视', movement: '向黑暗推进',
    atmosphere: '黑色主导，仅在金属门把边缘留下一次克制红色警报反光。',
    imagePrompt: 'Extreme macro of a brushed black metal door handle with restrained red reflection, woman soft silhouette behind, grounded cinematic thriller, no hand on handle, no text.',
    videoPrompt: '0-3秒：门把静止，红色反光出现。3-5秒：她的虚焦轮廓屏住呼吸。5-7秒：门把自行缓慢下压。7-8秒：门锁轻动，镜头推进黑暗。',
    bgmPrompt: '倒计时脉冲归零后以低沉冲击切断。', soundEffect: '语音结束、门锁机械声、门把摩擦、低沉片名冲击',
  },
]

const sourceVideoRows = [
  {
    taskId: 'task_7PPhgAJnHhb3zcsNN2DONpzmFSlw4BGw',
    localPath: 'static/videos/0a9ddf7e-3581-41b1-9f10-d95237380a89.mp4',
    imageUrl: media.panels[0], prompt: beats[0].videoPrompt,
    createdAt: '2026-08-13T16:17:41.000Z', completedAt: '2026-08-13T16:20:40.000Z',
  },
  {
    taskId: 'task_zM73ZzS386W9G76bRnXtKa2eis2nB1Nc',
    localPath: 'static/videos/cb4c1b16-18c7-45c7-b11f-fc8f33a0d9ff.mp4',
    imageUrl: media.panels[5], prompt: beats[5].videoPrompt,
    createdAt: '2026-08-13T16:23:45.000Z', completedAt: '2026-08-13T16:27:57.000Z',
  },
  {
    taskId: 'task_wYfaBU6zB6FMU010VazAQ5R69WiAgzWK',
    localPath: 'static/videos/b56ab28e-fb51-498c-9262-cdf45e9e409d.mp4',
    imageUrl: media.panels[3], prompt: beats[3].videoPrompt,
    createdAt: '2026-08-13T16:28:49.000Z', completedAt: '2026-08-13T16:33:20.000Z',
  },
]

const validatedMediaCount = validateMedia()

const db = new Database(DB_PATH, { timeout: 30000 })
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 30000')

for (const table of [
  'dramas', 'episodes', 'characters', 'scenes', 'episode_scenes', 'storyboards',
  'storyboard_characters', 'video_generations', 'video_merges', 'ai_activity_logs',
]) {
  assertTable(db, table)
}

const drama = db.prepare('SELECT id, workspace_id, title FROM dramas WHERE id=? AND deleted_at IS NULL').get(DRAMA_ID) as {
  id: number
  workspace_id: number | null
  title: string
} | undefined
const episode = db.prepare('SELECT id, drama_id FROM episodes WHERE id=? AND deleted_at IS NULL').get(EPISODE_ID) as { id: number; drama_id: number } | undefined
if (
  !drama
  || !episode
  || episode.drama_id !== DRAMA_ID
  || drama.workspace_id !== WORKSPACE_ID
  || ![EXPECTED_TITLE, FINAL_TITLE].includes(drama.title)
) {
  db.close()
  throw new Error('Flagship publish aborted. Target project preconditions do not match.')
}

const publish = db.transaction(() => {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE dramas SET
      title=?, description=?, genre=?, style=?, total_episodes=1, total_duration=48,
      status='completed', thumbnail=?, tags=?, metadata=?, is_public=1, updated_at=?
    WHERE id=?
  `).run(
    FINAL_TITLE,
    '深夜，她收到 59 秒后的自己发来的语音：门响之后，千万别开。倒计时归零时，门外站着另一个她。',
    '都市悬疑', 'cinematic thriller', media.poster16x9,
    JSON.stringify(['AI短剧', '悬疑', '未来语音', '双重身份', 'LingDrama Original']),
    JSON.stringify(projectMetadata), now, DRAMA_ID,
  )
  db.prepare(`
    UPDATE episodes SET
      episode_number=1, title=?, content=?, script_content=?, description=?, duration=48,
      status='completed', video_url=?, thumbnail=?, updated_at=?
    WHERE id=? AND drama_id=?
  `).run(
    '第1集｜门外的另一个我',
    '深夜，她收到来自五十九秒后自己的语音警告。随着敲门、脚步与倒计时逐一应验，门禁画面里出现了另一个完全相同的她。',
    scriptContent,
    '她只有 59 秒判断，门外的人究竟是谁。',
    media.master16x9, media.poster16x9, now, EPISODE_ID, DRAMA_ID,
  )

  const existingCharacter = db.prepare(`
    SELECT id FROM characters WHERE drama_id=?
    ORDER BY CASE WHEN id=1 THEN 0 ELSE 1 END, id LIMIT 1
  `).get(DRAMA_ID) as { id: number } | undefined
  let characterId: number
  if (existingCharacter) {
    characterId = existingCharacter.id
    db.prepare(`
      UPDATE characters SET
        name='她', role='主角 / 59 秒后的自己',
        description='一名独居的年轻女性，在雨夜收到来自未来自己的警告。',
        appearance='齐肩直黑短发，炭灰罗纹毛衣，左耳细银色耳骨夹，神情克制警觉。',
        personality='冷静、敏锐、克制', voice_style='低声、真实、带轻微手机窄频质感',
        image_url=?, reference_images=?, sort_order=1, local_path=?, updated_at=?, deleted_at=NULL
      WHERE id=? AND drama_id=?
    `).run(
      media.characterPortrait, JSON.stringify([media.characterPortrait]),
      media.characterPortrait, now, characterId, DRAMA_ID,
    )
  } else {
    characterId = Number(db.prepare(`
      INSERT INTO characters (
        drama_id, name, role, description, appearance, personality, voice_style,
        image_url, reference_images, sort_order, local_path, created_at, updated_at, deleted_at
      ) VALUES (?, '她', '主角 / 59 秒后的自己',
        '一名独居的年轻女性，在雨夜收到来自未来自己的警告。',
        '齐肩直黑短发，炭灰罗纹毛衣，左耳细银色耳骨夹，神情克制警觉。',
        '冷静、敏锐、克制', '低声、真实、带轻微手机窄频质感', ?, ?, 1, ?, ?, ?, NULL)
    `).run(
      DRAMA_ID, media.characterPortrait, JSON.stringify([media.characterPortrait]),
      media.characterPortrait, now, now,
    ).lastInsertRowid)
  }
  db.prepare(`
    UPDATE characters SET deleted_at=COALESCE(deleted_at, ?), updated_at=?
    WHERE drama_id=? AND id != ?
  `).run(now, now, DRAMA_ID, characterId)

  const existingScene = db.prepare(`
    SELECT id FROM scenes WHERE drama_id=?
    ORDER BY CASE WHEN id=1 THEN 0 ELSE 1 END, id LIMIT 1
  `).get(DRAMA_ID) as { id: number } | undefined
  let sceneId: number
  const scenePrompt = '雨夜深夜的高层公寓：石墨黑与雨夜蓝为主，深色木门、落地窗和克制钨丝暖光构成统一的写实悬疑空间。'
  if (existingScene) {
    sceneId = existingScene.id
    db.prepare(`
      UPDATE scenes SET
        episode_id=?, location='高层公寓', time='雨夜深夜', prompt=?, storyboard_count=6,
        image_url=?, status='completed', local_path=?, updated_at=?, deleted_at=NULL
      WHERE id=? AND drama_id=?
    `).run(EPISODE_ID, scenePrompt, media.panels[0], media.panels[0], now, sceneId, DRAMA_ID)
  } else {
    sceneId = Number(db.prepare(`
      INSERT INTO scenes (
        drama_id, episode_id, location, time, prompt, storyboard_count, image_url,
        status, local_path, created_at, updated_at, deleted_at
      ) VALUES (?, ?, '高层公寓', '雨夜深夜', ?, 6, ?, 'completed', ?, ?, ?, NULL)
    `).run(DRAMA_ID, EPISODE_ID, scenePrompt, media.panels[0], media.panels[0], now, now).lastInsertRowid)
  }
  db.prepare(`
    UPDATE scenes SET deleted_at=COALESCE(deleted_at, ?), updated_at=?
    WHERE drama_id=? AND id != ?
  `).run(now, now, DRAMA_ID, sceneId)
  db.prepare('DELETE FROM episode_scenes WHERE episode_id=?').run(EPISODE_ID)
  db.prepare(`
    INSERT INTO episode_scenes (episode_id, scene_id, created_at) VALUES (?, ?, ?)
  `).run(EPISODE_ID, sceneId, now)

  // The old three-shot version remains auditable but is excluded from every
  // current production query. Re-running updates the same six published rows.
  db.prepare(`
    UPDATE storyboards SET deleted_at=COALESCE(deleted_at, ?), updated_at=?
    WHERE episode_id=? AND status != 'flagship_published'
  `).run(now, now, EPISODE_ID)

  const existingPublished = db.prepare(`
    SELECT id, storyboard_number FROM storyboards
    WHERE episode_id=? AND status='flagship_published'
    ORDER BY storyboard_number
  `).all(EPISODE_ID) as Array<{ id: number; storyboard_number: number }>
  const idsByNumber = new Map(existingPublished.map(row => [row.storyboard_number, row.id]))
  const insertStoryboard = db.prepare(`
    INSERT INTO storyboards (
      episode_id, scene_id, storyboard_number, title, location, time, shot_type, angle, movement,
      action, result, atmosphere, image_prompt, video_prompt, bgm_prompt, sound_effect,
      dialogue, description, duration, composed_image, first_frame_image, video_url,
      subtitle_url, composed_video_url, status, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 8, ?, ?, ?, ?, ?, 'flagship_published', ?, ?, NULL)
  `)
  const updateStoryboard = db.prepare(`
    UPDATE storyboards SET
      scene_id=?, title=?, location=?, time=?, shot_type=?, angle=?, movement=?, action=?, result=?, atmosphere=?,
      image_prompt=?, video_prompt=?, bgm_prompt=?, sound_effect=?, dialogue=?, description=?, duration=8,
      composed_image=?, first_frame_image=?, video_url=?, subtitle_url=?, composed_video_url=?,
      status='flagship_published', updated_at=?, deleted_at=NULL
    WHERE id=?
  `)

  const storyboardIds: number[] = []
  for (let index = 0; index < beats.length; index++) {
    const number = index + 1
    const beat = beats[index]
    const result = index === beats.length - 1
      ? '门把压下，画面在门打开前切黑并出现片名。'
      : '悬念继续升级，动作与视线自然衔接到下一镜。'
    const subtitle = index === beats.length - 1 ? media.subtitleZh : null
    const composed = media.shots[index]
    const values = [
      beat.title, '高层公寓', '雨夜深夜', beat.shotType, beat.angle, beat.movement,
      beat.action, result, beat.atmosphere, beat.imagePrompt, beat.videoPrompt,
      beat.bgmPrompt, beat.soundEffect, beat.dialogue, beat.description,
      media.panels[index], media.panels[index], media.shots[index], subtitle, composed,
    ]
    const existingId = idsByNumber.get(number)
    if (existingId) {
      updateStoryboard.run(sceneId, ...values, now, existingId)
      storyboardIds.push(existingId)
    } else {
      const inserted = insertStoryboard.run(
        EPISODE_ID, sceneId, number, ...values.slice(0, 15),
        ...values.slice(15), now, now,
      )
      storyboardIds.push(Number(inserted.lastInsertRowid))
    }
  }

  db.prepare(`
    UPDATE storyboards SET deleted_at=COALESCE(deleted_at, ?), updated_at=?
    WHERE episode_id=? AND status='flagship_published' AND storyboard_number NOT BETWEEN 1 AND 6
  `).run(now, now, EPISODE_ID)

  db.prepare(`
    DELETE FROM storyboard_characters
    WHERE storyboard_id IN (SELECT id FROM storyboards WHERE episode_id=?)
  `).run(EPISODE_ID)
  const linkCharacter = db.prepare(`
    INSERT INTO storyboard_characters (storyboard_id, character_id) VALUES (?, ?)
  `)
  for (const storyboardId of storyboardIds) linkCharacter.run(storyboardId, characterId)

  for (const row of sourceVideoRows) {
    const existing = db.prepare('SELECT id FROM video_generations WHERE task_id=?').get(row.taskId) as { id: number } | undefined
    if (existing) {
      db.prepare(`
        UPDATE video_generations SET
          drama_id=?, provider='openai', prompt=?, model='doubao-seedance-2-0',
          reference_mode='single', image_url=?, duration=8, fps=24, resolution='1280x720',
          aspect_ratio='16:9', video_url=NULL, local_path=?, status='completed', error_msg=NULL,
          width=1280, height=720, updated_at=?, completed_at=?, deleted_at=NULL
        WHERE id=?
      `).run(DRAMA_ID, row.prompt, row.imageUrl, row.localPath, row.completedAt, row.completedAt, existing.id)
    } else {
      db.prepare(`
        INSERT INTO video_generations (
          drama_id, provider, prompt, model, reference_mode, image_url, duration, fps,
          resolution, aspect_ratio, video_url, local_path, status, task_id, width, height,
          created_at, updated_at, completed_at, deleted_at
        ) VALUES (?, 'openai', ?, 'doubao-seedance-2-0', 'single', ?, 8, 24,
          '1280x720', '16:9', NULL, ?, 'completed', ?, 1280, 720, ?, ?, ?, NULL)
      `).run(DRAMA_ID, row.prompt, row.imageUrl, row.localPath, row.taskId, row.createdAt, row.completedAt, row.completedAt)
    }
  }

  const mergeScenes = JSON.stringify(media.shots)
  db.prepare(`
    UPDATE video_merges SET deleted_at=COALESCE(deleted_at, ?)
    WHERE episode_id=? AND drama_id=? AND task_id != ?
  `).run(now, EPISODE_ID, DRAMA_ID, PUBLISH_TASK_ID)
  const existingMerge = db.prepare('SELECT id FROM video_merges WHERE task_id=?').get(PUBLISH_TASK_ID) as { id: number } | undefined
  if (existingMerge) {
    db.prepare(`
      UPDATE video_merges SET
        episode_id=?, drama_id=?, title=?, provider=?, model=?, status='completed',
        scenes=?, merged_url=?, duration=48, error_msg=NULL, completed_at=?, deleted_at=NULL
      WHERE id=?
    `).run(
      EPISODE_ID, DRAMA_ID, '第59秒｜最终母版', 'LingDrama Editorial',
      'DeepSeek v4 Pro + Seedream 5.0 Pro + Seedance 2.0 + local editorial pipeline',
      mergeScenes, media.master16x9, now, existingMerge.id,
    )
  } else {
    db.prepare(`
      INSERT INTO video_merges (
        episode_id, drama_id, title, provider, model, status, scenes, merged_url,
        duration, task_id, created_at, completed_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, 48, ?, ?, ?, NULL)
    `).run(
      EPISODE_ID, DRAMA_ID, '第59秒｜最终母版', 'LingDrama Editorial',
      'DeepSeek v4 Pro + Seedream 5.0 Pro + Seedance 2.0 + local editorial pipeline',
      mergeScenes, media.master16x9, PUBLISH_TASK_ID, now, now,
    )
  }

  const verification = {
    active_storyboards: (db.prepare(`
      SELECT COUNT(*) count FROM storyboards
      WHERE episode_id=? AND deleted_at IS NULL AND status='flagship_published'
    `).get(EPISODE_ID) as { count: number }).count,
    source_video_tasks: (db.prepare(`
      SELECT COUNT(*) count FROM video_generations
      WHERE task_id IN (?, ?, ?) AND deleted_at IS NULL
    `).get(...sourceVideoRows.map(row => row.taskId)) as { count: number }).count,
    merge_rows: (db.prepare('SELECT COUNT(*) count FROM video_merges WHERE task_id=? AND deleted_at IS NULL')
      .get(PUBLISH_TASK_ID) as { count: number }).count,
    other_active_merges: (db.prepare(`
      SELECT COUNT(*) count FROM video_merges
      WHERE episode_id=? AND drama_id=? AND task_id != ? AND deleted_at IS NULL
    `).get(EPISODE_ID, DRAMA_ID, PUBLISH_TASK_ID) as { count: number }).count,
    active_characters: (db.prepare(`
      SELECT COUNT(*) count FROM characters WHERE drama_id=? AND deleted_at IS NULL
    `).get(DRAMA_ID) as { count: number }).count,
    active_scenes: (db.prepare(`
      SELECT COUNT(*) count FROM scenes WHERE drama_id=? AND deleted_at IS NULL
    `).get(DRAMA_ID) as { count: number }).count,
    episode_scene_links: (db.prepare(`
      SELECT COUNT(*) count FROM episode_scenes WHERE episode_id=? AND scene_id=?
    `).get(EPISODE_ID, sceneId) as { count: number }).count,
    storyboard_character_links: (db.prepare(`
      SELECT COUNT(*) count FROM storyboard_characters sc
      JOIN storyboards s ON s.id=sc.storyboard_id
      WHERE s.episode_id=? AND s.status='flagship_published' AND s.deleted_at IS NULL
        AND sc.character_id=?
    `).get(EPISODE_ID, characterId) as { count: number }).count,
    ai_activity_rows: (db.prepare('SELECT COUNT(*) count FROM ai_activity_logs').get() as { count: number }).count,
  }
  if (
    verification.active_storyboards !== 6
    || verification.source_video_tasks !== 3
    || verification.merge_rows !== 1
    || verification.other_active_merges !== 0
    || verification.active_characters !== 1
    || verification.active_scenes !== 1
    || verification.episode_scene_links !== 1
    || verification.storyboard_character_links !== 6
  ) {
    throw new Error(`Post-publish invariant failed: ${JSON.stringify(verification)}`)
  }

  return {
    drama_id: DRAMA_ID,
    episode_id: EPISODE_ID,
    character_id: characterId,
    scene_id: sceneId,
    storyboards: storyboardIds,
    source_video_tasks: sourceVideoRows.map(row => row.taskId),
    merge_task_id: PUBLISH_TASK_ID,
    verification,
  }
})

try {
  if (DRY_RUN) {
    console.log(JSON.stringify({
      ok: true,
      dry_run: true,
      media_validated: validatedMediaCount,
      drama_id: DRAMA_ID,
      episode_id: EPISODE_ID,
      workspace_id: WORKSPACE_ID,
      current_title: drama.title,
    }, null, 2))
  } else {
    const result = publish()
    console.log(JSON.stringify({ ok: true, dry_run: false, media_validated: validatedMediaCount, ...result }, null, 2))
  }
} finally {
  db.close()
}
