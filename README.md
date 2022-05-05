# Pikachu Volleyball P2P Online

_&check;_ _English_ | [_Korean(한국어)_](README.ko.md)

Pikachu Volleyball (対戦ぴかちゅ～　ﾋﾞｰﾁﾊﾞﾚｰ編) is an old Windows game which was developed by "(C) SACHI SOFT / SAWAYAKAN Programmers" and "(C) Satoshi Takenouchi" in 1997.

Pikachu Volleyball P2P Online is an peer-to-peer online version of the game. You can play with other person through the internet. It is developed by integrating [WebRTC](https://webrtc.org/) [data channels](https://webrtc.org/getting-started/data-channels) to [the offline web version of Pikachu Volleyball](https://github.com/gorisanson/pikachu-volleyball) which is made by reverse engineering the original game.

You can play Pikachu Volleyball P2P online on the website: https://gorisanson.github.io/pikachu-volleyball-p2p-online/en/

<img src="src/resources/assets/images/screenshot.png" alt="Pikachu Volleyball game screenshot" width="648">

## Structure

- Offline version: All the offline web version source code files is in the directory [`src/resources/js/offline_version_js/`](src/resources/js/offline_version_js). These are the same as the source code files in https://github.com/gorisanson/pikachu-volleyball/tree/main/src/resources/js. The online version is developed base on these.

- WebRTC data channels: The peer-to-peer online functions utilizing WebRTC data channels are contained in [`src/resources/js/data_channel/data_channel.js`](src/resources/js/data_channel/data_channel.js). ([Firebase Cloud Firestore](https://firebase.google.com/docs/firestore) is used as a mediator for establishing a peer-to-peer communication via WebRTC. The room ID which the room creator sends to the joiner is the ID of a Cloud Firestore document which is shared between them. This method is originally from [Firebase + WebRTC Codelab](https://webrtc.org/getting-started/firebase-rtc-codelab) and [https://github.com/webrtc/FirebaseRTC](https://github.com/webrtc/FirebaseRTC).)

- Quick Match: The communication with the quick match server is contained in [`src/resources/js/quick_match/quick_match.js`](src/resources/js/quick_match/quick_match.js). ([Google App Engine](https://cloud.google.com/appengine) is used as the quick match server. The quick match server sends the ID of the room, which is created by a person waiting for a quick match, to the new one who comes in.)

The game state is deterministic on the user (keyboard) inputs except the RNG (random number generator) used in the game. So if the RNG is the same on both peers, only the user inputs need to be communicated to maintain the same game state between the peers. In this p2p online version, the RNG is set to the same thing on both peers at the data channel open event, then the user inputs are communicated via the data channel.

Refer comments on [`src/resources/js/main_online.js`](src/resources/js/main_online.js) for other details.
