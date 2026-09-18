const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Problem = require('../models/Problem');

const ALLOWED_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const CONTROLLED_TOPICS = [
  'Array', 'String', 'Hash Table', 'Two Pointers', 'Binary Search',
  'Sliding Window', 'Linked List', 'Stack', 'Queue', 'Tree',
  'Binary Tree', 'BST', 'Heap', 'Priority Queue', 'Graph', 'DFS',
  'BFS', 'Backtracking', 'Greedy', 'Dynamic Programming', 'Bit Manipulation',
  'Math', 'Sorting', 'Prefix Sum', 'Trie', 'Union Find', 'Recursion', 'Matrix'
];

function normalizeDifficulty(val) {
  if (!val || typeof val !== 'string') return null;
  const capitalized = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  if (ALLOWED_DIFFICULTIES.includes(capitalized)) return capitalized;
  return null;
}

const TOPIC_ALIAS_MAP = {
  'hashtable': 'Hash Table',
  'hash map': 'Hash Table',
  'hashmap': 'Hash Table',
  'binary-search': 'Binary Search',
  'sliding-window': 'Sliding Window',
  'linked-list': 'Linked List',
  'binary tree': 'Binary Tree',
  'binarytree': 'Binary Tree',
  'priority queue': 'Priority Queue',
  'depth-first search': 'DFS',
  'breadth-first search': 'BFS',
  'dynamic programming': 'Dynamic Programming',
  'bit manipulation': 'Bit Manipulation',
  'prefix sum': 'Prefix Sum',
  'union find': 'Union Find'
};

function normalizeTopics(rawTopics) {
  if (!Array.isArray(rawTopics)) return ['Array'];
  const normalized = [];
  rawTopics.forEach(t => {
    if (!t) return;
    const str = String(t).trim().toLowerCase();
    
    // Check direct alias map
    if (TOPIC_ALIAS_MAP[str] && !normalized.includes(TOPIC_ALIAS_MAP[str])) {
      normalized.push(TOPIC_ALIAS_MAP[str]);
      return;
    }

    const matched = CONTROLLED_TOPICS.find(ct => ct.toLowerCase() === str);
    if (matched && !normalized.includes(matched)) {
      normalized.push(matched);
    }
  });
  return normalized.length > 0 ? normalized : ['Array'];
}

function generateSlug(title, extId) {
  if (!title) return `problem-${extId}`;
  let slug = title.replace(/[^a-zA-Z0-9\s-]/g, '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  return slug || `problem-${extId}`;
}

async function runImport() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isValidateOnly = args.includes('--validate-only');

  console.log('==================================================');
  console.log('⚡ LEETCODE DATASET IMPORT PIPELINE ⚡');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (No DB changes)' : isValidateOnly ? 'VALIDATE ONLY' : 'REAL DATABASE IMPORT'}`);
  console.log('==================================================');

  const curriculum500Path = path.join(__dirname, '../../data/leetcode/curriculum-500.json');
  const processedPath = path.join(__dirname, '../../data/processed/leetcode_processed.json');
  const rawPath = path.join(__dirname, '../../data/raw/leetcode_dataset.json');

  let dataPath = curriculum500Path;
  if (!fs.existsSync(dataPath)) {
    dataPath = processedPath;
  }
  if (!fs.existsSync(dataPath)) {
    dataPath = rawPath;
  }

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Error: Dataset file not found at ${dataPath}`);
    console.log('Please run "python data/scripts/validate_leetcode_dataset.py" first to prepare the dataset.');
    process.exit(1);
  }

  console.log(`📂 Reading dataset from: ${path.relative(process.cwd(), dataPath)}`);
  const rawData = fs.readFileSync(dataPath, 'utf8');
  let records = [];
  try {
    records = JSON.parse(rawData);
  } catch (err) {
    console.error('❌ Error parsing JSON dataset:', err.message);
    process.exit(1);
  }

  console.log(`📊 Discovered ${records.length} problem records.`);

  let validated = 0;
  let invalid = 0;
  const validProblems = [];
  const seenSlugs = new Set();

  records.forEach((rec, idx) => {
    const extId = String(rec.externalId || rec.question_id || idx + 1).trim();
    const title = String(rec.title || '').trim();
    const difficulty = normalizeDifficulty(rec.difficulty);
    const description = String(rec.description || rec.question_content || '').trim();
    const topics = normalizeTopics(rec.topics || rec.tags);

    if (!extId || !title || !difficulty || !description) {
      invalid++;
      return;
    }

    let slug = rec.slug || generateSlug(title, extId);
    if (seenSlugs.has(slug)) {
      slug = `${slug}-${extId}`;
    }
    seenSlugs.add(slug);

    validated++;
    validProblems.push({
      externalSource: 'LeetCodeDataset',
      externalId: extId,
      title,
      slug,
      description,
      difficulty,
      levelTier: difficulty === 'Easy' ? 'Beginner' : difficulty === 'Medium' ? 'Intermediate' : 'Advanced',
      topics,
      constraints: Array.isArray(rec.constraints) ? rec.constraints : ['Standard execution constraints apply.'],
      examples: Array.isArray(rec.examples) ? rec.examples : [],
      starterCode: rec.starterCode || {
        cpp: `// Solution for ${title}\n#include <iostream>\nusing namespace std;\nclass Solution {\npublic:\n};`,
        javascript: `// Solution for ${title}\nfunction solution() {\n}`,
        python: `# Solution for ${title}\ndef solution():\n    pass`
      },
      supportedLanguages: ['cpp', 'javascript', 'python'],
      sampleTestCases: Array.isArray(rec.sampleTestCases) ? rec.sampleTestCases : rec.sample_test_cases || [],
      hiddenTestCases: Array.isArray(rec.hiddenTestCases) ? rec.hiddenTestCases : rec.hidden_test_cases || [],
      sourceMetadata: {
        dataset: 'LeetCodeDataset',
        datasetVersion: '2025.04',
        importedAt: new Date()
      },
      isActive: true
    });
  });

  console.log('\n--- Validation Summary ---');
  console.log(`Total Records: ${records.length}`);
  console.log(`Validated:     ${validated}`);
  console.log(`Invalid:       ${invalid}`);

  if (isValidateOnly) {
    console.log('✅ Validation complete.');
    return;
  }

  if (isDryRun) {
    console.log('\n--- Dry-Run Execution Summary ---');
    console.log(`Records to Insert/Update: ${validProblems.length}`);
    console.log(`Records Skipped:          ${invalid}`);
    console.log('⚡ Dry-run finished cleanly. No changes were made to MongoDB.');
    return;
  }

  // Real Database Import
  let mongoServer = null;
  let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/codebuddy';
  
  try {
    console.log(`\n🔌 Connecting to MongoDB: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2500 });
  } catch (connErr) {
    console.warn(`⚠️  Local MongoDB service not reachable (${connErr.message}).`);
    console.log(`🚀 Starting MongoMemoryServer for standalone database import...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      console.log(`🔌 Connected to MongoMemoryServer: ${mongoUri}`);
      await mongoose.connect(mongoUri);
    } catch (memErr) {
      console.error(`❌ MongoMemoryServer fallback error: ${memErr.message}`);
      throw connErr;
    }
  }

  try {
    const ops = validProblems.map(prob => ({
      updateOne: {
        filter: { externalSource: 'LeetCodeDataset', externalId: prob.externalId },
        update: { $set: prob },
        upsert: true
      }
    }));

    const bulkResult = await Problem.bulkWrite(ops);
    const dbCount = await Problem.countDocuments({ isActive: true });

    console.log('\n--- MongoDB Import Summary ---');
    console.log(`Inserted New Records: ${bulkResult.upsertedCount}`);
    console.log(`Updated Records:      ${bulkResult.modifiedCount}`);
    console.log(`Matched Total:        ${bulkResult.matchedCount}`);
    console.log(`Active Problems in DB: ${dbCount}`);
    console.log('✅ LeetCode dataset import completed successfully!');
  } catch (err) {
    console.error('❌ MongoDB bulkWrite error:', err.message);
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('🔌 Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  runImport().catch(err => {
    console.error('Fatal import error:', err);
    process.exit(1);
  });
}

module.exports = { runImport, normalizeDifficulty, normalizeTopics, generateSlug };
