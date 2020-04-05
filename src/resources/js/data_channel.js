/*
 * references
 * https://github.com/webrtc/FirebaseRTC
 * https://webrtc.org/getting-started/firebase-rtc-codelab
 * https://webrtc.org/getting-started/data-channels
 *
 */

'use strict;';

import * as firebase from 'firebase/app';
import 'firebase/firestore';
import { firebaseConfig } from './firebase_config.js';
import seedrandom from 'seedrandom';
import { setCustomRng } from './offline_version_js/rand.js';
import { PikaUserInputWithSync } from './pika_keyboard_online.js';
import { mod, isInModRange } from './mod.js';
import { noticeDisconnected, enableMessageBtns } from './ui_online.js';
import { generatePushID } from './generate_pushid.js';
import {
  setChatRngs,
  displayMyChatMessage,
  displayPeerChatMessage
} from './chat.js';

firebase.initializeApp(firebaseConfig);

// This is needed for initialize the clouds, it is custom rng is reset later on "notifyOpen" function
setCustomRng(seedrandom.alea('hello'));

export const channel = {
  isOpen: false,
  amICreatedRoom: false,

  /** @type {PikaUserInputWithSync[]} */
  peerInputQueue: [],
  _peerInputQueueSyncCounter: 0,
  get peerInputQueueSyncCounter() {
    return this._peerInputQueueSyncCounter;
  },
  set peerInputQueueSyncCounter(counter) {
    this._peerInputQueueSyncCounter = mod(counter, 256);
  },

  callbackWhenReceivePeerInput: null,

  amIPlayer2: null // received from pikavolley_online
};

const messageManager = {
  pendingMessage: '',
  resendIntervalID: null,
  _counter: 0,
  _peerCounter: 9,
  get counter() {
    return this._counter;
  },
  set counter(n) {
    this._counter = n % 10;
  },
  get peerCounter() {
    return this._peerCounter;
  },
  set peerCounter(n) {
    this._peerCounter = n % 10;
  }
};

// DEfault configuration - Change these if you have a different STUN or TURN server.
const configuration = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    },
    {
      urls: ['stun:stun.stunprotocol.org']
    }
  ]
};

let peerConnection = null;
let roomId = null;
let dataChannel = null;
const time = {
  string: undefined,
  ping: undefined
};

const pingArray = [];

const currentRoomID = document.getElementById('current-room-id');
const joinRoomID = document.getElementById('join-room-id');

const flexContainer = document.getElementById('flex-container');
const beforeConnection = document.getElementById('before-connection');

export async function createRoom() {
  channel.amICreatedRoom = true;
  roomId = generatePushID();

  const db = firebase.firestore();
  const roomRef = await db.collection('rooms').doc(roomId);

  console.log('Create PeerConnection with configuration: ', configuration);
  peerConnection = new RTCPeerConnection(configuration);

  registerPeerConnectionListeners();

  collectIceCandidates(
    roomRef,
    peerConnection,
    'callerCandidates',
    'calleeCandidates'
  );

  dataChannel = peerConnection.createDataChannel('chat_channel');

  console.log('dataChannel created', dataChannel);
  dataChannel.addEventListener('open', notifyOpen);
  dataChannel.addEventListener('message', recieveFromPeer);
  dataChannel.addEventListener('close', dataChannelClosed);

  roomRef.onSnapshot(async snapshot => {
    console.log('Got updated room:', snapshot.data());
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data.answer) {
      printLog('answer received');
      console.log('Set remote description: ', data.answer);
      const answer = data.answer;
      await peerConnection.setRemoteDescription(answer);
    }
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log('Created offer and set local description:', offer);
  const roomWithOffer = {
    offer: {
      type: offer.type,
      sdp: offer.sdp
    }
  };
  roomRef.set(roomWithOffer);
  console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
  printLog('offer sent');

  currentRoomID.textContent = `${roomId.slice(0, 5)}-${roomId.slice(
    5,
    10
  )}-${roomId.slice(10, 15)}-${roomId.slice(15)}`;
  console.log('created room!');
}

export function joinRoom() {
  // @ts-ignore
  roomId = joinRoomID.value
    .trim()
    .split('-')
    .join('');
  if (roomId.length !== 20) {
    printLog(
      'The room ID is not in correct form. Please check the correct room ID.'
    );
  }
  console.log('Join room: ', roomId);
  currentRoomID.textContent = `${roomId.slice(0, 5)}-${roomId.slice(
    5,
    10
  )}-${roomId.slice(10, 15)}-${roomId.slice(15)}`;
  joinRoomById(roomId);
}

async function joinRoomById(roomId) {
  // eslint-disable-next-line no-undef
  const db = firebase.firestore();
  const roomRef = db.collection('rooms').doc(`${roomId}`);
  const roomSnapshot = await roomRef.get();
  console.log('Got room:', roomSnapshot.exists);

  if (roomSnapshot.exists) {
    console.log('Create PeerConnection with configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);
    registerPeerConnectionListeners();

    // Code for collecting ICE candidates below
    collectIceCandidates(
      roomRef,
      peerConnection,
      'calleeCandidates',
      'callerCandidates'
    );

    // Code for creating SDP answer below
    const offer = roomSnapshot.data().offer;
    await peerConnection.setRemoteDescription(offer);
    console.log('Set remote description: ', offer);
    printLog('offer received');
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log('set local description:', answer);

    const roomWithAnswer = {
      answer: {
        type: answer.type,
        sdp: answer.sdp
      }
    };
    await roomRef.update(roomWithAnswer);
    printLog('answer sent');
    console.log('joined room!');
  }
}

export async function closeAndCleaning() {
  if (dataChannel) {
    dataChannel.close();
  }
  if (peerConnection) {
    peerConnection.close();
  }
  // Delete room on hangup
  if (roomId) {
    // eslint-disable-next-line no-undef
    const db = firebase.firestore();
    const roomRef = db.collection('rooms').doc(roomId);

    // TODO: how can I do this properly?
    // const calleeCandidates = await roomRef.collection('calleeCandidates').get();
    // console.log('calleCandidates', calleeCandidates);
    // calleeCandidates.forEach(candidate => {
    //   console.log(candidate);
    //   candidate.delete();
    // });
    // const callerCandidates = await roomRef.collection('callerCandidates').get();
    // console.log('callerCandidates', callerCandidates);
    // callerCandidates.forEach(candidate => {
    //   candidate.delete();
    // });
    await roomRef.delete();
    console.log('did room delete!');
  }
  console.log('Did close and Cleaning!');
}

function registerPeerConnectionListeners() {
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

  peerConnection.addEventListener('datachannel', event => {
    dataChannel = event.channel;

    console.log('data channel received!');
    printLog('data channel received!');
    dataChannel.addEventListener('open', notifyOpen);
    dataChannel.addEventListener('message', recieveFromPeer);
    dataChannel.addEventListener('close', dataChannelClosed);
  });
}

function collectIceCandidates(roomRef, peerConnection, localName, remoteName) {
  const candidatesCollection = roomRef.collection(localName);

  peerConnection.addEventListener('icecandidate', event => {
    if (!event.candidate) {
      console.log('Got final candidate!');
      return;
    }
    const json = event.candidate.toJSON();
    candidatesCollection.add(json);
    console.log('Got candidate: ', event.candidate);
  });

  roomRef.collection(remoteName).onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        const data = change.doc.data();
        await peerConnection.addIceCandidate(data);
        console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
      }
    });
  });
}

export function sendToPeer(inputsOrMessage) {
  if (typeof inputsOrMessage === 'string') {
    const message = inputsOrMessage;
    messageManager.pendingMessage = message;
    const messageToPeer = message + String(messageManager.counter);
    dataChannel.send(messageToPeer);
    messageManager.resendIntervalID = setInterval(
      () => dataChannel.send(messageToPeer),
      1000
    );
  } else if (Array.isArray(inputsOrMessage)) {
    const inputs = inputsOrMessage;
    const buffer = new ArrayBuffer(4 * inputs.length);
    const dataView = new DataView(buffer);
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      dataView.setUint8(4 * i + 0, input.syncCounter);
      dataView.setUint8(4 * i + 1, input.xDirection);
      dataView.setUint8(4 * i + 2, input.yDirection);
      dataView.setUint8(4 * i + 3, input.powerHit);
    }
    dataChannel.send(buffer);
  }
}

function recieveFromPeer(event) {
  const data = event.data;
  if (typeof data === 'string') {
    const peerCounter = Number(data.slice(-1));
    if (peerCounter === messageManager.peerCounter) {
      // if peer resned prevMessage since peer did not recieve this confirm arraybuffer with length 1
      const buffer = new ArrayBuffer(1);
      const dataView = new DataView(buffer);
      dataView.setInt8(0, peerCounter);
      dataChannel.send(buffer);
      console.log(
        'arraybuffer with length 1 for string receive confirm resent'
      );
    } else if (peerCounter === (messageManager.peerCounter + 1) % 10) {
      // if peer send new message
      const message = data.slice(0, -1);
      displayPeerChatMessage(message);
      messageManager.peerCounter++;
      const buffer = new ArrayBuffer(1);
      const dataView = new DataView(buffer);
      dataView.setInt8(0, peerCounter);
      dataChannel.send(buffer);
    }
    return;
  } else if (data instanceof ArrayBuffer) {
    if (data.byteLength === 1) {
      const dataView = new DataView(data);
      const counter = dataView.getInt8(0);
      if (counter === messageManager.counter) {
        messageManager.counter++;
        clearInterval(messageManager.resendIntervalID);
        displayMyChatMessage(messageManager.pendingMessage);
        enableMessageBtns();
      }
    } else if (data.byteLength % 4 === 0 && data.byteLength / 4 <= 11) {
      const dataView = new DataView(data);

      // TODO: clean ping test to arraybuffer with length 1?
      if (dataView.getInt32(0, true) === -1) {
        dataView.setInt32(0, -2, true);
        dataChannel.send(data);
        console.log('respond to ping');
        return;
      } else if (dataView.getInt32(0, true) === -2) {
        pingArray.push(Date.now() - time.ping);
      }

      for (let i = 0; i < data.byteLength / 4; i++) {
        const syncCounter = dataView.getUint8(i * 4 + 0);
        // isInModeRange in the below if statement is to prevent overflow of the queue by a corrupted peer code
        if (
          syncCounter === channel.peerInputQueueSyncCounter &&
          (channel.peerInputQueue.length === 0 ||
            isInModRange(
              syncCounter,
              channel.peerInputQueue[0].syncCounter,
              channel.peerInputQueue[0].syncCounter + 10,
              256
            ))
        ) {
          const xDirection = dataView.getInt8(i * 4 + 1);
          const yDirection = dataView.getInt8(i * 4 + 2);
          const powerHit = dataView.getInt8(i * 4 + 3);
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

      if (channel.callbackWhenReceivePeerInput !== null) {
        const callback = channel.callbackWhenReceivePeerInput;
        channel.callbackWhenReceivePeerInput = null;
        callback();
        console.log('callback!');
      }
    }
  }
}

function notifyOpen() {
  dataChannel.binaryType = 'arraybuffer';
  console.log('data channel opened!');
  printLog('data channel opened!');

  const customRng = seedrandom.alea(roomId.slice(10));
  setCustomRng(customRng);

  const rngForPlayer1Chat = seedrandom.alea(roomId.slice(10, 15));
  const rngForPlayer2Chat = seedrandom.alea(roomId.slice(15));
  setChatRngs(rngForPlayer1Chat, rngForPlayer2Chat);

  enableMessageBtns();

  printLog('start ping test');
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, -1, true);
  let n = 0;
  const intervalID = setInterval(() => {
    time.ping = Date.now();
    dataChannel.send(buffer);
    printLog('.');
    n++;
    if (n === 5) {
      window.clearInterval(intervalID);
      const sum = pingArray.reduce((acc, val) => acc + val, 0);
      const avg = sum / pingArray.length;
      console.log(`ping avg: ${avg} ms, ping list: ${pingArray}`);
      printLog(`ping avg: ${avg} ms`);
      channel.isOpen = true;
      if (!beforeConnection.classList.contains('hidden')) {
        beforeConnection.classList.add('hidden');
      }
      flexContainer.classList.remove('hidden');
    }
  }, 1000);
}

function dataChannelClosed() {
  console.log('data channel closed');
  channel.isOpen = false;
  noticeDisconnected();
}

function printLog(log) {
  const connectionLog = document.getElementById('connection-log');
  connectionLog.textContent += `${log}\n`;
  connectionLog.scrollIntoView();
}
