const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (e) {
    console.warn('Gemini API init failed for Study Buddy:', e.message);
  }
}

async function respondAsStudyBuddy({ userPrompt, currentProblemTitle, userCode, pageContext = 'general' }) {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
You are CodeBuddy AI, an encouraging, super-smart collaborative coding partner.
Page Context: ${pageContext}
Current Problem: ${currentProblemTitle || 'None'}
User Code Snippet: ${userCode || 'None'}

User asks: "${userPrompt}"

Provide a friendly, helpful response (max 3 short paragraphs). Give hints without immediately spoiling full solutions unless directly asked. Use code snippets if appropriate.
`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.warn('Gemini Study Buddy error, using fallback:', err.message);
    }
  }

  // Fallback AI Study Partner responses based on context
  if (userPrompt.toLowerCase().includes('hint') || userPrompt.toLowerCase().includes('stuck')) {
    return `💡 **CodeBuddy Hint**: For **${currentProblemTitle || 'this problem'}**, try breaking down the requirements into two steps:\n1. Use a Hash Map to store elements or frequencies as you traverse.\n2. Before inserting an element, check if its target complement already exists in the map in O(1) time!\n\nWant me to explain the time complexity breakdown?`;
  }
  if (userPrompt.toLowerCase().includes('study') || userPrompt.toLowerCase().includes('what to learn')) {
    return `🎯 **Study Recommendation**: Based on your coding history, focusing on **HashMap fundamentals** and **Sliding Window edge cases** will give you the biggest boost today!\n\nI recommend starting with *Longest Substring Without Repeating Characters*. Shall we tackle it together?`;
  }

  return `🤖 **CodeBuddy AI Partner**: I'm right here with you! Whether you need a hint on **${currentProblemTitle || 'your current code'}**, want to discuss time complexity, or need practice interview questions, just ask!`;
}

module.exports = {
  respondAsStudyBuddy
};
