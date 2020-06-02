/**
 * This function is from https://github.com/otalk/sdp
 * (permalink: https://github.com/otalk/sdp/blob/3a8d369a9c159a691c5ee67d6a5f26b4887d26dc/sdp.js#L48)
 * (I see this function first from https://webrtchacks.com/symmetric-nat/)
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
export function parseCandidate(line) {
  let parts;
  // Parse both variants.
  if (line.indexOf('a=candidate:') === 0) {
    parts = line.substring(12).split(' ');
  } else {
    parts = line.substring(10).split(' ');
  }

  const candidate = {
    foundation: parts[0],
    component: { 1: 'rtp', 2: 'rtcp' }[parts[1]],
    protocol: parts[2].toLowerCase(),
    priority: parseInt(parts[3], 10),
    ip: parts[4],
    address: parts[4], // address is an alias for ip.
    port: parseInt(parts[5], 10),
    // skip parts[6] == 'typ'
    type: parts[7],
  };

  for (let i = 8; i < parts.length; i += 2) {
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
 * Return public IP address extracted from the candidate.
 * If the candidate does not contain public IP address, return null.
 * @param {Object} candidate
 */
export function parsePublicIPFromCandidate(candidate) {
  // Parse the candidate
  const cand = parseCandidate(candidate);
  // Try to get and return the peer's public IP
  if (cand.type === 'srflx') {
    return cand.ip;
  } else if (cand.type === 'host') {
    if (!cand.ip.endsWith('.local')) {
      const privateIPReg = RegExp(
        '(^127.)|(^10.)|(^172.1[6-9].)|(^172.2[0-9].)|(^172.3[0-1].)|(^192.168.)'
      );
      if (!privateIPReg.test(cand.ip)) {
        return cand.ip;
      }
    }
  }
  return null;
}

/**
 * Get partial public IP, for example, 123.222.*.*
 * @param {string} ip ip address, for example, 123.222.111.123
 */
export function getPartialIP(ip) {
  const index = ip.indexOf('.', ip.indexOf('.') + 1);
  if (index === -1) {
    // if ip is IPv6 address
    return ip.slice(0, 7);
  } else {
    // if ip is IPv4 address
    return `${ip.slice(0, index)}.*.*`;
  }
}
