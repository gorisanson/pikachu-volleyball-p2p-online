/**
 * Manages outputs to and inputs from the html elements UI
 * and event listeners relevant to the UI of the web page
 */
'use strict';
import {
  channel,
  createRoom,
  joinRoom,
  sendChatMessageToPeer,
  cleanUpFirestoreRelevants,
  closeConnection,
  sendOptionsChangeMessageToPeer,
  sendOptionsChangeAgreeMessageToPeer,
  sendPeerNicknameShownMessageToPeer,
} from './data_channel/data_channel.js';
import { generatePushID } from './utils/generate_pushid.js';
import { myKeyboard } from './keyboard_online.js';
import { testNetwork } from './data_channel/network_test.js';
import {
  MESSAGE_TO_CLIENT,
  startQuickMatch,
  sendCancelQuickMatchMessageToServer,
} from './quick_match/quick_match.js';
import { enableChat } from './chat_display.js';
import { replaySaver } from './replay/replay_saver.js';
import { showBlockThisPeerBtn } from './block_other_players/ui.js';
import '../style.css';
import { MATCH_GROUP } from './quick_match/match_group.js';
import {
  displayNicknameFor,
  displayPeerNicknameFor,
  displayMyAndPeerNicknameShownOrHidden,
} from './nickname_display.js';

/** @typedef {import('./pikavolley_online.js').PikachuVolleyballOnline} PikachuVolleyballOnline */
/** @typedef {import('@pixi/ticker').Ticker} Ticker */
/** @typedef {{speed: string, winningScore: number}} Options options communicated with the peer */

/** @type {number} maximum nickname length */
export const MAX_NICKNAME_LENGTH = 8;

/**
 * This is for to enable changing game options event before loading the game assets.
 * @type {{graphic: string, bgm: string, sfx: string, speed: string, winningScore: number}}
 */
const optionsChangedBeforeLoadingGameAssets = {
  graphic: 'sharp', // local option i.e. not communicated with the peer
  bgm: 'on', // local option i.e. not communicated with the peer
  sfx: 'stereo', // local option i.e. not communicated with the peer
  speed: 'medium',
  winningScore: 15,
};

// This function is changed after the game assets are loaded
let applyOptions = (options) => {
  setSelectedOptionsBtn(options);
  if (options.graphic) {
    optionsChangedBeforeLoadingGameAssets.graphic = options.graphic;
  }
  if (options.bgm) {
    optionsChangedBeforeLoadingGameAssets.bgm = options.bgm;
  }
  if (options.sfx) {
    optionsChangedBeforeLoadingGameAssets.sfx = options.sfx;
  }
  if (options.speed) {
    optionsChangedBeforeLoadingGameAssets.speed = options.speed;
  }
  if (options.winningScore) {
    optionsChangedBeforeLoadingGameAssets.winningScore = options.winningScore;
  }
};

/** @type {{toSend: Options, received: Options}} */
const pendingOptions = {
  toSend: null,
  received: null,
};

let pikaVolleyOnline = null; // it is set after loading the game assets
let willSaveReplayAutomatically = null;
let willNotifyBySound = null;
let alreadySaved = false;

const chatOpenBtnAndChatDisablingBtnContainer = document.getElementById(
  'chat-open-btn-and-chat-disabling-btn-container'
);
const chatOpenBtn = document.getElementById('chat-open-btn');
const chatDisablingBtn = document.getElementById('chat-disabling-btn');
const nicknameHideBtn = document.getElementById('nickname-hide-btn');
const chatInputAndSendBtnContainer = document.getElementById(
  'chat-input-and-send-btn-container'
);
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

export function setUpUI() {
  // game keyboard input needs to be unsubscribe for typing join room ID
  myKeyboard.unsubscribe();

  const networkTestBtn = document.getElementById('network-test-btn');
  const quickMatchBtn = document.getElementById('quick-match-btn');
  const withYourFriendBtn = document.getElementById('with-your-friend-btn');
  const createBtn = document.getElementById('create-btn');
  const copyBtn = document.getElementById('copy-btn');
  const exitRoomBtn = document.getElementById('exit-room-btn');
  const joinBtn = document.getElementById('join-btn');
  const joinRoomIdInput = document.getElementById('join-room-id-input');
  // @ts-ignore
  exitRoomBtn.disabled = true;

  const disableBtns = () => {
    // @ts-ignore
    networkTestBtn.disabled = true;
    // @ts-ignore
    quickMatchBtn.disabled = true;
    // @ts-ignore
    withYourFriendBtn.disabled = true;
    // @ts-ignore
    createBtn.disabled = true;
    // @ts-ignore
    joinBtn.disabled = true;
    // @ts-ignore
    joinRoomIdInput.disabled = true;
  };
  const enableBtns = () => {
    // @ts-ignore
    networkTestBtn.disabled = false;
    if (
      document
        .getElementById('about-with-your-friend')
        .classList.contains('hidden')
    ) {
      // @ts-ignore
      quickMatchBtn.disabled = false;
    }
    // @ts-ignore
    withYourFriendBtn.disabled = false;
    // @ts-ignore
    createBtn.disabled = false;
    // @ts-ignore
    joinBtn.disabled = false;
    // @ts-ignore
    joinRoomIdInput.disabled = false;
  };
  networkTestBtn.addEventListener('click', () => {
    disableBtns();
    const callBackIfPassed = () => {
      document.getElementById('test-passed').classList.remove('hidden');
    };
    const callBackIfDidNotGetSrflxAndDidNotGetHost = () => {
      document
        .getElementById(
          'did-not-get-srflx-candidate-and-did-not-get-host-candidate'
        )
        .classList.remove('hidden');
    };
    const callBackIfDidNotGetSrflxAndHostAddressIsObfuscated = () => {
      document
        .getElementById(
          'did-not-get-srflx-candidate-and-host-address-is-obfuscated'
        )
        .classList.remove('hidden');
    };
    const callBackIfDidNotGetSrflxAndHostAddressIsPrivateIPAddress = () => {
      document
        .getElementById(
          'did-not-get-srflx-candidate-and-host-address-is-private-ip-address'
        )
        .classList.remove('hidden');
    };
    const callBackIfBehindSymmetricNat = () => {
      document
        .getElementById('behind-symmetric-nat')
        .classList.remove('hidden');
    };
    testNetwork(
      enableBtns,
      callBackIfPassed,
      callBackIfDidNotGetSrflxAndDidNotGetHost,
      callBackIfDidNotGetSrflxAndHostAddressIsObfuscated,
      callBackIfDidNotGetSrflxAndHostAddressIsPrivateIPAddress,
      callBackIfBehindSymmetricNat
    );
  });

  const nicknameInputElem = document.getElementById('nickname-input');
  let myNickname = null;
  try {
    myNickname = window.localStorage.getItem('myNickname');
  } catch (err) {
    console.log(err);
  }
  if (myNickname !== null) {
    channel.myNickname = myNickname.trim().slice(0, MAX_NICKNAME_LENGTH);
    // @ts-ignore
    nicknameInputElem.value = channel.myNickname;
  } else {
    // @ts-ignore
    channel.myNickname = nicknameInputElem.value;
  }
  nicknameInputElem.addEventListener('input', (event) => {
    // @ts-ignore
    channel.myNickname = event.target.value
      .trim()
      .slice(0, MAX_NICKNAME_LENGTH);
    // @ts-ignore
    nicknameInputElem.value = channel.myNickname;
    try {
      window.localStorage.setItem('myNickname', channel.myNickname);
    } catch (err) {
      console.log(err);
    }
  });

  // For auto-fast-speed-checkbox
  const autoFastSpeedCheckboxElem = document.getElementById(
    'auto-fast-speed-checkbox'
  );
  let willAskFastAutomatically = null;
  try {
    willAskFastAutomatically =
      'true' === window.localStorage.getItem('willAskFastAutomatically');
  } catch (err) {
    console.log(err);
  }
  if (willAskFastAutomatically !== null) {
    channel.willAskFastAutomatically = willAskFastAutomatically;
    // @ts-ignore
    autoFastSpeedCheckboxElem.checked = willAskFastAutomatically;
  } else {
    // @ts-ignore
    channel.willAskFastAutomatically = autoFastSpeedCheckboxElem.checked;
  }
  autoFastSpeedCheckboxElem.addEventListener('change', () => {
    // @ts-ignore
    channel.willAskFastAutomatically = autoFastSpeedCheckboxElem.checked;
    try {
      window.localStorage.setItem(
        'willAskFastAutomatically',
        String(channel.willAskFastAutomatically)
      );
    } catch (err) {
      console.log(err);
    }
  });

  // For auto-save-replay-checkbox
  const autoSaveReplayCheckbox = document.getElementById(
    'auto-save-replay-checkbox'
  );
  try {
    willSaveReplayAutomatically =
      'true' === window.localStorage.getItem('willSaveReplayAutomatically');
  } catch (err) {
    console.log(err);
  }
  if (willSaveReplayAutomatically !== null) {
    // @ts-ignore
    autoSaveReplayCheckbox.checked = willSaveReplayAutomatically;
  } else {
    // @ts-ignore
    willSaveReplayAutomatically = autoSaveReplayCheckbox.checked;
  }
  autoSaveReplayCheckbox.addEventListener('change', () => {
    // @ts-ignore
    willSaveReplayAutomatically = autoSaveReplayCheckbox.checked;
    try {
      window.localStorage.setItem(
        'willSaveReplayAutomatically',
        String(willSaveReplayAutomatically)
      );
    } catch (err) {
      console.log(err);
    }
  });

  // For notify-by-sound on/off radio buttons
  const notifyBySoundOnRadioBtn = document.getElementById('notify-by-sound-on');
  const notifyBySoundOffRadioBtn = document.getElementById(
    'notify-by-sound-off'
  );
  try {
    const item = window.localStorage.getItem('willNotifyBySound');
    if (item !== null) {
      willNotifyBySound = 'true' === item;
    }
  } catch (err) {
    console.log(err);
  }
  if (willNotifyBySound !== null) {
    // @ts-ignore
    notifyBySoundOnRadioBtn.checked = willNotifyBySound;
    // @ts-ignore
    notifyBySoundOffRadioBtn.checked = !willNotifyBySound;
  } else {
    // @ts-ignore
    willNotifyBySound = notifyBySoundOnRadioBtn.checked;
  }
  const notifyBySoundRadioBtnEventListener = (event) => {
    const currentTarget = event.currentTarget;
    if (currentTarget.checked) {
      willNotifyBySound = currentTarget.value === 'on' ? true : false;
      try {
        window.localStorage.setItem(
          'willNotifyBySound',
          String(willNotifyBySound)
        );
      } catch (err) {
        console.log(err);
      }
    }
  };
  notifyBySoundOnRadioBtn.addEventListener(
    'change',
    notifyBySoundRadioBtnEventListener
  );
  notifyBySoundOffRadioBtn.addEventListener(
    'change',
    notifyBySoundRadioBtnEventListener
  );

  let graphicSetting = null;
  try {
    graphicSetting = window.localStorage.getItem('graphic');
  } catch (err) {
    console.log(err);
  }
  if (graphicSetting !== null) {
    applyOptions({ graphic: graphicSetting });
  }

  let bgmSetting = null;
  try {
    bgmSetting = window.localStorage.getItem('bgm');
  } catch (err) {
    console.log(err);
  }
  if (bgmSetting !== null) {
    applyOptions({ bgm: bgmSetting });
  }

  let sfxSetting = null;
  try {
    sfxSetting = window.localStorage.getItem('sfx');
  } catch (err) {
    console.log(err);
  }
  if (sfxSetting !== null) {
    applyOptions({ sfx: sfxSetting });
  }

  let preselectedMatchGroup = null;
  try {
    preselectedMatchGroup = window.localStorage.getItem(
      'preselectedMatchGroup'
    );
  } catch (err) {
    console.log(err);
  }
  if (preselectedMatchGroup === null) {
    preselectedMatchGroup = document.querySelector(
      'input[name="match-group"]:checked'
      // @ts-ignore
    ).value;
  }
  const eachTimeRadioBtn = document.getElementById('each-time');
  const globalRadioBtn = document.getElementById('global');
  const koreaRadioBtn = document.getElementById('korea');
  const taiwanRadioBtn = document.getElementById('taiwan');
  if (Object.values(MATCH_GROUP).includes(preselectedMatchGroup)) {
    switch (preselectedMatchGroup) {
      case MATCH_GROUP.GLOBAL:
        // @ts-ignore
        globalRadioBtn.checked = true;
        break;
      case MATCH_GROUP.KR:
        // @ts-ignore
        koreaRadioBtn.checked = true;
        break;
      case MATCH_GROUP.TW:
        // @ts-ignore
        taiwanRadioBtn.checked = true;
        break;
    }
  } else {
    // If preselectedMatchGroup is set "EACH-TIME" or other value not enumerated
    // in MATCH_GROUP, it is converted to null.
    preselectedMatchGroup = null;

    // @ts-ignore
    eachTimeRadioBtn.checked = true;
  }

  const matchGroupPreselectionRadioBtnEventListener = (event) => {
    const currentTarget = event.currentTarget;
    // @ts-ignore
    if (currentTarget.checked) {
      // @ts-ignore
      const value = currentTarget.value;
      if (Object.values(MATCH_GROUP).includes(value)) {
        preselectedMatchGroup = value;
        try {
          window.localStorage.setItem(
            'preselectedMatchGroup',
            // @ts-ignore
            currentTarget.value
          );
        } catch (err) {
          console.log(err);
        }
      } else {
        // If value is set "EACH-TIME"
        preselectedMatchGroup = null;
        try {
          window.localStorage.removeItem('preselectedMatchGroup');
        } catch (err) {
          console.log(err);
        }
      }
    }
  };
  eachTimeRadioBtn.addEventListener(
    'change',
    matchGroupPreselectionRadioBtnEventListener
  );
  globalRadioBtn.addEventListener(
    'change',
    matchGroupPreselectionRadioBtnEventListener
  );
  koreaRadioBtn.addEventListener(
    'change',
    matchGroupPreselectionRadioBtnEventListener
  );
  taiwanRadioBtn.addEventListener(
    'change',
    matchGroupPreselectionRadioBtnEventListener
  );

  const startQuickMatchIfPressEnter = (event) => {
    if (event.code === 'Enter' || event.code === 'KeyZ') {
      event.preventDefault();
      window.removeEventListener('keydown', startQuickMatchIfPressEnter);
      document
        .getElementById('press-enter-to-quick-match')
        .classList.add('hidden');
      const callBackIfPassed = () => {
        const globalMatchGroupBtn = document.querySelector(
          '#global-match-group-btn'
        );
        const koreaMatchGroupBtn = document.querySelector(
          '#korea-match-group-btn'
        );
        const taiwanMatchGroupBtn = document.querySelector(
          '#taiwan-match-group-btn'
        );
        const matchGroupInQuickMatchNoticeBox = document.getElementById(
          'match-group-in-quick-match-notice-box'
        );
        const selectMatchGroupByPressingKeyboardShortcut = (event) => {
          switch (event.code) {
            case 'KeyG':
              event.preventDefault();
              // @ts-ignore
              globalMatchGroupBtn.click();
              break;
            case 'KeyK':
              event.preventDefault();
              // @ts-ignore
              koreaMatchGroupBtn.click();
              break;
            case 'KeyT':
              event.preventDefault();
              // @ts-ignore
              taiwanMatchGroupBtn.click();
              break;
          }
        };
        window.addEventListener(
          'keydown',
          selectMatchGroupByPressingKeyboardShortcut
        );
        const startQuickMatchWithMatchGroup = (matchGroup) => {
          window.removeEventListener(
            'keydown',
            selectMatchGroupByPressingKeyboardShortcut
          );
          document.getElementById('select-match-group').classList.add('hidden');
          document
            .getElementById('quick-match-notice-box')
            .classList.remove('hidden');
          const roomId = generatePushID();
          startQuickMatch(roomId, matchGroup);
        };
        globalMatchGroupBtn.addEventListener('click', () => {
          matchGroupInQuickMatchNoticeBox.textContent =
            globalMatchGroupBtn.querySelector('.match-group-name').textContent;
          startQuickMatchWithMatchGroup(MATCH_GROUP.GLOBAL);
        });
        koreaMatchGroupBtn.addEventListener('click', () => {
          matchGroupInQuickMatchNoticeBox.textContent =
            koreaMatchGroupBtn.querySelector('.match-group-name').textContent;
          startQuickMatchWithMatchGroup(MATCH_GROUP.KR);
        });
        taiwanMatchGroupBtn.addEventListener('click', () => {
          matchGroupInQuickMatchNoticeBox.textContent =
            taiwanMatchGroupBtn.querySelector('.match-group-name').textContent;
          startQuickMatchWithMatchGroup(MATCH_GROUP.TW);
        });

        document
          .getElementById('select-match-group')
          .classList.remove('hidden');

        if (preselectedMatchGroup !== null) {
          switch (preselectedMatchGroup) {
            case MATCH_GROUP.GLOBAL:
              // @ts-ignore
              globalMatchGroupBtn.click();
              break;
            case MATCH_GROUP.KR:
              // @ts-ignore
              koreaMatchGroupBtn.click();
              break;
            case MATCH_GROUP.TW:
              // @ts-ignore
              taiwanMatchGroupBtn.click();
              break;
          }
        }
      };
      const callBackIfDidNotGetSrflxAndDidNotGetHost = () => {
        document
          .getElementById(
            'did-not-get-srflx-candidate-and-did-not-get-host-candidate'
          )
          .classList.remove('hidden');
        enableBtns();
      };
      const callBackIfDidNotGetSrflxAndHostAddressIsObfuscated = () => {
        document
          .getElementById(
            'did-not-get-srflx-candidate-and-host-address-is-obfuscated'
          )
          .classList.remove('hidden');
        enableBtns();
      };
      const callBackIfDidNotGetSrflxAndHostAddressIsPrivateIPAddress = () => {
        document
          .getElementById(
            'did-not-get-srflx-candidate-and-host-address-is-private-ip-address'
          )
          .classList.remove('hidden');
        enableBtns();
      };
      const callBackIfBehindSymmetricNat = () => {
        document
          .getElementById('behind-symmetric-nat')
          .classList.remove('hidden');
        enableBtns();
      };
      // Start quick match only if user network passed the network test.
      testNetwork(
        () => {},
        callBackIfPassed,
        callBackIfDidNotGetSrflxAndDidNotGetHost,
        callBackIfDidNotGetSrflxAndHostAddressIsObfuscated,
        callBackIfDidNotGetSrflxAndHostAddressIsPrivateIPAddress,
        callBackIfBehindSymmetricNat
      );
    }
  };
  quickMatchBtn.addEventListener('click', () => {
    disableBtns();
    channel.isQuickMatch = true;
    window.addEventListener('keydown', startQuickMatchIfPressEnter);
    const pressEnterToQuickMatch = document.getElementById(
      'press-enter-to-quick-match'
    );
    pressEnterToQuickMatch.classList.remove('hidden');
  });

  const clickQuickMatchBtnByPressingEnter = (event) => {
    if (event.code === 'Enter') {
      event.preventDefault();
      window.removeEventListener('keydown', clickQuickMatchBtnByPressingEnter);
      quickMatchBtn.click();
    }
  };
  window.addEventListener('keydown', clickQuickMatchBtnByPressingEnter);

  createBtn.addEventListener('click', () => {
    disableBtns();
    // @ts-ignore
    document.getElementById('join-room-id-input').value = '';
    channel.isQuickMatch = false;

    const roomId = generatePushID();
    createRoom(roomId).then(() => {
      printCurrentRoomID(roomId);
      copyBtn.classList.remove('hidden');
      // @ts-ignore
      exitRoomBtn.disabled = false;
    });
  });

  copyBtn.addEventListener('click', () => {
    copyBtn.innerHTML = document.getElementById('copied').innerHTML;
    setTimeout(() => {
      copyBtn.textContent = document.getElementById('copy').textContent;
    }, 700);

    navigator.clipboard.writeText(
      document.getElementById('current-room-id').textContent
    );
  });

  exitRoomBtn.addEventListener('click', () => {
    cleanUpFirestoreRelevants();
    window.setTimeout(() => location.reload(), 0);
  });

  const clickJoinBtnByPressingEnter = (event) => {
    if (event.code === 'Enter') {
      event.preventDefault();
      window.removeEventListener('keydown', clickJoinBtnByPressingEnter);
      joinBtn.click();
    }
  };
  joinBtn.addEventListener('click', () => {
    disableBtns();
    channel.isQuickMatch = false;

    const roomId = getJoinRoomID();
    joinRoom(roomId).then((joined) => {
      if (joined) {
        printCurrentRoomID(roomId);
        // @ts-ignore
        exitRoomBtn.disabled = false;
      } else {
        enableBtns();
        window.addEventListener('keydown', clickJoinBtnByPressingEnter);
      }
    });
  });
  withYourFriendBtn.addEventListener('click', () => {
    const aboutWithYourFriend = document.getElementById(
      'about-with-your-friend'
    );
    const blockedIPAddressesTableContainer = document.getElementById(
      'blocked-ip-addresses-table-container'
    );
    const blockedBadWordsTableContainer = document.getElementById(
      'blocked-bad-words-table-container'
    );
    const openChatListContainer = document.getElementById(
      'open-chat-list-container'
    );
    if (aboutWithYourFriend.classList.contains('hidden')) {
      aboutWithYourFriend.classList.remove('hidden');
      // @ts-ignore
      quickMatchBtn.disabled = true;
      window.addEventListener('keydown', clickJoinBtnByPressingEnter);
      blockedIPAddressesTableContainer.classList.add('hidden');
      blockedBadWordsTableContainer.classList.add('hidden');
      if (openChatListContainer) {
        openChatListContainer.classList.add('hidden');
      }
    } else {
      aboutWithYourFriend.classList.add('hidden');
      // @ts-ignore
      quickMatchBtn.disabled = false;
      window.removeEventListener('keydown', clickJoinBtnByPressingEnter);
      blockedIPAddressesTableContainer.classList.remove('hidden');
      blockedBadWordsTableContainer.classList.remove('hidden');
      if (openChatListContainer) {
        openChatListContainer.classList.remove('hidden');
      }
    }
  });

  // hide or show menubar if the user presses the "esc" key
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      const menuBar = document.getElementById('menu-bar');
      if (menuBar.classList.contains('hidden')) {
        menuBar.classList.remove('hidden');
      } else {
        menuBar.classList.add('hidden');
      }
      event.preventDefault();
    }
  });

  chatOpenBtn.addEventListener('click', chatOpenBtnClicked);
  sendBtn.addEventListener('click', sendBtnClicked);
  chatDisablingBtn.addEventListener('click', () => {
    // @ts-ignore
    if (!chatOpenBtn.disabled) {
      enableChat(false);
      // @ts-ignore
      chatOpenBtn.disabled = true;
      // @ts-ignore
      chatInput.disabled = true;
      // @ts-ignore
      sendBtn.disabled = true;
      chatDisablingBtn.textContent =
        document.getElementById('text-enable-chat').textContent;
    } else {
      enableChat(true);
      // @ts-ignore
      chatOpenBtn.disabled = false;
      chatDisablingBtn.textContent =
        document.getElementById('text-disable-chat').textContent;
    }
    chatDisablingBtn.blur();
    try {
      window.localStorage.setItem(
        'isChatEnabled',
        // @ts-ignore
        String(!chatOpenBtn.disabled)
      );
    } catch (err) {
      console.log(err);
    }
  });
  nicknameHideBtn.addEventListener('click', () => {
    if (channel.myIsPeerNicknameVisible) {
      channel.myIsPeerNicknameVisible = false;
      nicknameHideBtn.textContent =
        document.getElementById('text-show-nickname').textContent;
    } else {
      channel.myIsPeerNicknameVisible = true;
      nicknameHideBtn.textContent =
        document.getElementById('text-hide-nickname').textContent;
    }
    nicknameHideBtn.blur();
    if (channel.amIPlayer2 === null) {
      displayPeerNicknameFor(channel.peerNickname, channel.amICreatedRoom);
    } else {
      displayPeerNicknameFor(channel.peerNickname, !channel.amIPlayer2);
    }
    if (channel.amICreatedRoom) {
      replaySaver.recordNicknames(channel.myNickname, channel.peerNickname);
    } else {
      replaySaver.recordNicknames(channel.peerNickname, channel.myNickname);
    }
    displayMyAndPeerNicknameShownOrHidden();
    sendPeerNicknameShownMessageToPeer(channel.myIsPeerNicknameVisible);
    try {
      window.localStorage.setItem(
        'isPeerNicknameVisible',
        // @ts-ignore
        String(channel.myIsPeerNicknameVisible)
      );
    } catch (err) {
      console.log(err);
    }
  });

  let isChatEnabled = true;
  try {
    isChatEnabled = 'false' !== window.localStorage.getItem('isChatEnabled');
  } catch (err) {
    console.log(err);
  }

  let isPeerNicknameVisible = true;
  try {
    isPeerNicknameVisible =
      'false' !== window.localStorage.getItem('isPeerNicknameVisible');
  } catch (err) {
    console.log(err);
  }
  channel.callbackAfterDataChannelOpenedForUI = () => {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        if (
          !chatOpenBtnAndChatDisablingBtnContainer.classList.contains('hidden')
        ) {
          event.preventDefault();
          chatOpenBtn.click();
        }
      } else if (event.code === 'Enter') {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      if (event.code === 'Enter') {
        if (!chatInputAndSendBtnContainer.classList.contains('hidden')) {
          window.setTimeout(() => sendBtn.click(), 0);
        }
      }
    });
    showGameCanvas();
    enableChatOpenBtnAndChatDisablingBtn();
    if (!isChatEnabled) {
      chatDisablingBtn.click();
    }
    if (!isPeerNicknameVisible) {
      nicknameHideBtn.click();
    }
  };

  attachEventListenerToHideBtn('test-passed-ok-btn', 'test-passed');
  attachEventListenerToHideBtn(
    'did-not-get-srflx-candidate-and-did-not-get-host-candidate-ok-btn',
    'did-not-get-srflx-candidate-and-did-not-get-host-candidate'
  );
  attachEventListenerToHideBtn(
    'did-not-get-srflx-candidate-and-host-address-is-obfuscated-ok-btn',
    'did-not-get-srflx-candidate-and-host-address-is-obfuscated'
  );
  attachEventListenerToHideBtn(
    'did-not-get-srflx-candidate-and-host-address-is-private-ip-address-ok-btn',
    'did-not-get-srflx-candidate-and-host-address-is-private-ip-address'
  );
  attachEventListenerToHideBtn(
    'behind-symmetric-nat-ok-btn',
    'behind-symmetric-nat'
  );

  const cancelQuickMatchBtn = document.getElementById('cancel-quick-match-btn');
  cancelQuickMatchBtn.addEventListener('click', () => {
    location.reload();
  });

  const cancelQuickMatchBtnInSelectMatchGroup = document.getElementById(
    'cancel-quick-match-btn-in-select-match-group'
  );
  cancelQuickMatchBtnInSelectMatchGroup.addEventListener('click', () => {
    location.reload();
  });

  const cancelQuickMatchBtn2 = document.getElementById(
    'cancel-quick-match-btn-2'
  );
  cancelQuickMatchBtn2.addEventListener('click', () => {
    sendCancelQuickMatchMessageToServer();
    cleanUpFirestoreRelevants();
    window.setTimeout(() => location.reload(), 0);
  });

  const noticeDisconnectedOKBtn = document.getElementById(
    'notice-disconnected-ok-btn'
  );
  noticeDisconnectedOKBtn.addEventListener('click', () => {
    window.setTimeout(() => location.reload(), 0);
  });

  const askOneMoreGameYesBtn = document.getElementById(
    'ask-one-more-game-yes-btn'
  );
  askOneMoreGameYesBtn.addEventListener('click', () => {
    document.getElementById('ask-one-more-game').classList.add('hidden');
  });

  const askOneMoreGameNoBtn = document.getElementById(
    'ask-one-more-game-no-btn'
  );
  askOneMoreGameNoBtn.addEventListener('click', () => {
    window.setTimeout(() => location.reload(), 0);
  });

  const clickProperBtnByPressingYOrN = (event) => {
    // @ts-ignore
    if (!chatInput.disabled) {
      return;
    }
    if (event.code === 'KeyY') {
      event.preventDefault();
      // @ts-ignore
      const btnForKeyY = document.querySelector(
        'div.fade-in-box:not(.hidden) button.key-y'
      );
      if (btnForKeyY !== null) {
        // @ts-ignore
        btnForKeyY.click();
      }
    } else if (event.code === 'KeyN') {
      event.preventDefault();
      // @ts-ignore
      const btnForKeyN = document.querySelector(
        'div.fade-in-box:not(.hidden) button.key-n'
      );
      if (btnForKeyN !== null) {
        // @ts-ignore
        btnForKeyN.click();
      }
    }
  };
  window.addEventListener('keydown', clickProperBtnByPressingYOrN);

  window.addEventListener('unload', closeConnection);

  window.addEventListener('beforeunload', function (e) {
    // This is for exiting the window by the browser exit button while being connected with quick match server
    cleanUpFirestoreRelevants();
    if (channel.isOpen) {
      if (
        willSaveReplayAutomatically &&
        !document.getElementById('flex-container').classList.contains('hidden')
      ) {
        replaySaver.saveAsFile();
      }
      // Cancel the event
      e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
      // Chrome requires returnValue to be set
      e.returnValue = '';
    }
  });

  disableChatBtns();

  setUpOptionsBtn();
  setUpToShowDropdownsAndSubmenus();
  setUpOptionsAskAndNoticeBoxes();

  const saveReplayBtn = document.getElementById('save-replay-btn');
  saveReplayBtn.addEventListener('click', () => {
    replaySaver.saveAsFile();
  });

  const exitBtn = document.getElementById('exit-btn');
  exitBtn.addEventListener('click', () => {
    location.reload();
  });
}

/**
 * Set up UI which is appropriate to be set after loading game assets
 * @param {PikachuVolleyballOnline} pikaVolley
 * @param {Ticker} ticker
 */
export function setUpUIAfterLoadingGameAssets(pikaVolley, ticker) {
  pikaVolleyOnline = pikaVolley;
  applyOptions = (options) => {
    setSelectedOptionsBtn(options);
    replaySaver.recordOptions(options);
    if (options.graphic) {
      switch (options.graphic) {
        case 'sharp':
          document
            .querySelector('#game-canvas-container>canvas')
            .classList.remove('graphic-soft');
          break;
        case 'soft':
          document
            .querySelector('#game-canvas-container>canvas')
            .classList.add('graphic-soft');
          break;
      }
      try {
        window.localStorage.setItem('graphic', options.graphic);
      } catch (err) {
        console.log(err);
      }
    }
    if (options.bgm) {
      switch (options.bgm) {
        case 'on':
          pikaVolley.audio.turnBGMVolume(true);
          break;
        case 'off':
          pikaVolley.audio.turnBGMVolume(false);
          break;
      }
      try {
        window.localStorage.setItem('bgm', options.bgm);
      } catch (err) {
        console.log(err);
      }
    }
    if (options.sfx) {
      switch (options.sfx) {
        case 'stereo':
          pikaVolley.audio.turnSFXVolume(true);
          pikaVolley.isStereoSound = true;
          break;
        case 'mono':
          pikaVolley.audio.turnSFXVolume(true);
          pikaVolley.isStereoSound = false;
          break;
        case 'off':
          pikaVolley.audio.turnSFXVolume(false);
          break;
      }
      try {
        window.localStorage.setItem('sfx', options.sfx);
      } catch (err) {
        console.log(err);
      }
    }
    if (options.speed) {
      switch (options.speed) {
        case 'slow':
          pikaVolley.normalFPS = 20;
          ticker.maxFPS = pikaVolley.normalFPS;
          break;
        case 'medium':
          pikaVolley.normalFPS = 25;
          ticker.maxFPS = pikaVolley.normalFPS;
          break;
        case 'fast':
          pikaVolley.normalFPS = 30;
          ticker.maxFPS = pikaVolley.normalFPS;
          break;
      }
    }
    if (options.winningScore) {
      switch (options.winningScore) {
        case 5:
          pikaVolley.winningScore = 5;
          break;
        case 10:
          pikaVolley.winningScore = 10;
          break;
        case 15:
          pikaVolley.winningScore = 15;
          break;
      }
    }
  };
  applyOptions(optionsChangedBeforeLoadingGameAssets);
}

function printCurrentRoomID(roomId) {
  const prettyRoomId = `${roomId.slice(0, 5)}-${roomId.slice(
    5,
    10
  )}-${roomId.slice(10, 15)}-${roomId.slice(15)}`;
  document.getElementById('current-room-id').textContent = prettyRoomId;
}

function getJoinRoomID() {
  return (
    document
      .getElementById('join-room-id-input')
      // @ts-ignore
      .value.trim()
      .split('-')
      .join('')
  );
}

export function disableCancelQuickMatchBtn() {
  // @ts-ignore
  document.getElementById('cancel-quick-match-btn-2').disabled = true;
}

/**
 * Print communication count
 * @param {number} count
 */
export function printCommunicationCount(count) {
  document.getElementById('communication-count').textContent = String(count);
}

/**
 * Print quick match state to quick match log box
 * @param {string} state MESSAGE_TO_CLIENT.x
 */
export function printQuickMatchState(state) {
  let log = '';
  switch (state) {
    case MESSAGE_TO_CLIENT.createRoom:
      log = document.getElementById('waiting-message').textContent;
      break;
    case MESSAGE_TO_CLIENT.keepWait:
      return;
    case MESSAGE_TO_CLIENT.waitPeerConnection:
      log = document.getElementById(
        'waiting-peer-to-connect-message'
      ).textContent;
      break;
    case MESSAGE_TO_CLIENT.connectToPeerAfterAWhile:
      log = document.getElementById(
        'connect-to-peer-after-a-while-message'
      ).textContent;
      break;
    case MESSAGE_TO_CLIENT.connectToPeer:
      log = document.getElementById('connect-to-peer-message').textContent;
      break;
    case MESSAGE_TO_CLIENT.abandoned:
      log = document.getElementById('abandoned-message').textContent;
      break;
    default:
      return;
  }
  printQuickMatchLog(log);
}

export function printFailedToConnectToQuickMatchServer() {
  const log = document.getElementById(
    'failed-to-connect-to-server'
  ).textContent;
  printQuickMatchLog(log);
}

/**
 * Print log to quick match log box
 * @param {string} log
 */
export function printQuickMatchLog(log) {
  const connectionLog = document.getElementById('quick-match-log');
  connectionLog.textContent += `${log}\n`;
  connectionLog.scrollIntoView();
}

/**
 * Print number of successful quick matches
 * @param {number} withinLast24hours
 * @param {number} withinLast1hour
 * @param {number} withinLast10minutes
 */
export function printNumberOfSuccessfulQuickMatches(
  withinLast24hours,
  withinLast1hour,
  withinLast10minutes
) {
  document.getElementById('within-24-hours').textContent =
    String(withinLast24hours);
  document.getElementById('within-1-hour').textContent =
    String(withinLast1hour);
  document.getElementById('within-10-minutes').textContent =
    String(withinLast10minutes);
}

/**
 * Print log to connection log box
 * @param {string} log
 */
export function printLog(log) {
  let elementId = 'connection-log-with-friend';
  if (channel.isQuickMatch) {
    elementId = 'connection-log-quick-match';
  }
  const connectionLog = document.getElementById(elementId);
  connectionLog.textContent += `${log}\n`;
  connectionLog.scrollIntoView();
}

export function printPeriodInLog() {
  let elementId = 'connection-log-with-friend';
  if (channel.isQuickMatch) {
    elementId = 'connection-log-quick-match';
  }
  const connectionLog = document.getElementById(elementId);
  connectionLog.textContent += '.';
  connectionLog.scrollIntoView();
}

export function printNotValidRoomIdMessage() {
  printLog(document.getElementById('not-valid-room-id-message').textContent);
}

export function printNoRoomMatchingMessage() {
  printLog(document.getElementById('no-room-matching-message').textContent);
}

export function printNoRoomMatchingMessageInQuickMatch() {
  printLog(
    document.getElementById('no-room-matching-message-in-quick-match')
      .textContent
  );
}

export function printSomeoneElseAlreadyJoinedRoomMessage() {
  printLog(
    document.getElementById('someone-else-already-joined-the-room').textContent
  );
}

export function printConnectionFailed() {
  printLog(document.getElementById('connection-failed').textContent);
}

export function showGameCanvas() {
  const flexContainer = document.getElementById('flex-container');
  const beforeConnection = document.getElementById('before-connection');
  const quickMatchNoticeBox = document.getElementById('quick-match-notice-box');
  quickMatchNoticeBox.classList.add('hidden');
  beforeConnection.classList.add('hidden');
  if (channel.isQuickMatch) {
    showBlockThisPeerBtn();
  }
  flexContainer.classList.remove('hidden');
  myKeyboard.subscribe();
}

export function hidePingBox() {
  const pingBox = document.getElementById('ping-box');
  pingBox.classList.add('hidden');
}

export function printAvgPing(avgPing) {
  document.getElementById('average-ping').textContent = String(avgPing);
}

export function printStartsIn(startsIn) {
  document.getElementById('starts-in').textContent = String(startsIn);
}

export function hideWaitingPeerAssetsLoadingBox() {
  const peerLoadingBox = document.getElementById('peer-loading-box');
  peerLoadingBox.classList.add('hidden');
}

/**
 * Process options change agree/disagree message from peer
 * @param {boolean} agree agree (true) or disagree (false)
 */
export function noticeAgreeMessageFromPeer(agree) {
  if (agree) {
    applyOptions(pendingOptions.toSend);
    const noticePeerAgreedBox = document.getElementById('notice-peer-agreed');
    noticePeerAgreedBox.classList.remove('hidden');
  } else {
    const noticePeerDisagreedBox = document.getElementById(
      'notice-peer-disagreed'
    );
    noticePeerDisagreedBox.classList.remove('hidden');
  }
}

/**
 * Process options change to send to peer
 * @param {Options} options
 */
function askOptionsChangeSendToPeer(options) {
  const optionsChangeBox = document.getElementById('options-change-to-send');
  if (options.speed) {
    optionsChangeBox.textContent =
      document.getElementById('speed-submenu-btn').textContent.trim() + ' ';
    switch (options.speed) {
      case 'slow':
        optionsChangeBox.textContent += document
          .getElementById('slow-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 'medium':
        optionsChangeBox.textContent += document
          .getElementById('medium-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 'fast':
        optionsChangeBox.textContent += document
          .getElementById('fast-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
    }
  } else if (options.winningScore) {
    optionsChangeBox.textContent =
      document.getElementById('winning-score-submenu-btn').textContent.trim() +
      ' ';
    switch (options.winningScore) {
      case 5:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-5-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 10:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-10-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 15:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-15-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
    }
  } else {
    return;
  }
  pendingOptions.toSend = options;
  document
    .getElementById('ask-options-change-send-to-peer')
    .classList.remove('hidden');
  disableOptionsBtn();
}

/**
 * Process options change received from peer
 * @param {Options} options
 */
export function askOptionsChangeReceivedFromPeer(options) {
  const optionsChangeBox = document.getElementById('options-change-received');
  if (options.speed) {
    optionsChangeBox.textContent =
      document.getElementById('speed-submenu-btn').textContent.trim() + ' ';
    switch (options.speed) {
      case 'slow':
        optionsChangeBox.textContent += document
          .getElementById('slow-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 'medium':
        optionsChangeBox.textContent += document
          .getElementById('medium-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 'fast':
        optionsChangeBox.textContent += document
          .getElementById('fast-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
    }
  } else if (options.winningScore) {
    optionsChangeBox.textContent =
      document.getElementById('winning-score-submenu-btn').textContent.trim() +
      ' ';
    switch (options.winningScore) {
      case 5:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-5-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 10:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-10-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 15:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-15-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
    }
  } else {
    return;
  }
  pendingOptions.received = options;
  document
    .getElementById('ask-options-change-received-from-peer')
    .classList.remove('hidden');
  disableOptionsBtn();
  hideSubmenus();
  hideDropdownsExcept('');
}

export function noticeDisconnected() {
  if (
    willSaveReplayAutomatically &&
    !document.getElementById('flex-container').classList.contains('hidden') &&
    !alreadySaved
  ) {
    replaySaver.saveAsFile();
    alreadySaved = true;
  }
  document.getElementById('notice-disconnected').classList.remove('hidden');
}

export function askOneMoreGame() {
  document.getElementById('ask-one-more-game').classList.remove('hidden');
}

export function enableChatOpenBtnAndChatDisablingBtn() {
  // @ts-ignore
  chatOpenBtn.disabled = false;
  // @ts-ignore
  chatDisablingBtn.disabled = false;
}

export function notifyBySound() {
  if (willNotifyBySound === false) {
    return;
  }
  const pikachuSound = document.getElementById('audio-pikachu-sound');
  // @ts-ignore
  pikachuSound.play();
}

/**
 * Ask changing to fast speed to the peer (for automatic option)
 * @param {boolean} shouldDisableOptionsBtn
 */
export function autoAskChangingToFastSpeedToPeer(shouldDisableOptionsBtn) {
  // @ts-ignore
  pendingOptions.toSend = { auto: true, speed: 'fast', winningScore: null };
  if (shouldDisableOptionsBtn) {
    disableOptionsBtn();
  }
  sendOptionsChangeMessageToPeer(pendingOptions.toSend);
}

export function applyAutoAskChangingToFastSpeedWhenBothPeerDo() {
  applyOptions({ speed: 'fast', winningScore: null });
  enableOptionsBtn();
}

function enableOptionsBtn() {
  const optionsDropdownBtn = document.getElementById('options-dropdown-btn');
  // @ts-ignore
  optionsDropdownBtn.disabled = false;
}

function disableOptionsBtn() {
  const optionsDropdownBtn = document.getElementById('options-dropdown-btn');
  // @ts-ignore
  optionsDropdownBtn.disabled = true;
}

function disableChatBtns() {
  // @ts-ignore
  chatOpenBtn.disabled = true;
  // @ts-ignore
  chatDisablingBtn.disabled = true;
  // @ts-ignore
  chatInput.disabled = true;
  // @ts-ignore
  sendBtn.disabled = true;
}

function chatOpenBtnClicked() {
  // @ts-ignore
  chatOpenBtn.disabled = true;
  // @ts-ignore
  chatInput.disabled = false;
  // @ts-ignore
  sendBtn.disabled = false;
  myKeyboard.unsubscribe();
  chatOpenBtnAndChatDisablingBtnContainer.classList.add('hidden');
  chatInputAndSendBtnContainer.classList.remove('hidden');
  chatInput.focus({ preventScroll: true });
}

function sendBtnClicked() {
  disableChatBtns();
  myKeyboard.subscribe();
  chatInputAndSendBtnContainer.classList.add('hidden');
  chatOpenBtnAndChatDisablingBtnContainer.classList.remove('hidden');
  // @ts-ignore
  const message = chatInput.value;
  if (message === '') {
    enableChatOpenBtnAndChatDisablingBtn();
    return;
  }
  // @ts-ignore
  chatInput.value = '';
  sendChatMessageToPeer(message);
}

/**
 * Attach event listener to the hide btn
 * @param {string} btnId
 * @param {string} boxIdToHide
 */
function attachEventListenerToHideBtn(btnId, boxIdToHide) {
  const btn = document.getElementById(btnId);
  btn.addEventListener('click', () => {
    const box = document.getElementById(boxIdToHide);
    box.classList.add('hidden');
  });
}

/**
 * Set up event listeners for options button
 */
function setUpOptionsBtn() {
  const graphicSharpBtn = document.getElementById('graphic-sharp-btn');
  const graphicSoftBtn = document.getElementById('graphic-soft-btn');
  graphicSharpBtn.addEventListener('click', () => {
    applyOptions({ graphic: 'sharp' });
  });
  graphicSoftBtn.addEventListener('click', () => {
    applyOptions({ graphic: 'soft' });
  });

  const bgmOnBtn = document.getElementById('bgm-on-btn');
  const bgmOffBtn = document.getElementById('bgm-off-btn');
  bgmOnBtn.addEventListener('click', () => {
    applyOptions({ bgm: 'on' });
  });
  bgmOffBtn.addEventListener('click', () => {
    applyOptions({ bgm: 'off' });
  });

  const stereoBtn = document.getElementById('stereo-btn');
  const monoBtn = document.getElementById('mono-btn');
  const sfxOffBtn = document.getElementById('sfx-off-btn');
  stereoBtn.addEventListener('click', () => {
    applyOptions({ sfx: 'stereo' });
  });
  monoBtn.addEventListener('click', () => {
    applyOptions({ sfx: 'mono' });
  });
  sfxOffBtn.addEventListener('click', () => {
    applyOptions({ sfx: 'off' });
  });

  /**
   * Return whether the game is in progress
   */
  function isGameInProgress() {
    if (pikaVolleyOnline) {
      return (
        pikaVolleyOnline.state !== pikaVolleyOnline.intro &&
        pikaVolleyOnline.state !== pikaVolleyOnline.menu &&
        !(
          pikaVolleyOnline.state === pikaVolleyOnline.round &&
          pikaVolleyOnline.gameEnded
        )
      );
    }
    return false;
  }

  // Game speed:
  //   slow: 1 frame per 50ms = 20 FPS
  //   medium: 1 frame per 40ms = 25 FPS
  //   fast: 1 frame per 33ms = 30.303030... FPS
  const slowSpeedBtn = document.getElementById('slow-speed-btn');
  const mediumSpeedBtn = document.getElementById('medium-speed-btn');
  const fastSpeedBtn = document.getElementById('fast-speed-btn');
  const noticeBoxGameInProgressForSpeed = document.getElementById(
    'notice-speed-options-cannot-changed-if-game-in-progress'
  );
  const noticeBoxGameInProgressForSpeedOKBtn = document.getElementById(
    'notice-speed-options-cannot-changed-if-game-in-progress-ok-btn'
  );
  slowSpeedBtn.addEventListener('click', () => {
    if (slowSpeedBtn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress()) {
      noticeBoxGameInProgressForSpeed.classList.remove('hidden');
      disableOptionsBtn();
      return;
    }
    askOptionsChangeSendToPeer({ speed: 'slow', winningScore: null });
  });
  mediumSpeedBtn.addEventListener('click', () => {
    if (mediumSpeedBtn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress()) {
      noticeBoxGameInProgressForSpeed.classList.remove('hidden');
      disableOptionsBtn();
      return;
    }
    askOptionsChangeSendToPeer({ speed: 'medium', winningScore: null });
  });
  fastSpeedBtn.addEventListener('click', () => {
    if (fastSpeedBtn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress()) {
      noticeBoxGameInProgressForSpeed.classList.remove('hidden');
      disableOptionsBtn();
      return;
    }
    askOptionsChangeSendToPeer({ speed: 'fast', winningScore: null });
  });
  noticeBoxGameInProgressForSpeedOKBtn.addEventListener('click', () => {
    if (!noticeBoxGameInProgressForSpeed.classList.contains('hidden')) {
      noticeBoxGameInProgressForSpeed.classList.add('hidden');
      enableOptionsBtn();
    }
  });

  const winningScore5Btn = document.getElementById('winning-score-5-btn');
  const winningScore10Btn = document.getElementById('winning-score-10-btn');
  const winningScore15Btn = document.getElementById('winning-score-15-btn');
  const noticeBoxGameInProgressForWinningScore = document.getElementById(
    'notice-winning-score-options-cannot-changed-if-game-in-progress'
  );
  const noticeBoxGameInProgressForWinningScoreOKBtn = document.getElementById(
    'notice-winning-score-options-cannot-changed-if-game-in-progress-ok-btn'
  );

  // const noticeBox2 = document.getElementById('notice-box-2');
  // const noticeOKBtn2 = document.getElementById('notice-ok-btn-2');
  winningScore5Btn.addEventListener('click', () => {
    if (winningScore5Btn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress()) {
      noticeBoxGameInProgressForWinningScore.classList.remove('hidden');
      // @ts-ignore
      disableOptionsBtn();
      return;
    }
    askOptionsChangeSendToPeer({ speed: null, winningScore: 5 });
  });
  winningScore10Btn.addEventListener('click', () => {
    if (winningScore10Btn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress()) {
      noticeBoxGameInProgressForWinningScore.classList.remove('hidden');
      disableOptionsBtn();
      return;
    }
    askOptionsChangeSendToPeer({ speed: null, winningScore: 10 });
  });
  winningScore15Btn.addEventListener('click', () => {
    if (winningScore15Btn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress()) {
      noticeBoxGameInProgressForWinningScore.classList.remove('hidden');
      disableOptionsBtn();
      return;
    }
    askOptionsChangeSendToPeer({ speed: null, winningScore: 15 });
  });
  noticeBoxGameInProgressForWinningScoreOKBtn.addEventListener('click', () => {
    if (!noticeBoxGameInProgressForWinningScore.classList.contains('hidden')) {
      noticeBoxGameInProgressForWinningScore.classList.add('hidden');
      enableOptionsBtn();
    }
  });
}

/**
 * Attach event listeners to show dropdowns and submenus properly
 */
function setUpToShowDropdownsAndSubmenus() {
  // hide dropdowns and submenus if the user clicks outside of these
  window.addEventListener('click', (event) => {
    // @ts-ignore
    if (!event.target.matches('.dropdown-btn, .submenu-btn')) {
      hideSubmenus();
      hideDropdownsExcept('');
    }
  });

  // set up to show dropdowns
  document
    .getElementById('options-dropdown-btn')
    .addEventListener('click', () => {
      toggleDropdown('options-dropdown');
    });

  // set up to show submenus on mouseover event
  document
    .getElementById('graphic-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('graphic-submenu-btn', 'graphic-submenu');
    });
  document
    .getElementById('bgm-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('bgm-submenu-btn', 'bgm-submenu');
    });
  document
    .getElementById('sfx-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('sfx-submenu-btn', 'sfx-submenu');
    });
  document
    .getElementById('speed-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('speed-submenu-btn', 'speed-submenu');
    });
  document
    .getElementById('winning-score-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('winning-score-submenu-btn', 'winning-score-submenu');
    });

  // set up to show submenus on click event
  // (it is for touch device equipped with physical keyboard)
  document.getElementById('bgm-submenu-btn').addEventListener('click', () => {
    showSubmenu('bgm-submenu-btn', 'bgm-submenu');
  });
  document.getElementById('sfx-submenu-btn').addEventListener('click', () => {
    showSubmenu('sfx-submenu-btn', 'sfx-submenu');
  });
  document.getElementById('speed-submenu-btn').addEventListener('click', () => {
    showSubmenu('speed-submenu-btn', 'speed-submenu');
  });
  document
    .getElementById('winning-score-submenu-btn')
    .addEventListener('click', () => {
      showSubmenu('winning-score-submenu-btn', 'winning-score-submenu');
    });
}

/**
 * Set selected (checked) options btn fit to options
 * @param {{graphic: string, bgm: string, sfx: string, speed: string, winningScore: number}} options
 */
function setSelectedOptionsBtn(options) {
  if (options.graphic) {
    const graphicSharpBtn = document.getElementById('graphic-sharp-btn');
    const graphicSoftBtn = document.getElementById('graphic-soft-btn');
    switch (options.graphic) {
      case 'sharp':
        graphicSoftBtn.classList.remove('selected');
        graphicSharpBtn.classList.add('selected');
        break;
      case 'soft':
        graphicSharpBtn.classList.remove('selected');
        graphicSoftBtn.classList.add('selected');
        break;
    }
  }
  if (options.bgm) {
    const bgmOnBtn = document.getElementById('bgm-on-btn');
    const bgmOffBtn = document.getElementById('bgm-off-btn');
    switch (options.bgm) {
      case 'on':
        bgmOffBtn.classList.remove('selected');
        bgmOnBtn.classList.add('selected');
        break;
      case 'off':
        bgmOnBtn.classList.remove('selected');
        bgmOffBtn.classList.add('selected');
        break;
    }
  }
  if (options.sfx) {
    const stereoBtn = document.getElementById('stereo-btn');
    const monoBtn = document.getElementById('mono-btn');
    const sfxOffBtn = document.getElementById('sfx-off-btn');
    switch (options.sfx) {
      case 'stereo':
        monoBtn.classList.remove('selected');
        sfxOffBtn.classList.remove('selected');
        stereoBtn.classList.add('selected');
        break;
      case 'mono':
        sfxOffBtn.classList.remove('selected');
        stereoBtn.classList.remove('selected');
        monoBtn.classList.add('selected');
        break;
      case 'off':
        stereoBtn.classList.remove('selected');
        monoBtn.classList.remove('selected');
        sfxOffBtn.classList.add('selected');
        break;
    }
  }
  if (options.speed) {
    const slowSpeedBtn = document.getElementById('slow-speed-btn');
    const mediumSpeedBtn = document.getElementById('medium-speed-btn');
    const fastSpeedBtn = document.getElementById('fast-speed-btn');
    switch (options.speed) {
      case 'slow':
        mediumSpeedBtn.classList.remove('selected');
        fastSpeedBtn.classList.remove('selected');
        slowSpeedBtn.classList.add('selected');
        break;
      case 'medium':
        fastSpeedBtn.classList.remove('selected');
        slowSpeedBtn.classList.remove('selected');
        mediumSpeedBtn.classList.add('selected');
        break;
      case 'fast':
        slowSpeedBtn.classList.remove('selected');
        mediumSpeedBtn.classList.remove('selected');
        fastSpeedBtn.classList.add('selected');
        break;
    }
  }
  if (options.winningScore) {
    const winningScore5Btn = document.getElementById('winning-score-5-btn');
    const winningScore10Btn = document.getElementById('winning-score-10-btn');
    const winningScore15Btn = document.getElementById('winning-score-15-btn');
    switch (options.winningScore) {
      case 5:
        winningScore10Btn.classList.remove('selected');
        winningScore15Btn.classList.remove('selected');
        winningScore5Btn.classList.add('selected');
        break;
      case 10:
        winningScore15Btn.classList.remove('selected');
        winningScore5Btn.classList.remove('selected');
        winningScore10Btn.classList.add('selected');
        break;
      case 15:
        winningScore5Btn.classList.remove('selected');
        winningScore10Btn.classList.remove('selected');
        winningScore15Btn.classList.add('selected');
        break;
    }
  }
}

/**
 * Attach event listeners to ask and notice boxes relevant to changing options
 */
function setUpOptionsAskAndNoticeBoxes() {
  const askOptionsChangeSendToPeerBox = document.getElementById(
    'ask-options-change-send-to-peer'
  );
  const askOptionsChangeSendToPeerBoxYesBtn = document.getElementById(
    'ask-options-change-send-to-peer-yes-btn'
  );
  const askOptionsChangeSendToPeerBoxNoBtn = document.getElementById(
    'ask-options-change-send-to-peer-no-btn'
  );
  askOptionsChangeSendToPeerBoxYesBtn.addEventListener('click', () => {
    sendOptionsChangeMessageToPeer(pendingOptions.toSend);
    askOptionsChangeSendToPeerBox.classList.add('hidden');
  });
  askOptionsChangeSendToPeerBoxNoBtn.addEventListener('click', () => {
    askOptionsChangeSendToPeerBox.classList.add('hidden');
    enableOptionsBtn();
  });

  const askOptionsChangeReceivedFromPeerBox = document.getElementById(
    'ask-options-change-received-from-peer'
  );
  const askOptionsChangeReceivedFromPeerBoxYesBtn = document.getElementById(
    'ask-options-change-received-from-peer-yes-btn'
  );
  const askOptionsChangeReceivedFromPeerBoxNoBtn = document.getElementById(
    'ask-options-change-received-from-peer-no-btn'
  );
  askOptionsChangeReceivedFromPeerBoxYesBtn.addEventListener('click', () => {
    askOptionsChangeReceivedFromPeerBox.classList.add('hidden');
    sendOptionsChangeAgreeMessageToPeer(true);
    applyOptions(pendingOptions.received);
    enableOptionsBtn();
  });
  askOptionsChangeReceivedFromPeerBoxNoBtn.addEventListener('click', () => {
    askOptionsChangeReceivedFromPeerBox.classList.add('hidden');
    sendOptionsChangeAgreeMessageToPeer(false);
    enableOptionsBtn();
  });

  const noticePeerAgreedBox = document.getElementById('notice-peer-agreed');
  const noticePeerAgreedBoxOKBtn = document.getElementById(
    'notice-peer-agreed-ok-btn'
  );
  noticePeerAgreedBoxOKBtn.addEventListener('click', () => {
    noticePeerAgreedBox.classList.add('hidden');
    enableOptionsBtn();
  });
  const noticePeerDisagreedBox = document.getElementById(
    'notice-peer-disagreed'
  );
  const noticePeerDisagreedBoxOKBtn = document.getElementById(
    'notice-peer-disagreed-ok-btn'
  );
  noticePeerDisagreedBoxOKBtn.addEventListener('click', () => {
    noticePeerDisagreedBox.classList.add('hidden');
    enableOptionsBtn();
  });
}

/**
 * Toggle (show or hide) the dropdown menu
 * @param {string} dropdownID html element id of the dropdown to toggle
 */
function toggleDropdown(dropdownID) {
  hideSubmenus();
  hideDropdownsExcept(dropdownID);
  document.getElementById(dropdownID).classList.toggle('show');
}

/**
 * Show the submenu
 * @param {string} submenuBtnID html element id of the submenu button whose submenu to show
 * @param {string} subMenuID html element id of the submenu to show
 */
function showSubmenu(submenuBtnID, subMenuID) {
  hideSubmenus();
  document.getElementById(submenuBtnID).classList.add('open');
  document.getElementById(subMenuID).classList.add('show');
}

/**
 * Hide all other dropdowns except the dropdown
 * @param {string} dropdownID html element id of the dropdown
 */
function hideDropdownsExcept(dropdownID) {
  const dropdowns = document.getElementsByClassName('dropdown');
  for (let i = 0; i < dropdowns.length; i++) {
    if (dropdowns[i].id !== dropdownID) {
      dropdowns[i].classList.remove('show');
    }
  }
}

/**
 * Hide all submenus
 */
function hideSubmenus() {
  const submenus = document.getElementsByClassName('submenu');
  for (let i = 0; i < submenus.length; i++) {
    submenus[i].classList.remove('show');
  }
  const submenuBtns = document.getElementsByClassName('submenu-btn');
  for (let i = 0; i < submenuBtns.length; i++) {
    submenuBtns[i].classList.remove('open');
  }
}
