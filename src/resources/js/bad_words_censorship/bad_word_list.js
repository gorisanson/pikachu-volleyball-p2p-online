import { getIfLocalStorageIsAvailable } from "../utils/is_local_storage_available";
const STORAGE_KEY_CUSTOM_LIST = "stringifiedCustomBadWordListArrayView";
const isLocalStorageAvailable = getIfLocalStorageIsAvailable();

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
class BadWordList {
  /**
   * Create a BadWordList object
   * @param {number} maxLength
   */
  constructor(maxLength) {
    const STORAGE_KEY_DEFAULT_FILTER_TOGGLE = "isDefaultBadWordFilterEnabled";
    const storedToggleState = window.localStorage.getItem(
      STORAGE_KEY_DEFAULT_FILTER_TOGGLE
    );
    if (storedToggleState === "false") {
      // Use list of basic bad words?
      this.basic_badWords = [];
    } else {
      this.basic_badWords = [
        "fuck",
        "fuckyou",
        "shit",
        "bitch",
        "asshole",
        "nigger",
        "faggot",
        "개새",
        "느금",
        "ㄴㄱㅁ",
        "ㄴ금마",
        "니애미",
        "ㄴㅇㅁ",
        "느그",
        "병신",
        "병ㅅ",
        "ㅂㅅ",
        "ㅂ신",
        "ㅅㅂ",
        "새끼",
        "ㅅㄲ",
        "시발",
        "씨발",
        "ㅅ발",
        "애미",
        "애비",
        "어머니",
        "엄마",
        "아버지",
        "좆",
        "ㅈ까",
        "ㅈ밥",
        "ㅈㅂ",
        "ㅈ이",
        "ㅄ",
        "씹",
      ];
    }
    this._badWords = [];
    this.maxLength = maxLength;
    this.loadFromLocalStorage();
  }

  loadFromLocalStorage() {
    if (!isLocalStorageAvailable) {
      return;
    }

    let stringifiedList = null;
    try {
      stringifiedList = window.localStorage.getItem(STORAGE_KEY_CUSTOM_LIST);
    } catch (err) {
      console.log(err);
    }

    if (stringifiedList !== null) {
      const arrayView = JSON.parse(stringifiedList);
      if (arrayView.length > 0 && arrayView[0].length !== 2) {
        window.localStorage.removeItem(STORAGE_KEY_CUSTOM_LIST);
        // location.reload();
      } else {
        this.readArrayViewAndUpdate(arrayView);
      }
    }
  }

  saveToLocalStorage() {
    if (!isLocalStorageAvailable) {
      return;
    }
    try {
      window.localStorage.setItem(
        STORAGE_KEY_CUSTOM_LIST,
        JSON.stringify(this.createArrayView())
      );
    } catch (err) {
      console.log(err);
    }
  }

  get length() {
    return this._badWords.length;
  }

  /**
   * @returns {boolean}
   */
  isFull() {
    return this.length >= this.maxLength;
  }

  /**
   * Add a new custom bad word to the list.
   * Silently fails if the word is empty, list is full, or word already exists.
   * @param {string} word
   * @returns {boolean} Returns true if added successfully, false otherwise.
   */
  add(word) {
    const cleanWord = word.toLowerCase().replace(/[^\p{L}\p{Emoji}]/gu, ''); // Words or emojis will be saved
    if (!cleanWord || this.isFull()) {
      return false;
    }

    if (this._badWords.some((bw) => bw.word === cleanWord)) {
      return false; // Duplicate Check, if already exists, do nothing.
    }
    this._badWords.push(new CustomBadWord(cleanWord, Date.now()));
    this.saveToLocalStorage();
    return true;
  }

  /**
   * Remove a custom bad word at index from the list
   * @param {number} index
   */
  removeAt(index) {
    this._badWords.splice(index, 1);
    this.saveToLocalStorage();
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

export const customBadWordList = new BadWordList(50); // Limit of the number of bad words