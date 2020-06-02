/**
 * Manages the communication with the quick match server.
 *
 * Major parts of fetch API code is copied from https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
 */
'use strict';
import { serverURL } from './quick_match_server_url.js';
import { createRoom, joinRoom } from '../data_channel/data_channel.js';
import {
  printCommunicationCount,
  printQuickMatchState,
  printQuickMatchLog,
  printFailedToConnectToQuickMatchServer,
  printNumberOfSuccessfulQuickMatches,
} from '../ui_online.js';

let roomIdToCreate = null;
let communicationCount = null;

const MESSAGE_TO_SERVER = {
  initial: 'initial',
  roomCreated: 'roomCreated',
  quickMatchSuccess: 'quickMatchSuccess',
  withFriendSuccess: 'withFriendSuccess',
  cancel: 'cancel',
};

export const MESSAGE_TO_CLIENT = {
  createRoom: 'createRoom',
  keepWait: 'keepWait', // keep sending wait packet
  connectToPeer: 'connectToPeer',
  connectToPeerAfterAWhile: 'connectToPeerAfterAWhile',
  waitPeerConnection: 'waitPeerConnection', // wait the peer to connect to you
  abandoned: 'abandoned',
};

/**
 * Start request/response with quick match server
 * @param {string} roomIdToCreateIfNeeded
 */
export function startQuickMatch(roomIdToCreateIfNeeded) {
  roomIdToCreate = roomIdToCreateIfNeeded;
  communicationCount = 0;
  postData(
    serverURL,
    objectToSendToServer(MESSAGE_TO_SERVER.initial, roomIdToCreate)
  ).then(callback);
}

/**
 * In quick match, the room creator send this quick match success message if data channel is opened.
 */
export function sendQuickMatchSuccessMessageToServer() {
  console.log('Send quick match success message to server');
  postData(
    serverURL,
    objectToSendToServer(MESSAGE_TO_SERVER.quickMatchSuccess, roomIdToCreate)
  );
}

/**
 * In "with friend", the room creator send this packet if data channel is opened.
 */
export function sendWithFriendSuccessMessageToServer() {
  console.log('Send with friend success message to server');
  postData(
    serverURL,
    objectToSendToServer(MESSAGE_TO_SERVER.withFriendSuccess, roomIdToCreate)
  );
}

/**
 * In quick match, the room creator send this quick match cancel packet if they want to cancel quick match i.e. want to stop waiting.
 */
export function sendCancelQuickMatchMessageToServer() {
  console.log('Send cancel quick match message to server');
  postData(
    serverURL,
    objectToSendToServer(MESSAGE_TO_SERVER.cancel, roomIdToCreate)
  );
}

// Example POST method implementation:
async function postData(url = '', data = {}) {
  try {
    // Default options are marked with *
    const response = await fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json',
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    });
    return response.json(); // parses JSON response into native JavaScript objects
  } catch (e) {
    printQuickMatchLog(e);
    printFailedToConnectToQuickMatchServer();
  }
}

const callback = (data) => {
  // JSON data parsed by `response.json()` call

  if (data.numOfSuccess !== null) {
    const numOfSuccess = data.numOfSuccess;
    printNumberOfSuccessfulQuickMatches(
      numOfSuccess.withinLast24hours,
      numOfSuccess.withinLast1hour,
      numOfSuccess.withinLast10minutes
    );
  }

  switch (data.message) {
    case MESSAGE_TO_CLIENT.createRoom:
      console.log('Create room!');
      createRoom(roomIdToCreate);
      window.setTimeout(() => {
        postData(
          serverURL,
          objectToSendToServer(MESSAGE_TO_SERVER.roomCreated, roomIdToCreate)
        ).then(callback);
      }, 1000);
      break;
    case MESSAGE_TO_CLIENT.keepWait:
      console.log('Keep wait!');
      window.setTimeout(() => {
        postData(
          serverURL,
          objectToSendToServer(MESSAGE_TO_SERVER.roomCreated, roomIdToCreate)
        ).then(callback);
      }, 1000);
      break;
    case MESSAGE_TO_CLIENT.waitPeerConnection:
      console.log('Wait peer connection!');
      break;
    case MESSAGE_TO_CLIENT.connectToPeerAfterAWhile:
      console.log('Connect To Peer after 5 seconds...');
      window.setTimeout(() => {
        console.log('Connect To Peer!');
        printQuickMatchState(MESSAGE_TO_CLIENT.connectToPeer);
        joinRoom(data.roomId);
      }, 5000);
      break;
    case MESSAGE_TO_CLIENT.connectToPeer:
      console.log('Connect To Peer!');
      joinRoom(data.roomId);
      break;
    case MESSAGE_TO_CLIENT.abandoned:
      console.log('room id abandoned.. please retry quick match.');
      break;
    case MESSAGE_TO_CLIENT.cancelAccepted:
      console.log('quick match cancel accepted');
      // TODO: do something
      break;
  }

  communicationCount++;
  printCommunicationCount(communicationCount);
  printQuickMatchState(data.message);
};

/**
 * Create an object to send to server by json
 * @param {string} message
 * @param {string} roomIdToCreate
 */
function objectToSendToServer(message, roomIdToCreate) {
  return {
    message: message,
    roomId: roomIdToCreate,
  };
}
