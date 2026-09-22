import { desc } from 'drizzle-orm'
import { db } from '@/db'
import { wikiGaps } from '@/db/schema'

export interface NewWikiGap {
  userId: string | null
  conversationId: string | null
  question: string
  note?: string | null
  wikiCommit?: string | null
}

export async function recordWikiGap(gap: NewWikiGap) {
  const [row] = await db.insert(wikiGaps).values({
    userId: gap.userId,
    conversationId: gap.conversationId,
    question: gap.question,
    note: gap.note ?? null,
    wikiCommit: gap.wikiCommit ?? null,
  }).returning({ id: wikiGaps.id, createdAt: wikiGaps.createdAt })
  return row
}

export async function listWikiGaps(limit = 200) {
  return db.select().from(wikiGaps).orderBy(desc(wikiGaps.createdAt)).limit(limit)
}
