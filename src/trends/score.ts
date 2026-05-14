import type { Env, TrendSnapshot } from '../types.js';

export async function computeTrends(env: Env): Promise<TrendSnapshot[]> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const today = now.toISOString().split('T')[0];

  const currentItems = await env.DB.prepare(
    `SELECT id, source, topic_tags, upvotes, comments, stars, author, psychosis_score
     FROM content_items
     WHERE published_at > ? AND topic_tags IS NOT NULL AND psychosis_score < 0.6`
  ).bind(weekAgo).all();

  const priorItems = await env.DB.prepare(
    `SELECT topic_tags, source
     FROM content_items
     WHERE published_at > ? AND published_at <= ? AND topic_tags IS NOT NULL`
  ).bind(twoWeeksAgo, weekAgo).all();

  const currentTopics = new Map<string, {
    mentions: number;
    platforms: Set<string>;
    engagement: number[];
    authors: Set<string>;
    contentIds: string[];
  }>();

  const priorTopics = new Map<string, { mentions: number; platforms: Set<string> }>();

  for (const row of currentItems.results) {
    const tags: string[] = JSON.parse(row.topic_tags as string || '[]');
    for (const tag of tags) {
      const t = tag.toLowerCase().trim();
      if (!t) continue;
      if (!currentTopics.has(t)) {
        currentTopics.set(t, { mentions: 0, platforms: new Set(), engagement: [], authors: new Set(), contentIds: [] });
      }
      const entry = currentTopics.get(t)!;
      entry.mentions++;
      entry.platforms.add(row.source as string);
      entry.engagement.push((row.upvotes as number) + (row.comments as number) + (row.stars as number));
      if (row.author) entry.authors.add(row.author as string);
      entry.contentIds.push(row.id as string);
    }
  }

  for (const row of priorItems.results) {
    const tags: string[] = JSON.parse(row.topic_tags as string || '[]');
    for (const tag of tags) {
      const t = tag.toLowerCase().trim();
      if (!t) continue;
      if (!priorTopics.has(t)) {
        priorTopics.set(t, { mentions: 0, platforms: new Set() });
      }
      const entry = priorTopics.get(t)!;
      entry.mentions++;
      entry.platforms.add(row.source as string);
    }
  }

  const firstSeen = await env.DB.prepare(
    `SELECT topic_tags, MIN(published_at) as first_published
     FROM content_items
     WHERE topic_tags IS NOT NULL
     GROUP BY topic_tags`
  ).all();

  const topicFirstSeen = new Map<string, number>();
  for (const row of firstSeen.results) {
    const tags: string[] = JSON.parse(row.topic_tags as string || '[]');
    const publishedMs = new Date(row.first_published as string).getTime();
    for (const tag of tags) {
      const t = tag.toLowerCase().trim();
      const existing = topicFirstSeen.get(t);
      if (!existing || publishedMs < existing) {
        topicFirstSeen.set(t, publishedMs);
      }
    }
  }

  const snapshots: TrendSnapshot[] = [];

  for (const [topic, data] of currentTopics) {
    const prior = priorTopics.get(topic);
    const priorMentions = prior?.mentions || 0;

    const velocity = priorMentions > 0
      ? (data.mentions - priorMentions) / priorMentions
      : data.mentions > 2 ? data.mentions : 0;

    const crossPlatformCount = data.platforms.size;
    const crossPlatformFactor = Math.pow(crossPlatformCount, 1.5);

    const firstSeenMs = topicFirstSeen.get(topic) || now.getTime();
    const daysSinceFirstSeen = (now.getTime() - firstSeenMs) / (1000 * 60 * 60 * 24);
    const noveltyBonus = 1 + (1 / (1 + daysSinceFirstSeen / 30));

    const mainstreamSaturation = 0;

    const emergenceScore = (velocity * crossPlatformFactor * noveltyBonus) / (1 + mainstreamSaturation);

    let classification: TrendSnapshot['classification'];
    if (emergenceScore > 15) classification = 'breakout';
    else if (emergenceScore > 5) classification = 'rising';
    else if (emergenceScore > 1) classification = 'stirring';
    else classification = 'noise';

    if (classification === 'noise') continue;

    const avgEngagement = data.engagement.length > 0
      ? data.engagement.reduce((a, b) => a + b, 0) / data.engagement.length
      : 0;

    snapshots.push({
      topic,
      mention_count: data.mentions,
      platforms: Array.from(data.platforms),
      velocity,
      cross_platform_count: crossPlatformCount,
      novelty_bonus: noveltyBonus,
      mainstream_saturation: mainstreamSaturation,
      emergence_score: emergenceScore,
      classification,
    });
  }

  snapshots.sort((a, b) => b.emergence_score - a.emergence_score);

  for (const snap of snapshots.slice(0, 50)) {
    const data = currentTopics.get(snap.topic)!;
    await env.DB.prepare(
      `INSERT OR REPLACE INTO trend_snapshots (id, topic, snapshot_date, mention_count, platforms, avg_engagement, velocity, cross_platform_count, novelty_bonus, mainstream_saturation, emergence_score, classification, top_content_ids, top_authors)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      `${snap.topic}-${today}`,
      snap.topic,
      today,
      snap.mention_count,
      JSON.stringify(snap.platforms),
      data.engagement.reduce((a, b) => a + b, 0) / data.engagement.length,
      snap.velocity,
      snap.cross_platform_count,
      snap.novelty_bonus,
      snap.mainstream_saturation,
      snap.emergence_score,
      snap.classification,
      JSON.stringify(data.contentIds.slice(0, 10)),
      JSON.stringify(Array.from(data.authors).slice(0, 10)),
    ).run();
  }

  console.log(`[trends] computed ${snapshots.length} active trends (${snapshots.filter(s => s.classification === 'breakout').length} breakout, ${snapshots.filter(s => s.classification === 'rising').length} rising, ${snapshots.filter(s => s.classification === 'stirring').length} stirring)`);
  return snapshots;
}

export async function updateAuthorScores(env: Env): Promise<void> {
  const rows = await env.DB.prepare(
    `SELECT author, source,
            COUNT(*) as cnt,
            AVG(originality_score) as avg_orig,
            AVG(technical_depth) as avg_depth,
            AVG(psychosis_score) as avg_psychosis,
            MIN(published_at) as first,
            MAX(published_at) as last
     FROM content_items
     WHERE author IS NOT NULL AND analyzed_at IS NOT NULL
     GROUP BY author, source
     HAVING cnt >= 2`
  ).all();

  for (const row of rows.results) {
    const isQuality = (row.avg_orig as number) > 0.5
      && (row.avg_depth as number) > 0.4
      && (row.avg_psychosis as number) < 0.4
      && (row.cnt as number) >= 3;

    await env.DB.prepare(
      `INSERT INTO authors (id, name, platform, profile_url, content_count, avg_originality, avg_depth, avg_psychosis, first_seen_at, last_seen_at, is_quality_voice)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(name, platform) DO UPDATE SET
         content_count = excluded.content_count,
         avg_originality = excluded.avg_originality,
         avg_depth = excluded.avg_depth,
         avg_psychosis = excluded.avg_psychosis,
         last_seen_at = excluded.last_seen_at,
         is_quality_voice = excluded.is_quality_voice`
    ).bind(
      `${row.source}-${row.author}`,
      row.author as string,
      row.source as string,
      null,
      row.cnt as number,
      row.avg_orig as number,
      row.avg_depth as number,
      row.avg_psychosis as number,
      row.first as string,
      row.last as string,
      isQuality ? 1 : 0,
    ).run();
  }

  const qualityCount = rows.results.filter(r =>
    (r.avg_orig as number) > 0.5 && (r.avg_depth as number) > 0.4 && (r.avg_psychosis as number) < 0.4 && (r.cnt as number) >= 3
  ).length;
  console.log(`[authors] updated ${rows.results.length} authors (${qualityCount} quality voices)`);
}
