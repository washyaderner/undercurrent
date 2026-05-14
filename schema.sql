CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  author TEXT,
  author_url TEXT,
  content_preview TEXT,
  published_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  subreddit TEXT,
  psychosis_score REAL,
  originality_score REAL,
  technical_depth REAL,
  practical_utility REAL,
  topic_tags TEXT,
  is_emerging INTEGER DEFAULT 0,
  analysis_summary TEXT,
  implementation_brief TEXT,
  analyzed_at TEXT,
  UNIQUE(source, source_id)
);

CREATE TABLE IF NOT EXISTS authors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  profile_url TEXT,
  content_count INTEGER DEFAULT 0,
  avg_originality REAL DEFAULT 0,
  avg_depth REAL DEFAULT 0,
  avg_psychosis REAL DEFAULT 0,
  consistency_score REAL DEFAULT 0,
  first_seen_at TEXT,
  last_seen_at TEXT,
  is_quality_voice INTEGER DEFAULT 0,
  discovery_reason TEXT,
  UNIQUE(name, platform)
);

CREATE TABLE IF NOT EXISTS trend_snapshots (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  mention_count INTEGER DEFAULT 0,
  platforms TEXT,
  avg_engagement REAL DEFAULT 0,
  velocity REAL DEFAULT 0,
  cross_platform_count INTEGER DEFAULT 1,
  novelty_bonus REAL DEFAULT 2.0,
  mainstream_saturation REAL DEFAULT 0,
  emergence_score REAL DEFAULT 0,
  classification TEXT,
  top_content_ids TEXT,
  top_authors TEXT,
  UNIQUE(topic, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_content_source ON content_items(source);
CREATE INDEX IF NOT EXISTS idx_content_published ON content_items(published_at);
CREATE INDEX IF NOT EXISTS idx_content_analyzed ON content_items(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_authors_quality ON authors(is_quality_voice);
CREATE INDEX IF NOT EXISTS idx_trends_date ON trend_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_trends_score ON trend_snapshots(emergence_score);
