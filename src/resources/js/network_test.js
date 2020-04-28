'use strict';
import { rtcConfiguration } from './rtc_configuration.js';

/**
 * This function is from https://github.com/otalk/sdp (I see this function first from https://webrtchacks.com/symmetric-nat/)
 * The license of the code this fucntion is below (MIT License)
 *
 ****************************************
 * Copyright (c) 2017 Philipp Hancke
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *********************************************
 */
function parseCandidate(line) {
  var parts;
  // Parse both variants.
  if (line.indexOf('a=candidate:') === 0) {
    parts = line.substring(12).split(' ');
  } else {
    parts = line.substring(10).split(' ');
  }

  var candidate = {
    foundation: parts[0],
    component: parseInt(parts[1], 10),
    protocol: parts[2].toLowerCase(),
    priority: parseInt(parts[3], 10),
    ip: parts[4],
    address: parts[4], // address is an alias for ip.
    port: parseInt(parts[5], 10),
    // skip parts[6] == 'typ'
    type: parts[7],
  };

  for (var i = 8; i < parts.length; i += 2) {
    switch (parts[i]) {
      case 'raddr':
        candidate.relatedAddress = parts[i + 1];
        break;
      case 'rport':
        candidate.relatedPort = parseInt(parts[i + 1], 10);
        break;
      case 'tcptype':
        candidate.tcpType = parts[i + 1];
        break;
      case 'ufrag':
        candidate.ufrag = parts[i + 1]; // for backward compatibility.
        candidate.usernameFragment = parts[i + 1];
        break;
      default:
        // extension handling, in particular ufrag
        candidate[parts[i]] = parts[i + 1];
        break;
    }
  }
  return candidate;
}

/**
 * Major part of this function is copied from https://webrtchacks.com/symmetric-nat/
 */
export async function testNetwork(
  callBack,
  callBackIfPassed,
  callBackIfDidNotGetSrflx,
  callBackIfBehindSymmetricNat
) {
  const pc = new RTCPeerConnection(rtcConfiguration);

  let didNotGetSrflx = true;
  let isBehindSymmetricNat = null;
  const candidates = [];

  pc.addEventListener('icecandidate', (event) => {
    if (!event.candidate) {
      console.log('Got final candidate!');
      if (Object.keys(candidates).length === 1) {
        var ports = candidates[Object.keys(candidates)[0]];
        isBehindSymmetricNat = ports.length === 1 ? false : true;
        console.log(isBehindSymmetricNat ? 'symmetric nat' : 'normal nat');
      }
      if (didNotGetSrflx) {
        callBackIfDidNotGetSrflx();
      }
      if (isBehindSymmetricNat) {
        callBackIfBehindSymmetricNat();
      }
      if (!didNotGetSrflx && !isBehindSymmetricNat) {
        callBackIfPassed();
      }
      callBack();
      return;
    }
    if (event.candidate.candidate.includes('srflx')) {
      didNotGetSrflx = false;
      const cand = parseCandidate(event.candidate.candidate);
      if (!candidates[cand.relatedPort]) {
        candidates[cand.relatedPort] = [cand.port];
        // this is for the Firefox browser
        // Firefox brower trigger an event even if a candidiate with
        // the same port after translation is received from another STUN server.
      } else if (candidates[cand.relatedPort][0] !== cand.port) {
        candidates[cand.relatedPort].push(cand.port);
      }
    }
    console.log('Got candidate: ', event.candidate);
  });

  pc.createDataChannel('test', {
    ordered: true,
    maxRetransmits: 0,
  });
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
}
