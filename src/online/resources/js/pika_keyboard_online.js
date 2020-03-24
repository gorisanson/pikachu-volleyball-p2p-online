// TODO:

import { PikaKeyboard } from '../../../resources/js/keyboard.js';
import { channel } from './data_channel.js';
import { mod } from './mod.js';

export class MyKeyboard extends PikaKeyboard {
  /**
   * Create a keyboard used for game controller
   * left, right, up, down, powerHit: KeyboardEvent.key value for each
   * Refer {@link https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values}
   * @param {string} left KeyboardEvent.key value of the key to use for left
   * @param {string} right KeyboardEvent.key value of the key to use for right
   * @param {string} up KeyboardEvent.key value of the key to use for up
   * @param {string} down KeyboardEvent.key value of the key to use for down
   * @param {string} powerHit KeyboardEvent.key value of the key to use for power hit or selection
   */
  constructor(left, right, up, down, powerHit) {
    super(left, right, up, down, powerHit);
    this.xDirectionPrev = 0;
    this.yDirectionPrev = 0;
    this.powerHitPrev = 0;
    this._syncCounter = mod(-1, 256);
  }

  get syncCounter() {
    return this._syncCounter;
  }

  set syncCounter(counter) {
    this._syncCounter = mod(counter, 256);
  }

  /**
   *
   * @param {number} syncCounter
   */
  getInputIfNeededAndSendToPeer(syncCounter) {
    if (syncCounter === mod(this.syncCounter + 1, 256)) {
      this.syncCounter = syncCounter;
      super.getInput();
    }
    channel.sendToPeer(
      syncCounter,
      this.xDirection,
      this.yDirection,
      this.powerHit
    );
  }

  storeAsPrevInput() {
    this.xDirectionPrev = this.xDirection;
    this.yDirectionPrev = this.yDirection;
    this.powerHitPrev = this.powerHit;
  }

  /**
   *
   * @param {number} syncCounter
   */
  resendPrevInput(syncCounter) {
    channel.sendToPeer(
      mod(syncCounter - 1, 256),
      this.xDirectionPrev,
      this.yDirectionPrev,
      this.powerHitPrev
    );
  }
}

/**
 * Class representing the webRTC peer's keyboard
 */
export class PeerKeyboard {
  constructor() {
    this.xDirection = 0;
    this.yDirection = 0;
    this.powerHit = 0;
  }

  /**
   * @param {number} syncCounter
   * @return {boolean} get input from peer succeed?
   */
  getInput(syncCounter) {
    const peerInputQueue = channel.peerInputQueue;
    if (peerInputQueue.length === 0) {
      return false;
    }
    let input;
    while (true) {
      input = peerInputQueue.shift();
      const peerRoundCounter = input[0];
      if (peerRoundCounter === syncCounter) {
        break;
      }
      if (peerInputQueue.length === 0) {
        return false;
      }
    }
    this.xDirection = input[1];
    this.yDirection = input[2];
    this.powerHit = input[3];
    return true;
  }
}
