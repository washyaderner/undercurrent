import type { Env, AnalysisResult } from '../types.js';
import { prePsychosisScore, shouldSkipClaude } from './psychosis.js';

const SYSTEM_PROMPT = `You analyze AI-related content for a trend intelligence tool called Undercurrent. For each piece of content, evaluate:

1. PSYCHOSIS_SCORE (0.0-1.0): How much is this AI-generated hype vs genuine insight?
   High score signals: formulaic structure, buzzword density, no specific details or numbers, hedging language, "delve/tapestry/landscape" vocabulary, claims without evidence, breathless tone about obvious things, listicle format with no depth.
   Low score signals: original thinking, specific technical details, reproducible results, hard-won practitioner lessons, contrarian views backed by evidence, working demos, methodology described.

2. ORIGINALITY (0.0-1.0): Novel insight vs rehash of common knowledge.

3. TECHNICAL_DEPTH (0.0-1.0): Specific implementation details, benchmarks, code vs hand-waving.

4. PRACTICAL_UTILITY (0.0-1.0): Can someone act on this today?

5. TOPIC_TAGS: Array of specific topics (max 5). Use precise terms like "rag-pipeline", "local-inference", "code-agents", "vision-models", not broad categories like "AI" or "machine learning".

6. ANALYSIS_SUMMARY: One sentence. What is actually new or notable here.

7. IMPLEMENTATION_BRIEF: One paragraph. If a practitioner wanted to use or build on this, what would they do? Name specific tools, repos, or approaches. If the content is too shallow to generate an implementation brief, write "No actionable implementation path."

8. IS_EMERGING: true if this topic/tool/approach has fewer than ~1000 mentions across the AI community. Use your judgment based on how well-known the subject is.

Return valid JSON only. No markdown fencing. Schema:
{"psychosis_score":0.0,"originality_score":0.0,"technical_depth":0.0,"practical_utility":0.0,"topic_tags":[],"analysis_summary":"","implementation_brief":"","is_emerging":false}`;

interface AnalysisBatch {
  id: string;
  title: string;
  content_preview: string | null;
  source: string;
  url: string | null;
  upvotes: number;
  comments: number;
  stars: number;
}

export async function analyzeItems(
  items: AnalysisBatch[],
  env: Env
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();

  for (const item of items) {
    const text = `${item.title}\n${item.content_preview || ''}`;
    const preScore = prePsychosisScore(text);
    const verdict = shouldSkipClaude(preScore);

    if (verdict === 'slop') {
      results.set(item.id, {
        psychosis_score: Math.max(preScore, 0.75),
        originality_score: 0.1,
        technical_depth: 0.1,
        practical_utility: 0.1,
        topic_tags: [],
        analysis_summary: 'Pre-screened as likely AI-generated or low-substance content.',
        implementation_brief: 'No actionable implementation path.',
        is_emerging: false,
      });
      continue;
    }

    // Low-engagement genuine items still need topic extraction from Claude
    // Only skip if engagement is truly zero and title is very short
    if (verdict === 'genuine' && item.upvotes === 0 && item.stars === 0 && item.comments === 0 && item.title.length < 30) {
      results.set(item.id, {
        psychosis_score: preScore,
        originality_score: 0.5,
        technical_depth: 0.5,
        practical_utility: 0.5,
        topic_tags: [],
        analysis_summary: 'Minimal-engagement item, pre-scored as likely genuine.',
        implementation_brief: 'No actionable implementation path.',
        is_emerging: true,
      });
      continue;
    }

    try {
      const userPrompt = `Analyze this ${item.source} content:\n\nTitle: ${item.title}\nURL: ${item.url || 'N/A'}\nEngagement: ${item.upvotes} upvotes, ${item.comments} comments, ${item.stars} stars\n\nContent preview:\n${item.content_preview || '(title only, no body text)'}`;

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
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!resp.ok) {
        console.error(`[analyze] Claude API error ${resp.status} for ${item.id}`);
        continue;
      }

      const data = await resp.json() as {
        content: Array<{ type: string; text?: string }>;
      };
      let text_content = data.content.find(c => c.type === 'text')?.text;
      if (!text_content) continue;

      text_content = text_content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const parsed = JSON.parse(text_content) as AnalysisResult;
      results.set(item.id, parsed);
    } catch (err) {
      console.error(`[analyze] failed for ${item.id}:`, err);
    }
  }

  console.log(`[analyze] processed ${results.size}/${items.length} items (${items.filter(i => shouldSkipClaude(prePsychosisScore(`${i.title}\n${i.content_preview || ''}`)) !== 'ambiguous').length} pre-screened)`);
  return results;
}
