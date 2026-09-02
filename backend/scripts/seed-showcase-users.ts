import fs from 'node:fs'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../src/db/index.js'
import { hashPassword } from '../src/security/passwords.js'

type SeedSecretFile = {
  client_password?: string
  admin_password?: string
  passwords?: Record<string, string>
}

const profiles = [
  {
    email: 'maya.chen@lingdrama.ai',
    displayName: 'Maya Chen',
    title: 'Executive Producer',
    city: 'Los Angeles',
    country: 'United States',
    locale: 'en-US',
    timezone: 'America/Los_Angeles',
    slug: 'maya-chen-productions',
    organization: 'LingDrama',
    workspace: 'Maya Chen · Los Angeles',
    project: {
      title: 'After the Last Take',
      description: 'A final pickup shot reveals that the actress who vanished never left the soundstage.',
      genre: 'Mystery Thriller',
      content: 'The final pickup begins after midnight. Executive producer Ava Lin notices a second figure reflected in the monitor—someone whose access badge was disabled three days ago.',
      episode: 'Episode 1 · The Reflection',
    },
  },
  {
    email: 'daniel.brooks@lingdrama.ai',
    displayName: 'Daniel Brooks',
    title: 'Development Producer',
    city: 'New York',
    country: 'United States',
    locale: 'en-US',
    timezone: 'America/New_York',
    slug: 'daniel-brooks-studio',
    organization: 'LingDrama',
    workspace: 'Daniel Brooks · New York',
    project: {
      title: 'Signal at Midnight',
      description: 'A radio host receives tomorrow’s emergency broadcast one night early.',
      genre: 'Tech Thriller',
      content: 'At 12:07 a.m., Jonah receives a broadcast in his own voice warning New York to evacuate. The transmission is timestamped twenty-four hours in the future.',
      episode: 'Episode 1 · Tomorrow’s Warning',
    },
  },
  {
    email: 'sofia.reyes@lingdrama.ai',
    displayName: 'Sofia Reyes',
    title: 'Creative Producer',
    city: 'Miami',
    country: 'United States',
    locale: 'en-US',
    timezone: 'America/New_York',
    slug: 'sofia-reyes-pictures',
    organization: 'LingDrama',
    workspace: 'Sofia Reyes · Miami',
    project: {
      title: 'Second Sunrise',
      description: 'Two strangers wake to the same impossible sunrise and one shared memory.',
      genre: 'Romantic Mystery',
      content: 'A second sunrise illuminates Miami at 7:14 a.m. Elena and Mateo recognize the same childhood photograph, though they have never met.',
      episode: 'Episode 1 · 7:14 A.M.',
    },
  },
  {
    email: 'kay.leung@lingdrama.ai',
    displayName: '梁嘉怡 Kay Leung',
    title: '监制',
    city: 'Hong Kong',
    country: 'Hong Kong',
    locale: 'zh-CN',
    timezone: 'Asia/Hong_Kong',
    slug: 'kay-leung-productions',
    organization: 'LingDrama',
    workspace: '梁嘉怡 Kay Leung · Hong Kong',
    project: {
      title: '霓虹尽头',
      description: '一名剪接师在深夜素材中，看见了尚未发生的维港追逐。',
      genre: '都市悬疑',
      content: '凌晨两点，剪接师阿澄在未命名素材里看见自己奔过雨夜码头。画面右下角的时间，是明天晚上十一点五十九分。',
      episode: '第1集 · 明日素材',
    },
  },
]

function loadSecrets(): SeedSecretFile {
  const file = process.env.LINGDRAMA_SEED_PASSWORD_FILE
  const fromFile = file ? JSON.parse(fs.readFileSync(file, 'utf8')) as SeedSecretFile : {}
  return {
    client_password: process.env.LINGDRAMA_CLIENT_PASSWORD || fromFile.client_password,
    admin_password: process.env.LINGDRAMA_ADMIN_PASSWORD || fromFile.admin_password,
    passwords: fromFile.passwords || {},
  }
}

function passwordFor(email: string, admin: boolean, secrets: SeedSecretFile) {
  const password = secrets.passwords?.[email]
    || (admin ? secrets.admin_password : secrets.client_password)
  if (!password) {
    throw new Error(`Missing password for ${email}. Set LINGDRAMA_SEED_PASSWORD_FILE or password environment variables.`)
  }
  return password
}

function upsertOrganization(input: typeof profiles[number], now: string) {
  let organization = db.select().from(schema.organizations)
    .where(eq(schema.organizations.slug, input.slug)).get()
  if (!organization) {
    const result = db.insert(schema.organizations).values({
      name: input.organization,
      slug: input.slug,
      region: input.country,
      city: input.city,
      locale: input.locale,
      timezone: input.timezone,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run()
    organization = db.select().from(schema.organizations)
      .where(eq(schema.organizations.id, Number(result.lastInsertRowid))).get()!
  }
  return organization
}

function upsertWorkspace(input: typeof profiles[number], organizationId: number, now: string) {
  let workspace = db.select().from(schema.workspaces).where(eq(schema.workspaces.slug, input.slug)).get()
  if (!workspace) {
    const result = db.insert(schema.workspaces).values({
      organizationId,
      name: input.workspace,
      slug: input.slug,
      region: input.country,
      city: input.city,
      locale: input.locale,
      timezone: input.timezone,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run()
    workspace = db.select().from(schema.workspaces)
      .where(eq(schema.workspaces.id, Number(result.lastInsertRowid))).get()!
  }
  return workspace
}

function upsertUser(input: typeof profiles[number], password: string, now: string, isPlatformAdmin = false) {
  let user = db.select().from(schema.users).where(eq(schema.users.email, input.email)).get()
  const passwordHash = hashPassword(password)
  if (!user) {
    const result = db.insert(schema.users).values({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      title: input.title,
      locale: input.locale,
      city: input.city,
      country: input.country,
      isPlatformAdmin,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run()
    user = db.select().from(schema.users).where(eq(schema.users.id, Number(result.lastInsertRowid))).get()!
  } else {
    db.update(schema.users).set({
      displayName: input.displayName,
      title: input.title,
      locale: input.locale,
      city: input.city,
      country: input.country,
      isPlatformAdmin,
      status: 'active',
      ...(process.env.LINGDRAMA_RESET_SEED_PASSWORDS === 'true' ? { passwordHash } : {}),
      updatedAt: now,
    }).where(eq(schema.users.id, user.id)).run()
  }
  return user
}

function ensureMemberships(organizationId: number, workspaceId: number, userId: number, now: string, role: string) {
  const orgMembership = db.select().from(schema.organizationMemberships).where(and(
    eq(schema.organizationMemberships.organizationId, organizationId),
    eq(schema.organizationMemberships.userId, userId),
  )).get()
  if (!orgMembership) db.insert(schema.organizationMemberships).values({ organizationId, userId, role, createdAt: now }).run()

  const workspaceMembership = db.select().from(schema.workspaceMemberships).where(and(
    eq(schema.workspaceMemberships.workspaceId, workspaceId),
    eq(schema.workspaceMemberships.userId, userId),
  )).get()
  if (!workspaceMembership) db.insert(schema.workspaceMemberships).values({ workspaceId, userId, role, createdAt: now }).run()
}

function ensureProject(input: typeof profiles[number], workspaceId: number, userId: number, now: string) {
  let project = db.select().from(schema.dramas).where(and(
    eq(schema.dramas.workspaceId, workspaceId),
    eq(schema.dramas.title, input.project.title),
    isNull(schema.dramas.deletedAt),
  )).get()
  if (!project) {
    const result = db.insert(schema.dramas).values({
      workspaceId,
      createdBy: userId,
      title: input.project.title,
      description: input.project.description,
      genre: input.project.genre,
      style: 'cinematic',
      totalEpisodes: 1,
      status: 'in_development',
      tags: JSON.stringify(['Original', input.city]),
      createdAt: now,
      updatedAt: now,
    }).run()
    project = db.select().from(schema.dramas).where(eq(schema.dramas.id, Number(result.lastInsertRowid))).get()!
  }
  const episode = db.select().from(schema.episodes).where(and(
    eq(schema.episodes.dramaId, project.id),
    eq(schema.episodes.episodeNumber, 1),
  )).get()
  if (!episode) {
    db.insert(schema.episodes).values({
      dramaId: project.id,
      episodeNumber: 1,
      title: input.project.episode,
      content: input.project.content,
      status: 'writing',
      createdAt: now,
      updatedAt: now,
    }).run()
  }
}

const secrets = loadSecrets()
const now = new Date().toISOString()

const adminProfile = {
  ...profiles[0],
  email: process.env.LINGDRAMA_ADMIN_EMAIL || 'operations@lingdrama.ai',
  displayName: 'LingDrama Operations',
  title: 'Platform Administrator',
  city: 'Shantou',
  country: 'China',
  locale: 'zh-CN',
  timezone: 'Asia/Shanghai',
  slug: 'lingdrama-operations',
  organization: 'LingDrama Operations',
  workspace: 'LingDrama Operations',
}

const adminOrganization = upsertOrganization(adminProfile, now)
const adminWorkspace = upsertWorkspace(adminProfile, adminOrganization.id, now)
const admin = upsertUser(adminProfile, passwordFor(adminProfile.email, true, secrets), now, true)
ensureMemberships(adminOrganization.id, adminWorkspace.id, admin.id, now, 'owner')

// Preserve the current showcase production by assigning only unowned legacy
// projects to the platform operations workspace.
db.update(schema.dramas).set({ workspaceId: adminWorkspace.id, createdBy: admin.id, updatedAt: now })
  .where(isNull(schema.dramas.workspaceId)).run()
db.update(schema.dramas).set({ isPublic: true, updatedAt: now })
  .where(eq(schema.dramas.title, '第59秒｜灵动 AI 原创短剧')).run()

for (const profile of profiles) {
  const organization = upsertOrganization(profile, now)
  const workspace = upsertWorkspace(profile, organization.id, now)
  const user = upsertUser(profile, passwordFor(profile.email, false, secrets), now)
  ensureMemberships(organization.id, workspace.id, user.id, now, 'owner')
  ensureProject(profile, workspace.id, user.id, now)
}

console.log(JSON.stringify({
  ok: true,
  admin_email: adminProfile.email,
  client_emails: profiles.map(profile => profile.email),
  passwords_written_to_database: false,
  note: 'Passwords were stored only as scrypt hashes. AI activity is intentionally not seeded; it is recorded from real calls.',
}, null, 2))
