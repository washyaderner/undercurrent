export type RiskLevel = 'auto' | 'suggest' | 'approve';

export interface GateResult {
  risk: RiskLevel;
  action: string;
  reason: string;
}

const AUTO_APPROVE_SIGNALS = [
  /\bmonitor(?:ing)?\b/i,
  /\bwatch\b/i,
  /\bsubscribe\b/i,
  /\bbookmark\b/i,
  /\bread(?:ing)?\b/i,
  /\bfollow\b/i,
  /\btrack\b/i,
  /\bexplore\b/i,
  /\bevaluate\b/i,
  /\btry\s+out\b/i,
  /\bcheck\s+out\b/i,
  /\blook\s+into\b/i,
  /\blearn\b/i,
  /\bstudy\b/i,
  /\bbenchmark\b/i,
  /\bcompare\b/i,
];

const REQUIRE_APPROVAL_SIGNALS = [
  { pattern: /\bauth(?:entication|orization)?\b/i, reason: 'touches authentication' },
  { pattern: /\breplac(?:e|ing)\b.*\b(?:core|main|primary|current)\b/i, reason: 'replaces core tooling' },
  { pattern: /\bmigrat(?:e|ion|ing)\b/i, reason: 'involves migration' },
  { pattern: /\binfrastructure\b/i, reason: 'infrastructure change' },
  { pattern: /\bdeploy(?:ment)?\s+(?:pipeline|config|strategy)\b/i, reason: 'deployment config change' },
  { pattern: /\bdatabase\s+(?:schema|migration|change)\b/i, reason: 'database schema change' },
  { pattern: /\bproduction\b/i, reason: 'affects production' },
  { pattern: /\bsecurity\b/i, reason: 'security implications' },
  { pattern: /\bremove\b.*\b(?:dependenc|package|library)\b/i, reason: 'removes dependency' },
  { pattern: /\brewrite\b/i, reason: 'involves rewrite' },
  { pattern: /\bbreak(?:ing)?\s+change/i, reason: 'breaking change' },
];

const SUGGEST_SIGNALS = [
  { pattern: /\binstall\b/i, reason: 'installs a package' },
  { pattern: /\badd\b.*\b(?:dependenc|package|library)\b/i, reason: 'adds dependency' },
  { pattern: /\bconfig(?:ure|uration)?\b/i, reason: 'configuration change' },
  { pattern: /\bupdate\b.*\b(?:dependenc|package|version)\b/i, reason: 'updates dependency' },
  { pattern: /\bswitch\b.*\b(?:to|from)\b/i, reason: 'switches tooling' },
  { pattern: /\bintegrat(?:e|ion|ing)\b/i, reason: 'new integration' },
  { pattern: /\bplugin\b/i, reason: 'adds plugin' },
  { pattern: /\bAPI\s+key\b/i, reason: 'requires API key' },
  { pattern: /\benv(?:ironment)?\s+var/i, reason: 'environment variable change' },
  { pattern: /\bwebhook\b/i, reason: 'webhook setup' },
];

function extractAction(brief: string, title: string): string {
  const sentences = brief.split(/[.!]\s+/);
  const actionSentence = sentences.find(s =>
    /\b(?:install|add|use|try|set up|configure|implement|adopt|switch|integrate|run|deploy|create|build|enable)\b/i.test(s)
  );
  if (actionSentence) return actionSentence.trim().slice(0, 200);
  if (sentences[0]) return sentences[0].trim().slice(0, 200);
  return `Evaluate: ${title}`.slice(0, 200);
}

export function classifyRisk(title: string, brief: string | null, tags: string[]): GateResult {
  const text = [title, brief || '', tags.join(' ')].join(' ');

  for (const { pattern, reason } of REQUIRE_APPROVAL_SIGNALS) {
    if (pattern.test(text)) {
      return {
        risk: 'approve',
        action: extractAction(brief || title, title),
        reason,
      };
    }
  }

  for (const { pattern, reason } of SUGGEST_SIGNALS) {
    if (pattern.test(text)) {
      return {
        risk: 'suggest',
        action: extractAction(brief || title, title),
        reason,
      };
    }
  }

  for (const pattern of AUTO_APPROVE_SIGNALS) {
    if (pattern.test(text)) {
      return {
        risk: 'auto',
        action: extractAction(brief || title, title),
        reason: 'low-risk exploration or learning',
      };
    }
  }

  if (!brief || brief.startsWith('No actionable implementation path')) {
    return {
      risk: 'auto',
      action: `Review: ${title}`.slice(0, 200),
      reason: 'informational only, no implementation path',
    };
  }

  return {
    risk: 'suggest',
    action: extractAction(brief, title),
    reason: 'actionable recommendation, review before proceeding',
  };
}
