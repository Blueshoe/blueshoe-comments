#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];

if (!targetDir) {
  console.error("Usage: npx blueshoe-community-init <public-dir>");
  process.exit(1);
}

const sourceFile = path.resolve(__dirname, '../auth-callback.html');
const targetFile = path.resolve(process.cwd(), targetDir, 'auth-callback.html');

try {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`Successfully copied auth-callback.html to ${targetFile}`);
} catch (err) {
  console.error("Failed to copy file:", err);
  process.exit(1);
}
