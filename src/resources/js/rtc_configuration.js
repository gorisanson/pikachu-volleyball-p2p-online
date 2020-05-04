// This configuration should contain at least two stun servers to test for symmetric nat in test_network.js
export const rtcConfiguration = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
    // {
    //   urls: ['stun:stun.stunprotocol.org'],
    // },
  ],
};
