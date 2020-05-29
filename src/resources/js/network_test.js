'use strict';
import { parseCandidate } from './parse_candidate.js';
import { rtcConfiguration } from './rtc_configuration.js';

let peerConnection = null;
let dataChannel = null;

/**
 * Major part of this function is copied from https://webrtchacks.com/symmetric-nat/
 */
export async function testNetwork(
  callBack,
  callBackIfPassed,
  callBackIfDidNotGetSrflx,
  callBackIfDidNotGetSrflxAndHostAddressIsObfuscated,
  callBackIfBehindSymmetricNat
) {
  peerConnection = new RTCPeerConnection(rtcConfiguration);

  let isHostAddressObfuscated = false;
  let isHostAddressPublicIP = false;
  let gotSrflx = false;
  let isBehindSymmetricNat = false;
  const candidates = [];

  peerConnection.addEventListener('icecandidate', (event) => {
    if (!event.candidate) {
      console.log('Got final candidate!');
      if (dataChannel) {
        dataChannel.close();
      }
      if (peerConnection) {
        peerConnection.close();
      }
      if (Object.keys(candidates).length === 1) {
        var ports = candidates[Object.keys(candidates)[0]];
        isBehindSymmetricNat = ports.length === 1 ? false : true;
        console.log(isBehindSymmetricNat ? 'symmetric nat' : 'normal nat');
      }
      if (!gotSrflx && !isHostAddressPublicIP) {
        console.log('did not get srflx');
        if (isHostAddressObfuscated) {
          console.log('host address is obfuscted');
          callBackIfDidNotGetSrflxAndHostAddressIsObfuscated();
        } else {
          console.log('host address is not obfuscated');
          callBackIfDidNotGetSrflx();
        }
      } else if (isBehindSymmetricNat) {
        console.log('behind symmetric nat');
        callBackIfBehindSymmetricNat();
      } else if (isHostAddressPublicIP || (gotSrflx && !isBehindSymmetricNat)) {
        console.log(
          '"host address is public IP" or "got srflx, not behind symmetric nat"'
        );
        callBackIfPassed();
      }
      callBack();
      return;
    }
    if (event.candidate.candidate === '') {
      // This if statement is for Firefox browser.
      return;
    }
    const cand = parseCandidate(event.candidate.candidate);
    if (cand.type === 'srflx') {
      gotSrflx = true;
      if (!candidates[cand.relatedPort]) {
        candidates[cand.relatedPort] = [cand.port];
        // this is for the Firefox browser
        // Firefox brower trigger an event even if a candidiate with
        // the same port after translation is received from another STUN server.
      } else if (candidates[cand.relatedPort][0] !== cand.port) {
        candidates[cand.relatedPort].push(cand.port);
      }
    } else if (cand.type === 'host') {
      if (cand.ip.endsWith('.local')) {
        isHostAddressObfuscated = true;
      } else {
        const privateIPReg = RegExp(
          '(^127.)|(^10.)|(^172.1[6-9].)|(^172.2[0-9].)|(^172.3[0-1].)|(^192.168.)'
        );
        if (!privateIPReg.test(cand.ip)) {
          isHostAddressPublicIP = true;
        }
      }
    }
    console.log('Got candidate: ', event.candidate);
  });

  dataChannel = peerConnection.createDataChannel('test', {
    ordered: true,
    maxRetransmits: 0,
  });
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
}
