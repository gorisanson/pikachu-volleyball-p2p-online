# Pikachu Volleyball P2P Online

_&check;_ _English_ | [_Korean(한국어)_](README.ko.md)

Pikachu Volleyball (対戦ぴかちゅ～　ﾋﾞｰﾁﾊﾞﾚｰ編) is an old Windows game which was developed by "(C) SACHI SOFT / SAWAYAKAN Programmers" and "(C) Satoshi Takenouchi" in 1997.

Pikachu Volleyball P2P Online is an peer-to-peer online version of the game. You can play with one of your friends through the internet. It is developed by integrating [WebRTC](https://webrtc.org/) [data channels](https://webrtc.org/getting-started/data-channels) to [the offline web version of Pikachu Volleyball](https://github.com/gorisanson/pikachu-volleyball) which is made by reverse engineering the original game.

You can play Pikachu Volleyball P2P online on the website: https://gorisanson.github.io/pikachu-volleyball-p2p-online/en/

<img src="src/resources/assets/images/screenshot.png" alt="Pikachu Volleyball game screenshot" width="648">

## Structure

- Offline version: All the offline web version source code files is in the directory [`src/resources/js/offline_version_js/`](src/resources/js/offline_version_js). These are the same as the source code files in https://github.com/gorisanson/pikachu-volleyball/tree/master/src/resources/js. The online version is developed base on these.

- WebRTC data channels: The core peer-to-peer online functions utilizing WebRTC data channels are contained in [`src/resources/js/data_channel.js`](src/resources/js/data_channel.js).

For other details, you can refer [the offline web version repository](https://github.com/gorisanson/pikachu-volleyball).
