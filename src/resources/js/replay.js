'use strict';
import * as PIXI from 'pixi.js-legacy';
import 'pixi-sound';
import { ASSETS_PATH } from './offline_version_js/assets_path.js';
import { setGetSpeechBubbleNeeded } from './chat_display.js';
import seedrandom from 'seedrandom';
import { saveAs } from 'file-saver';
import { setCustomRng } from './offline_version_js/rand.js';
import { PikachuVolleyball } from './offline_version_js/pikavolley.js';
import { setChatRngs, displayChatMessageAt } from './chat_display.js';
import '../style.css';
import { noticeEndOfReplay } from './ui_replay.js';

let renderer = null;
let stage = null;
let ticker = null;
let loader = null;

/** @typedef {{speed: string, winningScore: number}} Options options communicated with the peer */

class ReplaySaver {
  constructor() {
    this.frameCounter = 0;
    this.roomID = null; // used for set RNGs
    this.inputs = []; // [[xDirection, yDirection, powerHit], [xDirection, yDirection, powerHit]][], left side is for player 1.
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
   * Record user inputs
   * @param {number[]} player1Input [xDirection, yDirection, powerHit]
   * @param {number[]} player2Input [xDirection, yDirection, powerHit]
   */
  recordInputs(player1Input, player2Input) {
    this.inputs.push([player1Input, player2Input]);
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

  saveAsFile() {
    const pack = {
      roomID: this.roomID,
      chats: this.chats,
      options: this.options,
      inputs: this.inputs,
    };
    const blob = new Blob([JSON.stringify(pack)], {
      type: 'text/plain;charset=utf-8',
    });
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
    ticker = new PIXI.Ticker();
    loader = new PIXI.Loader();

    document.querySelector('#game-canvas-container').appendChild(renderer.view);

    renderer.render(stage); // To make the initial canvas painting stable in the Firefox browser.
    loader.add(ASSETS_PATH.SPRITE_SHEET);
    for (const prop in ASSETS_PATH.SOUNDS) {
      loader.add(ASSETS_PATH.SOUNDS[prop]);
    }
    const reader = new FileReader();
    reader.onload = function (event) {
      // @ts-ignore
      const pack = JSON.parse(event.target.result);
      loader.load(() => {
        setup(pack);
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
  constructor(stage, resources, inputs, options, chats) {
    super(stage, resources);
    this.noInputFrameTotal.menu = Infinity;

    this.replayFrameCounter = 0;
    this.chatCounter = 0;
    this.optionsCounter = 0;
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

    const player1Input = this.inputs[this.replayFrameCounter][0];
    const player2Input = this.inputs[this.replayFrameCounter][1];
    this.player1Keyboard.xDirection = player1Input[0];
    this.player1Keyboard.yDirection = player1Input[1];
    this.player1Keyboard.powerHit = player1Input[2];
    this.player2Keyboard.xDirection = player2Input[0];
    this.player2Keyboard.yDirection = player2Input[1];
    this.player2Keyboard.powerHit = player2Input[2];

    let options = this.options[this.optionsCounter];
    while (options && options[0] === this.replayFrameCounter) {
      if (options[1].speed) {
        switch (options[1].speed) {
          case 'slow':
            this.normalFPS = 20;
            ticker.maxFPS = this.normalFPS;
            break;
          case 'medium':
            this.normalFPS = 25;
            ticker.maxFPS = this.normalFPS;
            break;
          case 'fast':
            this.normalFPS = 30;
            ticker.maxFPS = this.normalFPS;
            break;
        }
      } else if (options[1].winningScore) {
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

    let chat = this.chats[this.chatCounter];
    while (chat && chat[0] === this.replayFrameCounter) {
      displayChatMessageAt(chat[2], chat[1]);
      this.chatCounter++;
      chat = this.chats[this.chatCounter];
    }

    this.replayFrameCounter++;
    this.physics.player1.isComputer = false;
    this.physics.player2.isComputer = false;
    super.gameLoop();
  }
}

function setup(pack) {
  const roomId = pack.roomID;
  // Set the same RNG (used for the game) for both peers
  const customRng = seedrandom.alea(roomId.slice(10));
  setCustomRng(customRng);

  // Set the same RNG (used for displaying chat messages) for both peers
  const rngForPlayer1Chat = seedrandom.alea(roomId.slice(10, 15));
  const rngForPlayer2Chat = seedrandom.alea(roomId.slice(15));
  setChatRngs(rngForPlayer1Chat, rngForPlayer2Chat);

  const pikaVolley = new PikachuVolleyballReplay(
    stage,
    loader.resources,
    pack.inputs,
    pack.options,
    pack.chats
  );
  // @ts-ignore
  setGetSpeechBubbleNeeded(pikaVolley);
  start(pikaVolley);
}

function start(pikaVolley) {
  ticker.maxFPS = pikaVolley.normalFPS;
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
    pikaVolley.gameLoop();
  });
  ticker.start();
}
