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
    this.basic_badWords = [
      'fuck',
      'fuckyou',
      'shit',
      'bitch',
      'asshole',
      'nigger',
      'faggot',
      '개새',
      '느금',
      'ㄴㄱㅁ',
      'ㄴ금마',
      '니애미',
      'ㄴㅇㅁ',
      '느그',
      '병신',
      '병ㅅ',
      'ㅂㅅ',
      'ㅂ신',
      'ㅅㅂ',
      '새끼',
      'ㅅㄲ',
      '시발',
      '씨발',
      'ㅅ발',
      '애미',
      '애비',
      '어머니',
      '엄마',
      '아버지',
      '좆',
      'ㅈ까',
      'ㅈ밥',
      'ㅈㅂ',
      'ㅈ이',
      'ㅄ',
      '씹',
    ];
    try {
      const storedToggleState = window.localStorage.getItem(
        'isDefaultBadWordFilterEnabled'
      );
      if (storedToggleState === 'false') {
        // Use list of basic bad words?
        this.basic_badWords = [];
      };
    } catch (err) {
      console.log(err);
    };
  };

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
    return this._badWords.map((badWord) => [badWord.word, badWord.addedTime]);
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
    return this.basic_badWords.concat(
      this._badWords.map((badWord) => badWord.word)
    );
  }
}

export const customBadWordList = new CustomBadWordList(50); // Limit of the number of bad words
