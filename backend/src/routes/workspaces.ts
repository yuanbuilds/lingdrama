import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { getAuth } from '../security/auth.js'
import { success } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'

const app = new Hono()

app.get('/', async (c) => {
  const auth = getAuth(c)
  const memberships = db.select().from(schema.workspaceMemberships)
    .where(eq(schema.workspaceMemberships.userId, auth.user.id)).all()
  const rows = db.select().from(schema.workspaces).all().filter(row => row.status === 'active')
  const visible = auth.user.isPlatformAdmin
    ? rows.map(workspace => ({ workspace, role: 'platform_admin' }))
    : memberships.map(membership => ({
      workspace: rows.find(row => row.id === membership.workspaceId),
      role: membership.role,
    })).filter(entry => entry.workspace)

  return success(c, visible.map(({ workspace: maybeWorkspace, role }) => {
    const workspace = maybeWorkspace!
    const organization = db.select().from(schema.organizations)
      .where(eq(schema.organizations.id, workspace.organizationId)).get()
    return {
      ...toSnakeCase(workspace),
      role,
      organization: organization ? toSnakeCase(organization) : null,
      active: workspace.id === auth.workspace.id,
    }
  }))
})

export default app
