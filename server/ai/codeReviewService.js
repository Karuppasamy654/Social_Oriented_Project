const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (e) {
    console.warn('Gemini API init failed, using fallback rule engine:', e.message);
  }
}

async function analyzeSubmittedCode({ problemTitle, problemDescription, language, sourceCode, status, runtimeMs, memoryKb, previousMistakes = [] }) {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
You are an expert AI Code Reviewer for the CodeBuddy platform.
Analyze this submitted solution:

Problem: ${problemTitle}
Language: ${language}
Verdict: ${status}
Source Code:
\`\`\`${language}
${sourceCode}
\`\`\`

User's Previous Mistakes:
${JSON.stringify(previousMistakes)}

Provide structured JSON with the following fields ONLY:
{
  "codeScore": 88,
  "correctnessPercentage": 95,
  "efficiencyScore": 82,
  "codeQualityScore": 85,
  "timeComplexity": "O(N)",
  "spaceComplexity": "O(N)",
  "aiImprovementAdvice": "Detailed explanation of approach and how to improve space or time complexity...",
  "detectedMistakes": ["off-by-one boundary condition"],
  "understandingQuestions": [
    { "question": "Why did you select this data structure?", "options": ["Option A", "Option B", "Option C"], "correctAnswer": "Option A" },
    { "question": "What is the time complexity of your inner loop?", "options": ["O(1)", "O(N)", "O(N^2)"], "correctAnswer": "O(N)" }
  ]
}
`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      return JSON.parse(cleanJson);
    } catch (err) {
      console.warn('Gemini API call failed during code review, using fallback rule engine:', err.message);
    }
  }

  // Fallback intelligent code review rule engine
  let timeComp = "O(N)";
  let spaceComp = "O(N)";
  if (sourceCode.includes('unordered_map') || sourceCode.includes('new Map()') || sourceCode.includes('dict()') || sourceCode.includes('seen = {}')) {
    spaceComp = "O(N)";
  } else if (sourceCode.includes('sort') || sourceCode.includes('std::sort')) {
    timeComp = "O(N log N)";
    spaceComp = "O(1)";
  }
  
  if (sourceCode.includes('for') && sourceCode.split('for').length > 3) {
    timeComp = "O(N^2)";
  }

  let advice = "Your solution effectively passes the required evaluation criteria. ";
  if (timeComp === "O(N^2)") {
    advice += "However, nested loops increase time complexity to O(N^2). Consider using a Hash Map or Frequency Array to optimize lookup speed down to O(N).";
  } else if (spaceComp === "O(N)") {
    advice += "Great use of Hash Maps for O(N) linear time lookup. Make sure to check for key existence before accessing map values to avoid out-of-bounds or undefined key access.";
  } else {
    advice += "Clean and optimal approach! Maintain clear variable naming conventions for competitive interviews.";
  }

  return {
    codeScore: status === 'Accepted' ? 88 : 45,
    correctnessPercentage: status === 'Accepted' ? 100 : 50,
    efficiencyScore: timeComp.includes('N^2') ? 65 : 85,
    codeQualityScore: 88,
    timeComplexity: timeComp,
    spaceComplexity: spaceComp,
    aiImprovementAdvice: advice,
    detectedMistakes: sourceCode.includes('<=') && sourceCode.includes('.length') ? ["Potential off-by-one array index boundary error"] : [],
    understandingQuestions: [
      {
        question: `What is the time complexity of your ${language} solution?`,
        options: [timeComp, "O(N^2)", "O(1)", "O(2^N)"],
        correctAnswer: timeComp
      },
      {
        question: `Why is space complexity evaluated as ${spaceComp}?`,
        options: [
          `Because of auxiliary data structures maintained during execution`,
          `Because no extra variables were allocated`,
          `Due to recursion stack depth`
        ],
        correctAnswer: `Because of auxiliary data structures maintained during execution`
      }
    ]
  };
}

module.exports = {
  analyzeSubmittedCode
};
