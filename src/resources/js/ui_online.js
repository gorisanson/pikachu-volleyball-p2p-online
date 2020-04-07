import {
  channel,
  createRoom,
  joinRoom,
  sendToPeer,
  closeAndCleaning,
} from './data_channel.js';
import { myKeyboard } from './pikavolley_online.js';

const createBtn = document.getElementById('create-btn');
const joinBtn = document.getElementById('join-btn');
const joinRoomID = document.getElementById('join-room-id');
const sendBtn = document.getElementById('send-btn');
const chatInputWithButton = document.getElementById('chat-input-with-button');
const chatOpenBtn = document.getElementById('chat-open-btn');
const messageBox = document.getElementById('message-box');
const noticeDisconnectedOKBtn = document.getElementById(
  'notice-disconnected-ok-btn'
);

export function setUpUI() {
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

export function noticeDisconnected() {
  document.getElementById('notice-disconnected').classList.remove('hidden');
}

export function enableMessageBtns() {
  // @ts-ignore
  messageBox.disabled = false;
  // @ts-ignore
  chatOpenBtn.disabled = false;
  // @ts-ignore
  sendBtn.disabled = false;
}

function disableMessageBtns() {
  // @ts-ignore
  messageBox.disabled = true;
  // @ts-ignore
  chatOpenBtn.disabled = true;
  // @ts-ignore
  sendBtn.disabled = true;
}

function chatOpenBtnClicked() {
  if (!chatOpenBtn.classList.contains('hidden')) {
    chatOpenBtn.classList.add('hidden');
  }
  chatInputWithButton.classList.remove('hidden');
  messageBox.focus({ preventScroll: true });
  myKeyboard.unsubscribe();
}

function sendBtnClicked() {
  myKeyboard.subscribe();
  // @ts-ignore
  disableMessageBtns();
  chatOpenBtn.classList.remove('hidden');
  if (!chatInputWithButton.classList.contains('hidden')) {
    chatInputWithButton.classList.add('hidden');
  }
  // @ts-ignore
  const message = messageBox.value;
  if (message === '') {
    // @ts-ignore
    enableMessageBtns();
    return;
  }
  // @ts-ignore
  messageBox.value = '';
  sendToPeer(message);
}
