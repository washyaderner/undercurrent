const KNOWN_BAD_DOMAINS = [
  'ai-tools-free.com', 'chatgpt-download.net', 'openai-api-free.com',
  'claude-free.ai', 'gpt4-unlimited.com', 'free-copilot.dev',
  'bard-ai-pro.com', 'midjourney-free.net', 'get-gpt5.com',
  'anthropic-free.com', 'openai-hack.com', 'chatgpt-jailbreak.com',
  'free-dalle.com', 'copilot-crack.dev', 'llama-download.net',
];

const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly',
  'is.gd', 'buff.ly', 'adf.ly', 'shorte.st', 'bc.vc',
  'v.gd', 'soo.gd', 'cutt.ly', 's.coop',
];

const TYPOSQUAT_TARGETS = [
  { real: 'openai.com', fakes: ['openai', 'opanai', 'openal', 'openia', 'oepnai'] },
  { real: 'anthropic.com', fakes: ['anthropic', 'antrhopic', 'anthopic', 'antropic'] },
  { real: 'github.com', fakes: ['github', 'glthub', 'githib', 'gihub', 'gitbub'] },
  { real: 'huggingface.co', fakes: ['huggingface', 'hugginface', 'huggingfase', 'hugingface'] },
  { real: 'pytorch.org', fakes: ['pytorch', 'pytorh', 'pytoch', 'pytroch'] },
];

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?prior/i,
  /forget\s+(everything|all)\s+(you|your)/i,
  /new\s+instructions?\s*:/i,
  /system\s*:\s*you\s+are\s+now/i,
  /\bact\s+as\s+(if|though)\s+you\s+(are|were)\s+a\b/i,
  /do\s+not\s+follow\s+(the\s+)?(previous|above|prior)/i,
  /override\s+(your|the)\s+(instructions|rules|guidelines)/i,
  /\bprompt\s*injection\b/i,
  /\bjailbreak\b/i,
  /\bDAN\s*mode\b/i,
  /you\s+must\s+(now\s+)?obey/i,
  /from\s+now\s+on,?\s+(you|ignore)/i,
];

const SOCIAL_ENGINEERING_PATTERNS = [
  /just\s+paste\s+this\s+into\s+(your\s+)?terminal/i,
  /run\s+this\s+(in|on)\s+(your\s+)?terminal/i,
  /copy\s+(and\s+)?paste\s+(this|the\s+following)\s+(into|in)\s+(your\s+)?/i,
  /trust\s+me,?\s+(just\s+)?run/i,
  /don['']t\s+worry\s+(about|what)\s+(it|this)\s+does/i,
  /it['']s\s+completely\s+safe/i,
  /no\s+need\s+to\s+review/i,
];

const DANGEROUS_CODE_PATTERNS = [
  { pattern: /curl\s+[^\s|]*\s*\|\s*(?:sudo\s+)?(?:ba)?sh/i, severity: 0.9, label: 'curl-pipe-bash' },
  { pattern: /wget\s+[^\s|]*\s*\|\s*(?:sudo\s+)?(?:ba)?sh/i, severity: 0.9, label: 'wget-pipe-bash' },
  { pattern: /curl\s+[^\s]*\s*\|\s*python/i, severity: 0.8, label: 'curl-pipe-python' },
  { pattern: /sudo\s+chmod\s+777/i, severity: 0.7, label: 'chmod-777' },
  { pattern: /sudo\s+rm\s+-rf\s+\//i, severity: 1.0, label: 'rm-rf-root' },
  { pattern: />\s*\/etc\/(passwd|shadow|hosts|sudoers)/i, severity: 0.9, label: 'system-file-write' },
  { pattern: /eval\s*\(\s*\$\(/i, severity: 0.8, label: 'eval-subshell' },
  { pattern: /base64\s+(-d|--decode)\s*\|\s*(?:ba)?sh/i, severity: 0.9, label: 'base64-decode-exec' },
  { pattern: /pip\s+install\s+--pre\s+--extra-index-url/i, severity: 0.7, label: 'pip-untrusted-index' },
  { pattern: /npm\s+install\s+-g\s+[^\s]*--unsafe-perm/i, severity: 0.7, label: 'npm-unsafe-global' },
  { pattern: /\bkeychain\b.*\b(dump|export|extract)\b/i, severity: 0.8, label: 'keychain-access' },
  { pattern: /\b(AWS_SECRET|OPENAI_API_KEY|ANTHROPIC_API_KEY|DATABASE_URL)\s*=/i, severity: 0.6, label: 'credential-assignment' },
  { pattern: /ssh-keygen.*-f\s+~?\/?\.ssh/i, severity: 0.5, label: 'ssh-key-gen' },
  { pattern: /\bdd\s+if=.*of=\/dev\//i, severity: 0.9, label: 'dd-device-write' },
  { pattern: /disable\s*(antivirus|firewall|defender|gatekeeper)/i, severity: 0.8, label: 'security-disable' },
];

export interface ShieldResult {
  score: number;
  flags: ShieldFlag[];
}

export interface ShieldFlag {
  category: 'url' | 'injection' | 'code';
  label: string;
  severity: number;
}

function screenUrls(text: string): ShieldFlag[] {
  const flags: ShieldFlag[] = [];
  const urlRegex = /https?:\/\/([^\s"'<>)\]]+)/gi;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const fullUrl = match[0];
    const domain = match[1].split('/')[0].toLowerCase();

    if (KNOWN_BAD_DOMAINS.some(bad => domain === bad || domain.endsWith('.' + bad))) {
      flags.push({ category: 'url', label: `known-bad-domain: ${domain}`, severity: 0.9 });
    }

    if (URL_SHORTENERS.some(s => domain === s || domain.endsWith('.' + s))) {
      flags.push({ category: 'url', label: `url-shortener: ${domain}`, severity: 0.3 });
    }

    for (const target of TYPOSQUAT_TARGETS) {
      if (domain.includes(target.real.split('.')[0]) && domain !== target.real && !domain.endsWith('.' + target.real)) {
        for (const fake of target.fakes) {
          if (domain.includes(fake) && !domain.includes(target.real.split('.')[0])) {
            flags.push({ category: 'url', label: `possible-typosquat: ${domain} (looks like ${target.real})`, severity: 0.7 });
            break;
          }
        }
      }
    }

    if (/\.(exe|msi|bat|cmd|ps1|vbs|scr)$/i.test(fullUrl)) {
      flags.push({ category: 'url', label: `executable-download: ${fullUrl.slice(0, 100)}`, severity: 0.6 });
    }
  }

  return flags;
}

function screenInjection(text: string): ShieldFlag[] {
  const flags: ShieldFlag[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      flags.push({ category: 'injection', label: `prompt-injection: ${pattern.source.slice(0, 60)}`, severity: 0.8 });
    }
  }

  for (const pattern of SOCIAL_ENGINEERING_PATTERNS) {
    if (pattern.test(text)) {
      flags.push({ category: 'injection', label: `social-engineering: ${pattern.source.slice(0, 60)}`, severity: 0.6 });
    }
  }

  const hiddenInCode = text.match(/```[\s\S]*?```/g) || [];
  for (const block of hiddenInCode) {
    for (const injPattern of INJECTION_PATTERNS) {
      if (injPattern.test(block)) {
        flags.push({ category: 'injection', label: 'injection-in-code-block', severity: 0.9 });
        break;
      }
    }
  }

  return flags;
}

function screenCode(text: string): ShieldFlag[] {
  const flags: ShieldFlag[] = [];

  for (const { pattern, severity, label } of DANGEROUS_CODE_PATTERNS) {
    if (pattern.test(text)) {
      flags.push({ category: 'code', label, severity });
    }
  }

  return flags;
}

export function shieldScore(title: string, contentPreview: string | null, url: string | null): ShieldResult {
  const text = [title, contentPreview || '', url || ''].join('\n');
  const allFlags = [
    ...screenUrls(text),
    ...screenInjection(text),
    ...screenCode(text),
  ];

  if (allFlags.length === 0) {
    return { score: 0, flags: [] };
  }

  const maxSeverity = Math.max(...allFlags.map(f => f.severity));
  const avgSeverity = allFlags.reduce((s, f) => s + f.severity, 0) / allFlags.length;
  const score = Math.min(1, maxSeverity * 0.7 + avgSeverity * 0.3);

  return { score: parseFloat(score.toFixed(3)), flags: allFlags };
}
