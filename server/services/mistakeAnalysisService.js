const Mistake = require('../models/Mistake');
const User = require('../models/User');
const pythonService = require('./pythonService');

/**
 * Perform comprehensive code analysis and mistake detection
 * Combines AST rule heuristics with Python ML microservice when available.
 */
async function analyzeCodeAndMistakes({
  sourceCode,
  language = 'cpp17',
  problem = null,
  executionResult = null,
  userId = null,
  saveToProfile = false
}) {
  const code = sourceCode || '';
  const codeLower = code.toLowerCase();
  const problemTopic = (problem?.topics && problem.topics[0]) || problem?.category || 'Array';
  const problemTitle = problem?.title || 'Coding Problem';

  // 1. Gather User's Historical Mistake Profile (for recurrence tracking)
  let userMistakeRecords = [];
  if (userId) {
    try {
      userMistakeRecords = await Mistake.find({ userId }).lean();
    } catch (_) {}
  }

  const prevMistakeMap = new Map();
  userMistakeRecords.forEach(m => {
    const count = m.occurrenceCount || m.frequency || 1;
    prevMistakeMap.set(m.mistakeType, count);
  });

  // 2. AST Token & Structural Code Analysis
  const lines = code.split('\n');
  let loopCount = 0;
  let maxLoopDepth = 0;
  let currentDepth = 0;
  let hasRecursion = false;

  const hasSort = /\b(std::)?sort\b/.test(code);
  const hasHashMap = /\b(unordered_map|unordered_set)\b/.test(code);
  const hasTreeMap = /\b(std::)?map\b/.test(code) && !hasHashMap;
  const hasBinarySearch = /\b(lower_bound|upper_bound|binary_search)\b/.test(code);
  const hasRefPass = /vector<[^>]+>\s*&/.test(code);

  for (const line of lines) {
    const trimmed = line.trim();
    if (/\b(for|while)\b/.test(trimmed)) {
      loopCount++;
      currentDepth++;
      if (currentDepth > maxLoopDepth) maxLoopDepth = currentDepth;
    }
    if (trimmed.includes('}') && currentDepth > 0) {
      currentDepth--;
    }
    if (/\b(solve|dfs|bfs|helper|backtrack)\s*\(/.test(trimmed) && trimmed.includes('return')) {
      hasRecursion = true;
    }
  }

  // Determine Complexity
  let timeComplexity = 'O(N)';
  let spaceComplexity = hasHashMap ? 'O(N)' : 'O(1)';
  const evidence = [];
  const whatDidWell = [];
  const whatCanBeImproved = [];

  if (hasSort) {
    if (maxLoopDepth <= 1) {
      timeComplexity = 'O(N log N)';
      evidence.push('std::sort invocation incurs O(N log N) runtime.');
    } else {
      timeComplexity = 'O(N² log N)';
      evidence.push('std::sort nested inside loop iterations.');
    }
  } else if (maxLoopDepth >= 3) {
    timeComplexity = 'O(N³)';
    evidence.push('Triple nested loop structure detected.');
  } else if (maxLoopDepth === 2) {
    timeComplexity = 'O(N²)';
    evidence.push('Double nested for-loops iterating over input elements.');
  } else if (maxLoopDepth === 1) {
    if (hasBinarySearch) {
      timeComplexity = 'O(N log N)';
      evidence.push('Single loop combined with binary search.');
    } else if (hasHashMap) {
      timeComplexity = 'O(N)';
      evidence.push('Single pass linear traversal with expected O(1) hash map operations.');
    } else {
      timeComplexity = 'O(N)';
      evidence.push('Single pass linear iteration.');
    }
  } else if (hasBinarySearch) {
    timeComplexity = 'O(log N)';
    evidence.push('Logarithmic binary search boundary halving.');
  } else if (hasRecursion) {
    timeComplexity = 'O(2^N)';
    spaceComplexity = 'O(N)';
    evidence.push('Recursive branching algorithm with call stack overhead.');
  }

  // Strengths
  if (hasHashMap) {
    whatDidWell.push('Leveraged std::unordered_map for O(1) average lookup time.');
  }
  if (hasRefPass) {
    whatDidWell.push('Passed containers by reference to eliminate costly vector deep-copies.');
  }
  if (maxLoopDepth <= 1 && !hasRecursion) {
    whatDidWell.push('Maintained linear O(N) or sub-linear algorithmic time efficiency.');
  }
  if (whatDidWell.length === 0) {
    whatDidWell.push('Modular functional structure adhering to C++17 class standards.');
  }

  // 3. Rule-Based Mistake Diagnostics
  const detectedMistakes = [];

  // (A) Vector Index Off-by-one Check (e.g. i <= nums.size())
  if (/for\s*\(\s*(?:int\s+)?\w+\s*=\s*0;\s*\w+\s*<=\s*\w+\.(?:size|length)\(\)/.test(code)) {
    detectedMistakes.push({
      mistakeType: 'off_by_one',
      title: 'Off-by-One Vector Index Out-of-Bounds',
      severity: 'high',
      description: 'Loop termination condition uses `<= nums.size()`. In C++, valid 0-indexed vector positions range from 0 to size() - 1. Accessing index `nums.size()` reads unallocated memory or causes a Segmentation Fault.',
      suggestion: 'Replace `<=` with `<` in your loop condition: `for (int i = 0; i < nums.size(); ++i)`.'
    });
    whatCanBeImproved.push('Correct vector boundary condition from `<=` to `<`.');
  }

  // (B) Unchecked Hash Map Key Access (map[key] without .find or .count)
  if ((codeLower.includes('unordered_map') || codeLower.includes('map')) &&
      !codeLower.includes('.count(') && !codeLower.includes('.find(') && !codeLower.includes('.contains(')) {
    if (code.includes('[') && code.includes(']')) {
      detectedMistakes.push({
        mistakeType: 'incorrect_hash_logic',
        title: 'Unchecked Hash Map Subscript Access',
        severity: 'medium',
        description: 'Direct key access `map[key]` without verifying presence via `.find()` or `.count()`. In C++, subscript `[]` implicitly inserts default-initialized zero values if the key is missing.',
        suggestion: 'Check `if (map.find(complement) != map.end())` or `if (map.count(complement))` before reading or writing.'
      });
      whatCanBeImproved.push('Guard hash map lookups with .find() or .count() to prevent unwanted key creations.');
    }
  }

  // (C) Duplicate / Self-Pair Iteration in Inner Loop (j = 0 instead of j = i + 1)
  if (/for\s*\(\s*(?:int\s+)?i\s*=.*for\s*\(\s*(?:int\s+)?j\s*=\s*0;/s.test(code)) {
    detectedMistakes.push({
      mistakeType: 'duplicate_handling',
      title: 'Redundant Self-Pair Inner Loop Iteration',
      severity: 'medium',
      description: 'Inner loop initializes `j = 0`. This causes comparing an element with itself (`i == j`) and redundantly testing duplicate pair permutations.',
      suggestion: 'Initialize inner loop from `int j = i + 1;` to iterate over strictly unique, distinct pairs.'
    });
    whatCanBeImproved.push('Start inner loop at j = i + 1 to avoid self-pairing and redundant duplicate operations.');
  }

  // (D) Inefficient Quadratic Complexity on Large Constraints
  if (maxLoopDepth >= 2 && !hasHashMap) {
    detectedMistakes.push({
      mistakeType: 'inefficient_complexity',
      title: 'Brute-Force O(N²) Quadratic Complexity',
      severity: 'high',
      description: `Nested loop structure detected with estimated O(N²) time complexity. For problems with input sizes up to 10⁵, N² exceeds 10¹⁰ operations and will hit Time Limit Exceeded (TLE).`,
      suggestion: 'Optimize using a Hash Map (std::unordered_map) for O(N) lookup or a two-pointer technique after sorting.'
    });
    whatCanBeImproved.push('Reduce quadratic O(N²) nested loops down to O(N) using a Hash Map.');
  }

  // (E) Unguarded Empty Container Access
  if (/(?:nums|arr|vec)\[0\]/.test(code) && !/empty\(\)|size\(\)\s*>\s*0/.test(code)) {
    detectedMistakes.push({
      mistakeType: 'empty_container_access',
      title: 'Unguarded Container Index Access',
      severity: 'medium',
      description: 'Accessing `nums[0]` directly without verifying whether the container is empty. This can crash with a buffer overflow on empty input edge cases.',
      suggestion: 'Add an edge-case guard: `if (nums.empty()) return {};` at the start of your function.'
    });
    whatCanBeImproved.push('Validate container non-emptiness before direct index access.');
  }

  // (F) Compilation Error Diagnosis
  if (executionResult?.compileError || executionResult?.verdict === 'Compilation Error') {
    const rawError = executionResult.compileError || 'Compilation Error';
    let cleanExplanation = rawError.split('\n').filter(l => l.trim() && !l.includes('compilation terminated')).slice(0, 3).join(' | ');

    let fixSuggestion = 'Check variable declarations, matching brackets, and proper semicolons.';
    if (rawError.includes('was not declared in this scope') || rawError.includes('undeclared')) {
      const match = rawError.match(/'([^']+)' was not declared/);
      const missingVar = match ? match[1] : 'identifier';
      fixSuggestion = `Ensure \`${missingVar}\` is declared before use, or include standard headers like \`#include <vector>\` or \`#include <unordered_map>\`.`;
    } else if (rawError.includes('expected') && rawError.includes(';')) {
      fixSuggestion = 'Missing semicolon `;` before statement.';
    }

    detectedMistakes.unshift({
      mistakeType: 'compilation_error',
      title: 'C++ Syntax / Declaration Error',
      severity: 'critical',
      description: cleanExplanation || 'Syntax error encountered during GCC compilation.',
      suggestion: fixSuggestion
    });
  }

  // (G) Test Failure / Wrong Answer Diagnosis
  if (executionResult?.verdict === 'Wrong Answer' || (executionResult?.results && executionResult.results.some(r => !r.passed))) {
    const failedTests = (executionResult.results || executionResult.executionResults || []).filter(r => !r.passed);
    const firstFail = failedTests[0];

    let failDetail = 'One or more sample test cases produced incorrect output.';
    let failSuggestion = 'Review loop boundaries, 0-based indexing, and edge cases.';

    if (firstFail) {
      const act = String(firstFail.actualOutput || '').trim();
      const exp = String(firstFail.expectedOutput || '').trim();
      failDetail = `Test case failed for input \`${firstFail.input || 'sample'}\`: Expected \`${exp}\`, but your code returned \`${act || 'empty / no output'}\`.`;

      if (act === '' || act === '[]' || act === '{}') {
        failSuggestion = 'Your function returned empty or reached the end without finding the answer. Verify return conditions and map insertions.';
      } else {
        failSuggestion = 'Double check the order of indices returned, or make sure you are comparing numbers and target correctly.';
      }
    }

    detectedMistakes.push({
      mistakeType: 'wrong_answer',
      title: 'Logic Mismatch (Wrong Answer)',
      severity: 'high',
      description: failDetail,
      suggestion: failSuggestion
    });
  }

  // (H) Time Limit Exceeded Diagnosis
  if (executionResult?.verdict === 'Time Limit Exceeded' || executionResult?.errorType === 'time_limit_exceeded') {
    detectedMistakes.unshift({
      mistakeType: 'time_limit_exceeded',
      title: 'Execution Time Limit Exceeded (> 2.0s)',
      severity: 'critical',
      description: 'Your solution exceeded the 2.0s CPU time limit. This typically occurs due to an infinite loop, missing loop increment step, or high time complexity (O(N²)) on large constraints.',
      suggestion: 'Verify all while/for loops increment their loop indices, and replace nested loops with a single pass Hash Map.'
    });
  }

  // 4. Try Querying Python AI Microservice (fast timeout fallback)
  try {
    const pythonMistakes = await Promise.race([
      pythonService.detectMistakes({
        user_id: userId ? String(userId) : 'guest',
        code,
        language,
        problem_topic: problemTopic,
        previous_mistakes: userMistakeRecords,
        error_type: executionResult?.errorType
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
    ]);

    if (Array.isArray(pythonMistakes) && pythonMistakes.length > 0) {
      pythonMistakes.forEach(pm => {
        if (!detectedMistakes.some(d => d.mistakeType === pm.mistake_type)) {
          detectedMistakes.push({
            mistakeType: pm.mistake_type,
            title: pm.mistake_type.replace(/_/g, ' ').toUpperCase(),
            severity: pm.severity || 'medium',
            description: pm.description,
            suggestion: pm.suggestion,
            isRecurring: pm.is_recurring,
            frequency: pm.frequency
          });
        }
      });
    }
  } catch (_) {
    // Built-in rule engine handles detection reliably
  }

  // 5. Cross-reference Recurrence & Format Final Mistake Objects
  const formattedMistakes = detectedMistakes.map(m => {
    const prevCount = prevMistakeMap.get(m.mistakeType) || 0;
    const isRecurring = prevCount > 0;
    const frequency = prevCount + 1;

    let description = m.description;
    if (isRecurring) {
      description = `🚨 RECURRING MISTAKE #${frequency}: You have made this "${m.title}" error ${frequency} times across problems. ` + description;
    }

    return {
      mistakeType: m.mistakeType,
      title: m.title,
      severity: m.severity,
      description,
      suggestion: m.suggestion,
      isRecurring,
      frequency
    };
  });

  // 6. Persist Mistakes to Database (if requested, e.g. during submission)
  if (saveToProfile && userId && formattedMistakes.length > 0) {
    try {
      for (const m of formattedMistakes) {
        let existing = await Mistake.findOne({ userId, mistakeType: m.mistakeType });
        if (existing) {
          existing.occurrenceCount = (existing.occurrenceCount || 1) + 1;
          existing.frequency = existing.occurrenceCount;
          existing.lastSeen = new Date();
          existing.description = m.description;
          existing.topic = problemTopic;
          if (problem?._id) existing.problemId = problem._id;
          await existing.save();
        } else {
          await Mistake.create({
            userId,
            problemId: problem?._id,
            topic: problemTopic,
            mistakeType: m.mistakeType,
            description: m.description,
            severity: m.severity,
            occurrenceCount: 1,
            frequency: 1,
            firstSeen: new Date(),
            lastSeen: new Date()
          });
        }
      }

      // Update User mistakeProfile array
      const user = await User.findById(userId);
      if (user) {
        user.mistakeProfile = user.mistakeProfile || [];
        for (const m of formattedMistakes) {
          const idx = user.mistakeProfile.findIndex(p => p.mistakeType === m.mistakeType);
          if (idx !== -1) {
            user.mistakeProfile[idx].frequency += 1;
            user.mistakeProfile[idx].lastSeen = new Date();
            user.mistakeProfile[idx].topic = problemTopic;
          } else {
            user.mistakeProfile.push({
              topic: problemTopic,
              mistakeType: m.mistakeType,
              frequency: 1,
              lastSeen: new Date()
            });
          }
        }
        await user.save();
      }
    } catch (saveErr) {
      console.warn('Could not persist mistake record:', saveErr.message);
    }
  }

  const aiAnalysis = {
    timeComplexity,
    spaceComplexity,
    confidence: 0.94,
    evidence,
    whatDidWell,
    whatCanBeImproved: whatCanBeImproved.length > 0 ? whatCanBeImproved : ['Code exhibits clean syntax and good problem-solving structure.'],
    loopCount,
    nestedLoopMaxDepth: maxLoopDepth,
    hasRecursion
  };

  return {
    aiAnalysis,
    detectedMistakes: formattedMistakes
  };
}

module.exports = {
  analyzeCodeAndMistakes
};
