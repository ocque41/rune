#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync, statSync } = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const MAX_FILE_SIZE = 1024 * 1024;

const blockedTrackedPaths = [
  /^dist-lib(?:\/|$)/,
  /^\.runs\.json$/,
  /^tsconfig\.tsbuildinfo$/,
  /^supabase\/\.temp(?:\/|$)/,
  /^\.swc(?:\/|$)/,
  /\.bak$/,
];

const skipPathPatterns = [
  /^node_modules(?:\/|$)/,
  /^\.git(?:\/|$)/,
  /^\.next(?:\/|$)/,
  /^coverage(?:\/|$)/,
  /^out(?:\/|$)/,
  /^build(?:\/|$)/,
  /^dist(?:\/|$)/,
  /^package-lock\.json$/,
  /^pnpm-lock\.yaml$/,
];

const secretPatterns = [
  { name: 'OpenAI-style API key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Google API key', regex: /\bAIza[0-9A-Za-z_-]{20,}\b/g },
  { name: 'Slack token', regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g },
  { name: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/g },
  { name: 'JWT-like token', regex: /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/g },
];

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function gitBuffer(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'buffer',
    maxBuffer: MAX_FILE_SIZE + 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function listFiles() {
  const output = git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']);
  return output.split('\0').filter(Boolean);
}

function listHistoryObjects() {
  const output = git(['rev-list', '--objects', '--all']);
  const objects = new Map();

  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    const [objectId, ...pathParts] = line.split(' ');
    if (!objects.has(objectId)) {
      objects.set(objectId, pathParts.join(' ') || '<unknown>');
    }
  }

  return objects;
}

function shouldSkip(file) {
  return skipPathPatterns.some((pattern) => pattern.test(file));
}

function isBinary(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  return sample.includes(0);
}

function lineForIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}

function scanFile(file, findings) {
  if (shouldSkip(file)) return;

  const absolutePath = path.join(ROOT, file);
  if (!existsSync(absolutePath)) return;

  const stat = statSync(absolutePath);
  if (!stat.isFile() || stat.size > MAX_FILE_SIZE) return;

  const buffer = readFileSync(absolutePath);
  if (isBinary(buffer)) return;

  const text = buffer.toString('utf8');
  for (const rule of secretPatterns) {
    rule.regex.lastIndex = 0;
    let match;
    while ((match = rule.regex.exec(text))) {
      findings.push({
        file,
        line: lineForIndex(text, match.index),
        reason: rule.name,
      });
    }
  }
}

function scanHistoryBlob(objectId, displayPath, findings) {
  if (shouldSkip(displayPath)) return;

  const type = git(['cat-file', '-t', objectId]).trim();
  if (type !== 'blob') return;

  const size = Number(git(['cat-file', '-s', objectId]).trim());
  if (!Number.isFinite(size) || size > MAX_FILE_SIZE) return;

  const buffer = gitBuffer(['cat-file', 'blob', objectId]);
  if (isBinary(buffer)) return;

  const text = buffer.toString('utf8');
  for (const rule of secretPatterns) {
    rule.regex.lastIndex = 0;
    let match;
    while ((match = rule.regex.exec(text))) {
      findings.push({
        file: `${displayPath}@${objectId.slice(0, 12)}`,
        line: lineForIndex(text, match.index),
        reason: rule.name,
      });
    }
  }
}

function scanCurrentTree() {
  const files = listFiles();
  const findings = [];

  for (const file of files) {
    if (blockedTrackedPaths.some((pattern) => pattern.test(file))) {
      findings.push({ file, line: 1, reason: 'generated/runtime artifact is publish-blocked' });
      continue;
    }

    scanFile(file, findings);
  }

  return { checked: files.length, findings };
}

function scanHistory() {
  const objects = listHistoryObjects();
  const findings = [];

  for (const [objectId, displayPath] of objects.entries()) {
    scanHistoryBlob(objectId, displayPath, findings);
  }

  return { checked: objects.size, findings };
}

function printFindings(findings) {
  console.error('Secret/publication scan failed:');
  for (const finding of findings.slice(0, 80)) {
    console.error(`- ${finding.file}:${finding.line} ${finding.reason}`);
  }
  if (findings.length > 80) {
    console.error(`- ...and ${findings.length - 80} more findings`);
  }
}

function main() {
  const scanHistoryMode = process.argv.includes('--history');
  const { checked, findings } = scanHistoryMode ? scanHistory() : scanCurrentTree();

  if (findings.length > 0) {
    printFindings(findings);
    process.exit(1);
  }

  const scope = scanHistoryMode ? 'history' : 'current tree';
  console.log(`Secret/publication scan passed for ${scope} (${checked} items checked).`);
}

main();
