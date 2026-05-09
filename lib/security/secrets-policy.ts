export const REDACTED_SECRET = '[secret redacted]';

export type SecretPolicyViolation = {
  path: string;
  reason: string;
};

type PatternRule = {
  name: string;
  pattern: RegExp;
  reason: string;
};

const HIGH_CONFIDENCE_SECRET_PATTERNS: PatternRule[] = [
  {
    name: 'openai-key',
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
    reason: 'OpenAI-style API key',
  },
  {
    name: 'google-api-key',
    pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/g,
    reason: 'Google API key',
  },
  {
    name: 'slack-token',
    pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g,
    reason: 'Slack token',
  },
  {
    name: 'aws-access-key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    reason: 'AWS access key',
  },
  {
    name: 'private-key-block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/g,
    reason: 'private key block',
  },
  {
    name: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/g,
    reason: 'JWT-like token',
  },
];

const SENSITIVE_KEY_PATTERN = /(^|[_-])(api[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token|secret|password|client[_-]?secret|service[_-]?role[_-]?key|connection[_-]?string)([_-]|$)/i;
const SAFE_PLACEHOLDER_PATTERN = /^\s*(\{\{[^}]+\}\}|\$\{[A-Z0-9_]+\}|<[^>]+>|YOUR_[A-Z0-9_]+|REPLACE_ME|placeholder|example|test[_-]?key)\s*$/i;

export function isSecretReference(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /\{\{\s*(?:SECRET_[A-Z0-9_]+|secrets\.[A-Z0-9_]+|[A-Z0-9_]+)\s*\}\}/i.test(value);
}

function isLikelySecretByKey(path: string, value: string): boolean {
  if (!SENSITIVE_KEY_PATTERN.test(path)) return false;
  const trimmed = value.trim();
  if (!trimmed || SAFE_PLACEHOLDER_PATTERN.test(trimmed) || isSecretReference(trimmed)) return false;
  if (/^[A-Z][A-Z0-9_-]{2,127}$/.test(trimmed)) return false;
  if (trimmed.length < 16) return false;
  if (/^(true|false|null|undefined)$/i.test(trimmed)) return false;
  return /[A-Za-z]/.test(trimmed) && /[0-9_\-./+=]/.test(trimmed);
}

function replacePatternMatches(value: string): string {
  return HIGH_CONFIDENCE_SECRET_PATTERNS.reduce(
    (current, rule) => current.replace(rule.pattern, REDACTED_SECRET),
    value,
  );
}

export function redactSecrets<T>(value: T, path = '$'): T {
  if (typeof value === 'string') {
    if (isLikelySecretByKey(path, value)) return REDACTED_SECRET as T;
    return replacePatternMatches(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => redactSecrets(item, `${path}[${index}]`)) as T;
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = redactSecrets(nested, `${path}.${key}`);
    }
    return result as T;
  }

  return value;
}

export function findSecretPolicyViolations(value: unknown, path = '$'): SecretPolicyViolation[] {
  const violations: SecretPolicyViolation[] = [];

  const visit = (current: unknown, currentPath: string) => {
    if (typeof current === 'string') {
      const text = current.trim();
      if (!text || SAFE_PLACEHOLDER_PATTERN.test(text) || isSecretReference(text)) return;

      for (const rule of HIGH_CONFIDENCE_SECRET_PATTERNS) {
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(text)) {
          violations.push({ path: currentPath, reason: rule.reason });
        }
      }

      if (isLikelySecretByKey(currentPath, text)) {
        violations.push({ path: currentPath, reason: 'secret-like value in a sensitive field' });
      }
      return;
    }

    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
      return;
    }

    if (current && typeof current === 'object') {
      for (const [key, nested] of Object.entries(current as Record<string, unknown>)) {
        visit(nested, `${currentPath}.${key}`);
      }
    }
  };

  visit(value, path);

  const seen = new Set<string>();
  return violations.filter((violation) => {
    const key = `${violation.path}:${violation.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function assertNoInlineSecrets(value: unknown, label: string): void {
  const violations = findSecretPolicyViolations(value);
  if (violations.length === 0) return;

  const paths = violations
    .slice(0, 8)
    .map((violation) => `${violation.path} (${violation.reason})`)
    .join(', ');
  const suffix = violations.length > 8 ? `, and ${violations.length - 8} more` : '';

  throw new Error(
    `${label} contains inline secret-looking values at ${paths}${suffix}. Store values in BYOK secrets and reference only secret names.`,
  );
}
