import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { getAuth } from '../security/auth.js'
import { success } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'

const app = new Hono()

app.get('/summary', async (c) => {
  const auth = getAuth(c)
  const rows = db.select().from(schema.aiActivityLogs)
    .where(eq(schema.aiActivityLogs.workspaceId, auth.workspace.id))
    .orderBy(desc(schema.aiActivityLogs.createdAt)).all()
  const completed = rows.filter(row => row.status === 'completed')
  const byModel = new Map<string, { requests: number; input_tokens: number; output_tokens: number; total_tokens: number }>()
  const byAgent = new Map<string, number>()
  for (const row of rows) {
    const model = row.model || 'unknown'
    const current = byModel.get(model) || { requests: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0 }
    current.requests += 1
    current.input_tokens += row.inputTokens
    current.output_tokens += row.outputTokens
    current.total_tokens += row.totalTokens
    byModel.set(model, current)
    byAgent.set(row.agentType, (byAgent.get(row.agentType) || 0) + 1)
  }

  return success(c, {
    workspace_id: auth.workspace.id,
    total_requests: rows.length,
    completed_requests: completed.length,
    failed_requests: rows.filter(row => row.status === 'failed').length,
    input_tokens: rows.reduce((sum, row) => sum + row.inputTokens, 0),
    output_tokens: rows.reduce((sum, row) => sum + row.outputTokens, 0),
    total_tokens: rows.reduce((sum, row) => sum + row.totalTokens, 0),
    average_latency_ms: completed.length
      ? Math.round(completed.reduce((sum, row) => sum + (row.latencyMs || 0), 0) / completed.length)
      : 0,
    by_model: [...byModel.entries()].map(([model, usage]) => ({ model, ...usage })),
    by_agent: [...byAgent.entries()].map(([agent_type, requests]) => ({ agent_type, requests })),
    recent_activity: rows.slice(0, 12).map(toSnakeCase),
  })
})

app.get('/activity', async (c) => {
  const auth = getAuth(c)
  const rows = db.select().from(schema.aiActivityLogs)
    .where(eq(schema.aiActivityLogs.workspaceId, auth.workspace.id))
    .orderBy(desc(schema.aiActivityLogs.createdAt)).all()
  return success(c, rows.slice(0, 100).map(toSnakeCase))
})

export default app
