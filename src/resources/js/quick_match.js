/**
 * Major parts of fetch API code is copied from https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
 */
'use strict';
import { serverURL } from './quick_match_server_url.js';
import { createRoom, joinRoom } from './data_channel.js';
import {
  printCommunicationCount,
  printQuickMatchState,
  printQuickMatchLog,
  printFailedToConnectToQuickMatchServer,
  printNumberOfSuccessfulQuickMatches,
} from './ui_online.js';

let roomIdToCreate = null;
let communicationCount = null;

export const CLIENT_TO_DO = {
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
  postData(serverURL, objectToSendToServer(roomIdToCreate, false, false)).then(
    callback
  );
}

/**
 * In quick match, the room creator send this quick match succeeded packet if data channel is opened.
 */
export function sendQuickMatchSucceededToServer() {
  console.log('Send quick match success message to server');
  postData(serverURL, objectToSendToServer(roomIdToCreate, true, true));
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

  switch (data.toDo) {
    case CLIENT_TO_DO.createRoom:
      console.log('Create room!');
      createRoom(roomIdToCreate);
      window.setTimeout(() => {
        postData(
          serverURL,
          objectToSendToServer(roomIdToCreate, true, false)
        ).then(callback);
      }, 1000);
      break;
    case CLIENT_TO_DO.keepWait:
      console.log('Keep wait!');
      window.setTimeout(() => {
        postData(
          serverURL,
          objectToSendToServer(roomIdToCreate, true, false)
        ).then(callback);
      }, 1000);
      break;
    case CLIENT_TO_DO.waitPeerConnection:
      console.log('Wait peer connection!');
      break;
    case CLIENT_TO_DO.connectToPeerAfterAWhile:
      console.log('Connect To Peer after 5 seconds...');
      window.setTimeout(() => {
        console.log('Connect To Peer!');
        joinRoom(data.roomId);
      }, 5000);
      break;
    case CLIENT_TO_DO.connectToPeer:
      console.log('Connect To Peer!');
      joinRoom(data.roomId);
      break;
    case CLIENT_TO_DO.abandoned:
      console.log('room id abandoned.. please retry quick match.');
      break;
  }

  communicationCount++;
  printCommunicationCount(communicationCount);
  printQuickMatchState(data.toDo);
};

/**
 * Create an object to send to server by json
 * @param {string} roomIdToCreate
 * @param {boolean} roomCreated
 * @param {boolean} quickMatchSucceeded
 */
function objectToSendToServer(
  roomIdToCreate,
  roomCreated,
  quickMatchSucceeded
) {
  return {
    roomId: roomIdToCreate,
    roomCreated: roomCreated,
    quickMatchSucceeded: quickMatchSucceeded,
  };
}
