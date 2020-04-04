// TODO:

import { PikaKeyboard } from './offline_version_js/keyboard.js';
import { PikaUserInput } from './offline_version_js/physics.js';
import { sendToPeer } from './data_channel.js';
import { mod, isInModRange } from './mod.js';

export class MyKeyboard {
  /**
   * Create a keyboard used for game controller
   * left, right, up, down, powerHit: KeyboardEvent.code value for each
   * Refer {@link https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values}
   * @param {string} left KeyboardEvent.code value of the key to use for left
   * @param {string} right KeyboardEvent.code value of the key to use for right
   * @param {string} up KeyboardEvent.code value of the key to use for up
   * @param {string} down KeyboardEvent.code value of the key to use for down
   * @param {string} powerHit KeyboardEvent.code value of the key to use for power hit or selection
   * @param {string} left2 KeyboardEvent.code value of the key to use for left
   * @param {string} right2 KeyboardEvent.code value of the key to use for right
   * @param {string} up2 KeyboardEvent.code value of the key to use for up
   * @param {string} down2 KeyboardEvent.code value of the key to use for down
   * @param {string} powerHit2 KeyboardEvent.code value of the key to use for power hit or selection
   */
  constructor(
    left,
    right,
    up,
    down,
    powerHit,
    left2,
    right2,
    up2,
    down2,
    powerHit2
  ) {
    this.keyboard1 = new PikaKeyboard(left, right, up, down, powerHit);
    this.keyboard2 = new PikaKeyboard(left2, right2, up2, down2, powerHit2);
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

  subscribe() {
    this.keyboard1.subscribe();
    this.keyboard2.subscribe();
  }

  unsubscribe() {
    this.keyboard1.unsubscribe();
    this.keyboard2.unsubscribe();
  }

  /**
   *
   *
   */
  getInputIfNeededAndSendToPeer() {
    if (
      this.inputQueue.length === 0 ||
      isInModRange(
        this.syncCounter,
        this.inputQueue[0].syncCounter,
        this.inputQueue[0].syncCounter + 10,
        256
      )
    ) {
      this.keyboard1.getInput();
      this.keyboard2.getInput();
      const xDirection =
        this.keyboard1.xDirection !== 0
          ? this.keyboard1.xDirection
          : this.keyboard2.xDirection;
      const yDirection =
        this.keyboard1.yDirection !== 0
          ? this.keyboard1.yDirection
          : this.keyboard2.yDirection;
      const powerHit =
        this.keyboard1.powerHit !== 0
          ? this.keyboard1.powerHit
          : this.keyboard2.powerHit;
      const userInputWithSync = new PikaUserInputWithSync(
        this.syncCounter,
        xDirection,
        yDirection,
        powerHit
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
    // Keep the previous input at the head of queue so that
    // the previous input can be resended if lost.
    let input;
    if (this.inputQueue[0].syncCounter === syncCounter) {
      input = this.inputQueue[0];
    } else if (
      this.inputQueue.length > 1 &&
      this.inputQueue[1].syncCounter === syncCounter
    ) {
      input = this.inputQueue[1];
      this.inputQueue.shift();
    } else {
      return false;
    }
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
