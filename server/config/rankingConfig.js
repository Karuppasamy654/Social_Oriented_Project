/**
 * Centralized Ranking Model Configuration & Adaptation Rules
 * Avoids hardcoded magic numbers across controllers and algorithms.
 */

module.exports = {
  // Candidate Ranking Weight Configuration (Sum = 1.00)
  rankingWeights: {
    companyFrequency: 0.25,        // Relevance of company historical frequency
    recency: 0.10,                 // Freshness of company interview signal
    difficultyFit: 0.20,           // Alignment with student ML skill level
    weakTopicMatch: 0.15,          // Relevance to student's recorded weak topics
    mistakeRelevance: 0.10,        // Match with student's active mistake profile
    unseenBonus: 0.08,             // Preference for unattempted problems
    topicCoverage: 0.07,           // Topic diversity maintenance
    solvedPenalty: 0.03,           // Penalty for previously solved problems
    recentlyAttemptedPenalty: 0.02 // Penalty for recently attempted problems
  },

  // Recency Signal Weights (Normalized [0, 1])
  recencyWeights: {
    'thirty-days': 1.0,
    'three-months': 0.9,
    'six-months': 0.8,
    'more-than-six-months': 0.6,
    'all-time': 0.5
  },

  // Dynamic Difficulty Adaptation Sequence per Student Level
  difficultyAdaptationRules: {
    Beginner: {
      initialDifficulty: 'Easy',
      onSuccess: 'Easy->Medium', // Upgrade to Medium after 2 consecutive successes
      onFailure: 'Easy'         // Keep at Easy warm-up
    },
    Intermediate: {
      initialDifficulty: 'Medium',
      onSuccess: 'Medium->Hard', // Upgrade to Hard after success
      onFailure: 'Easy/Medium'   // Target Easy warm-up or foundational Medium
    },
    Advanced: {
      initialDifficulty: 'Medium',
      onSuccess: 'Hard',        // Challenge with high-frequency Hard
      onFailure: 'Medium'       // Fallback to foundational Medium
    }
  },

  // Performance Weights for Evaluation & Performance Score
  performanceWeights: {
    correctness: 0.50,           // Execution correctness (Accepted vs WA/RE)
    timeEfficiency: 0.15,        // Speed relative to estimated solve time
    attemptsPenalty: 0.10,       // Number of attempts needed
    hintsPenalty: 0.10,          // Number of hints requested
    understandingScore: 0.15     // Solution-specific AI follow-up score
  }
};
