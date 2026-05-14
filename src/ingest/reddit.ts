import type { ContentItem } from '../types.js';

const SUBREDDITS = [
  'MachineLearning', 'LocalLLaMA', 'artificial',
  'singularity', 'LLMDevs', 'ClaudeAI',
  'ChatGPT', 'StableDiffusion',
];

const ENDPOINTS = ['rising', 'hot'] as const;

interface RedditPost {
  data: {
    id: string;
    title: string;
    url: string;
    permalink: string;
    author: string;
    score: number;
    num_comments: number;
    created_utc: number;
    subreddit: string;
    selftext: string;
    is_self: boolean;
  };
}

interface RedditListing {
  data: { children: RedditPost[] };
}

export async function ingestReddit(since: number): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  const seen = new Set<string>();

  for (const sub of SUBREDDITS) {
    for (const endpoint of ENDPOINTS) {
      const url = `https://www.reddit.com/r/${sub}/${endpoint}.json?limit=50`;

      try {
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'undercurrent/0.1 (trend-research)' },
        });
        if (!resp.ok) {
          console.warn(`[reddit] ${sub}/${endpoint} returned ${resp.status}`);
          continue;
        }
        const data = await resp.json() as RedditListing;

        for (const child of data.data.children) {
          const post = child.data;
          if (post.created_utc < since) continue;
          if (seen.has(post.id)) continue;
          seen.add(post.id);

          const preview = post.is_self && post.selftext
            ? post.selftext.slice(0, 500)
            : null;

          items.push({
            id: `reddit-${post.id}`,
            source: 'reddit',
            source_id: post.id,
            title: post.title,
            url: post.is_self
              ? `https://reddit.com${post.permalink}`
              : post.url,
            author: post.author,
            author_url: `https://reddit.com/u/${post.author}`,
            content_preview: preview,
            published_at: new Date(post.created_utc * 1000).toISOString(),
            ingested_at: new Date().toISOString(),
            upvotes: post.score,
            comments: post.num_comments,
            stars: 0,
            subreddit: post.subreddit,
          });
        }
      } catch (err) {
        console.error(`[reddit] ${sub}/${endpoint} failed:`, err);
      }
    }
  }

  console.log(`[reddit] ingested ${items.length} items since ${new Date(since * 1000).toISOString()}`);
  return items;
}
