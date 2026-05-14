export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  GITHUB_TOKEN?: string;
  ENVIRONMENT: string;
}

export interface ContentItem {
  id: string;
  source: 'hn' | 'reddit' | 'github';
  source_id: string;
  title: string;
  url: string | null;
  author: string | null;
  author_url: string | null;
  content_preview: string | null;
  published_at: string;
  ingested_at: string;
  upvotes: number;
  comments: number;
  stars: number;
  subreddit: string | null;
}

export interface AnalysisResult {
  psychosis_score: number;
  originality_score: number;
  technical_depth: number;
  practical_utility: number;
  topic_tags: string[];
  analysis_summary: string;
  implementation_brief: string;
  is_emerging: boolean;
}

export interface TrendSnapshot {
  topic: string;
  mention_count: number;
  platforms: string[];
  velocity: number;
  cross_platform_count: number;
  novelty_bonus: number;
  mainstream_saturation: number;
  emergence_score: number;
  classification: 'breakout' | 'rising' | 'stirring' | 'noise';
}
