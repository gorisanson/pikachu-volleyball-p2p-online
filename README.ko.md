# 피카츄 배구 P2P 온라인

[_English_](README.md) | _&check;_ _Korean(한국어)_

피카츄 배구(対戦ぴかちゅ～　ﾋﾞｰﾁﾊﾞﾚｰ編)는 "(C) SACHI SOFT / SAWAYAKAN Programmers"와 "(C) Satoshi Takenouchi"가 1997년에 만든 윈도우용 게임입니다.

피카츄 배구 P2P 온라인은 이 피카츄 배구 게임의 P2P (peer-to-peer) 온라인 버전입니다. 인터넷을 통해 친구와 함께 플레이할 수 있습니다. 원조 게임을 리버스 엔지니어링해서 만든 [피카츄 배구 오프라인 웹 버전](https://github.com/gorisanson/pikachu-volleyball)에 [WebRTC](https://webrtc.org/) [data channels](https://webrtc.org/getting-started/data-channels)을 결합하여 개발하였습니다.

https://gorisanson.github.io/pikachu-volleyball-p2p-online/ko/ 에서 피카츄 배구 P2P 온라인을 플레이할 수 있습니다.

<img src="src/resources/assets/images/screenshot.png" alt="피카츄 배구 게임 스크린샷" width="648">

## 구조

- 오프라인 버전: 오프라인 웹 버전의 소스 코드 파일이 모두 [`src/resources/js/offline_version_js/`](src/resources/js/offline_version_js)에 담겨 있습니다. https://github.com/gorisanson/pikachu-volleyball/tree/master/src/resources/js 에 있는 소스 코드 파일과 동일한 것입니다. 이를 기반으로 온라인 버전을 만들었습니다.

- WebRTC data channels: WebRTC data channels를 이용한 P2P 온라인 핵심 기능들이 [`src/resources/js/data_channel.js`](src/resources/js/data_channel.js)에 담겨 있습니다.

게임에서 사용되는 RNG (random number generator) 부분만을 제외하면 게임 상태는 오로지 사용자의 (키보드) 입력에 의해 결정됩니다. 따라서 네트워크 양편에 있는 두 사용자가 사용하는 RNG가 같다면, 사용자의 입력을 서로 주고 받는 것만으로도 두 사용자의 게임 상태를 동일하게 유지할 수 있습니다. 이 P2P 온라인 버전은 data channel open event가 발생할 때 이 두 사용자의 RNG를 같게 만들고 그 후 사용자의 입력을 네트워크를 통해 서로 주고 받습니다.

더 자세한 사항은 [`src/resources/js/main_online.js`](src/resources/js/main_online.js) 파일에 있는 주석에서 볼 수 있습니다.
