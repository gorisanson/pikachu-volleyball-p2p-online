import { customBadWordList } from "./bad_word_list";

/**
 * @param {string} message
 * @returns {string}
 */
export function filterBadWords(message) {
  const badWords = customBadWordList.createWordArray(); // Sum of basic bad words and additional bad words
  const filteredBadWords = [...new Set(badWords)].filter(
    (word) => word.length > 0
  );

  if (filteredBadWords.length === 0) {
    // if bad word is blank, do nothing.
    return message;
  }

  const cleanedChars = [];
  const mapToOriginal = []; // List for remembering what kind of, where was a blank / number / special character
  const messageChars = Array.from(message);

  for (let i = 0; i < messageChars.length; i++) {
    const ch = messageChars[i];
    if (/\p{L}|\p{Emoji}/u.test(ch)) { 
      mapToOriginal.push(i);  
      cleanedChars.push(ch.toLowerCase());
    }
  }
  
  const cleaned = cleanedChars.join("");
  const pattern = new RegExp(filteredBadWords.join("|"), "gi");
  const matches = [...cleaned.matchAll(pattern)];
  const result = messageChars;

  for (const m of matches) {
    const start = m.index;
    const end = start + m[0].length;
    for (let i = start; i < end; i++) {
      const origIndex = mapToOriginal[i];
      result[origIndex] = "*";
      // Only replace bad words to * except for blank / number / special character
    }
  }

  return result.join("");
}