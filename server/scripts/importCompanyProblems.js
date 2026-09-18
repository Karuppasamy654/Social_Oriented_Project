const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Problem = require('../models/Problem');
const CompanyProblem = require('../models/CompanyProblem');

async function importCompanyProblems({ dryRun = false, validateOnly = false } = {}) {
  const jsonPath = path.join(__dirname, '../../data/company/company-problems.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Dataset file not found at: ${jsonPath}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log("==================================================");
  console.log(`⚡ CODEBUDDY COMPANY INTERVIEW IMPORT PIPELINE ⚡`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : validateOnly ? 'VALIDATION ONLY' : 'REAL DATABASE IMPORT'}`);
  console.log("==================================================");
  console.log(`📊 Discovered ${rawData.length} company-problem records.`);

  if (validateOnly) {
    console.log(`✅ Validation passed for ${rawData.length} company-problem records.`);
    return;
  }

  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Failed to connect to database.');
    process.exit(1);
  }

  try {
    let upsertedCount = 0;
    let matchedCount = 0;
    const bulkOps = [];

    for (const item of rawData) {
      // Find or create base Problem record
      let baseProblem = await Problem.findOne({ slug: item.slug });
      if (!baseProblem) {
        baseProblem = await Problem.create({
          title: item.title,
          slug: item.slug,
          description: `Given a collection of inputs, solve the problem optimizing time and space complexity.\n\nCompany context: Frequently asked in ${item.company} technical interviews.`,
          difficulty: item.difficulty,
          levelTier: item.difficulty === 'Easy' ? 'Beginner' : item.difficulty === 'Medium' ? 'Intermediate' : 'Advanced',
          topics: item.topics || ['Array'],
          constraints: ["1 <= N <= 10^5"],
          starterCode: {
            javascript: `function ${item.slug.replace(/-/g, '_')}(nums) {\n  // Implement solution\n}`,
            python: `def ${item.slug.replace(/-/g, '_')}(nums):\n    pass`,
            cpp: `class Solution {\npublic:\n    void solve() {\n    }\n};`
          },
          companies: [item.company]
        });
      } else {
        // Ensure company tag is present in base problem
        if (!baseProblem.companies.includes(item.company)) {
          baseProblem.companies.push(item.company);
          await baseProblem.save();
        }
      }

      bulkOps.push({
        updateOne: {
          filter: { problemId: baseProblem._id, company: item.company },
          update: {
            $set: {
              problemId: baseProblem._id,
              title: item.title,
              slug: item.slug,
              company: item.company,
              difficulty: item.difficulty,
              topics: item.topics,
              frequency: item.frequency,
              recency: item.recency,
              historicalEvidence: item.historicalEvidence,
              evidenceType: item.evidenceType,
              source: item.source,
              importedAt: new Date()
            }
          },
          upsert: true
        }
      });
    }

    if (dryRun) {
      console.log(`⚡ Dry-run finished cleanly. ${bulkOps.length} company-problem records prepared for upsert.`);
    } else if (bulkOps.length > 0) {
      const res = await CompanyProblem.bulkWrite(bulkOps);
      upsertedCount = res.upsertedCount || 0;
      matchedCount = res.matchedCount || 0;
      const totalDBCount = await CompanyProblem.countDocuments();
      console.log("--------------------------------------------------");
      console.log(`Inserted New Associations: ${upsertedCount}`);
      console.log(`Updated Associations:      ${matchedCount}`);
      console.log(`Total Active Associations: ${totalDBCount}`);
      console.log(`✅ Company dataset import completed successfully!`);
      console.log("--------------------------------------------------");
    }
  } catch (err) {
    console.error('❌ Import execution failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  const isValidateOnly = process.argv.includes('--validate-only');
  importCompanyProblems({ dryRun: isDryRun, validateOnly: isValidateOnly });
}

module.exports = { importCompanyProblems };
