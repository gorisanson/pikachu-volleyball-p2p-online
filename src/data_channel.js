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

export const channel = {
  sendToPeer: sendToPeer,

  /** @type {number[][]} Array of number[] where number[0]: xDirection, number[1]: yDirection, number[2]: powerHit */
  peerInputQueue: [],

  callbackWhenReceivePeerInput: null
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
  string: null,
  arr1: null,
  arr2: null,
  arr4: null,
  arr7: null,
  arr8: null,
  arr16: null,
  arr32: null
};

function init() {
  document.querySelector('#hangupBtn').addEventListener('click', hangUp);
  document.querySelector('#createBtn').addEventListener('click', createRoom);
  document.querySelector('#joinBtn').addEventListener('click', joinRoom);
}

async function createRoom() {
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = true;
  // eslint-disable-next-line no-undef
  const db = firebase.firestore();
  const justForGetRoomRef = {
    pika: {
      pika: 'volleyball'
    }
  };
  const roomRef = await db.collection('rooms').add(justForGetRoomRef);

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

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log('Created offer and set local description:', offer);
  const roomWithOffer = {
    offer: {
      type: offer.type,
      sdp: offer.sdp
    }
  };
  roomRef.update(roomWithOffer);
  console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
  document.querySelector('#chatMessages').textContent += '\n' + 'offer sent';

  roomRef.onSnapshot(async snapshot => {
    console.log('Got updated room:', snapshot.data());
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data.answer) {
      document.querySelector('#chatMessages').textContent +=
        '\n' + 'answer received ';
      console.log('Set remote description: ', data.answer);
      const answer = data.answer;
      await peerConnection.setRemoteDescription(answer);
    }
  });

  roomId = roomRef.id;
  document.querySelector(
    '#currentRoom'
  ).innerText = `Current room is ${roomId} - You are the caller!`;
  console.log('created room!');
}

function joinRoom() {
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = true;
  roomId = document.querySelector('#room-id').value;
  console.log('Join room: ', roomId);
  document.querySelector(
    '#currentRoom'
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
    document.querySelector('#chatMessages').textContent +=
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
    document.querySelector('#chatMessages').textContent += '\n' + 'answer sent';
    console.log('joined room!');
  }
}

async function hangUp(e) {
  document.querySelector('#joinBtn').disabled = true;
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#hangupBtn').disabled = true;
  document.querySelector('#currentRoom').innerText = '';

  closeAndCleaning();

  // document.location.reload(true);
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
    document.querySelector('#chatMessages').textContent +=
      '\n' + `ICE gathering state changed: ${peerConnection.iceGatheringState}`;
  });

  peerConnection.addEventListener('connectionstatechange', () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
    document.querySelector('#chatMessages').textContent +=
      '\n' + `Connection state change: ${peerConnection.connectionState}`;
  });

  peerConnection.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
    document.querySelector('#chatMessages').textContent +=
      '\n' + `Signaling state change: ${peerConnection.signalingState}`;
  });

  peerConnection.addEventListener('iceconnectionstatechange ', () => {
    console.log(
      `ICE connection state change: ${peerConnection.iceConnectionState}`
    );
    document.querySelector('#chatMessages').textContent +=
      '\n' +
      `ICE connection state change: ${peerConnection.iceConnectionState}`;
  });

  peerConnection.addEventListener('datachannel', event => {
    dataChannel = event.channel;

    console.log('data channel received!');
    document.querySelector('#chatMessages').textContent +=
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
  const roundCounterModulo = ((roundCounter % 255) + 255) % 255; // since prevRoundCounter can be -1 at the start;
  dataView.setUint8(0, roundCounterModulo);
  dataView.setInt8(1, xDirection);
  dataView.setInt8(2, yDirection);
  dataView.setInt8(3, powerHit);

  dataChannel.send(buffer);
}

function recieveMessage(event) {
  if (typeof event.data === 'string') {
    console.log(event.data);
    return;
  }
  const buffer = event.data;
  const dataView = new DataView(buffer);
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

function notifyOpen(event) {
  dataChannel.send('hello');
  dataChannel.binaryType = 'arraybuffer';
  console.log('data channel opened!');
  document.querySelector('#chatMessages').textContent +=
    '\n' + 'data channel opened!';
  document.querySelector('#sendBtn').addEventListener('click', event => {
    const message = document.querySelector('#messageBox').value;
    document.querySelector('#chatMessages').textContent +=
      '\nsended:' + message;
    time.string = Date.now();
    dataChannel.send(message);
  });
}

window.addEventListener('unload', hangUp);

init();
