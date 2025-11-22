import { badWordList } from './bad_word_list';

/**
 * @param {string} message
 * @returns {string}
 */
export function filterBadWords(message) {
  const badWords = badWordList.createWordArray(); // Sum of basic bad words and additional bad words
  const filteredBadWords = [...new Set(badWords)].filter(
    (word) => word.length > 0
  );

  let resultChars = Array.from(message); // Original message not yet filtered
  let hasChanges = true; // Variable for detecting 'Is filtering ended?'

  const pattern = new RegExp(filteredBadWords.join('|'), 'gi');

  const characterViews = [
    { name: 'Letter+Emoji', regex: /\p{L}|\p{Emoji}/u }, // Only letter and emoji
    { name: 'Letter', regex: /\p{L}/u }, // Only letter
    { name: 'Korean', regex: /\p{Script=Hangul}/u }, // Only korean
    { name: 'English', regex: /\p{Script=Latin}/u }, // Only English
    { name: 'Kanji', regex: /\p{Script=Han}/u }, // Only kanji
    { name: 'Emoji', regex: /\p{Emoji}/u }, // Only Emoji
  ];

  while (hasChanges) {
    // Repeat filtering while target doesn't exist
    hasChanges = false;
    let currentResult = Array.from(resultChars);

    for (const characterView of characterViews) {
      const { cleaned, mapToOriginal } = cleanMessage(
        currentResult.join(''),
        characterView.regex
      );
      const matches = [...cleaned.matchAll(pattern)];

      for (const m of matches) {
        const matchLength = Array.from(m[0]).length; // Count emojis as length 1
        const prefix = cleaned.slice(0, m.index);
        const arrayIndex = Array.from(prefix).length;

        // Substitute bad-words to '*' by index
        for (let i = 0; i < matchLength; i++) {
          const cleanedIndex = arrayIndex + i;
          const origIndex = mapToOriginal[cleanedIndex];

          // Prevent re-filtering
          if (currentResult[origIndex] !== '*') {
            currentResult[origIndex] = '*';
            hasChanges = true;
          }
        }
      }
    }

    if (hasChanges) {
      resultChars = currentResult;
    }
  } // End of while loop
  return resultChars.join('');
}

/**
 * Remove characters not matching 'filterRegex'
 * @param {string} message
 * @param {RegExp} filterRegex - character which is wanted to remain
 * @returns {{cleaned: string, mapToOriginal: number[]}}
 */
function cleanMessage(message, filterRegex) {
  const cleanedChars = [];
  const mapToOriginal = [];
  const messageChars = Array.from(message);

  for (let i = 0; i < messageChars.length; i++) {
    const ch = messageChars[i];

    if (filterRegex.test(ch)) {
      mapToOriginal.push(i);
      cleanedChars.push(ch.toLowerCase());
    }
  }

  return {
    cleaned: cleanedChars.join(''),
    mapToOriginal: mapToOriginal,
  };
}
