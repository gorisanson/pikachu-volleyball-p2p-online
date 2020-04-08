import {
  channel,
  createRoom,
  joinRoom,
  sendChatMessageToPeer,
  closeAndCleaning,
} from './data_channel.js';
import { myKeyboard } from './pikavolley_online.js';
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

  const createBtn = document.getElementById('create-btn');
  const joinBtn = document.getElementById('join-btn');
  const joinRoomID = document.getElementById('join-room-id');
  createBtn.addEventListener('click', () => {
    // @ts-ignore
    createBtn.disabled = true;
    // @ts-ignore
    joinBtn.disabled = true;
    // @ts-ignore
    joinRoomID.disabled = true;
    createRoom();
  });

  joinBtn.addEventListener('click', () => {
    // @ts-ignore
    createBtn.disabled = true;
    // @ts-ignore
    joinBtn.disabled = true;
    // @ts-ignore
    joinRoomID.disabled = true;
    joinRoom().then((joined) => {
      if (!joined) {
        // @ts-ignore
        createBtn.disabled = false;
        // @ts-ignore
        joinBtn.disabled = false;
        // @ts-ignore
        joinRoomID.disabled = false;
      }
    });
  });
  chatOpenBtn.addEventListener('click', chatOpenBtnClicked);
  sendBtn.addEventListener('click', sendBtnClicked);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!chatOpenBtn.classList.contains('hidden')) {
        chatOpenBtn.click();
        // @ts-ignore
      } else {
        sendBtn.click();
      }
      event.preventDefault();
    }
  });

  const noticeDisconnectedOKBtn = document.getElementById(
    'notice-disconnected-ok-btn'
  );
  noticeDisconnectedOKBtn.addEventListener('click', () => {
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

  disableMessageBtns();
}

export function printCurrentRoomID(roomId) {
  const prettyRoomId = `${roomId.slice(0, 5)}-${roomId.slice(
    5,
    10
  )}-${roomId.slice(10, 15)}-${roomId.slice(15)}`;
  document.getElementById('current-room-id').textContent = prettyRoomId;
}

export function getJoinRoomID() {
  return (
    document
      .getElementById('join-room-id')
      // @ts-ignore
      .value.trim()
      .split('-')
      .join('')
  );
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

export function enableMessageBtns() {
  // @ts-ignore
  chatInput.disabled = false;
  // @ts-ignore
  chatOpenBtn.disabled = false;
  // @ts-ignore
  sendBtn.disabled = false;
}

function disableMessageBtns() {
  // @ts-ignore
  chatInput.disabled = true;
  // @ts-ignore
  chatOpenBtn.disabled = true;
  // @ts-ignore
  sendBtn.disabled = true;
}

function chatOpenBtnClicked() {
  if (!chatOpenBtn.classList.contains('hidden')) {
    chatOpenBtn.classList.add('hidden');
  }
  chatInputAndSendBtnContainer.classList.remove('hidden');
  chatInput.focus({ preventScroll: true });
  myKeyboard.unsubscribe();
}

function sendBtnClicked() {
  myKeyboard.subscribe();
  // @ts-ignore
  disableMessageBtns();
  chatOpenBtn.classList.remove('hidden');
  if (!chatInputAndSendBtnContainer.classList.contains('hidden')) {
    chatInputAndSendBtnContainer.classList.add('hidden');
  }
  // @ts-ignore
  const message = chatInput.value;
  if (message === '') {
    // @ts-ignore
    enableMessageBtns();
    return;
  }
  // @ts-ignore
  chatInput.value = '';
  sendChatMessageToPeer(message);
}
