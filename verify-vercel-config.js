#!/usr/bin/env node

/**
 * Vercel Deployment Configuration Verification Script
 * Checks all configuration files to identify deployment issues
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const check = {
  pass: `${colors.green}✓${colors.reset}`,
  fail: `${colors.red}✗${colors.reset}`,
  warn: `${colors.yellow}⚠${colors.reset}`,
};

let allChecksPassed = true;
const issues = [];

console.log(`${colors.cyan}==========================================${colors.reset}`);
console.log(`${colors.cyan}  Vercel Deployment Config Verification${colors.reset}`);
console.log(`${colors.cyan}==========================================${colors.reset}\n`);

// Helper function to read JSON file
function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// Check 1: Verify vercel.json
console.log(`${colors.blue}[1] Checking vercel.json${colors.reset}`);
console.log('----------------------------------------');

const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
const vercelJsonExists = fs.existsSync(vercelJsonPath);

if (vercelJsonExists) {
  const vercelJson = readJSON(vercelJsonPath);
  
  if (!vercelJson) {
    console.log(`${check.fail} vercel.json exists but is invalid JSON`);
    issues.push('vercel.json is invalid JSON');
    allChecksPassed = false;
  } else {
    const keys = Object.keys(vercelJson);
    const hasOnlyFramework = keys.length === 1 && keys[0] === 'framework';
    const isNextJS = vercelJson.framework === 'nextjs';
    
    if (hasOnlyFramework && isNextJS) {
      console.log(`${check.pass} vercel.json is simplified (only contains framework: "nextjs")`);
    } else {
      console.log(`${check.fail} vercel.json is NOT simplified`);
      console.log(`   Current content: ${JSON.stringify(vercelJson, null, 2)}`);
      console.log(`   Expected: { "framework": "nextjs" }`);
      console.log(`   ${colors.yellow}Recommendation: Simplify vercel.json or delete it entirely${colors.reset}`);
      issues.push('vercel.json needs to be simplified or deleted');
      allChecksPassed = false;
    }
  }
} else {
  console.log(`${check.pass} vercel.json does not exist (Vercel will auto-detect Next.js)`);
}

console.log('');

// Check 2: Verify .npmrc exists
console.log(`${colors.blue}[2] Checking .npmrc${colors.reset}`);
console.log('----------------------------------------');

const npmrcPath = path.join(process.cwd(), '.npmrc');
const npmrcExists = fs.existsSync(npmrcPath);

if (npmrcExists) {
  console.log(`${check.pass} .npmrc exists`);
  
  const npmrcContent = fs.readFileSync(npmrcPath, 'utf8').trim();
  const hasLegacyPeerDeps = npmrcContent.includes('legacy-peer-deps=true');
  
  if (hasLegacyPeerDeps) {
    console.log(`${check.pass} .npmrc contains: legacy-peer-deps=true`);
  } else {
    console.log(`${check.fail} .npmrc does NOT contain: legacy-peer-deps=true`);
    console.log(`   Current content: ${npmrcContent || '(empty)'}`);
    console.log(`   ${colors.yellow}Recommendation: Add "legacy-peer-deps=true" to .npmrc${colors.reset}`);
    issues.push('.npmrc missing legacy-peer-deps=true');
    allChecksPassed = false;
  }
} else {
  console.log(`${check.fail} .npmrc does NOT exist`);
  console.log(`   ${colors.yellow}Recommendation: Create .npmrc with: legacy-peer-deps=true${colors.reset}`);
  issues.push('.npmrc file is missing');
  allChecksPassed = false;
}

console.log('');

// Check 3: Verify package.json scripts
console.log(`${colors.blue}[3] Checking package.json scripts${colors.reset}`);
console.log('----------------------------------------');

const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = readJSON(packageJsonPath);

if (!packageJson) {
  console.log(`${check.fail} package.json does not exist or is invalid`);
  issues.push('package.json is missing or invalid');
  allChecksPassed = false;
} else {
  const scripts = packageJson.scripts || {};
  
  // Check for build script
  if (scripts.build === 'next build') {
    console.log(`${check.pass} "build": "next build" exists`);
  } else {
    console.log(`${check.fail} "build": "next build" is missing or incorrect`);
    console.log(`   Current: ${scripts.build || '(missing)'}`);
    console.log(`   Expected: "next build"`);
    issues.push('package.json missing or incorrect build script');
    allChecksPassed = false;
  }
  
  // Check for start script
  if (scripts.start === 'next start') {
    console.log(`${check.pass} "start": "next start" exists`);
  } else {
    console.log(`${check.fail} "start": "next start" is missing or incorrect`);
    console.log(`   Current: ${scripts.start || '(missing)'}`);
    console.log(`   Expected: "next start"`);
    issues.push('package.json missing or incorrect start script');
    allChecksPassed = false;
  }
}

console.log('');

// Summary
console.log(`${colors.cyan}==========================================${colors.reset}`);
console.log(`${colors.cyan}  Summary${colors.reset}`);
console.log(`${colors.cyan}==========================================${colors.reset}`);

if (allChecksPassed) {
  console.log(`${check.pass} ${colors.green}All configuration checks passed!${colors.reset}`);
  console.log(`\n${colors.green}Your configuration looks good for Vercel deployment.${colors.reset}`);
  process.exit(0);
} else {
  console.log(`${check.fail} ${colors.red}Some configuration issues found:${colors.reset}\n`);
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
  console.log(`\n${colors.yellow}Please fix these issues before deploying to Vercel.${colors.reset}`);
  process.exit(1);
}
























