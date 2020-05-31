/**
 * Manages displaying of chat messages.
 *
 * The chat messages between peers appears somewhat random positions on the game screen.
 * The positions are random but one message should appears on the same (random) position for both peers.
 * It is achieved by setting the same RNG (random number generator) for each player's chat box.
 */
'use strict';
import { channel } from './data_channel/data_channel.js';
import { replaySaver } from './replay/replay_saver.js';

/** @typedef {import('./pikavolley_online.js').PikachuVolleyballOnline} PikachuVolleyballOnline */

let getSpeechBubbleNeeded = null; // it is assigned a function after the game assets are loaded

let player1ChatRng = null;
let player2ChatRng = null;

let isChatEnabled = true;

const canvasContainer = document.getElementById('game-canvas-container');
let player1ChatBox = document.getElementById('player1-chat-box');
let player2ChatBox = document.getElementById('player2-chat-box');

/**
 * Set getSpeechBubbleNeeded function
 * @param {PikachuVolleyballOnline} pikaVolley
 */
export function setGetSpeechBubbleNeeded(pikaVolley) {
  getSpeechBubbleNeeded = () => {
    if (document.querySelectorAll('.fade-in-box:not(.hidden)').length > 0) {
      return true;
    }
    if (
      pikaVolley.state === pikaVolley.intro ||
      pikaVolley.state === pikaVolley.menu
    ) {
      return true;
    }
    return false;
  };
}

export function setChatRngs(rngForPlayer1Chat, rngForPlayer2Chat) {
  player1ChatRng = rngForPlayer1Chat;
  player2ChatRng = rngForPlayer2Chat;
}

/**
 * Enable/Disable chat
 * @param {boolean} turnOn
 */
export function enableChat(turnOn) {
  isChatEnabled = turnOn;
}

export function hideChat() {
  if (!player1ChatBox.classList.contains('hidden')) {
    player1ChatBox.classList.add('hidden');
  }
  if (!player2ChatBox.classList.contains('hidden')) {
    player2ChatBox.classList.add('hidden');
  }
}

export function displayMyChatMessage(message) {
  if (channel.amIPlayer2 === null) {
    if (channel.amICreatedRoom) {
      displayChatMessageAt(message, 1);
    } else {
      displayChatMessageAt(message, 2);
    }
  } else if (channel.amIPlayer2 === false) {
    displayChatMessageAt(message, 1);
  } else if (channel.amIPlayer2 === true) {
    displayChatMessageAt(message, 2);
  }
}

export function displayPeerChatMessage(message) {
  if (channel.amIPlayer2 === null) {
    if (channel.amICreatedRoom) {
      displayChatMessageAt(message, 2);
    } else {
      displayChatMessageAt(message, 1);
    }
  } else if (channel.amIPlayer2 === false) {
    displayChatMessageAt(message, 2);
  } else if (channel.amIPlayer2 === true) {
    displayChatMessageAt(message, 1);
  }
}

export function displayChatMessageAt(message, whichPlayerSide) {
  if (!isChatEnabled) {
    return;
  }

  replaySaver.recordChats(message, whichPlayerSide);

  if (whichPlayerSide === 1) {
    const newChatBox = player1ChatBox.cloneNode();
    newChatBox.textContent = message;
    // @ts-ignore
    newChatBox.style.top = `${20 + 30 * player1ChatRng()}%`;
    // @ts-ignore
    newChatBox.style.right = `${55 + 25 * player1ChatRng()}%`;
    // @ts-ignore
    newChatBox.classList.remove('hidden');
    if (getSpeechBubbleNeeded && !getSpeechBubbleNeeded()) {
      // If speech Bubble is not needed

      // @ts-ignore
      newChatBox.classList.remove('in-speech-bubble');
    } else {
      // if speech bubble is not needed

      // @ts-ignore
      if (!newChatBox.classList.contains('in-speech-bubble')) {
        // @ts-ignore
        newChatBox.classList.add('in-speech-bubble');
      }
    }
    canvasContainer.replaceChild(newChatBox, player1ChatBox);
    // @ts-ignore
    player1ChatBox = newChatBox;
  } else if (whichPlayerSide === 2) {
    const newChatBox = player2ChatBox.cloneNode();
    newChatBox.textContent = message;
    // @ts-ignore
    newChatBox.style.top = `${20 + 30 * player2ChatRng()}%`;
    // @ts-ignore
    newChatBox.style.left = `${55 + 25 * player2ChatRng()}%`;
    // @ts-ignore
    newChatBox.classList.remove('hidden');
    if (getSpeechBubbleNeeded && !getSpeechBubbleNeeded()) {
      // If speech Bubble is not needed

      // @ts-ignore
      newChatBox.classList.remove('in-speech-bubble');
    } else {
      // if speech bubble is not needed

      // @ts-ignore
      if (!newChatBox.classList.contains('in-speech-bubble')) {
        // @ts-ignore
        newChatBox.classList.add('in-speech-bubble');
      }
    }
    canvasContainer.replaceChild(newChatBox, player2ChatBox);
    // @ts-ignore
    player2ChatBox = newChatBox;
  }
}
