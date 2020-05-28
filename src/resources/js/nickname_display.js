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
