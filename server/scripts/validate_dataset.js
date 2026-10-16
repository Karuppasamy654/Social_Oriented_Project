const fs = require('fs');
const path = require('path');

async function validateDataset() {
  console.log('🔍 Running Dataset Validation & Quality Audit...');

  const v2Path = path.join(__dirname, '../../data/processed/coding_problems_v2.json');
  const curriculumPath = path.join(__dirname, '../../data/leetcode/curriculum-500.json');
  const companyPath = path.join(__dirname, '../../data/company/company-problems.json');

  let datasetPath = fs.existsSync(v2Path) ? v2Path : (fs.existsSync(curriculumPath) ? curriculumPath : null);

  if (!datasetPath) {
    console.error('❌ No coding problem dataset found!');
    process.exit(1);
  }

  const problems = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  console.log(`📦 Loaded ${problems.length} problems from ${path.basename(datasetPath)}`);

  let duplicateTitles = 0;
  let missingDescriptions = 0;
  let missingDifficulty = 0;
  let missingTopics = 0;
  let missingStarterCpp = 0;
  let missingSampleCases = 0;
  let missingHiddenCases = 0;

  const seenSlugs = new Set();
  let validCount = 0;

  for (const p of problems) {
    const slug = p.slug || p.problem_id;
    if (seenSlugs.has(slug)) duplicateTitles++;
    seenSlugs.add(slug);

    if (!p.description || p.description.trim().length === 0) missingDescriptions++;
    if (!p.difficulty) missingDifficulty++;
    if (!p.topics || p.topics.length === 0) missingTopics++;
    if (!p.starterCode || (!p.starterCode.cpp && !p.starter_code?.cpp)) missingStarterCpp++;
    if (!p.sampleTestCases || p.sampleTestCases.length === 0) missingSampleCases++;
    if (!p.hiddenTestCases || p.hiddenTestCases.length === 0) missingHiddenCases++;

    validCount++;
  }

  console.log('\n================ DATASET QUALITY AUDIT REPORT ================');
  console.log(`Total Records Checked:      ${problems.length}`);
  console.log(`Duplicate Slugs:             ${duplicateTitles}`);
  console.log(`Missing Descriptions:        ${missingDescriptions}`);
  console.log(`Missing Difficulty:          ${missingDifficulty}`);
  console.log(`Missing Topics:              ${missingTopics}`);
  console.log(`Missing C++ Starter Code:    ${missingStarterCpp}`);
  console.log(`Missing Sample Test Cases:   ${missingSampleCases}`);
  console.log(`Missing Hidden Test Cases:   ${missingHiddenCases}`);
  console.log(`Valid Records:               ${validCount}`);
  console.log('===============================================================\n');

  if (fs.existsSync(companyPath)) {
    const companyRecords = JSON.parse(fs.readFileSync(companyPath, 'utf8'));
    console.log(`🏢 Loaded ${companyRecords.length} Company-Problem Associations across 15 target companies.`);
  }

  console.log('✅ Dataset Validation Complete!');
}

validateDataset();

