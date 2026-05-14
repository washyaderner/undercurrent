import type { ContentItem } from '../types.js';

const HN_ALGOLIA = 'https://hn.algolia.com/api/v1';

const AI_QUERIES = [
  'AI', 'LLM', 'GPT', 'Claude', 'machine learning',
  'neural network', 'transformer', 'agent', 'RAG',
  'fine-tuning', 'embedding', 'diffusion', 'reasoning',
];

interface HNHit {
  objectID: string;
  title: string;
  url: string | null;
  author: string;
  points: number;
  num_comments: number;
  created_at_i: number;
}

export async function ingestHN(since: number): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  const seen = new Set<string>();

  for (const query of AI_QUERIES) {
    const url = `${HN_ALGOLIA}/search_by_date?query=${encodeURIComponent(query)}&tags=story&numericFilters=points>10,created_at_i>${since}&hitsPerPage=50`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json() as { hits: HNHit[] };

      for (const hit of data.hits) {
        if (seen.has(hit.objectID)) continue;
        seen.add(hit.objectID);

        items.push({
          id: `hn-${hit.objectID}`,
          source: 'hn',
          source_id: hit.objectID,
          title: hit.title || '',
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          author: hit.author,
          author_url: `https://news.ycombinator.com/user?id=${hit.author}`,
          content_preview: null,
          published_at: new Date(hit.created_at_i * 1000).toISOString(),
          ingested_at: new Date().toISOString(),
          upvotes: hit.points || 0,
          comments: hit.num_comments || 0,
          stars: 0,
          subreddit: null,
        });
      }
    } catch (err) {
      console.error(`[hn] query "${query}" failed:`, err);
    }
  }

  console.log(`[hn] ingested ${items.length} items since ${new Date(since * 1000).toISOString()}`);
  return items;
}
