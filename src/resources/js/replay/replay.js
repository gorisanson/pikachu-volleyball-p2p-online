'use strict';
import * as PIXI from 'pixi.js-legacy';
import 'pixi-sound';
import { ASSETS_PATH } from '../offline_version_js/assets_path.js';
import { setGetSpeechBubbleNeeded, hideChat } from '../chat_display.js';
import seedrandom from 'seedrandom';
import { saveAs } from 'file-saver';
import { setCustomRng } from '../offline_version_js/rand.js';
import { PikachuVolleyball } from '../offline_version_js/pikavolley.js';
import { setChatRngs, displayChatMessageAt } from '../chat_display.js';
import {
  noticeEndOfReplay,
  setMaxForScrubberRange,
  moveScrubberTo,
  adjustPlayPauseBtnIcon,
  showTotalTimeDuration,
  showTimeCurrent,
  enableReplayScrubberAndBtns,
} from './ui_replay.js';
import {
  displayNicknameFor,
  displayPartialIPFor,
} from '../nickname_display.js';
import { Cloud, Wave } from '../offline_version_js/cloud_and_wave.js';
import { PikaPhysics } from '../offline_version_js/physics.js';
import '../../style.css';
import {
  convertUserInputTo5bitNumber,
  convert5bitNumberToUserInput,
} from '../input_conversion.js';

/** @typedef {import('../offline_version_js/physics.js').PikaUserInput} PikaUserInput */
/** @typedef GameState @type {function():void} */

export const ticker = new PIXI.Ticker();
ticker.minFPS = 1;
let renderer = null;
let stage = null;
let loader = null;
let pikaVolley = null;
let pack = null;
let willMoveScrubber = true;
let willDisplayChat = true;
let playBackSpeedTimes = 1;
let playBackSpeedFPS = null;

const fakeSound = {
  play: () => {},
  stop: () => {},
};
const fakeBGM = {
  fake: true,
  playing: false,
  play: function () {
    this.playing = true;
  },
  stop: function () {
    this.playing = false;
  },
};
const fakeAudio = {
  sounds: {
    bgm: fakeBGM,
    pipikachu: fakeSound,
    pika: fakeSound,
    chu: fakeSound,
    pi: fakeSound,
    pikachu: fakeSound,
    powerHit: fakeSound,
    ballTouchesGround: fakeSound,
  },
};

/** @typedef {{speed: string, winningScore: number}} Options options communicated with the peer */

/**
 * Classs representing replay saver
 */
class ReplaySaver {
  constructor() {
    this.frameCounter = 0;
    this.roomID = null; // used for set RNGs
    this.nicknames = ['', '']; // [0]: room creator's nickname, [1]: room joiner's nickname
    this.partialPublicIPs = ['*.*.*.*', '*.*.*.*']; // [0]: room creator's partial public IP address, [1]: room joiner's partial public IP address
    this.inputs = []; // [player1Input5bitNumber, player2Input5bitNumber][]
    this.options = []; // [frameCounter, options][];
    this.chats = []; // [frameCounter, playerIndex (1 or 2), chatMessage][]
  }

  /**
   * Record room ID for RNGs to be used for replay
   * @param {string} roomID
   */
  recordRoomID(roomID) {
    this.roomID = roomID;
  }

  /**
   * Record nicknames
   * @param {string} roomCreatorNickname
   * @param {string} roomJoinerNickname
   */
  recordNicknames(roomCreatorNickname, roomJoinerNickname) {
    this.nicknames[0] = roomCreatorNickname;
    this.nicknames[1] = roomJoinerNickname;
  }

  /**
   * Record partial public ips
   * @param {string} roomCreatorPartialPublicIP
   * @param {string} roomJoinerPartialPublicIP
   */
  recordPartialPublicIPs(
    roomCreatorPartialPublicIP,
    roomJoinerPartialPublicIP
  ) {
    this.partialPublicIPs[0] = roomCreatorPartialPublicIP;
    this.partialPublicIPs[1] = roomJoinerPartialPublicIP;
  }

  /**
   * Record user inputs
   * @param {PikaUserInput} player1Input
   * @param {PikaUserInput} player2Input
   */
  recordInputs(player1Input, player2Input) {
    this.inputs.push([
      convertUserInputTo5bitNumber(player1Input),
      convertUserInputTo5bitNumber(player2Input),
    ]);
    this.frameCounter++;
  }

  /**
   * Record game options
   * @param {Options} options
   */
  recordOptions(options) {
    this.options.push([this.frameCounter, options]);
  }

  /**
   * Record a chat message
   * @param {string} chatMessage
   * @param {number} whichPlayerSide 1 or 2
   */
  recordChats(chatMessage, whichPlayerSide) {
    this.chats.push([this.frameCounter, whichPlayerSide, chatMessage]);
  }

  /**
   * Save as a file
   */
  saveAsFile() {
    const pack = {
      roomID: this.roomID,
      nicknames: this.nicknames,
      partialPublicIPs: this.partialPublicIPs,
      chats: this.chats,
      options: this.options,
      inputs: this.inputs,
    };
    const blob = new Blob([JSON.stringify(pack)], {
      type: 'text/plain;charset=utf-8',
    });
    // TODO: properly name the file
    saveAs(blob, 'replay.txt', { autoBom: true });
  }
}

class ReplayReader {
  readFile(filename) {
    const TEXTURES = ASSETS_PATH.TEXTURES;
    TEXTURES.WITH_COMPUTER = TEXTURES.WITH_FRIEND;

    const settings = PIXI.settings;
    settings.RESOLUTION = window.devicePixelRatio;
    settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    settings.ROUND_PIXELS = true;

    renderer = PIXI.autoDetectRenderer({
      width: 432,
      height: 304,
      antialias: false,
      backgroundColor: 0x000000,
      transparent: false,
    });
    stage = new PIXI.Container();
    loader = new PIXI.Loader();

    document.querySelector('#game-canvas-container').appendChild(renderer.view);

    renderer.render(stage); // To make the initial canvas painting stable in the Firefox browser.
    ticker.add(() => {
      // Redering and gameLoop order is the opposite of
      // the offline web version (refer: ./offline_version_js/main.js).
      // It's for the smooth rendering for the online version
      // which gameLoop can not always succeed right on this "ticker.add"ed code
      // because of the transfer delay or connection status. (If gameLoop here fails,
      // it is recovered by the callback gameLoop which is called after peer input received.)
      // Now the rendering is delayed 40ms (when pikaVolley.normalFPS == 25)
      // behind gameLoop.
      renderer.render(stage);
      showTimeCurrent(pikaVolley.timeCurrent);
      pikaVolley.gameLoop();
    });

    loader.add(ASSETS_PATH.SPRITE_SHEET);
    for (const prop in ASSETS_PATH.SOUNDS) {
      loader.add(ASSETS_PATH.SOUNDS[prop]);
    }
    setUpLoaderProgresBar();
    const reader = new FileReader();
    reader.onload = function (event) {
      // @ts-ignore
      pack = JSON.parse(event.target.result);
      showTotalTimeDuration(getTotalTimeDuration(pack));
      loader.load(() => {
        pikaVolley = new PikachuVolleyballReplay(
          stage,
          loader.resources,
          pack.roomID,
          pack.nicknames,
          pack.partialPublicIPs,
          pack.inputs,
          pack.options,
          pack.chats
        );
        // @ts-ignore
        setGetSpeechBubbleNeeded(pikaVolley);
        setMaxForScrubberRange(pack.inputs.length);
        setup(0);
        ticker.start();
        adjustPlayPauseBtnIcon();
        enableReplayScrubberAndBtns();
      });
    };
    reader.readAsText(filename);
  }
}

export const replaySaver = new ReplaySaver();
export const replayReader = new ReplayReader();

/**
 * Class reperesenting Pikachu Volleyball Replay
 */
// @ts-ignore
class PikachuVolleyballReplay extends PikachuVolleyball {
  constructor(
    stage,
    resources,
    roomId,
    nicknames,
    partialPublicIPs,
    inputs,
    options,
    chats
  ) {
    super(stage, resources);
    this.noInputFrameTotal.menu = Infinity;

    this.roomId = roomId;
    this.nicknames = nicknames;
    this.partialPublicIPs = partialPublicIPs;
    this.inputs = inputs;
    this.options = options;
    this.chats = chats;
    this.player1Keyboard = {
      xDirection: 0,
      yDirection: 0,
      powerHit: 0,
      getInput: () => {},
    };
    this.player2Keyboard = {
      xDirection: 0,
      yDirection: 0,
      powerHit: 0,
      getInput: () => {},
    };
    this.keyboardArray = [this.player1Keyboard, this.player2Keyboard];

    this.initilizeForReplay();
  }

  /**
   * This is mainly for reinitilization for reusing the PikachuVolleyballReplay object
   */
  initilizeForReplay() {
    this.timeCurrent = 0; // unit: second
    this.timeBGM = 0;
    this.replayFrameCounter = 0;
    this.chatCounter = 0;
    this.optionsCounter = 0;

    // Set the same RNG (used for the game) for both peers
    const customRng = seedrandom.alea(this.roomId.slice(10));
    setCustomRng(customRng);

    // Set the same RNG (used for displaying chat messages) for both peers
    const rngForPlayer1Chat = seedrandom.alea(this.roomId.slice(10, 15));
    const rngForPlayer2Chat = seedrandom.alea(this.roomId.slice(15));
    setChatRngs(rngForPlayer1Chat, rngForPlayer2Chat);

    // Reinitilize things which needs exact RNG
    this.view.game.cloudArray = [];
    const NUM_OF_CLOUDS = 10;
    for (let i = 0; i < NUM_OF_CLOUDS; i++) {
      this.view.game.cloudArray.push(new Cloud());
    }
    this.view.game.wave = new Wave();
    this.view.intro.visible = false;
    this.view.menu.visible = false;
    this.view.game.visible = false;
    this.view.fadeInOut.visible = false;

    this.physics = new PikaPhysics(true, true);

    this.normalFPS = 25;
    this.slowMotionFPS = 5;
    this.SLOW_MOTION_FRAMES_NUM = 6;
    this.slowMotionFramesLeft = 0;
    this.slowMotionNumOfSkippedFrames = 0;
    this.selectedWithWho = 0;
    this.scores = [0, 0];
    this.winningScore = 15;
    this.gameEnded = false;
    this.roundEnded = false;
    this.isPlayer2Serve = false;
    this.frameCounter = 0;
    this.noInputFrameCounter = 0;

    this.paused = false;
    this.isStereoSound = true;
    this._isPracticeMode = false;
    this.isRoomCreatorPlayer2 = false;
    this.state = this.intro;
  }

  /**
   * Override the "intro" method in the super class.
   * It is to ask for one more game with the peer after quick match game ends.
   * @type {GameState}
   */
  intro() {
    if (this.frameCounter === 0) {
      this.selectedWithWho = 0;
      if (this.nicknames) {
        // TODO: remove backward compatibility by transforming
        displayNicknameFor(this.nicknames[0], this.isRoomCreatorPlayer2);
        displayNicknameFor(this.nicknames[1], !this.isRoomCreatorPlayer2);
      }
      if (this.partialPublicIPs) {
        // TODO: remove backward compatibility by transforming
        displayPartialIPFor(
          this.partialPublicIPs[0],
          this.isRoomCreatorPlayer2
        );
        displayPartialIPFor(
          this.partialPublicIPs[1],
          !this.isRoomCreatorPlayer2
        );
      }
    }
    super.intro();
  }

  /**
   * Override the "menu" method in the super class.
   * It changes "am I player 1 or player 2" setting accordingly.
   * @type {GameState}
   */
  menu() {
    const selectedWithWho = this.selectedWithWho;
    super.menu();
    if (this.selectedWithWho !== selectedWithWho) {
      this.isRoomCreatorPlayer2 = !this.isRoomCreatorPlayer2;
      if (this.nicknames) {
        // TODO: remove backward compatibility by transforming
        displayNicknameFor(this.nicknames[0], this.isRoomCreatorPlayer2);
        displayNicknameFor(this.nicknames[1], !this.isRoomCreatorPlayer2);
      }
      if (this.partialPublicIPs) {
        // TODO: remove backward compatibility by transforming
        displayPartialIPFor(
          this.partialPublicIPs[0],
          this.isRoomCreatorPlayer2
        );
        displayPartialIPFor(
          this.partialPublicIPs[1],
          !this.isRoomCreatorPlayer2
        );
      }
    }
  }

  /**
   * Game loop
   * This function should be called at regular intervals ( interval = (1 / FPS) second )
   */
  gameLoop() {
    if (!this.inputs[this.replayFrameCounter]) {
      noticeEndOfReplay();
      return;
    }

    if (willMoveScrubber) {
      moveScrubberTo(this.replayFrameCounter);
    }

    const userInputNumbers = this.inputs[this.replayFrameCounter];
    const player1Input = convert5bitNumberToUserInput(userInputNumbers[0]);
    const player2Input = convert5bitNumberToUserInput(userInputNumbers[1]);
    this.player1Keyboard.xDirection = player1Input.xDirection;
    this.player1Keyboard.yDirection = player1Input.yDirection;
    this.player1Keyboard.powerHit = player1Input.powerHit;
    this.player2Keyboard.xDirection = player2Input.xDirection;
    this.player2Keyboard.yDirection = player2Input.yDirection;
    this.player2Keyboard.powerHit = player2Input.powerHit;

    let options = this.options[this.optionsCounter];
    while (options && options[0] === this.replayFrameCounter) {
      if (options[1].speed) {
        switch (options[1].speed) {
          case 'slow':
            this.normalFPS = 20;
            break;
          case 'medium':
            this.normalFPS = 25;
            break;
          case 'fast':
            this.normalFPS = 30;
            break;
        }
        if (playBackSpeedFPS) {
          ticker.maxFPS = playBackSpeedFPS;
        } else if (playBackSpeedTimes) {
          ticker.maxFPS = this.normalFPS * playBackSpeedTimes;
        }
      }
      if (options[1].winningScore) {
        switch (options[1].winningScore) {
          case 5:
            this.winningScore = 5;
            break;
          case 10:
            this.winningScore = 10;
            break;
          case 15:
            this.winningScore = 15;
            break;
        }
      }
      this.optionsCounter++;
      options = this.options[this.optionsCounter];
    }
    this.timeCurrent += 1 / this.normalFPS;
    // @ts-ignore
    if (this.audio.sounds.bgm.fake) {
      // @ts-ignore
      if (this.audio.sounds.bgm.playing) {
        this.timeBGM = (this.timeBGM + 1 / this.normalFPS) % 83; // 83 is total duration of bgm
      } else {
        this.timeBGM = 0;
      }
    }

    let chat = this.chats[this.chatCounter];
    while (chat && chat[0] === this.replayFrameCounter) {
      if (willDisplayChat) {
        displayChatMessageAt(chat[2], chat[1]);
      }
      this.chatCounter++;
      chat = this.chats[this.chatCounter];
    }

    this.replayFrameCounter++;
    this.physics.player1.isComputer = false;
    this.physics.player2.isComputer = false;
    super.gameLoop();
  }
}

export function setup(startFrameNumber) {
  ticker.stop();

  // Cleanup previous pikaVolley
  hideChat();
  for (const prop in pikaVolley.audio.sounds) {
    pikaVolley.audio.sounds[prop].stop();
  }
  pikaVolley.initilizeForReplay();

  if (startFrameNumber > 0) {
    const audio = pikaVolley.audio;
    // @ts-ignore
    pikaVolley.audio = fakeAudio;
    willDisplayChat = false;
    willMoveScrubber = false;
    for (let i = 0; i < startFrameNumber; i++) {
      pikaVolley.gameLoop();
    }
    willMoveScrubber = true;
    willDisplayChat = true;
    pikaVolley.audio = audio;
    renderer.render(stage);
  }
  showTimeCurrent(pikaVolley.timeCurrent);
}

export function stopBGM() {
  pikaVolley.audio.sounds.bgm.center.stop();
}

export function pauseBGM() {
  pikaVolley.audio.sounds.bgm.center.pause();
}

export function resumeBGM() {
  pikaVolley.audio.sounds.bgm.center.resume();
}

export function playBGMProperlyAfterScrubbbing() {
  if (fakeAudio.sounds.bgm.playing) {
    pikaVolley.audio.sounds.bgm.center.play({ start: pikaVolley.timeBGM });
  }
}

/**
 *
 * @param {number} seconds
 */
export function seek(seconds) {
  const seekFrameCounter = Math.max(
    0,
    pikaVolley.replayFrameCounter + seconds * pikaVolley.normalFPS
  );
  setup(seekFrameCounter);
}

/**
 *
 * @param {number} times
 */
export function adjustPlaybackSpeedTimes(times) {
  playBackSpeedFPS = null;
  playBackSpeedTimes = times;
  ticker.maxFPS = pikaVolley.normalFPS * playBackSpeedTimes;
}

/**
 *
 * @param {number} fps
 */
export function adjustPlaybackSeeedFPS(fps) {
  playBackSpeedTimes = null;
  playBackSpeedFPS = fps;
  ticker.maxFPS = playBackSpeedFPS;
}

/**
 * Set up the loader progress bar.
 */
function setUpLoaderProgresBar() {
  const loadingBox = document.getElementById('loading-box');
  const progressBar = document.getElementById('progress-bar');

  loader.on('progress', () => {
    progressBar.style.width = `${loader.progress}%`;
  });
  loader.on('complete', () => {
    if (!loadingBox.classList.contains('hidden')) {
      loadingBox.classList.add('hidden');
    }
  });
}

function getTotalTimeDuration(pack) {
  const speedChangeRecord = [];

  let optionsCounter = 0;
  let options = pack.options[optionsCounter];
  while (options) {
    if (options[1].speed) {
      let fpsFromNowOn = null;
      switch (options[1].speed) {
        case 'slow':
          fpsFromNowOn = 20;
          break;
        case 'medium':
          fpsFromNowOn = 25;
          break;
        case 'fast':
          fpsFromNowOn = 30;
          break;
      }
      const frameCounter = options[0];
      speedChangeRecord.push([frameCounter, fpsFromNowOn]);
    }
    optionsCounter++;
    options = pack.options[optionsCounter];
  }

  let timeDuration = 0; // unit: second
  let currentFrameCounter = 0;
  let currentFPS = 25;
  for (let i = 0; i < speedChangeRecord.length; i++) {
    const futureFrameCounter = speedChangeRecord[i][0];
    const futureFPS = speedChangeRecord[i][1];
    timeDuration += (futureFrameCounter - currentFrameCounter) / currentFPS;
    currentFrameCounter = futureFrameCounter;
    currentFPS = futureFPS;
  }
  timeDuration += (pack.inputs.length - currentFrameCounter) / currentFPS;

  return timeDuration;
}
