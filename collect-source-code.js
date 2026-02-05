#!/usr/bin/env node

/**
 * Copyright Source Code Collection Script
 * Collects all TypeScript/JavaScript source files for U.S. Copyright Office registration
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_DIR = '/Users/experracbo/Desktop/copyworx-v4';
const OUTPUT_FILE = path.join(BASE_DIR, 'copyworx-source-code-complete.txt');
const SUMMARY_FILE = path.join(BASE_DIR, 'copyright-filing-summary.txt');

const EXCLUDED_DIRS = ['node_modules', '.next', 'dist', 'build', '.git', '.vercel'];
const EXCLUDED_FILES = ['package-lock.json', 'yarn.lock'];
const VALID_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Storage for collected files
const collectedFiles = [];

/**
 * Check if a directory should be excluded
 */
function shouldExcludeDir(dirName) {
  return EXCLUDED_DIRS.includes(dirName);
}

/**
 * Check if a file should be excluded
 */
function shouldExcludeFile(fileName) {
  // Exclude specific files
  if (EXCLUDED_FILES.includes(fileName)) return true;
  
  // Exclude .env files
  if (fileName.startsWith('.env')) return true;
  
  // Only include files with valid extensions
  const ext = path.extname(fileName);
  return !VALID_EXTENSIONS.includes(ext);
}

/**
 * Recursively scan directory for source files
 */
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip excluded directories
      if (!shouldExcludeDir(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      // Process files
      if (!shouldExcludeFile(entry.name)) {
        const relativePath = path.relative(BASE_DIR, fullPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lineCount = content.split('\n').length;
        
        collectedFiles.push({
          relativePath,
          fullPath,
          content,
          lineCount
        });
      }
    }
  }
}

/**
 * Sort files alphabetically by relative path
 */
function sortFiles() {
  collectedFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * Write concatenated source code file
 */
function writeSourceCodeFile() {
  const stream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf-8' });
  
  // Write header
  stream.write('CopyWorx Studio - Complete Source Code\n');
  stream.write(`Generated on: ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString()}\n`);
  stream.write('For U.S. Copyright Office Registration\n');
  stream.write('\n');
  stream.write('========================================\n');
  stream.write('\n');
  
  // Write each file with header
  for (const file of collectedFiles) {
    stream.write('\n');
    stream.write(`=== FILE: ${file.relativePath} ===\n`);
    stream.write('\n');
    stream.write(file.content);
    stream.write('\n');
  }
  
  stream.end();
  
  console.log(`✅ Source code file created: ${OUTPUT_FILE}`);
}

/**
 * Write summary file
 */
function writeSummaryFile() {
  const stream = fs.createWriteStream(SUMMARY_FILE, { encoding: 'utf-8' });
  
  const totalFiles = collectedFiles.length;
  const totalLines = collectedFiles.reduce((sum, file) => sum + file.lineCount, 0);
  
  // Count by extension
  const extCounts = {
    '.ts': 0,
    '.tsx': 0,
    '.js': 0,
    '.jsx': 0
  };
  
  for (const file of collectedFiles) {
    const ext = path.extname(file.relativePath);
    if (extCounts.hasOwnProperty(ext)) {
      extCounts[ext]++;
    }
  }
  
  // Write header
  stream.write('CopyWorx Studio - Copyright Filing Summary\n');
  stream.write(`Generated on: ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString()}\n`);
  stream.write('\n');
  stream.write('========================================\n');
  stream.write('SUMMARY STATISTICS\n');
  stream.write('========================================\n');
  stream.write('\n');
  stream.write(`Total Files Included: ${totalFiles}\n`);
  stream.write(`Total Lines of Code: ${totalLines}\n`);
  stream.write('\n');
  stream.write('File Breakdown:\n');
  stream.write(`  TypeScript (.ts):      ${extCounts['.ts']}\n`);
  stream.write(`  TypeScript JSX (.tsx): ${extCounts['.tsx']}\n`);
  stream.write(`  JavaScript (.js):      ${extCounts['.js']}\n`);
  stream.write(`  JavaScript JSX (.jsx): ${extCounts['.jsx']}\n`);
  stream.write('\n');
  stream.write('========================================\n');
  stream.write('COMPLETE FILE LIST WITH LINE COUNTS\n');
  stream.write('========================================\n');
  stream.write('\n');
  
  // Write file list
  for (const file of collectedFiles) {
    const paddedPath = file.relativePath.padEnd(80, ' ');
    const lineInfo = `${file.lineCount} lines`;
    stream.write(`${paddedPath} ${lineInfo.padStart(10, ' ')}\n`);
  }
  
  stream.write('\n');
  stream.write('========================================\n');
  stream.write('NOTES FOR COPYRIGHT REGISTRATION\n');
  stream.write('========================================\n');
  stream.write('\n');
  stream.write('This package contains the complete source code for CopyWorx Studio,\n');
  stream.write('an AI-powered copywriting platform.\n');
  stream.write('\n');
  stream.write('Excluded from this filing:\n');
  stream.write('  - node_modules (third-party dependencies)\n');
  stream.write('  - .next (build artifacts)\n');
  stream.write('  - dist, build (compiled output)\n');
  stream.write('  - .git (version control metadata)\n');
  stream.write('  - .vercel (deployment configuration)\n');
  stream.write('  - package-lock.json, yarn.lock (dependency lock files)\n');
  stream.write('  - .env files (environment configuration)\n');
  stream.write('\n');
  stream.write('All source files are included in alphabetical order by path.\n');
  stream.write('Each file is prefixed with its relative path for easy reference.\n');
  stream.write('\n');
  
  stream.end();
  
  console.log(`✅ Summary file created: ${SUMMARY_FILE}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Scanning CopyWorx Studio source code...\n');
  console.log(`Base directory: ${BASE_DIR}`);
  console.log(`Excluding directories: ${EXCLUDED_DIRS.join(', ')}`);
  console.log(`Including extensions: ${VALID_EXTENSIONS.join(', ')}\n`);
  
  // Scan directory
  console.log('📂 Scanning directories...');
  scanDirectory(BASE_DIR);
  
  console.log(`📄 Found ${collectedFiles.length} source files\n`);
  
  // Sort files
  console.log('🔤 Sorting files alphabetically...');
  sortFiles();
  
  // Write output files
  console.log('💾 Writing output files...\n');
  writeSourceCodeFile();
  writeSummaryFile();
  
  // Final summary
  const totalLines = collectedFiles.reduce((sum, file) => sum + file.lineCount, 0);
  const outputSize = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
  
  console.log('\n========================================');
  console.log('✅ COPYRIGHT PACKAGE COMPLETE');
  console.log('========================================\n');
  console.log(`Total Files:  ${collectedFiles.length}`);
  console.log(`Total Lines:  ${totalLines.toLocaleString()}`);
  console.log(`Output Size:  ${outputSize} MB\n`);
  console.log('📁 Files created:');
  console.log(`   - ${OUTPUT_FILE}`);
  console.log(`   - ${SUMMARY_FILE}\n`);
}

// Run the script
try {
  main();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
