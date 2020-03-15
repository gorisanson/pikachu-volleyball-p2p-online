/* eslint-disable no-unused-vars */
// @ts-nocheck
/*
 * references
 * https://github.com/webrtc/FirebaseRTC
 * https://webrtc.org/getting-started/firebase-rtc-codelab
 * https://webrtc.org/getting-started/data-channels
 *
 */

'use strict;';
import seedrandom from 'seedrandom';
import { forRand } from './rand.js';

// TODO: seed randomly
forRand.rng = seedrandom.alea('hello');
const player1ChatRng = seedrandom.alea('player1');
const player2ChatRng = seedrandom.alea('player2');

export const channel = {
  isOpen: false,
  amICreatedRoom: false,
  sendToPeer: sendToPeer,

  /** @type {number[][]} Array of number[] where number[0]: xDirection, number[1]: yDirection, number[2]: powerHit */
  peerInputQueue: [],

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
    }
  ]
  // iceCandidatePoolSize: 10
};

let peerConnection = null;
let roomId = null;
let dataChannel = null;
const time = {
  string: undefined,
  ping: undefined
};

const pingArray = [];

const cavasHereElm = document.querySelector('#canvas-here');
let player1ChatBox = document.querySelector('#player1-chat-box');
let player2ChatBox = document.querySelector('#player2-chat-box');
const sendBtn = document.querySelector('#send-btn');

function init() {
  document.querySelector('#create-btn').addEventListener('click', createRoom);
  document.querySelector('#join-btn').addEventListener('click', joinRoom);
  sendBtn.disabled = true;
}

async function createRoom() {
  channel.amICreatedRoom = true;
  document.querySelector('#create-btn').disabled = true;
  document.querySelector('#join-btn').disabled = true;
  document.querySelector('#room-id').disabled = true;
  // eslint-disable-next-line no-undef
  const db = firebase.firestore();
  const roomRef = await db.collection('rooms').doc();

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
  dataChannel.addEventListener('message', recieveMessage);
  dataChannel.addEventListener('close', whenClosed);

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
  document.querySelector('#chat-messages').textContent += '\n' + 'offer sent';

  roomRef.onSnapshot(async snapshot => {
    console.log('Got updated room:', snapshot.data());
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data.answer) {
      document.querySelector('#chat-messages').textContent +=
        '\n' + 'answer received ';
      console.log('Set remote description: ', data.answer);
      const answer = data.answer;
      await peerConnection.setRemoteDescription(answer);
    }
  });

  roomId = roomRef.id;
  document.querySelector(
    '#current-room'
  ).innerText = `Current room is ${roomId} - You are the caller!`;
  console.log('created room!');
}

function joinRoom() {
  document.querySelector('#create-btn').disabled = true;
  document.querySelector('#join-btn').disabled = true;
  document.querySelector('#room-id').disabled = true;
  roomId = document.querySelector('#room-id').value;
  console.log('Join room: ', roomId);
  document.querySelector(
    '#current-room'
  ).innerText = `Current room is ${roomId} - You are the callee!`;
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
    document.querySelector('#chat-messages').textContent +=
      '\n' + 'offer received';
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
    document.querySelector('#chat-messages').textContent +=
      '\n' + 'answer sent';
    console.log('joined room!');
  }
}

async function closeAndCleaning(e) {
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
    const calleeCandidates = await roomRef.collection('calleeCandidates').get();
    console.log('calleCandidates', calleeCandidates);
    calleeCandidates.forEach(candidate => {
      console.log(candidate);
      candidate.delete();
    });
    const callerCandidates = await roomRef.collection('callerCandidates').get();
    console.log('callerCandidates', callerCandidates);
    callerCandidates.forEach(candidate => {
      candidate.delete();
    });
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
    document.querySelector('#chat-messages').textContent +=
      '\n' + `ICE gathering state changed: ${peerConnection.iceGatheringState}`;
  });

  peerConnection.addEventListener('connectionstatechange', () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
    document.querySelector('#chat-messages').textContent +=
      '\n' + `Connection state change: ${peerConnection.connectionState}`;
  });

  peerConnection.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
    document.querySelector('#chat-messages').textContent +=
      '\n' + `Signaling state change: ${peerConnection.signalingState}`;
  });

  peerConnection.addEventListener('iceconnectionstatechange ', () => {
    console.log(
      `ICE connection state change: ${peerConnection.iceConnectionState}`
    );
    document.querySelector('#chat-messages').textContent +=
      '\n' +
      `ICE connection state change: ${peerConnection.iceConnectionState}`;
  });

  peerConnection.addEventListener('datachannel', event => {
    dataChannel = event.channel;

    console.log('data channel received!');
    document.querySelector('#chat-messages').textContent +=
      '\n' + 'data channel received!';
    dataChannel.addEventListener('open', notifyOpen);
    dataChannel.addEventListener('message', recieveMessage);
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
        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
      }
    });
  });
}

function sendToPeer(roundCounter, xDirection, yDirection, powerHit) {
  const buffer = new ArrayBuffer(4);
  const dataView = new DataView(buffer);
  dataView.setUint8(0, roundCounter);
  dataView.setInt8(1, xDirection);
  dataView.setInt8(2, yDirection);
  dataView.setInt8(3, powerHit);

  dataChannel.send(buffer);
}

function sendMessageToPeer(message) {
  messageManager.pendingMessage = message;
  const messageToPeer = message + String(messageManager.counter);
  dataChannel.send(messageToPeer);
  messageManager.resendIntervalID = setInterval(
    () => dataChannel.send(messageToPeer),
    1000
  );
}

function recieveMessage(event) {
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
      wirtePeerMessage(message);
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
        wirteMyMessage(messageManager.pendingMessage);
        sendBtn.disabled = false;
      }
    } else if (data.byteLength === 4) {
      const dataView = new DataView(data);
      if (dataView.getInt32(0, true) === -1) {
        dataView.setInt32(0, -2, true);
        dataChannel.send(data);
        console.log('respond to ping');
        return;
      } else if (dataView.getInt32(0, true) === -2) {
        pingArray.push(Date.now() - time.ping);
      }

      const peerRoundCounterModulo = dataView.getUint8(0);
      const xDirection = dataView.getInt8(1);
      const yDirection = dataView.getInt8(2);
      const powerHit = dataView.getInt8(3);
      channel.peerInputQueue.push([
        peerRoundCounterModulo,
        xDirection,
        yDirection,
        powerHit
      ]);

      if (channel.callbackWhenReceivePeerInput !== null) {
        const round = channel.callbackWhenReceivePeerInput;
        channel.callbackWhenReceivePeerInput = null;
        round();
      }
    }
  }
}

function notifyOpen(event) {
  dataChannel.binaryType = 'arraybuffer';
  console.log('data channel opened!');
  document.querySelector('#chat-messages').textContent +=
    '\n' + 'data channel opened!';
  sendBtn.disabled = false;
  sendBtn.addEventListener('click', event => {
    sendBtn.disabled = true;
    const messageBox = document.querySelector('#message-box');
    const message = messageBox.value;
    if (message === '') {
      sendBtn.disabled = false;
      return;
    }
    messageBox.value = '';
    sendMessageToPeer(message);
  });

  document.querySelector('#chat-messages').textContent += '\nstart ping test';
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, -1, true);
  let n = 0;
  const intervalID = setInterval(() => {
    time.ping = Date.now();
    dataChannel.send(buffer);
    document.querySelector('#chat-messages').textContent += '.';
    n++;
    if (n === 5) {
      window.clearInterval(intervalID);
      const sum = pingArray.reduce((acc, val) => acc + val, 0);
      const avg = sum / pingArray.length;
      console.log(`ping avg: ${avg} ms, ping list: ${pingArray}`);
      document.querySelector(
        '#chat-messages'
      ).textContent += `\nping avg: ${avg} ms`;
      channel.isOpen = true;
    }
  }, 1000);
  // time.string = Date.now();
  // dataChannel.send('hello');
}

function whenClosed(event) {
  console.log('data channel closed');
  channel.isOpen = false;
}

function writeMessageTo(message, whichPlayer) {
  if (whichPlayer === 1) {
    const newChatBox = player1ChatBox.cloneNode();
    newChatBox.textContent = message;
    newChatBox.style.top = `${20 + 30 * player1ChatRng()}%`;
    newChatBox.style.right = `${55 + 25 * player1ChatRng()}%`;
    cavasHereElm.replaceChild(newChatBox, player1ChatBox);
    player1ChatBox = newChatBox;
  } else if (whichPlayer === 2) {
    const newChatBox = player2ChatBox.cloneNode();
    newChatBox.textContent = message;
    newChatBox.style.top = `${20 + 30 * player2ChatRng()}%`;
    newChatBox.style.left = `${55 + 25 * player2ChatRng()}%`;
    cavasHereElm.replaceChild(newChatBox, player2ChatBox);
    player2ChatBox = newChatBox;
  }
}

function wirteMyMessage(message) {
  if (channel.amIPlayer2 === null) {
    if (channel.amICreatedRoom) {
      writeMessageTo(message, 1);
    } else {
      writeMessageTo(message, 2);
    }
  } else if (channel.amIPlayer2 === false) {
    writeMessageTo(message, 1);
  } else if (channel.amIPlayer2 === true) {
    writeMessageTo(message, 2);
  }
}

function wirtePeerMessage(message) {
  if (channel.amIPlayer2 === null) {
    if (channel.amICreatedRoom) {
      writeMessageTo(message, 2);
    } else {
      writeMessageTo(message, 1);
    }
  } else if (channel.amIPlayer2 === false) {
    writeMessageTo(message, 2);
  } else if (channel.amIPlayer2 === true) {
    writeMessageTo(message, 1);
  }
}

window.addEventListener('unload', closeAndCleaning);

init();
