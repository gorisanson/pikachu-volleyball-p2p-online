'use strict';
import { PikachuVolleyball } from './offline_version_js/pikavolley.js';
import { bufferLength, myKeyboard, OnlineKeyboard } from './keyboard_online.js';
import { SYNC_DIVISOR, channel } from './data_channel/data_channel';
import { mod } from './utils/mod.js';
import { askOneMoreGame } from './ui_online.js';
import { displayPartialIPFor, displayNicknameFor } from './nickname_display.js';
import { replaySaver } from './replay/replay_saver.js';
import { PikaUserInput } from './offline_version_js/physics.js';

/** @typedef GameState @type {function():void} */

/**
 * Class reperesenting Pikachu Volleyball p2p online game
 */
// @ts-ignore
export class PikachuVolleyballOnline extends PikachuVolleyball {
  constructor(stage, resources) {
    super(stage, resources);
    this.physics.player1.isComputer = false;
    this.physics.player2.isComputer = false;

    // @ts-ignore
    this.keyboardArray[0].unsubscribe();
    // @ts-ignore
    this.keyboardArray[1].unsubscribe();

    this.myKeyboard = myKeyboard;
    this.myOnlineKeyboard = new OnlineKeyboard(this.myKeyboard.inputQueue);
    this.peerOnlineKeyboard = new OnlineKeyboard(channel.peerInputQueue);

    this._amIPlayer2 = false;
    this.keyboardArray = [this.myOnlineKeyboard, this.peerOnlineKeyboard];
    this._syncCounter = 0;
    this.noInputFrameTotal.menu = Infinity;

    this.isFirstGame = true;

    this.willSaveReplay = true;
  }

  /**
   * @return {boolean}
   */
  get amIPlayer2() {
    return this._amIPlayer2;
  }

  /**
   * @param {boolean} bool Am I Player 2? Am I play on the right side?
   */
  set amIPlayer2(bool) {
    this._amIPlayer2 = bool;
    channel.amIPlayer2 = bool;
    if (this._amIPlayer2 === true) {
      this.keyboardArray = [this.peerOnlineKeyboard, this.myOnlineKeyboard];
    } else {
      this.keyboardArray = [this.myOnlineKeyboard, this.peerOnlineKeyboard];
    }
  }

  get syncCounter() {
    return this._syncCounter;
  }

  set syncCounter(counter) {
    this._syncCounter = mod(counter, SYNC_DIVISOR);
  }

  /**
   * Override the "intro" method in the super class.
   * It is to ask for one more game with the peer after quick match game ends.
   * @type {GameState}
   */
  intro() {
    if (this.frameCounter === 0) {
      this.selectedWithWho = 0;
      if (this.isFirstGame) {
        this.isFirstGame = false;
        this.amIPlayer2 = !channel.amICreatedRoom;
      } else if (channel.isQuickMatch) {
        askOneMoreGame();
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
      this.amIPlayer2 = !this.amIPlayer2;
      displayNicknameFor(channel.myNickname, this.amIPlayer2);
      displayNicknameFor(channel.peerNickname, !this.amIPlayer2);
      displayPartialIPFor(channel.myPartialPublicIP, this.amIPlayer2);
      displayPartialIPFor(channel.peerPartialPublicIP, !this.amIPlayer2);
    }
  }

  /**
   * Game loop
   * This function should be called at regular intervals ( interval = (1 / FPS) second )
   */
  gameLoop() {
    if (!(channel.gameStartAllowed && channel.isOpen)) {
      return;
    }

    // Sync game frame and user input with peer
    //
    // This must be before the slow-mo effect.
    // Otherwise, frame sync could be broken,
    // for example, if peer use other tap on the browser
    // so peer's game pause while my game goes on slow-mo.
    // This broken frame sync results into different game state between two peers.
    this.myKeyboard.getInputIfNeededAndSendToPeer(this.syncCounter);
    this.gameLoopFromGettingPeerInput();
  }

  gameLoopFromGettingPeerInput() {
    const checkForPeerInputQueue = this.peerOnlineKeyboard.isInputOnQueue(
      this.syncCounter
    );
    if (!checkForPeerInputQueue) {
      channel.callbackAfterPeerInputQueueReceived = this.gameLoopFromGettingPeerInput.bind(
        this
      );
      return;
    }
    const checkForMyInputQueue = this.myOnlineKeyboard.isInputOnQueue(
      this.syncCounter
    );
    if (!checkForMyInputQueue) {
      return;
    }
    this.peerOnlineKeyboard.getInput(this.syncCounter);
    this.myOnlineKeyboard.getInput(this.syncCounter);
    this.syncCounter++;

    if (this.willSaveReplay) {
      const player1Input = new PikaUserInput();
      player1Input.xDirection = this.keyboardArray[0].xDirection;
      player1Input.yDirection = this.keyboardArray[0].yDirection;
      player1Input.powerHit = this.keyboardArray[0].powerHit;
      const player2Input = new PikaUserInput();
      player2Input.xDirection = this.keyboardArray[1].xDirection;
      player2Input.yDirection = this.keyboardArray[1].yDirection;
      player2Input.powerHit = this.keyboardArray[1].powerHit;
      replaySaver.recordInputs(player1Input, player2Input);
    }

    // slow-mo effect
    if (this.slowMotionFramesLeft > 0) {
      this.slowMotionNumOfSkippedFrames++;
      if (
        this.slowMotionNumOfSkippedFrames %
          Math.round(this.normalFPS / this.slowMotionFPS) !==
        0
      ) {
        return;
      }
      this.slowMotionFramesLeft--;
      this.slowMotionNumOfSkippedFrames = 0;
    }

    this.physics.player1.isComputer = false;
    this.physics.player2.isComputer = false;
    this.state();

    // window.setTimeout(callback, 0) is used because it puts
    // the callback to the message queue of Javascript runtime event loop,
    // so the callback does not stack upon the stack of the caller function and
    // also does not block if the callbacks are called a bunch in a row.
    if (this.peerOnlineKeyboard.inputQueue.length > bufferLength) {
      if (this.myOnlineKeyboard.inputQueue.length > bufferLength) {
        window.setTimeout(this.gameLoopFromGettingPeerInput.bind(this), 0);
      } else {
        window.setTimeout(this.gameLoop.bind(this), 0);
      }
    }
  }
}
