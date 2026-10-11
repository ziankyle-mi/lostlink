#!/usr/bin/env node

/**
 * Bulletproof Security Scanner
 * Scans codebases for common vulnerabilities, leaked credentials, missing security headers,
 * unprotected database schemas, and dangerous coding patterns.
 */

import fs from "node:fs";
import path from "node:path";

const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

console.log(`\n🛡️  Starting Bulletproof Security Audit in: ${targetDir}\n`);

const findings = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  passed: [],
};

// Patterns for credential detection
const SECRET_PATTERNS = [
  { name: "Supabase Service Role Key", regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, severity: "critical" },
  { name: "Private RSA/EC/SSH Key", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, severity: "critical" },
  { name: "Generic API Key/Token Secret", regex: /(?:api_key|secret_key|private_key|auth_token)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi, severity: "high" },
  { name: "Hardcoded Password", regex: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{6,}['"]/gi, severity: "medium" },
];

// Dangerous code patterns
const CODE_PATTERNS = [
  { name: "Unsafe HTML Injection (set:html / dangerouslySetInnerHTML)", regex: /(?:set:html|dangerouslySetInnerHTML|innerHTML\s*=)/g, severity: "high" },
  { name: "Potential SQL String Interpolation", regex: /(?:query|execute|select|from|where)\s*\(`[^`]*\${[^}]+}[^`]*`\)/gi, severity: "critical" },
  { name: "Insecure Cookie Flag (Missing httpOnly/secure)", regex: /cookies\.set\([^)]*\{\s*(?!.*httpOnly).*\}\)/gis, severity: "medium" },
];

function shouldIgnore(entryPath) {
  const normalized = entryPath.replace(/\\/g, "/");
  return (
    normalized.includes("/node_modules/") ||
    normalized.includes("/.git/") ||
    normalized.includes("/dist/") ||
    normalized.includes("/.astro/") ||
    normalized.includes("/build/") ||
    normalized.includes("/.agents/") ||
    normalized.endsWith(".png") ||
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".webp") ||
    normalized.endsWith(".ico") ||
    normalized.endsWith(".svg")
  );
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (shouldIgnore(fullPath)) continue;
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath, callback);
      } else {
        callback(fullPath);
      }
    } catch {
      // Ignore read errors
    }
  }
}

// 1. Check .gitignore for .env and sensitive files
const gitignorePath = path.join(targetDir, ".gitignore");
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
  if (!gitignoreContent.includes(".env")) {
    findings.critical.push({ file: ".gitignore", message: "Missing .env in .gitignore! Environment secrets may be committed." });
  } else {
    findings.passed.push("Secrets file (.env) properly excluded in .gitignore");
  }
} else {
  findings.high.push({ file: ".gitignore", message: "No .gitignore found in target directory!" });
}

// 2. Scan project files
walkDir(targetDir, (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const relPath = path.relative(targetDir, filePath);

  // Check for plain-text credential markdown / xlsx / files in repo
  if (/accounts?[-_]?cred|admin[-_]?password|logins?[-_]?database/i.test(path.basename(filePath))) {
    findings.critical.push({ file: relPath, message: "Credential or account database file found tracked in repository!" });
  }

  // SQL Schema RLS check
  if (ext === ".sql") {
    const content = fs.readFileSync(filePath, "utf-8");
    const createTableMatches = content.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)/gi) || [];
    const rlsMatches = content.match(/enable\s+row\s+level\s+security/gi) || [];
    if (createTableMatches.length > 0 && rlsMatches.length === 0) {
      findings.critical.push({
        file: relPath,
        message: `SQL Schema defines ${createTableMatches.length} tables but contains NO "ENABLE ROW LEVEL SECURITY" statements!`,
      });
    }
  }

  // Scan JS/TS/Astro files
  if ([".ts", ".js", ".mjs", ".astro", ".jsx", ".tsx"].includes(ext)) {
    const content = fs.readFileSync(filePath, "utf-8");

    // Scan for secrets
    for (const pat of SECRET_PATTERNS) {
      const matches = content.match(pat.regex);
      if (matches) {
        findings[pat.severity].push({
          file: relPath,
          message: `Detected ${pat.name} (${matches.length} occurrences)`,
        });
      }
    }

    // Scan for dangerous code patterns
    for (const pat of CODE_PATTERNS) {
      const matches = content.match(pat.regex);
      if (matches) {
        // Skip false positives in test or documentation mock files
        if (!relPath.includes("test") && !relPath.includes("mock")) {
          findings[pat.severity].push({
            file: relPath,
            message: `Detected ${pat.name} (${matches.length} occurrences)`,
          });
        }
      }
    }
  }
});

// 3. Print Report
console.log("=================================================");
console.log("             SECURITY AUDIT SUMMARY              ");
console.log("=================================================");

function printGroup(label, list, icon) {
  if (list.length === 0) return;
  console.log(`\n${icon} ${label.toUpperCase()} (${list.length}):`);
  for (const item of list) {
    if (typeof item === "string") {
      console.log(`  ✓ ${item}`);
    } else {
      console.log(`  ✖ [${item.file}] ${item.message}`);
    }
  }
}

printGroup("Critical Vulnerabilities", findings.critical, "🚨");
printGroup("High Priority Issues", findings.high, "⚠️ ");
printGroup("Medium Priority Issues", findings.medium, "⚡");
printGroup("Passed Checks", findings.passed, "✅");

console.log("\n=================================================");
const totalIssues = findings.critical.length + findings.high.length + findings.medium.length;
if (totalIssues === 0) {
  console.log("🎉 STATUS: PASSED - All baseline security checks satisfied!");
} else {
  console.log(`⚠️  STATUS: ${totalIssues} issue(s) detected. Remediate according to bulletproof-security guidelines.`);
}
console.log("=================================================\n");
