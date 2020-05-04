/**
 * Manages outputs to and inputs from the html elements UI
 * and event listeners relevant to the UI of the web page
 */
'use strict';
import {
  channel,
  createRoom,
  joinRoom,
  sendChatMessageToPeer,
  closeAndCleaning,
} from './data_channel.js';
import { generatePushID } from './generate_pushid.js';
import { myKeyboard } from './keyboard_online.js';
import { testNetwork } from './network_test.js';
import { MESSAGE_TO_CLIENT, startQuickMatch } from './quick_match.js';
import '../style.css';

const chatOpenBtn = document.getElementById('chat-open-btn');
const chatInputAndSendBtnContainer = document.getElementById(
  'chat-input-and-send-btn-container'
);
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

export function setUpUI() {
  // game keyboard input needs to be unsubscribe for typing join room ID
  myKeyboard.unsubscribe();

  const networkTestBtn = document.getElementById('network-test-btn');
  const quickMatchBtn = document.getElementById('quick-match-btn');
  const withYourFriendBtn = document.getElementById('with-your-friend-btn');
  const createBtn = document.getElementById('create-btn');
  const joinBtn = document.getElementById('join-btn');
  const joinRoomIdInput = document.getElementById('join-room-id-input');
  const disableBtns = () => {
    // @ts-ignore
    networkTestBtn.disabled = true;
    // @ts-ignore
    quickMatchBtn.disabled = true;
    // @ts-ignore
    withYourFriendBtn.disabled = true;
    // @ts-ignore
    createBtn.disabled = true;
    // @ts-ignore
    joinBtn.disabled = true;
    // @ts-ignore
    joinRoomIdInput.disabled = true;
  };
  const enableBtns = () => {
    // @ts-ignore
    networkTestBtn.disabled = false;
    if (
      document
        .getElementById('about-with-your-friend')
        .classList.contains('hidden')
    ) {
      // @ts-ignore
      quickMatchBtn.disabled = false;
    }
    // @ts-ignore
    withYourFriendBtn.disabled = false;
    // @ts-ignore
    createBtn.disabled = false;
    // @ts-ignore
    joinBtn.disabled = false;
    // @ts-ignore
    joinRoomIdInput.disabled = false;
  };
  networkTestBtn.addEventListener('click', () => {
    disableBtns();
    const callBackIfPassed = () => {
      document.getElementById('test-passed').classList.remove('hidden');
    };
    const callBackIfDidNotGetSrflx = () => {
      document
        .getElementById('did-not-get-srflx-candidate')
        .classList.remove('hidden');
    };
    const callBackIfBehindSymmetricNat = () => {
      document
        .getElementById('behind-symmetric-nat')
        .classList.remove('hidden');
    };
    testNetwork(
      enableBtns,
      callBackIfPassed,
      callBackIfDidNotGetSrflx,
      callBackIfBehindSymmetricNat
    );
  });
  const startQuickMatchIfPressEnter = (event) => {
    if (event.code === 'Enter') {
      event.preventDefault();
      window.removeEventListener('keydown', startQuickMatchIfPressEnter);
      const pressEnterToQuickMatch = document.getElementById(
        'press-enter-to-quick-match'
      );
      if (!pressEnterToQuickMatch.classList.contains('hidden')) {
        pressEnterToQuickMatch.classList.add('hidden');
      }
      document
        .getElementById('quick-match-log-container')
        .classList.remove('hidden');
      document
        .getElementById('connection-log-container')
        .classList.remove('hidden');
      const callBackIfPassed = () => {
        const roomId = generatePushID();
        startQuickMatch(roomId);
      };
      const callBackIfDidNotGetSrflx = () => {
        document
          .getElementById('did-not-get-srflx-candidate')
          .classList.remove('hidden');
        enableBtns();
      };
      const callBackIfBehindSymmetricNat = () => {
        document
          .getElementById('behind-symmetric-nat')
          .classList.remove('hidden');
        enableBtns();
      };
      // Start quick match only if user network passed the network test.
      testNetwork(
        () => {},
        callBackIfPassed,
        callBackIfDidNotGetSrflx,
        callBackIfBehindSymmetricNat
      );
    }
  };
  quickMatchBtn.addEventListener('click', () => {
    disableBtns();
    channel.isQuickMatch = true;
    window.addEventListener('keydown', startQuickMatchIfPressEnter);
    const pressEnterToQuickMatch = document.getElementById(
      'press-enter-to-quick-match'
    );
    pressEnterToQuickMatch.classList.remove('hidden');
    pressEnterToQuickMatch.scrollIntoView();
  });
  withYourFriendBtn.addEventListener('click', () => {
    const aboutWithYourFriend = document.getElementById(
      'about-with-your-friend'
    );
    const connectionLogContainer = document.getElementById(
      'connection-log-container'
    );
    if (aboutWithYourFriend.classList.contains('hidden')) {
      aboutWithYourFriend.classList.remove('hidden');
      connectionLogContainer.classList.remove('hidden');
      // @ts-ignore
      quickMatchBtn.disabled = true;
    } else {
      aboutWithYourFriend.classList.add('hidden');
      connectionLogContainer.classList.add('hidden');
      // @ts-ignore
      quickMatchBtn.disabled = false;
    }
  });
  createBtn.addEventListener('click', () => {
    disableBtns();
    // @ts-ignore
    document.getElementById('join-room-id-input').value = '';
    channel.isQuickMatch = false;

    const roomId = generatePushID();
    createRoom(roomId).then(() => {
      printCurrentRoomID(roomId);
    });
  });
  joinBtn.addEventListener('click', () => {
    disableBtns();
    channel.isQuickMatch = false;

    const roomId = getJoinRoomID();
    joinRoom(roomId).then((joined) => {
      if (joined) {
        printCurrentRoomID(roomId);
      } else {
        enableBtns();
      }
    });
  });
  chatOpenBtn.addEventListener('click', chatOpenBtnClicked);
  sendBtn.addEventListener('click', sendBtnClicked);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      if (!chatOpenBtn.classList.contains('hidden')) {
        chatOpenBtn.click();
      } else {
        // @ts-ignore
        chatInput.value = '';
        // This setTimeout is for Korean input weired thing which happens on Chrome..
        // When Korean character typed on input element and press some key (for example, esc key),
        // the key event occur twice on Chrome browser. (It was not the case on Firefox or Safari.)
        // This setTimeout prevent the event occur twice.
        window.setTimeout(() => sendBtn.click(), 0);
      }
      event.preventDefault();
    } else if (event.code === 'Enter') {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Enter') {
      if (!chatInputAndSendBtnContainer.classList.contains('hidden')) {
        window.setTimeout(() => sendBtn.click(), 0);
      }
    }
  });

  attachEventListenerToHideBtn('test-passed-ok-btn', 'test-passed');
  attachEventListenerToHideBtn(
    'did-not-get-srflx-candidate-ok-btn',
    'did-not-get-srflx-candidate'
  );
  attachEventListenerToHideBtn(
    'behind-symmetric-nat-ok-btn',
    'behind-symmetric-nat'
  );

  const cancelQuickMatchBtn = document.getElementById('cancel-quick-match-btn');
  cancelQuickMatchBtn.addEventListener('click', () => {
    const pressEnterToQuickMatch = document.getElementById(
      'press-enter-to-quick-match'
    );
    if (!pressEnterToQuickMatch.classList.contains('hidden')) {
      pressEnterToQuickMatch.classList.add('hidden');
    }
    enableBtns();
  });

  const noticeDisconnectedOKBtn = document.getElementById(
    'notice-disconnected-ok-btn'
  );
  noticeDisconnectedOKBtn.addEventListener('click', () => {
    location.reload();
  });

  const askOneMoreGameYesBtn = document.getElementById(
    'ask-one-more-game-yes-btn'
  );
  askOneMoreGameYesBtn.addEventListener('click', () => {
    const askOneMoreGameBox = document.getElementById('ask-one-more-game');
    if (!askOneMoreGameBox.classList.contains('hidden')) {
      askOneMoreGameBox.classList.add('hidden');
    }
  });

  const askOneMoreGameNoBtn = document.getElementById(
    'ask-one-more-game-no-btn'
  );
  askOneMoreGameNoBtn.addEventListener('click', () => {
    location.reload();
  });

  window.addEventListener('unload', closeAndCleaning);

  window.addEventListener('beforeunload', function (e) {
    if (channel.isOpen) {
      // Cancel the event
      e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
      // Chrome requires returnValue to be set
      e.returnValue = '';
    }
  });

  disableChatBtns();
}

function printCurrentRoomID(roomId) {
  const prettyRoomId = `${roomId.slice(0, 5)}-${roomId.slice(
    5,
    10
  )}-${roomId.slice(10, 15)}-${roomId.slice(15)}`;
  document.getElementById('current-room-id').textContent = prettyRoomId;
}

function getJoinRoomID() {
  return (
    document
      .getElementById('join-room-id-input')
      // @ts-ignore
      .value.trim()
      .split('-')
      .join('')
  );
}

/**
 * Print communication count
 * @param {number} count
 */
export function printCommunicationCount(count) {
  document.getElementById('communication-count').textContent = String(count);
}

/**
 * Print quick match state to quick match log box
 * @param {string} state MESSAGE_TO_CLIENT.x
 */
export function printQuickMatchState(state) {
  let log = '';
  switch (state) {
    case MESSAGE_TO_CLIENT.createRoom:
      log = document.getElementById('waiting-message').textContent;
      break;
    case MESSAGE_TO_CLIENT.keepWait:
      return;
    case MESSAGE_TO_CLIENT.waitPeerConnection:
      log = document.getElementById('waiting-peer-to-connect-message')
        .textContent;
      break;
    case MESSAGE_TO_CLIENT.connectToPeerAfterAWhile:
      log = document.getElementById('connect-to-peer-after-a-while-message')
        .textContent;
      break;
    case MESSAGE_TO_CLIENT.connectToPeer:
      log = document.getElementById('connect-to-peer-message').textContent;
      break;
    case MESSAGE_TO_CLIENT.abandoned:
      log = document.getElementById('abandoned-message').textContent;
      break;
    default:
      return;
  }
  printQuickMatchLog(log);
}

export function printFailedToConnectToQuickMatchServer() {
  const log = document.getElementById('failed-to-connect-to-server')
    .textContent;
  printQuickMatchLog(log);
}

/**
 * Print log to quick match log box
 * @param {string} log
 */
export function printQuickMatchLog(log) {
  const connectionLog = document.getElementById('quick-match-log');
  connectionLog.textContent += `${log}\n`;
  connectionLog.scrollIntoView();
}

/**
 * Print number of successful quick matches
 * @param {number} withinLast24hours
 * @param {number} withinLast1hour
 * @param {number} withinLast10minutes
 */
export function printNumberOfSuccessfulQuickMatches(
  withinLast24hours,
  withinLast1hour,
  withinLast10minutes
) {
  document.getElementById('within-24-hours').textContent = String(
    withinLast24hours
  );
  document.getElementById('within-1-hour').textContent = String(
    withinLast1hour
  );
  document.getElementById('within-10-minutes').textContent = String(
    withinLast10minutes
  );
}

/**
 * Print log to connection log box
 * @param {string} log
 */
export function printLog(log) {
  const connectionLog = document.getElementById('connection-log');
  connectionLog.textContent += `${log}\n`;
  connectionLog.scrollIntoView();
}

export function printNotValidRoomIdMessage() {
  printLog(document.getElementById('not-valid-room-id-message').textContent);
}

export function printNoRoomMatchingMessage() {
  printLog(document.getElementById('no-room-matching-message').textContent);
}

export function showGameCanvas() {
  const flexContainer = document.getElementById('flex-container');
  const beforeConnection = document.getElementById('before-connection');
  if (!beforeConnection.classList.contains('hidden')) {
    beforeConnection.classList.add('hidden');
  }
  flexContainer.classList.remove('hidden');
  myKeyboard.subscribe();
}

export function hidePingBox() {
  const pingBox = document.getElementById('ping-box');
  if (!pingBox.classList.contains('hidden')) {
    pingBox.classList.add('hidden');
  }
}

export function printAvgPing(avgPing) {
  document.getElementById('average-ping').textContent = String(avgPing);
}

export function printStartsIn(startsIn) {
  document.getElementById('starts-in').textContent = String(startsIn);
}

export function hideWatingPeerAssetsLoadingBox() {
  const peerLoadingBox = document.getElementById('peer-loading-box');
  if (!peerLoadingBox.classList.contains('hidden')) {
    peerLoadingBox.classList.add('hidden');
  }
}

export function noticeDisconnected() {
  document.getElementById('notice-disconnected').classList.remove('hidden');
}

export function askOneMoreGame() {
  document.getElementById('ask-one-more-game').classList.remove('hidden');
}

export function enableChatOpenBtn() {
  // @ts-ignore
  chatOpenBtn.disabled = false;
}

function disableChatBtns() {
  // @ts-ignore
  chatInput.disabled = true;
  // @ts-ignore
  chatOpenBtn.disabled = true;
  // @ts-ignore
  sendBtn.disabled = true;
}

function chatOpenBtnClicked() {
  // @ts-ignore
  chatOpenBtn.disabled = true;
  // @ts-ignore
  chatInput.disabled = false;
  // @ts-ignore
  sendBtn.disabled = false;
  myKeyboard.unsubscribe();
  if (!chatOpenBtn.classList.contains('hidden')) {
    chatOpenBtn.classList.add('hidden');
  }
  chatInputAndSendBtnContainer.classList.remove('hidden');
  chatInput.focus({ preventScroll: true });
}

function sendBtnClicked() {
  disableChatBtns();
  myKeyboard.subscribe();
  if (!chatInputAndSendBtnContainer.classList.contains('hidden')) {
    chatInputAndSendBtnContainer.classList.add('hidden');
  }
  chatOpenBtn.classList.remove('hidden');
  // @ts-ignore
  const message = chatInput.value;
  if (message === '') {
    enableChatOpenBtn();
    return;
  }
  // @ts-ignore
  chatInput.value = '';
  sendChatMessageToPeer(message);
}

/**
 * Attch event listner to the hide btn
 * @param {string} btnId
 * @param {string} boxIdToHide
 */
function attachEventListenerToHideBtn(btnId, boxIdToHide) {
  const btn = document.getElementById(btnId);
  btn.addEventListener('click', () => {
    const box = document.getElementById(boxIdToHide);
    if (!box.classList.contains('hidden')) {
      box.classList.add('hidden');
    }
  });
}
