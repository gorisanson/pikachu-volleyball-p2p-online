/**
 * Class representing a custom bad word added by the user.
 */
class CustomBadWord {
  /**
   * Create a CustomBadWord object
   * @param {string} word
   * @param {number} [addedTime]
   */
  constructor(word, addedTime = Date.now()) {
    this.word = word.toLowerCase().trim();
    this.addedTime = addedTime;
  }
}

/**
 * Class representing a list of custom bad words
 */
class CustomBadWordList {
  /**
   * Create a CustomBadWordList object
   * @param {number} maxLength
   */
  constructor(maxLength) {
    this._badWords = [];
    this.maxLength = maxLength;
  }

 get length() {
    return this._badWords.length;
  }

  /**
   * Return if the list is full
   * @returns {boolean}
   */
  isFull() {
    return this.length >= this.maxLength;
  }

  /**
   * Add the custom bad words into custom bad words list
   * @param {string} bad_Words
   */
  AddBadWords(bad_Words) {
    if (this.isFull()) {
      return;
    }
    this._badWords.push(new CustomBadWord(bad_Words));
  }

  /**
   * Remove a bad word at index from the list
   * @param {number} index
   */
  removeAt(index) {
    this._badWords.splice(index, 1);
  }

  /**
   * Create a read-only 2D array [word, addedTime].
   * @returns {[string, number][]}
   */
  createArrayView() {
    return this._badWords.map((badWord) => [
      badWord.word,
      badWord.addedTime,
    ]);
  }

  /**
   * Read a 2D array and update this._badWords from it.
   * @param {[string, number, string][]} arrayView
   */
  readArrayViewAndUpdate(arrayView) {
    this._badWords = []; 
    arrayView.slice(0, this.maxLength);
    this._badWords = arrayView.map(
      (value) => new CustomBadWord(value[0], value[1])
    );
  }

  /**
   * Create a read-only 1D array of words.
   * @returns {string[]}
   */
  createWordArray() {
    return this._badWords.map((badWord) => badWord.word);
  }
}

export const customBadWordList = new CustomBadWordList(50); // Limit of the number of bad words
