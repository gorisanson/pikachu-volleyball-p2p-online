/**
 * Manages a data channel between the two peers.
 *
 * A large portion (mainly, {@link createRoom}, {@link joinRoom}, {@link registerPeerConnectionListeners} and {@link collectIceCandidates} functions)
 * of the code in this module is copied (or edited after copied) from the links below:
 * https://github.com/webrtc/FirebaseRTC
 * https://webrtc.org/getting-started/firebase-rtc-codelab
 * https://webrtc.org/getting-started/data-channels
 */
'use strict';
import * as firebase from 'firebase/app';
import 'firebase/firestore';
import { firebaseConfig } from './firebase_config.js';
import seedrandom from 'seedrandom';
import { setCustomRng } from './offline_version_js/rand.js';
import { mod, isInModRange } from './mod.js';
import { bufferLength, PikaUserInputWithSync } from './keyboard_online.js';
import {
  noticeDisconnected,
  enableChatOpenBtn,
  showGameCanvas,
  hideWatingPeerAssetsLoadingBox,
  hidePingBox,
  printAvgPing,
  printStartsIn,
  printLog,
  printPeriodInLog,
  printNotValidRoomIdMessage,
  printNoRoomMatchingMessage,
  printSomeoneElseAlreadyJoinedRoomMessage,
  disableCancelQuickMatchBtn,
  askOptionsChangeReceivedFromPeer,
  noticeAgreeMessageFromPeer,
} from './ui_online.js';
import {
  setChatRngs,
  displayMyChatMessage,
  displayPeerChatMessage,
} from './chat_display.js';
import { rtcConfiguration } from './rtc_configuration.js';
import {
  sendQuickMatchSuccessMessageToServer,
  sendWithFriendSuccessMessageToServer,
} from './quick_match.js';

firebase.initializeApp(firebaseConfig);

// It is set to (1 << 8) since syncCounter is to be sent as Uint8
export const SYNC_DIVISOR = 1 << 8; // 256

export const channel = {
  isOpen: false,
  gameStartAllowed: false,
  amICreatedRoom: false,
  amIPlayer2: null, // set from pikavolley_online.js
  isQuickMatch: null, // set from ui_online.js

  /** @type {PikaUserInputWithSync[]} */
  peerInputQueue: [],
  _peerInputQueueSyncCounter: 0,
  get peerInputQueueSyncCounter() {
    return this._peerInputQueueSyncCounter;
  },
  set peerInputQueueSyncCounter(counter) {
    this._peerInputQueueSyncCounter = mod(counter, SYNC_DIVISOR);
  },

  callbackAfterDataChannelOpened: null,
  callbackAfterDataChannelOpenedForUI: null,
  callbackAfterPeerInputQueueReceived: null,
};

const pingTestManager = {
  pingSentTimeArray: new Array(5),
  receivedPingResponseNumber: 0,
  pingMesurementArray: [],
};

/**
 * Return a message sync manager
 * @param {number} offset syncCounter offset (even number)
 */
function createMessageSyncManager(offset) {
  return {
    pendingMessage: '',
    resendIntervalID: null,
    _syncCounter: offset,
    _peerSyncCounter: offset + ((offset + 1) % 2),
    get syncCounter() {
      return this._syncCounter;
    },
    set syncCounter(n) {
      this._syncCounter = offset + (n % 2);
    },
    get peerSyncCounter() {
      return this._peerSyncCounter;
    },
    set peerSyncCounter(n) {
      this._peerSyncCounter = offset + (n % 2);
    },
    get nextPeerSyncCounter() {
      return offset + ((this._peerSyncCounter + 1) % 2);
    },
  };
}

const chatManager = createMessageSyncManager(0); // use 0, 1 for syncCounter
const optionsChangeManager = createMessageSyncManager(2); // use 2, 3 for syncCounter
const optionsChangeAgreeManager = createMessageSyncManager(4); // use 4, 5 for syncCounter

let peerConnection = null;
let dataChannel = null;
let roomId = null;
let isFirstInputQueueFromPeer = true;

/**
 * Create a room
 * @param {string} roomIdToCreate
 */
export async function createRoom(roomIdToCreate) {
  channel.amICreatedRoom = true;
  roomId = roomIdToCreate;

  const db = firebase.firestore();
  const roomRef = db.collection('rooms').doc(roomId);

  console.log('Create PeerConnection with configuration: ', rtcConfiguration);
  peerConnection = new RTCPeerConnection(rtcConfiguration);
  registerPeerConnectionListeners(peerConnection);

  collectIceCandidates(
    roomRef,
    peerConnection,
    'offerorCandidates',
    'answererCandidates'
  );

  console.log('Create DataChannel', dataChannel);
  // Create an unreliable and ordered data channel.
  // An reliable and ordered data channel can be used but,
  // even if reliable channel is used, the sync brokes somehow after one of the peer,
  // for example, stops the game a while by minimizing the browser window.
  // So, I decided to manage the transmission reliability on the application layer.
  // I don't know how the "ordered" is implemented on "unreliable" data channel.
  // But I think the guess in here https://jameshfisher.com/2017/01/17/webrtc-datachannel-reliability/
  // would be right. The receiver may discard earlier messages if arriving after later ones.
  // This guess seems right according to the last paragraph RFC3758 section 3.6 which is the following.
  //
  // "Note that after receiving a FORWARD TSN and updating the cumulative
  // acknowledgement point, if a TSN that was skipped does arrive (i.e.,
  // due to network reordering), then the receiver will follow the normal
  // rules defined in RFC 2960 [2] for handling duplicate data.  This
  // implies that the receiver will drop the chunk and report it as a
  // duplicate in the next outbound SACK chunk."
  // (from https://tools.ietf.org/html/rfc3758#section-3.6
  // which is refered by https://tools.ietf.org/html/draft-ietf-rtcweb-data-channel-13#section-5
  // which is refered by https://www.w3.org/TR/webrtc/#bib-rtcweb-data)
  //
  // references:
  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel
  // https://www.w3.org/TR/webrtc/#rtcpeerconnection-interface-extensions-0
  // https://www.w3.org/TR/webrtc/#methods-11
  // https://www.w3.org/TR/webrtc/#rtcdatachannel
  // https://www.w3.org/TR/webrtc/#dictionary-rtcdatachannelinit-members
  dataChannel = peerConnection.createDataChannel('pikavolley_p2p_channel', {
    ordered: true,
    maxRetransmits: 0,
  });

  dataChannel.addEventListener('open', dataChannelOpened);
  dataChannel.addEventListener('message', recieveFromPeer);
  dataChannel.addEventListener('close', dataChannelClosed);

  const unsubscribe = roomRef.onSnapshot(async (snapshot) => {
    console.log('Got updated room:', snapshot.data());
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data.answer) {
      printLog('Answer received');
      console.log('Set remote description');
      const answer = data.answer;
      await peerConnection.setRemoteDescription(answer);
      unsubscribe();
    }
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log('Created offer and set local description:', offer);
  const roomWithOffer = {
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    },
  };
  roomRef.set(roomWithOffer);
  console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
  printLog('Offer sent');
}

/**
 * Join the room
 * @param {string} roomIdToJoin
 */
export async function joinRoom(roomIdToJoin) {
  roomId = roomIdToJoin;
  if (roomId.length !== 20) {
    printNotValidRoomIdMessage();
    return false;
  }
  console.log('Join room: ', roomId);

  const db = firebase.firestore();
  const roomRef = db.collection('rooms').doc(`${roomId}`);
  const roomSnapshot = await roomRef.get();
  console.log('Got room:', roomSnapshot.exists);
  if (!roomSnapshot.exists) {
    console.log('No room is mathing the ID');
    printNoRoomMatchingMessage();
    return false;
  }
  const data = roomSnapshot.data();
  if (data.answer) {
    console.log('The room is already joined by someone else');
    printSomeoneElseAlreadyJoinedRoomMessage();
    return false;
  }

  console.log('Create PeerConnection with configuration: ', rtcConfiguration);
  peerConnection = new RTCPeerConnection(rtcConfiguration);
  registerPeerConnectionListeners(peerConnection);

  // Code for collecting ICE candidates below
  collectIceCandidates(
    roomRef,
    peerConnection,
    'answererCandidates',
    'offerorCandidates'
  );

  // Code for creating SDP answer below
  const offer = data.offer;
  await peerConnection.setRemoteDescription(offer);
  console.log('Set remote description');
  printLog('Offer received');
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  console.log('set local description:', answer);

  const roomWithAnswer = {
    answer: {
      type: answer.type,
      sdp: answer.sdp,
    },
  };
  await roomRef.update(roomWithAnswer);
  printLog('Answer sent');
  console.log('joined room!');

  return true;
}

export async function closeAndCleaning() {
  if (dataChannel) {
    dataChannel.close();
  }
  if (peerConnection) {
    peerConnection.close();
  }
  // Delete room on hangup
  if (channel.amICreatedRoom && roomId) {
    const db = firebase.firestore();
    const roomRef = db.collection('rooms').doc(roomId);
    await roomRef.delete();
    console.log('did room delete!');
  }
  console.log('Did close and Cleaning!');
}

/**
 * Send my input queue to the peer.
 *
 * Input is transmitted by 5 bits (so fit in 1 byte = 8 bits).
 * input.xDirection: 2bits. 0: 00, 1: 01, -1: 11.
 * input.yDirection: 2bits. 0: 00, 1: 01, -1: 11.
 * input.powerHit: 1bits. 0: 0, 1: 1.
 * The bits order is input.powerHit, input.yDirection, input.xDirection.
 *
 * @param {PikaUserInputWithSync[]} inputQueue
 */
export function sendInputQueueToPeer(inputQueue) {
  const buffer = new ArrayBuffer(1 + inputQueue.length);
  const dataView = new DataView(buffer);
  dataView.setUint8(0, inputQueue[0].syncCounter);
  for (let i = 0; i < inputQueue.length; i++) {
    const input = inputQueue[i];
    let byte = 0;
    switch (input.xDirection) {
      case 1:
        byte += 1;
        break;
      case -1:
        byte += (1 << 1) + 1;
        break;
    }
    switch (input.yDirection) {
      case 1:
        byte += 1 << 2;
        break;
      case -1:
        byte += (1 << 3) + (1 << 2);
        break;
    }
    switch (input.powerHit) {
      case 1:
        byte += 1 << 4;
        break;
    }
    dataView.setUint8(1 + i, byte);
  }
  dataChannel.send(buffer);
}

/**
 * Receive peer's input queue from the peer
 * @param {ArrayBuffer} data
 */
function receiveInputQueueFromPeer(data) {
  if (isFirstInputQueueFromPeer) {
    isFirstInputQueueFromPeer = false;
    hideWatingPeerAssetsLoadingBox();
  }

  const dataView = new DataView(data);
  const syncCounter0 = dataView.getUint8(0);
  for (let i = 0; i < data.byteLength - 1; i++) {
    const syncCounter = mod(syncCounter0 + i, SYNC_DIVISOR);
    // isInModeRange in the below if statement is
    // to prevent overflow of the queue by a corrupted peer code
    if (
      syncCounter === channel.peerInputQueueSyncCounter &&
      (channel.peerInputQueue.length === 0 ||
        isInModRange(
          syncCounter,
          channel.peerInputQueue[0].syncCounter,
          channel.peerInputQueue[0].syncCounter + 2 * bufferLength - 1,
          SYNC_DIVISOR
        ))
    ) {
      const byte = dataView.getUint8(1 + i);
      let xDirection;
      switch (byte % (1 << 2)) {
        case 0:
          xDirection = 0;
          break;
        case 1:
          xDirection = 1;
          break;
        case 3:
          xDirection = -1;
          break;
      }
      let yDirection;
      switch ((byte >>> 2) % (1 << 2)) {
        case 0:
          yDirection = 0;
          break;
        case 1:
          yDirection = 1;
          break;
        case 3:
          yDirection = -1;
          break;
      }
      const powerHit = byte >>> 4;
      const peerInputWithSync = new PikaUserInputWithSync(
        syncCounter,
        xDirection,
        yDirection,
        powerHit
      );
      channel.peerInputQueue.push(peerInputWithSync);
      channel.peerInputQueueSyncCounter++;
    }
  }
}

/**
 * Send chat message to the peer
 * @param {string} chatMessage
 */
export function sendChatMessageToPeer(chatMessage) {
  chatManager.pendingMessage = chatMessage;
  // append syncCounter at the end of chat message;
  const chatMessageToPeer = chatMessage + String(chatManager.syncCounter);
  dataChannel.send(chatMessageToPeer);
  chatManager.resendIntervalID = setInterval(
    () => dataChannel.send(chatMessageToPeer),
    1000
  );
  return;
}

/**
 * Receive chat message ACK(acknowledgment) array buffer from peer.
 * @param {ArrayBuffer} data array buffer with length 1
 */
function receiveChatMessageAckFromPeer(data) {
  const dataView = new DataView(data);
  const syncCounter = dataView.getInt8(0);
  if (syncCounter === chatManager.syncCounter) {
    chatManager.syncCounter++;
    clearInterval(chatManager.resendIntervalID);
    displayMyChatMessage(chatManager.pendingMessage);
    enableChatOpenBtn();
  }
}

/**
 * Receive chat meesage from the peer
 * @param {string} chatMessage
 */
function receiveChatMessageFromPeer(chatMessage) {
  // Read syncCounter at the end of chat message
  const peerSyncCounter = Number(chatMessage.slice(-1));
  if (peerSyncCounter === chatManager.peerSyncCounter) {
    // if peer resend prevMessage since peer did not recieve
    // the message ACK(acknowledgment) array buffer with length 1
    console.log('arraybuffer with length 1 for chat message ACK resent');
  } else if (peerSyncCounter === chatManager.nextPeerSyncCounter) {
    // if peer send new message
    chatManager.peerSyncCounter++;
    displayPeerChatMessage(chatMessage.slice(0, -1));
  } else {
    console.log('invalid chat message received.');
    return;
  }

  // Send the message ACK array buffer with length 1.
  const buffer = new ArrayBuffer(1);
  const dataView = new DataView(buffer);
  dataView.setInt8(0, peerSyncCounter);
  dataChannel.send(buffer);
}

/**
 * Send options change message to peer
 *
 * speed: one of 'slow', 'medium', 'fast', null
 * winningScore: one of 5, 10, 15, null
 * @param {{speed: string, winningScore: number}} options
 */
export function sendOptionsChangeMessageToPeer(options) {
  if (!options.speed && !options.winningScore) {
    return;
  }
  let optionsChangeMessageToPeer = JSON.stringify(options);
  // append syncCounter at the end of options change message;
  optionsChangeMessageToPeer += String(optionsChangeManager.syncCounter);
  dataChannel.send(optionsChangeMessageToPeer);
  optionsChangeManager.resendIntervalID = setInterval(
    () => dataChannel.send(optionsChangeMessageToPeer),
    1000
  );
  return;
}

/**
 * Receive options change message ACK(acknowledgment) array buffer from peer.
 * @param {ArrayBuffer} data array buffer with length 1
 */
function receiveOptionsChangeMessageAckFromPeer(data) {
  const dataView = new DataView(data);
  const syncCounter = dataView.getInt8(0);
  if (syncCounter === optionsChangeManager.syncCounter) {
    optionsChangeManager.syncCounter++;
    clearInterval(optionsChangeManager.resendIntervalID);
  }
}

/**
 * Receive options change meesage from the peer
 * @param {string} optionsChangeMessage
 */
function receiveOptionsChangeMessageFromPeer(optionsChangeMessage) {
  // Read syncCounter at the end of options change message
  const peerSyncCounter = Number(optionsChangeMessage.slice(-1));
  if (peerSyncCounter === optionsChangeManager.peerSyncCounter) {
    // if peer resend prevMessage since peer did not recieve
    // the message ACK(acknowledgment) array buffer with length 1
    console.log(
      'arraybuffer with length 1 for options change message ACK resent'
    );
  } else if (peerSyncCounter === optionsChangeManager.nextPeerSyncCounter) {
    // if peer send new message
    optionsChangeManager.peerSyncCounter++;
    const options = JSON.parse(optionsChangeMessage.slice(0, -1));
    askOptionsChangeReceivedFromPeer(options);
  } else {
    console.log('invalid options change message received.');
    return;
  }

  // Send the message ACK array buffer with length 1.
  const buffer = new ArrayBuffer(1);
  const dataView = new DataView(buffer);
  dataView.setInt8(0, peerSyncCounter);
  dataChannel.send(buffer);
}

/**
 * Send options change agree/disagree message to peer
 * @param {boolean} agree agree (true) or disagree (false)
 */
export function sendOptionsChangeAgreeMessageToPeer(agree) {
  let agreeMessageToPeer = String(agree);
  agreeMessageToPeer += String(optionsChangeAgreeManager.syncCounter);
  dataChannel.send(agreeMessageToPeer);
  optionsChangeAgreeManager.resendIntervalID = setInterval(
    () => dataChannel.send(agreeMessageToPeer),
    1000
  );
  return;
}

/**
 * Receive options change agree message ACK(acknowledgment) array buffer from peer.
 * @param {ArrayBuffer} data array buffer with length 1
 */
function receiveOptionsChangeAgreeMessageAckFromPeer(data) {
  const dataView = new DataView(data);
  const syncCounter = dataView.getInt8(0);
  if (syncCounter === optionsChangeAgreeManager.syncCounter) {
    optionsChangeAgreeManager.syncCounter++;
    clearInterval(optionsChangeAgreeManager.resendIntervalID);
  }
}

/**
 * Receive options change meesage from the peer
 * @param {string} optionsChangeAgreeMessage
 */
function receiveOptionsChangeAgreeMessageFromPeer(optionsChangeAgreeMessage) {
  // Read syncCounter at the end of options change agree message
  const peerSyncCounter = Number(optionsChangeAgreeMessage.slice(-1));
  if (peerSyncCounter === optionsChangeAgreeManager.peerSyncCounter) {
    // if peer resend prevMessage since peer did not recieve
    // the message ACK(acknowledgment) array buffer with length 1
    console.log(
      'arraybuffer with length 1 for options change message ACK resent'
    );
  } else if (
    peerSyncCounter === optionsChangeAgreeManager.nextPeerSyncCounter
  ) {
    // if peer send new message
    optionsChangeAgreeManager.peerSyncCounter++;
    const agree = optionsChangeAgreeMessage.slice(0, -1) === 'true';
    noticeAgreeMessageFromPeer(agree);
  } else {
    console.log('invalid options change message received.');
    return;
  }

  // Send the message ACK array buffer with length 1.
  const buffer = new ArrayBuffer(1);
  const dataView = new DataView(buffer);
  dataView.setInt8(0, peerSyncCounter);
  dataChannel.send(buffer);
}

/**
 * Test average ping by sending ping test arraybuffers, then start the game
 */
function startGameAfterPingTest() {
  printLog('start ping test');
  const buffer = new ArrayBuffer(1);
  const view = new DataView(buffer);
  view.setInt8(0, -1);
  let n = 0;
  const intervalID = setInterval(() => {
    if (n === 5) {
      window.clearInterval(intervalID);
      const sum = pingTestManager.pingMesurementArray.reduce(
        (acc, val) => acc + val,
        0
      );
      const avg = sum / pingTestManager.pingMesurementArray.length;
      console.log(
        `average ping: ${avg} ms, ping list: ${pingTestManager.pingMesurementArray}`
      );
      channel.callbackAfterDataChannelOpened();
      channel.callbackAfterDataChannelOpenedForUI();
      showGameCanvas();
      enableChatOpenBtn();

      printAvgPing(avg);

      let t = 10;
      printStartsIn(t);
      const intervalID2 = setInterval(() => {
        t--;
        printStartsIn(t);
        if (t === 0) {
          window.clearInterval(intervalID2);
          hidePingBox();
          channel.gameStartAllowed = true;
          return;
        }
      }, 1000);
      return;
    }
    pingTestManager.pingSentTimeArray[n] = Date.now();
    dataChannel.send(buffer);
    printPeriodInLog();
    n++;
  }, 1000);
}

/**
 * Respond to received ping test array buffer.
 * @param {ArrayBuffer} data array buffer with length 1
 */
function respondToPingTest(data) {
  const dataView = new DataView(data);
  if (dataView.getInt8(0) === -1) {
    const buffer = new ArrayBuffer(1);
    const view = new DataView(buffer);
    view.setInt8(0, -2);
    console.log('respond to ping');
    dataChannel.send(buffer);
  } else if (dataView.getInt8(0) === -2) {
    pingTestManager.pingMesurementArray.push(
      Date.now() -
        pingTestManager.pingSentTimeArray[
          pingTestManager.receivedPingResponseNumber
        ]
    );
    pingTestManager.receivedPingResponseNumber++;
  }
}

/**
 * Event handler for the message event (which has data received from the peer) of data channel
 * @param {MessageEvent} event
 */
function recieveFromPeer(event) {
  const data = event.data;
  if (data instanceof ArrayBuffer) {
    if (data.byteLength > 1 && data.byteLength <= 1 + 2 * bufferLength) {
      receiveInputQueueFromPeer(data);
      if (channel.callbackAfterPeerInputQueueReceived !== null) {
        const callback = channel.callbackAfterPeerInputQueueReceived;
        channel.callbackAfterPeerInputQueueReceived = null;
        window.setTimeout(callback, 0);
      }
    } else if (data.byteLength === 1) {
      const view = new DataView(data);
      const value = view.getInt8(0);
      if (value >= 4) {
        receiveOptionsChangeAgreeMessageAckFromPeer(data);
      } else if (value >= 2) {
        receiveOptionsChangeMessageAckFromPeer(data);
      } else if (value >= 0) {
        receiveChatMessageAckFromPeer(data);
      } else if (value < 0) {
        respondToPingTest(data);
      }
    }
  } else if (typeof data === 'string') {
    const syncCounter = Number(data.slice(-1));
    if (syncCounter >= 4) {
      receiveOptionsChangeAgreeMessageFromPeer(data);
    } else if (syncCounter >= 2) {
      receiveOptionsChangeMessageFromPeer(data);
    } else if (syncCounter >= 0) {
      receiveChatMessageFromPeer(data);
    }
  }
}

/**
 * Data channel open event listener
 */
function dataChannelOpened() {
  printLog('data channel opened!');
  console.log('data channel opened!');
  console.log(`dataChannel.ordered: ${dataChannel.ordered}`);
  console.log(`dataChannel.maxRetransmits: ${dataChannel.maxRetransmits}`);
  channel.isOpen = true;
  dataChannel.binaryType = 'arraybuffer';

  if (channel.isQuickMatch) {
    disableCancelQuickMatchBtn();
  }

  if (channel.amICreatedRoom) {
    if (channel.isQuickMatch) {
      sendQuickMatchSuccessMessageToServer();
    } else {
      sendWithFriendSuccessMessageToServer();
    }
  }

  // Set the same RNG (used for the game) for both peers
  const customRng = seedrandom.alea(roomId.slice(10));
  setCustomRng(customRng);

  // Set the same RNG (used for displaying chat messages) for both peers
  const rngForPlayer1Chat = seedrandom.alea(roomId.slice(10, 15));
  const rngForPlayer2Chat = seedrandom.alea(roomId.slice(15));
  setChatRngs(rngForPlayer1Chat, rngForPlayer2Chat);

  startGameAfterPingTest();
}

/**
 * Data channel close event listener
 */
function dataChannelClosed() {
  console.log('data channel closed');
  channel.isOpen = false;
  noticeDisconnected();
}

function registerPeerConnectionListeners(peerConnection) {
  peerConnection.addEventListener('icegatheringstatechange', () => {
    console.log(
      `ICE gathering state changed: ${peerConnection.iceGatheringState}`
    );
    printLog(
      `ICE gathering state changed: ${peerConnection.iceGatheringState}`
    );
  });

  peerConnection.addEventListener('connectionstatechange', () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
    printLog(`Connection state change: ${peerConnection.connectionState}`);
    if (
      peerConnection.connectionState === 'disconnected' ||
      peerConnection.connectionState === 'closed'
    ) {
      channel.isOpen = false;
      noticeDisconnected();
    }
  });

  peerConnection.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
    printLog(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener('iceconnectionstatechange ', () => {
    console.log(
      `ICE connection state change: ${peerConnection.iceConnectionState}`
    );
    printLog(
      `ICE connection state change: ${peerConnection.iceConnectionState}`
    );
  });

  peerConnection.addEventListener('datachannel', (event) => {
    dataChannel = event.channel;

    console.log('data channel received!');
    printLog('data channel received!');
    dataChannel.addEventListener('open', dataChannelOpened);
    dataChannel.addEventListener('message', recieveFromPeer);
    dataChannel.addEventListener('close', dataChannelClosed);
  });
}

function collectIceCandidates(roomRef, peerConnection, localName, remoteName) {
  const candidatesCollection = roomRef.collection(localName);

  peerConnection.addEventListener('icecandidate', (event) => {
    if (!event.candidate) {
      console.log('Got final candidate!');
      return;
    }
    const json = event.candidate.toJSON();
    candidatesCollection.add(json);
    console.log('Got candidate: ', event.candidate);
  });

  roomRef.collection(remoteName).onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        await peerConnection.addIceCandidate(data);
        console.log('Got new remote ICE candidate');
      }
    });
  });
}
