import type { Env } from './types.js';
import { ingestHN } from './ingest/hn.js';
import { ingestReddit } from './ingest/reddit.js';
import { ingestGitHub } from './ingest/github.js';
import { analyzeItems } from './analysis/analyze.js';
import { prePsychosisScore, shouldSkipClaude } from './analysis/psychosis.js';
import { computeTrends, updateAuthorScores } from './trends/score.js';

async function storeItems(env: Env, items: Array<import('./types.js').ContentItem>): Promise<number> {
  let inserted = 0;
  for (const item of items) {
    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO content_items (id, source, source_id, title, url, author, author_url, content_preview, published_at, ingested_at, upvotes, comments, stars, subreddit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        item.id, item.source, item.source_id, item.title, item.url,
        item.author, item.author_url, item.content_preview,
        item.published_at, item.ingested_at,
        item.upvotes, item.comments, item.stars, item.subreddit,
      ).run();
      inserted++;
    } catch {
      // duplicate, skip
    }
  }
  return inserted;
}

async function runIngestion(env: Env): Promise<void> {
  const sixHoursAgo = Math.floor(Date.now() / 1000) - (6 * 60 * 60);

  console.log('[ingest] starting ingestion cycle...');

  const [hnItems, redditItems, githubItems] = await Promise.all([
    ingestHN(sixHoursAgo),
    ingestReddit(sixHoursAgo),
    ingestGitHub(sixHoursAgo, env.GITHUB_TOKEN),
  ]);

  const allItems = [...hnItems, ...redditItems, ...githubItems];
  const stored = await storeItems(env, allItems);
  console.log(`[ingest] stored ${stored} new items (${allItems.length} total fetched)`);
}

async function runAnalysis(env: Env): Promise<void> {
  const unanalyzed = await env.DB.prepare(
    `SELECT id, title, content_preview, source, url, upvotes, comments, stars
     FROM content_items
     WHERE analyzed_at IS NULL
     ORDER BY (upvotes + comments + stars) DESC
     LIMIT 20`
  ).all();

  if (unanalyzed.results.length === 0) {
    console.log('[analyze] no unanalyzed items');
    return;
  }

  console.log(`[analyze] processing ${unanalyzed.results.length} items...`);

  const batch = unanalyzed.results.map(row => ({
    id: row.id as string,
    title: row.title as string,
    content_preview: row.content_preview as string | null,
    source: row.source as string,
    url: row.url as string | null,
    upvotes: row.upvotes as number,
    comments: row.comments as number,
    stars: row.stars as number,
  }));

  const results = await analyzeItems(batch, env);

  for (const [id, result] of results) {
    await env.DB.prepare(
      `UPDATE content_items SET
         psychosis_score = ?, originality_score = ?, technical_depth = ?,
         practical_utility = ?, topic_tags = ?, analysis_summary = ?,
         implementation_brief = ?, is_emerging = ?, analyzed_at = ?
       WHERE id = ?`
    ).bind(
      result.psychosis_score, result.originality_score, result.technical_depth,
      result.practical_utility, JSON.stringify(result.topic_tags), result.analysis_summary,
      result.implementation_brief, result.is_emerging ? 1 : 0,
      new Date().toISOString(), id,
    ).run();
  }
}

async function runPipeline(env: Env): Promise<void> {
  const start = Date.now();
  await runIngestion(env);
  await runAnalysis(env);
  await computeTrends(env);
  await updateAuthorScores(env);
  console.log(`[pipeline] complete in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runPipeline(env);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const json = (data: unknown) => Response.json(data, { headers: corsHeaders });
    const url = new URL(request.url);

    if (url.pathname === '/api/trends') {
      const days = parseInt(url.searchParams.get('days') || '7');
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const rows = await env.DB.prepare(
        `SELECT * FROM trend_snapshots WHERE snapshot_date >= ? ORDER BY emergence_score DESC LIMIT 30`
      ).bind(since).all();
      return json({ trends: rows.results });
    }

    if (url.pathname === '/api/signals') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const minScore = parseFloat(url.searchParams.get('min_originality') || '0');
      const rows = await env.DB.prepare(
        `SELECT * FROM content_items
         WHERE analyzed_at IS NOT NULL AND psychosis_score < 0.5 AND originality_score > ?
         ORDER BY published_at DESC LIMIT ?`
      ).bind(minScore, limit).all();
      return json({ signals: rows.results });
    }

    if (url.pathname === '/api/voices') {
      const rows = await env.DB.prepare(
        `SELECT * FROM authors WHERE is_quality_voice = 1 ORDER BY avg_originality DESC LIMIT 30`
      ).all();
      return json({ voices: rows.results });
    }

    if (url.pathname === '/api/psychosis') {
      const rows = await env.DB.prepare(
        `SELECT id, title, source, url, psychosis_score, originality_score, analysis_summary, author
         FROM content_items
         WHERE analyzed_at IS NOT NULL
         ORDER BY psychosis_score DESC LIMIT 20`
      ).all();
      const genuine = await env.DB.prepare(
        `SELECT id, title, source, url, psychosis_score, originality_score, analysis_summary, author
         FROM content_items
         WHERE analyzed_at IS NOT NULL AND psychosis_score < 0.3
         ORDER BY originality_score DESC LIMIT 20`
      ).all();
      return json({ highest_psychosis: rows.results, most_genuine: genuine.results });
    }

    if (url.pathname === '/api/kit') {
      const topic = url.searchParams.get('topic');
      if (!topic) return json({ error: 'topic parameter required' });

      const trend = await env.DB.prepare(
        `SELECT * FROM trend_snapshots WHERE topic = ? ORDER BY snapshot_date DESC LIMIT 1`
      ).bind(topic).first();

      const contentIds = trend ? JSON.parse(trend.top_content_ids as string || '[]') : [];
      const authorNames = trend ? JSON.parse(trend.top_authors as string || '[]') : [];

      let items: any[] = [];
      if (contentIds.length > 0) {
        const placeholders = contentIds.map(() => '?').join(',');
        const itemRows = await env.DB.prepare(
          `SELECT title, url, source, author, author_url, upvotes, comments, stars,
                  originality_score, technical_depth, practical_utility, psychosis_score,
                  topic_tags, analysis_summary, implementation_brief
           FROM content_items WHERE id IN (${placeholders})
           ORDER BY originality_score DESC`
        ).bind(...contentIds).all();
        items = itemRows.results;
      }

      if (items.length === 0) {
        const tagItems = await env.DB.prepare(
          `SELECT title, url, source, author, author_url, upvotes, comments, stars,
                  originality_score, technical_depth, practical_utility, psychosis_score,
                  topic_tags, analysis_summary, implementation_brief
           FROM content_items
           WHERE topic_tags LIKE ? AND analyzed_at IS NOT NULL AND psychosis_score < 0.5
           ORDER BY originality_score DESC LIMIT 10`
        ).bind(`%${topic}%`).all();
        items = tagItems.results;
      }

      let authors: any[] = [];
      if (authorNames.length > 0) {
        const aPlaceholders = authorNames.map(() => '?').join(',');
        const authorRows = await env.DB.prepare(
          `SELECT name, platform, content_count, avg_originality, avg_depth, avg_psychosis
           FROM authors WHERE name IN (${aPlaceholders})
           ORDER BY avg_originality DESC`
        ).bind(...authorNames).all();
        authors = authorRows.results;
      }

      const date = new Date().toISOString().split('T')[0];
      const classification = trend?.classification || 'detected';
      const emergence = trend ? (trend.emergence_score as number).toFixed(1) : 'N/A';
      const platforms = trend ? JSON.parse(trend.platforms as string || '[]') : [];

      let md = `# Undercurrent Kit: ${topic}\n\n`;
      md += `> Generated ${date} | Status: ${classification} | Emergence: ${emergence}\n`;
      md += `> Platforms: ${platforms.join(', ') || 'multiple'}\n\n`;

      md += `## What's Happening\n\n`;
      if (trend) {
        md += `"${topic}" has ${trend.mention_count} mentions across ${(trend.cross_platform_count as number)} platform(s) in the last 7 days.\n`;
        md += `Velocity: ${typeof trend.velocity === 'number' ? (trend.velocity as number).toFixed(1) : trend.velocity}x week-over-week.\n\n`;
      }

      md += `## Key Signals\n\n`;
      for (const item of items.slice(0, 8)) {
        const scores = `originality:${((item.originality_score as number) * 100).toFixed(0)}% depth:${((item.technical_depth as number) * 100).toFixed(0)}% psychosis:${((item.psychosis_score as number) * 100).toFixed(0)}%`;
        md += `### ${item.title}\n`;
        md += `- **Source:** ${item.source}${item.url ? ` | [link](${item.url})` : ''}\n`;
        md += `- **Author:** ${item.author || 'unknown'}${item.author_url ? ` ([profile](${item.author_url}))` : ''}\n`;
        md += `- **Scores:** ${scores}\n`;
        md += `- **Engagement:** ${item.upvotes} upvotes, ${item.comments} comments, ${item.stars} stars\n`;
        if (item.analysis_summary) md += `- **Summary:** ${item.analysis_summary}\n`;
        if (item.implementation_brief && item.implementation_brief !== 'No actionable implementation path.') {
          md += `\n**Implementation:**\n${item.implementation_brief}\n`;
        }
        md += `\n`;
      }

      if (authors.length > 0) {
        md += `## People to Watch\n\n`;
        md += `These authors consistently produce original, technically deep content on this topic.\n\n`;
        for (const a of authors) {
          md += `- **${a.name}** (${a.platform}) - ${a.content_count} posts, originality: ${((a.avg_originality as number) * 100).toFixed(0)}%, depth: ${((a.avg_depth as number) * 100).toFixed(0)}%\n`;
        }
        md += `\n`;
      } else if (authorNames.length > 0) {
        md += `## People to Watch\n\n`;
        for (const name of authorNames.slice(0, 8)) {
          md += `- **${name}**\n`;
        }
        md += `\n`;
      }

      md += `## Prompt: Hand This to Claude Code\n\n`;
      md += "```\n";
      md += `I want to explore "${topic}" based on these emerging signals from the AI community.\n\n`;
      md += `Key implementations I've found:\n`;
      for (const item of items.slice(0, 5)) {
        if (item.implementation_brief && item.implementation_brief !== 'No actionable implementation path.') {
          md += `- ${item.title}: ${(item.implementation_brief as string).slice(0, 200)}...\n`;
        }
      }
      md += `\nHelp me:\n`;
      md += `1. Assess which of these approaches fits my current stack\n`;
      md += `2. Build a minimal working prototype of the most promising one\n`;
      md += `3. Identify what these practitioners learned that isn't in the docs yet\n`;
      md += "```\n\n";

      md += `---\n*Kit generated by [Undercurrent](https://undercurrent-dashboard.pages.dev). Trend detection is people detection.*\n`;

      const download = url.searchParams.get('download') === '1';
      if (download) {
        return new Response(md, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="undercurrent-kit-${topic}-${date}.md"`,
          },
        });
      }

      return json({ topic, classification, emergence_score: trend?.emergence_score, kit: md });
    }

    if (url.pathname === '/api/run' && request.method === 'POST') {
      await runPipeline(env);
      return json({ ok: true, message: 'pipeline complete' });
    }

    if (url.pathname === '/api/debug-analyze-one') {
      const row = await env.DB.prepare(
        `SELECT id, title, content_preview, source, url, upvotes, comments, stars
         FROM content_items WHERE analyzed_at IS NULL
         ORDER BY (upvotes + comments + stars) DESC LIMIT 1`
      ).first();
      if (!row) return json({ error: 'no unanalyzed items' });

      const text = `${row.title}\n${row.content_preview || ''}`;
      const preScore = prePsychosisScore(text);
      const verdict = shouldSkipClaude(preScore);

      const userPrompt = `Analyze this ${row.source} content:\n\nTitle: ${row.title}\nURL: ${row.url || 'N/A'}\nEngagement: ${row.upvotes} upvotes, ${row.comments} comments, ${row.stars} stars\n\nContent preview:\n${row.content_preview || '(title only, no body text)'}`;

      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: [{ type: 'text', text: 'Return valid JSON with fields: psychosis_score, originality_score, technical_depth, practical_utility, topic_tags, analysis_summary, implementation_brief, is_emerging', cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        const rawBody = await resp.text();
        if (!resp.ok) {
          return json({ id: row.id, title: row.title, preScore, verdict, apiStatus: resp.status, apiError: rawBody.slice(0, 1000) });
        }

        const data = JSON.parse(rawBody);
        let textContent = data.content?.find((c: {type: string}) => c.type === 'text')?.text;
        if (!textContent) return json({ id: row.id, preScore, verdict, apiStatus: 200, noTextContent: true, data: JSON.stringify(data).slice(0, 500) });

        textContent = textContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        const parsed = JSON.parse(textContent);
        return json({ id: row.id, title: row.title, preScore, verdict, apiStatus: 200, analysis: parsed });
      } catch (err) {
        return json({ id: row.id, title: row.title, preScore, verdict, error: String(err), stack: (err as Error).stack?.slice(0, 500) });
      }
    }

    if (url.pathname === '/api/debug-analysis') {
      const unanalyzed = await env.DB.prepare(
        `SELECT id, title, content_preview, source, url, upvotes, comments, stars
         FROM content_items
         WHERE analyzed_at IS NULL
         ORDER BY (upvotes + comments + stars) DESC
         LIMIT 5`
      ).all();

      const diagnostics = unanalyzed.results.map(row => {
        const text = `${row.title}\n${row.content_preview || ''}`;
        const preScore = prePsychosisScore(text);
        const verdict = shouldSkipClaude(preScore);
        return {
          id: row.id,
          title: (row.title as string).slice(0, 80),
          source: row.source,
          upvotes: row.upvotes,
          comments: row.comments,
          stars: row.stars,
          preScore,
          verdict,
          wouldSkip: verdict === 'slop' || (verdict === 'genuine' && row.upvotes === 0 && row.stars === 0 && row.comments === 0 && (row.title as string).length < 30),
        };
      });

      return json({ unanalyzed_count: unanalyzed.results.length, diagnostics });
    }

    if (url.pathname === '/api/test-claude') {
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 64,
            messages: [{ role: 'user', content: 'Reply with just the word "ok"' }],
          }),
        });
        const body = await resp.text();
        return json({ status: resp.status, body: body.slice(0, 500), keyPresent: !!env.ANTHROPIC_API_KEY });
      } catch (err) {
        return json({ error: String(err), keyPresent: !!env.ANTHROPIC_API_KEY });
      }
    }

    if (url.pathname === '/api/stats') {
      const total = await env.DB.prepare('SELECT COUNT(*) as n FROM content_items').first();
      const analyzed = await env.DB.prepare('SELECT COUNT(*) as n FROM content_items WHERE analyzed_at IS NOT NULL').first();
      const voices = await env.DB.prepare('SELECT COUNT(*) as n FROM authors WHERE is_quality_voice = 1').first();
      const trends = await env.DB.prepare('SELECT COUNT(*) as n FROM trend_snapshots WHERE snapshot_date = ?')
        .bind(new Date().toISOString().split('T')[0]).first();
      return json({
        total_items: total?.n || 0,
        analyzed_items: analyzed?.n || 0,
        quality_voices: voices?.n || 0,
        trends_today: trends?.n || 0,
      });
    }

    return new Response('Undercurrent API. Endpoints: /api/trends, /api/signals, /api/voices, /api/psychosis, /api/stats', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
