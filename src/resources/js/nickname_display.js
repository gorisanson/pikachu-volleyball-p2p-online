import { channel } from './data_channel/data_channel';
import { filterBadWords } from './bad_words_filtering/chat_filter.js';

/**
 * Display nickname for the player
 * @param {boolean} isForPlayer2
 * @param {string} nickname
 */
export function displayNicknameFor(nickname, isForPlayer2) {
  let nicknameElm = null;
  if (!isForPlayer2) {
    nicknameElm = document.getElementById('player1-nickname');
  } else {
    nicknameElm = document.getElementById('player2-nickname');
  }
  nicknameElm.textContent = nickname;
}

/**
 * Display peer's nickname for the player
 * Added for filtering nickname
 * @param {boolean} isForPlayer2
 * @param {string} nickname
 */
export function displayPeerNicknameFor(nickname, isForPlayer2) {
  let nicknameElm = null;
  if (!isForPlayer2) {
    nicknameElm = document.getElementById('player1-nickname');
  } else {
    nicknameElm = document.getElementById('player2-nickname');
  }
  nicknameElm.textContent = filterBadWords(nickname);
}

/**
 * Display partial ip for the player
 * @param {boolean} isForPlayer2
 * @param {string} partialIP
 */
export function displayPartialIPFor(partialIP, isForPlayer2) {
  let partialIPElm = null;
  if (!isForPlayer2) {
    partialIPElm = document.getElementById('player1-partial-ip');
  } else {
    partialIPElm = document.getElementById('player2-partial-ip');
  }
  partialIPElm.textContent = partialIP;
}

export function displayMyAndPeerNicknameShownOrHidden() {
  const elem1 = document.getElementById('player1-hiding-peer-nickname');
  const elem2 = document.getElementById('player2-hiding-peer-nickname');
  const displayShown = (isNicknameShown, elem) => {
    if (isNicknameShown) {
      elem.classList.add('hidden');
    } else {
      elem.classList.remove('hidden');
    }
  };

  if (channel.amIPlayer2 === null) {
    if (channel.amICreatedRoom) {
      displayShown(channel.myIsPeerNicknameVisible, elem1);
      displayShown(channel.peerIsPeerNicknameVisible, elem2);
    } else {
      displayShown(channel.myIsPeerNicknameVisible, elem2);
      displayShown(channel.peerIsPeerNicknameVisible, elem1);
    }
  } else if (channel.amIPlayer2 === false) {
    displayShown(channel.myIsPeerNicknameVisible, elem1);
    displayShown(channel.peerIsPeerNicknameVisible, elem2);
  } else if (channel.amIPlayer2 === true) {
    displayShown(channel.myIsPeerNicknameVisible, elem2);
    displayShown(channel.peerIsPeerNicknameVisible, elem1);
  }
}
