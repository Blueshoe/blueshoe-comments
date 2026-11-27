export type ReactionKind = 'like' | 'love' | 'rocket' | 'celebrate' | 'insightful'

export interface ReactionSummary {
  counts: Partial<Record<ReactionKind, number>>
  active: ReactionKind[]
}

/** Teaser/ToC — no visitor-specific active state */
export interface ReactionTeaser {
  comment_count: number
  reactions: Partial<Record<ReactionKind, number>>
}

export type ReactionBatch = Record<string, ReactionTeaser>

export const REACTION_KINDS: { kind: ReactionKind, emoji: string }[] = [
  { kind: 'like', emoji: '👍' },
  { kind: 'love', emoji: '❤️' },
  { kind: 'rocket', emoji: '🚀' },
  { kind: 'celebrate', emoji: '🎉' },
  { kind: 'insightful', emoji: '💡' },
]

/** Stable pill order — never iterate `counts` object keys (API/insertion order jumps on hydrate). */
export function visibleReactionKinds(
  counts: Partial<Record<ReactionKind, number>> | null | undefined,
): typeof REACTION_KINDS {
  return REACTION_KINDS.filter(({ kind }) => (counts?.[kind] || 0) > 0)
}

/** Rebuild counts in REACTION_KINDS order so Object.keys / JSON stay stable across SSR ↔ client. */
export function normalizeReactionCounts(
  counts: Partial<Record<ReactionKind, number>> | null | undefined,
): Partial<Record<ReactionKind, number>> {
  const out: Partial<Record<ReactionKind, number>> = {}
  for (const { kind } of REACTION_KINDS) {
    const n = counts?.[kind]
    if (n && n > 0)
      out[kind] = n
  }
  return out
}

export function normalizeReactionSummary(
  summary: ReactionSummary | null | undefined,
): ReactionSummary {
  return {
    counts: normalizeReactionCounts(summary?.counts),
    active: REACTION_KINDS
      .map(({ kind }) => kind)
      .filter(kind => summary?.active?.includes(kind)),
  }
}
