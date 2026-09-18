/**
 * Content-Based Recommendation System & Adaptive Candidate Ranking Engine
 * Calculates recommendation & interview candidate ranking scores based on:
 * - Centralized rankingConfig weights
 * - Company interview frequency & recency signals
 * - Skill difficulty fit & student level
 * - Topic weakness matching & mistake memory
 * - Topic coverage diversity & previous solve penalties
 */

const { rankingWeights, recencyWeights } = require('../config/rankingConfig');

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function recommendProblems(user, candidateProblems, limit = 5) {
  const userWeakTopics = (user.mistakeProfile || []).map(m => m.topic);
  const targetCompanies = user.targetCompanies || [];
  const userLevel = user.verifiedLevel || 'Beginner';

  const scoredProblems = candidateProblems.map(problem => {
    let score = 0;
    let reasons = [];

    // 1. Difficulty fit
    if (userLevel.startsWith('Beginner') && problem.difficulty === 'Easy') {
      score += 40;
      reasons.push('Matches your verified Beginner level');
    } else if (userLevel.startsWith('Intermediate') && problem.difficulty === 'Medium') {
      score += 40;
      reasons.push('Optimal for Intermediate skill building');
    } else if (userLevel.startsWith('Advanced') && (problem.difficulty === 'Hard' || problem.difficulty === 'Medium')) {
      score += 40;
      reasons.push('Challenges your Advanced skill level');
    } else {
      score += 15;
    }

    // 2. Topic weakness match (High Priority)
    const matchesWeakness = (problem.topics || []).filter(t => userWeakTopics.includes(t));
    if (matchesWeakness.length > 0) {
      score += 35;
      reasons.push(`Addresses recent weakness in ${matchesWeakness.join(', ')}`);
    }

    // 3. Company target match
    const matchesCompany = (problem.companies || []).filter(c => targetCompanies.includes(c));
    if (matchesCompany.length > 0) {
      score += 20;
      reasons.push(`Frequently asked by target company: ${matchesCompany[0]}`);
    }

    // 4. Feature vector cosine similarity boost
    const userVector = [
      userLevel.includes('Advanced') ? 3 : userLevel.includes('Intermediate') ? 2 : 1,
      userWeakTopics.length,
      targetCompanies.length
    ];
    const problemVector = [
      problem.difficulty === 'Hard' ? 3 : problem.difficulty === 'Medium' ? 2 : 1,
      (problem.topics || []).length,
      (problem.companies || []).length
    ];
    const sim = cosineSimilarity(userVector, problemVector);
    score += Math.round(sim * 15);

    // Is already solved?
    const isSolved = (user.solvedProblems || []).some(id => id.toString() === problem._id.toString());
    if (isSolved) score -= 50;

    return {
      problem,
      recommendationScore: score,
      primaryReason: reasons[0] || 'Matches your current learning roadmap',
      isSolved
    };
  });

  return scoredProblems.sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, limit);
}

/**
 * Company-Wise Dynamic Candidate Problem Ranking Formula
 * Uses configured weights from rankingConfig.js
 */
function recommendCompanyProblems(user, companyProblems, targetCompany, limit = 10, options = {}) {
  const userWeakTopics = (user.mistakeProfile || []).map(m => m.topic);
  const activeMistakes = options.activeMistakes || (user.mistakesDetected || []).map(m => m.topic);
  const userLevel = user.verifiedLevel || options.targetLevel || 'Intermediate';
  const solvedProblemIds = (user.solvedProblems || []).map(id => id.toString());
  const topicsAsked = options.topicsAsked || [];
  const recentlyAttemptedIds = options.recentlyAttemptedIds || [];

  const w = rankingWeights;

  const scored = companyProblems.map(item => {
    let score = 0;
    let reasons = [];
    const prob = item.problemId || item;
    const probIdStr = prob._id ? prob._id.toString() : item._id ? item._id.toString() : '';
    const topics = prob.topics || item.topics || [];
    const diff = prob.difficulty || item.difficulty || 'Medium';

    // 1. Company Frequency Score
    const freqVal = item.frequency || 0.5;
    const compFreqScore = freqVal * 100 * w.companyFrequency;
    score += compFreqScore;

    // 2. Recency Score
    const recencyVal = recencyWeights[item.recency] || 0.5;
    const recencyScore = recencyVal * 100 * w.recency;
    score += recencyScore;

    // 3. Difficulty Fit Score
    let diffFitScore = 0;
    if (userLevel.startsWith('Beginner')) {
      if (diff === 'Easy') diffFitScore = 100;
      else if (diff === 'Medium') diffFitScore = 50;
      else diffFitScore = 20;
    } else if (userLevel.startsWith('Intermediate')) {
      if (diff === 'Medium') diffFitScore = 100;
      else if (diff === 'Easy') diffFitScore = 60;
      else diffFitScore = 50;
    } else { // Advanced
      if (diff === 'Hard') diffFitScore = 100;
      else if (diff === 'Medium') diffFitScore = 75;
      else diffFitScore = 30;
    }
    score += diffFitScore * w.difficultyFit;
    if (diffFitScore >= 80) reasons.push(`Matches target ${userLevel} difficulty tier (${diff})`);

    // 4. Weak Topic Match Score
    const matchesWeakness = topics.filter(t => userWeakTopics.includes(t));
    if (matchesWeakness.length > 0) {
      const weaknessScore = 100 * (matchesWeakness.length / Math.max(1, topics.length));
      score += weaknessScore * w.weakTopicMatch;
      reasons.push(`Targets weak topic area: ${matchesWeakness.join(', ')}`);
    }

    // 5. Mistake Relevance Score
    const matchesMistake = topics.filter(t => activeMistakes.includes(t));
    if (matchesMistake.length > 0) {
      const mistakeScore = 100;
      score += mistakeScore * w.mistakeRelevance;
      reasons.push(`Remediates recent mistake in ${matchesMistake.join(', ')}`);
    }

    // 6. Topic Diversity / Coverage Score
    const isTopicAsked = topics.some(t => topicsAsked.includes(t));
    if (!isTopicAsked) {
      score += 100 * w.topicCoverage;
      reasons.push(`Promotes topic diversity (${topics[0] || 'New Topic'})`);
    }

    // 7. Unseen Problem Bonus
    const isSolved = solvedProblemIds.includes(probIdStr);
    if (!isSolved) {
      score += 100 * w.unseenBonus;
    } else {
      score -= 100 * w.solvedPenalty;
    }

    // 8. Recently Attempted Penalty
    if (recentlyAttemptedIds.includes(probIdStr)) {
      score -= 100 * w.recentlyAttemptedPenalty;
    }

    const normalizedScore = Math.max(0, Math.round(score));

    return {
      companyProblem: item,
      problem: prob,
      recommendationScore: normalizedScore,
      primaryReason: reasons[0] || `Popular ${targetCompany} interview question`,
      isSolved,
      selectionExplanation: {
        companyRelevance: compFreqScore > 15 ? 'high' : 'medium',
        difficultyFit: diffFitScore >= 80 ? 'strong' : 'moderate',
        weakTopicMatch: matchesWeakness.length > 0 ? 'high' : 'none',
        mistakeRelevance: matchesMistake.length > 0 ? 'high' : 'none',
        unseen: !isSolved
      }
    };
  });

  return scored.sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, limit);
}

module.exports = {
  recommendProblems,
  recommendCompanyProblems,
  cosineSimilarity
};
