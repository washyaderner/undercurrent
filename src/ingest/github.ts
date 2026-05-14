import type { ContentItem } from '../types.js';

const SEARCH_QUERIES = [
  'topic:ai created:>DATE stars:>20',
  'topic:llm created:>DATE stars:>10',
  'topic:machine-learning created:>DATE stars:>20',
  'topic:agents created:>DATE stars:>10',
  'topic:rag created:>DATE stars:>5',
];

interface GHRepo {
  id: number;
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  owner: {
    login: string;
    html_url: string;
  };
  topics: string[];
}

interface GHSearchResult {
  items: GHRepo[];
}

export async function ingestGitHub(since: number, token?: string): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  const seen = new Set<string>();

  const sinceDate = new Date(since * 1000).toISOString().split('T')[0];
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'undercurrent/0.1',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  for (const queryTemplate of SEARCH_QUERIES) {
    const q = queryTemplate.replace('DATE', sinceDate);
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`;

    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.warn(`[github] search returned ${resp.status}: ${await resp.text()}`);
        continue;
      }
      const data = await resp.json() as GHSearchResult;

      for (const repo of data.items) {
        const key = repo.full_name;
        if (seen.has(key)) continue;
        seen.add(key);

        items.push({
          id: `github-${repo.id}`,
          source: 'github',
          source_id: String(repo.id),
          title: `${repo.full_name}: ${repo.description || repo.name}`,
          url: repo.html_url,
          author: repo.owner.login,
          author_url: repo.owner.html_url,
          content_preview: repo.description,
          published_at: repo.created_at,
          ingested_at: new Date().toISOString(),
          upvotes: 0,
          comments: repo.open_issues_count,
          stars: repo.stargazers_count,
          subreddit: null,
        });
      }
    } catch (err) {
      console.error(`[github] search failed:`, err);
    }
  }

  console.log(`[github] ingested ${items.length} items since ${sinceDate}`);
  return items;
}
