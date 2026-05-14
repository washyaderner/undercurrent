const SLOP_WORDS = [
  'delve', 'tapestry', 'landscape', 'paradigm', 'revolutionize',
  'game-changer', 'cutting-edge', 'leverage', 'synergy', 'holistic',
  'multifaceted', 'intricate interplay', 'crucial role', 'pivotal',
  'transformative', 'groundbreaking', 'unprecedented', 'seamless',
  'robust', 'comprehensive', 'innovative', 'disruptive',
  'harness the power', 'at the forefront', 'dive deep',
  'in today\'s fast-paced', 'it\'s worth noting',
  'let\'s explore', 'in conclusion',
];

const HEDGING_PHRASES = [
  'might potentially', 'could possibly', 'it remains to be seen',
  'only time will tell', 'it\'s important to note',
  'having said that', 'that being said',
];

export function prePsychosisScore(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  let signals = 0;

  const slopCount = SLOP_WORDS.filter(w => lower.includes(w)).length;
  if (slopCount >= 3) { score += 0.3; signals++; }
  else if (slopCount >= 1) { score += 0.15; signals++; }

  const emDashCount = (text.match(/—/g) || []).length;
  if (emDashCount >= 3) { score += 0.15; signals++; }

  const hedgeCount = HEDGING_PHRASES.filter(p => lower.includes(p)).length;
  if (hedgeCount >= 2) { score += 0.2; signals++; }

  const hasNumbers = /\d+%|\$\d|benchmarks?|accuracy|latency|throughput|fps|tokens?\/s/i.test(text);
  const hasCode = /```|`[^`]+`|\bimport\b|\bconst\b|\bfunction\b|\bclass\b/i.test(text);
  const hasTools = /\b(pytorch|tensorflow|vllm|ollama|langchain|openai|anthropic|huggingface|transformers|cuda|onnx)\b/i.test(text);

  if (hasNumbers) score -= 0.15;
  if (hasCode) score -= 0.2;
  if (hasTools) score -= 0.1;

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    const avgLen = text.length / sentences.length;
    if (avgLen > 150) { score += 0.1; signals++; }
  }

  const listPattern = /^\d+\.\s|^[-*]\s/gm;
  const listItems = (text.match(listPattern) || []).length;
  if (listItems >= 5 && !hasCode) { score += 0.1; signals++; }

  return Math.max(0, Math.min(1, score));
}

export function shouldSkipClaude(preScore: number): 'genuine' | 'slop' | 'ambiguous' {
  if (preScore <= 0.15) return 'genuine';
  if (preScore >= 0.6) return 'slop';
  return 'ambiguous';
}
