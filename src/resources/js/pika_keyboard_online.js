// TODO:

import { PikaKeyboard } from './offline_version_js/keyboard.js';
import { PikaUserInput } from './offline_version_js/physics.js';
import { sendToPeer } from './data_channel.js';
import { mod, isInModRange } from './mod.js';

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
    this._syncCounter = 0;
    /** @type {PikaUserInputWithSync[]} */
    this.inputQueue = [];
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
    if (isInModRange(this.syncCounter, syncCounter, syncCounter + 10, 256)) {
      super.getInput();
      const userInputWithSync = new PikaUserInputWithSync(
        this.syncCounter,
        this.xDirection,
        this.yDirection,
        this.powerHit
      );
      this.inputQueue.push(userInputWithSync);
      this.syncCounter++;
    }
    sendToPeer(this.inputQueue);
  }
}

/**
 * Class representing the online keyboard receiveing input from input queue
 */
export class OnlineKeyboard {
  /**
   *
   * @param {PikaUserInputWithSync[]} inputQueue
   */
  constructor(inputQueue) {
    this.xDirection = 0;
    this.yDirection = 0;
    this.powerHit = 0;
    this.inputQueue = inputQueue;
  }

  /**
   * @param {number} syncCounter
   * @return {boolean} get input from peer succeed?
   */
  getInput(syncCounter) {
    if (this.inputQueue.length === 0) {
      return false;
    }
    if (this.inputQueue[0].syncCounter !== syncCounter) {
      console.log(this.inputQueue[0].syncCounter);
      console.log('intended', syncCounter);
      return false;
    }
    const input = this.inputQueue.shift();
    this.xDirection = input.xDirection;
    this.yDirection = input.yDirection;
    this.powerHit = input.powerHit;
    return true;
  }
}

export class PikaUserInputWithSync extends PikaUserInput {
  constructor(syncCounter, xDirection, yDirection, powerHit) {
    super();
    this.syncCounter = syncCounter;
    this.xDirection = xDirection;
    this.yDirection = yDirection;
    this.powerHit = powerHit;
  }
}
