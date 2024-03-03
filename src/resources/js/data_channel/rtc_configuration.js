// This configuration should contain at least two stun servers to test for symmetric nat in test_network.js
export const rtcConfiguration = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302'],
    },
    {
      urls: ['stun:stun2.l.google.com:19302'],
    },
  ],
};

// Expose `rtcConfiguration` as a global variable so that it can be accessed in the browser console.
// Refer to:
// https://github.com/gorisanson/pikachu-volleyball-p2p-online/pull/27#issuecomment-1974752039
//@ts-ignore
window.rtcConfiguration = rtcConfiguration;
