/**
 * Manages UI relevant to bad words censorship
 */
"use strict";

import { getIfLocalStorageIsAvailable } from "../utils/is_local_storage_available";
import { customBadWordList } from "./bad_word_list.js";

const STORAGE_KEY_DEFAULT_FILTER_TOGGLE = "isDefaultBadWordFilterEnabled";

const defaultFilterToggle = document.getElementById(
  "basic-chat-filter-checkbox"
);
const customBadWordsTableContainer = document.getElementById(
  "blocked-bad-words-table-container"
);
const customBadWordsTableTbody = document.querySelector(
  "table.blocked-bad-words-table tbody"
);
const deleteCustomWordBtn = document.querySelector(
  "table.blocked-bad-words-table .delete-btn"
);
const customBadWordsCountSpan = document.getElementById(
  "number-of-bad-words-addresses"
);

const addCustomWordBtn = document.getElementById("add-custom-word-btn");
const newCustomWordInput = document.getElementById("new-custom-word-input");

const isLocalStorageAvailable = getIfLocalStorageIsAvailable();

export function setUpUIForManagingBadWords() {
  if (!isLocalStorageAvailable) {
    if (defaultFilterToggle) {
      defaultFilterToggle.parentElement.classList.add("hidden");
    }
    if (customBadWordsTableContainer) {
      customBadWordsTableContainer.classList.add("hidden");
    }
    return;
  }

  setUpDefaultFilterToggle();
  setUpCustomFilterManagement();
}

/**
 * Set up toggle for using list of basic bad words at chat_filter.js
 */
function setUpDefaultFilterToggle() {
  if (!defaultFilterToggle) {
    return;
  }
  let isEnabled = true;
  const storedToggleState = window.localStorage.getItem(
    STORAGE_KEY_DEFAULT_FILTER_TOGGLE
  );
  if (storedToggleState !== null) {
    isEnabled = JSON.parse(storedToggleState);
  }
  // @ts-ignore
  defaultFilterToggle.checked = isEnabled;
  defaultFilterToggle.addEventListener("change", () => {
    try {
      // @ts-ignore
      window.localStorage.setItem(
        STORAGE_KEY_DEFAULT_FILTER_TOGGLE,
        // @ts-ignore
        JSON.stringify(defaultFilterToggle.checked)
      );
    } catch (err) {
      console.log(err);
    }
  });
}

/**
 * Set up table of bad words(delete, register)
 */
function setUpCustomFilterManagement() {
  if (
    !customBadWordsTableContainer ||
    !deleteCustomWordBtn ||
    !customBadWordsTableTbody ||
    !customBadWordsCountSpan ||
    !addCustomWordBtn ||
    !newCustomWordInput
  ) {
    return;
  }

  // @ts-ignore
  deleteCustomWordBtn.disabled = true;

  displayCustomBadWords(customBadWordList.createArrayView());
  displayNumberOfCustomBadWords();

  document.body.addEventListener("click", (event) => {
    Array.from(
      // @ts-ignore
      customBadWordsTableTbody.getElementsByTagName("tr")
    ).forEach((elem) => {
      elem.classList.remove("selected");
    });
    // @ts-ignore
    deleteCustomWordBtn.disabled = true;
    const target = event.target;
    if (
      // @ts-ignore
      customBadWordsTableTbody.contains(target) &&
      // @ts-ignore
      target.tagName === "TD"
    ) {
      // @ts-ignore
      target.parentElement.classList.add("selected");
      // @ts-ignore
      deleteCustomWordBtn.disabled = false;
    }
  });
  deleteCustomWordBtn.addEventListener("click", () => {
    // @ts-ignore
    const selectedTRElement =
      customBadWordsTableTbody.querySelector(".selected");
    if (!selectedTRElement) {
      return;
    }
    // @ts-ignore
    customBadWordList.removeAt(Number(selectedTRElement.dataset.index));
    displayCustomBadWords(customBadWordList.createArrayView());
    displayNumberOfCustomBadWords();
  });
  addCustomWordBtn.addEventListener("click", () => {
    // @ts-ignore
    const newWord = newCustomWordInput.value;

    // customBadWordList.add returns true when it succeeds
    if (customBadWordList.add(newWord)) {
      displayCustomBadWords(customBadWordList.createArrayView());
      displayNumberOfCustomBadWords();
      // @ts-ignore
      newCustomWordInput.value = "";
    } else {
      console.log("Custom bad word add failed (duplicate, empty, or full).");
    }
  });
}

/**
 * Display the given bad word list array view.
 * @param {[string, number][]} badWords
 */
function displayCustomBadWords(badWords) {
  if (!customBadWordsTableTbody) {
    return;
  }
  while (customBadWordsTableTbody.firstChild) {
    customBadWordsTableTbody.removeChild(customBadWordsTableTbody.firstChild);
  }
  // Display the given list
  badWords.forEach((badWord, index) => {
    const trElement = document.createElement("tr");
    const tdElementForWord = document.createElement("td");
    const tdElementForTime = document.createElement("td");
    trElement.appendChild(tdElementForWord);
    trElement.appendChild(tdElementForTime);
    trElement.dataset.index = String(index);
    tdElementForWord.textContent = badWord[0];
    tdElementForTime.textContent = new Date(badWord[1]).toLocaleString();
    customBadWordsTableTbody.appendChild(trElement);
  });
}

/**
 * Display the number of bad words in the list
 */
function displayNumberOfCustomBadWords() {
  if (customBadWordsCountSpan) {
    customBadWordsCountSpan.textContent = String(customBadWordList.length);
  }
}