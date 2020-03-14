'ues strics';
import { PikachuVolleyball } from './pikavolley.js';
import { MyKeyboard, PeerKeyboard } from './pika_keyboard_online.js';
import { channel } from './data_channel';
import { mod } from './mod.js';

/** @typedef GameState @type {function():void} */

// TODO: remove unnecessary "@ts-ignore"'s

// @ts-ignore
export class PikachuVolleyballOnline extends PikachuVolleyball {
  constructor(stage, resources) {
    super(stage, resources);
    this.physics.player1.isComputer = false;
    this.physics.player2.isComputer = false;

    this.myKeyboard = new MyKeyboard( // for player2
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Enter'
    );
    this.peerKeyboard = new PeerKeyboard();

    this._amIPlayer2 = false;
    this.keyboardArray = [this.myKeyboard, this.peerKeyboard];
    this._syncCounter = 0;
    this.noInputFrameTotal.menu = 0;
    this.noInputFrameTotal = {
      menu: Infinity
    };
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
    if (this._amIPlayer2 === true) {
      // @ts-ignore
      this.keyboardArray = [this.peerKeyboard, this.myKeyboard];
    } else {
      // @ts-ignore
      this.keyboardArray = [this.myKeyboard, this.peerKeyboard];
    }
  }

  get syncCounter() {
    return this._syncCounter;
  }

  set syncCounter(counter) {
    this._syncCounter = mod(counter, 256); // since it is to be sent as Uint8
  }

  beforeStartOfNewGame() {
    if (this.frameCounter === 0) {
      if (channel.amICreatedRoom) {
        if (this.selectedWithWho === 0) {
          this.amIPlayer2 = false;
        } else {
          this.amIPlayer2 = true;
        }
      } else {
        if (this.selectedWithWho === 0) {
          this.amIPlayer2 = true;
        } else {
          this.amIPlayer2 = false;
        }
      }
    }
    super.beforeStartOfNewGame();
  }

  /**
   * Game loop
   * This function should be called at regular intervals ( interval = (1 / FPS) second )
   */
  gameLoop() {
    if (channel.isOpen !== true) {
      return;
    }

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

    this.myKeyboard.getInputIfNeededAndSendToPeer(this.syncCounter);
    const succeed = this.peerKeyboard.getInput(this.syncCounter);
    if (!succeed) {
      this.myKeyboard.resendPrevInput(this.syncCounter);
      channel.callbackWhenReceivePeerInput = this.gameLoop.bind(this);
      return;
    }
    this.myKeyboard.storeAsPrevInput();
    this.physics.player1.isComputer = false;
    this.physics.player2.isComputer = false;
    this.syncCounter++;
    this.state();
  }
}
