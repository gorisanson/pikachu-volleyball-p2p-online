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
      if (Object.keys(candidates).length >= 1) {
        isBehindSymmetricNat = true;
        for (const ip in candidates) {
          var ports = candidates[ip];
          if (ports.length === 1) {
            isBehindSymmetricNat = false;
            break;
          }
        }
        console.log(isBehindSymmetricNat ? 'symmetric nat' : 'normal nat');
      }
      if (!gotSrflx && !isHostAddressPublicIP) {
        console.log('did not get srflx');
        if (isHostAddressObfuscated) {
          console.log('host address is obfuscated');
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
      // The original version in https://webrtchacks.com/symmetric-nat/
      // use cand.relatedPort instead of cand.ip here to differentiate
      // the associated host port.)
      // References:
      // https://stackoverflow.com/a/53880029/8581025
      // https://www.rfc-editor.org/rfc/rfc5245#appendix-B.3
      //
      // But as we can see here:
      // https://datatracker.ietf.org/doc/html/draft-ietf-mmusic-mdns-ice-candidates#section-3.1.2.2-3
      // rport is set to a constant value when mDNS is used to obfuscate host
      // address thus rport is not appropriate to be used here.
      // So I decided to use cand.ip here instead.
      // (For some network environment, a user device is assigned both IPv4
      // address and IPv6 address. And when cand.relatedPort was used,
      // the network test for the user device resulted to false negative.
      // The user device was falsely detected to be behind symmetric.
      // (I get to know about this bug while troubleshooting with
      // a user "sochew" who reported that their device suddenly reported to
      // be behind symmetric nat.) So I fix it by using cand.ip instead.)
      if (!candidates[cand.ip]) {
        candidates[cand.ip] = [cand.port];
        // this is for the Firefox browser
        // Firefox browser trigger an event even if a candidate with
        // the same port after translation is received from another STUN server.
      } else if (candidates[cand.ip][0] !== cand.port) {
        candidates[cand.ip].push(cand.port);
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
