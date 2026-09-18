const Mistake = require('../models/Mistake');

async function updateMistakeProfile(userId, topic, detectedMistakes = [], codeSnippet = '') {
  if (!detectedMistakes || detectedMistakes.length === 0) return [];

  const recordedMistakes = [];
  for (let mistakeType of detectedMistakes) {
    let existing = await Mistake.findOne({ userId, topic, mistakeType });
    if (existing) {
      existing.frequency += 1;
      existing.lastSeen = new Date();
      existing.codeSnippet = codeSnippet || existing.codeSnippet;
      await existing.save();
      recordedMistakes.push(existing);
    } else {
      let created = await Mistake.create({
        userId,
        topic,
        mistakeType,
        codeSnippet,
        frequency: 1
      });
      recordedMistakes.push(created);
    }
  }
  return recordedMistakes;
}

async function checkRepeatMistake(userId, topic, currentCode = '') {
  const userMistakes = await Mistake.find({ userId, topic, resolved: false });
  if (!userMistakes || userMistakes.length === 0) return null;

  const frequentMistake = userMistakes.sort((a, b) => b.frequency - a.frequency)[0];
  if (frequentMistake && frequentMistake.frequency >= 2) {
    return {
      isRepeat: true,
      mistakeType: frequentMistake.mistakeType,
      frequency: frequentMistake.frequency,
      warningMessage: `⚠️ You made this mistake before (${frequentMistake.frequency} times). Previously in ${topic}: "${frequentMistake.mistakeType}". Watch out for duplicate check or boundary conditions!`
    };
  }

  return null;
}

module.exports = {
  updateMistakeProfile,
  checkRepeatMistake
};
