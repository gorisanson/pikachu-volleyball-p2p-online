/**
 * This module takes charge of the online user input via keyboard
 *
 * The user inputs (inputQueue) are transmitted between peers.
 */
'use strict';
import { PikaKeyboard } from './offline_version_js/keyboard.js';
import { PikaUserInput } from './offline_version_js/physics.js';
import {
  channel,
  SYNC_DIVISOR,
  sendInputQueueToPeer,
} from './data_channel/data_channel.js';
import { mod, isInModRange } from './utils/mod.js';

/** @constant @type {number} communicated input queue buffer length */
export const bufferLength = 8;

/**
 * Class respresenting modified version of PikaKeyboard Class
 */
class PikaKeyboardModified extends PikaKeyboard {
  /**
   * Override the method in the superclass
   */
  getInput() {
    if (this.leftKey.isDown) {
      this.xDirection = -1;
    } else if (
      this.rightKey.isDown ||
      (!channel.amIPlayer2 && this.downRightKey && this.downRightKey.isDown) // this.downRightKey works as right key only for player 1
    ) {
      this.xDirection = 1;
    } else {
      this.xDirection = 0;
    }

    if (this.upKey.isDown) {
      this.yDirection = -1;
    } else if (
      this.downKey.isDown ||
      (this.downRightKey && this.downRightKey.isDown)
    ) {
      this.yDirection = 1;
    } else {
      this.yDirection = 0;
    }

    const isDown = this.powerHitKey.isDown;
    if (!this.powerHitKeyIsDownPrevious && isDown) {
      this.powerHit = 1;
    } else {
      this.powerHit = 0;
    }
    this.powerHitKeyIsDownPrevious = isDown;
  }
}

/**
 * Class representing my keyboard used for game controller.
 * User chooses a comfortable side, so it contains both sides
 * (player 1 side in offline version, player 2 side in offline version).
 */
class MyKeyboard {
  /**
   * Create a keyboard used for game controller
   * left, right, up, down, powerHit: KeyboardEvent.code value for each
   * Refer {@link https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values}
   * @param {string} left KeyboardEvent.code value of the key to use for left
   * @param {string} right KeyboardEvent.code value of the key to use for right
   * @param {string} up KeyboardEvent.code value of the key to use for up
   * @param {string} down KeyboardEvent.code value of the key to use for down
   * @param {string} powerHit KeyboardEvent.code value of the key to use for power hit or selection
   * @param {string} downRight KeyboardEvent.code value of the key to use for having the same effect
   *                          when pressing down key and right key at the same time (Only player 1
   *                          has this key)
   * @param {string} left2 KeyboardEvent.code value of the key to use for left
   * @param {string} right2 KeyboardEvent.code value of the key to use for right
   * @param {string} up2 KeyboardEvent.code value of the key to use for up
   * @param {string} down2 KeyboardEvent.code value of the key to use for down
   * @param {string} powerHit2 KeyboardEvent.code value of the key to use for power hit or selection
   * @param {string} downRight2 KeyboardEvent.code value of the key to use for having the same effect
   *                           when pressing down key and right key at the same time (Only player 1
   *                           has this key)
   */
  constructor(
    left,
    right,
    up,
    down,
    powerHit,
    downRight,
    left2,
    right2,
    up2,
    down2,
    powerHit2,
    downRight2
  ) {
    this.keyboard1 = new PikaKeyboardModified(
      left,
      right,
      up,
      down,
      powerHit,
      downRight
    );
    this.keyboard2 = new PikaKeyboardModified(
      left2,
      right2,
      up2,
      down2,
      powerHit2,
      downRight2
    );
    this._syncCounter = 0;
    /** @type {PikaUserInputWithSync[]} */
    this.inputQueue = [];
  }

  get syncCounter() {
    return this._syncCounter;
  }

  set syncCounter(counter) {
    this._syncCounter = mod(counter, SYNC_DIVISOR);
  }

  /**
   * Subscribe keydown, keyup event listners for the keys of this keyboard
   */
  subscribe() {
    this.keyboard1.subscribe();
    this.keyboard2.subscribe();
  }

  /**
   * Unsubscribe keydown, keyup event listners for the keys of this keyboard
   */
  unsubscribe() {
    this.keyboard1.unsubscribe();
    this.keyboard2.unsubscribe();
  }

  /**
   * Get user input if needed (judged by the syncCounter),
   * then push it to the input queue and send the input queue to peer.
   * @param {number} syncCounter
   */
  getInputIfNeededAndSendToPeer(syncCounter) {
    if (
      this.inputQueue.length === 0 ||
      isInModRange(
        this.syncCounter,
        syncCounter,
        syncCounter + bufferLength - 1,
        SYNC_DIVISOR
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
    sendInputQueueToPeer(this.inputQueue);
  }
}

/** This Mykeybord instance is used among the modules */
export const myKeyboard = new MyKeyboard(
  'KeyD',
  'KeyG',
  'KeyR',
  'KeyV',
  'KeyZ',
  'KeyF',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Enter',
  'ArrowDown'
);

/**
 * Class representing the online keyboard which gets input from input queue
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
    this.isHistoryBufferFilled = false;
  }

  /**
   * Check whether an input which corrsponds syncConter is on inputQueue
   * @param {number} syncCounter
   * @return {boolean} get input from peer succeed?
   */
  isInputOnQueue(syncCounter) {
    if (this.inputQueue.length === 0) {
      return false;
    }
    if (this.isHistoryBufferFilled) {
      if (this.inputQueue.length > bufferLength) {
        if (this.inputQueue[bufferLength].syncCounter !== syncCounter) {
          console.log('Something in OnlineKeyboard is wrong...');
          return false;
        }
        return true;
      }
      return false;
    } else {
      for (let i = 0; i < this.inputQueue.length; i++) {
        if (this.inputQueue[i].syncCounter === syncCounter) {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * It should be called after checking the isInputOnQueue return value
   * is true. The input gotten by this method should be used, not discarded,
   * since this method does this.inputQueue.shift if it is needed.
   * @param {number} syncCounter
   */
  getInput(syncCounter) {
    if (this.inputQueue.length === 0) {
      console.log('Something in getInput method is wrong...0');
      return;
    }
    // Keep the history buffers (previous inputs) at the head of queue so that
    // the history buffers can be resended if lost.
    // The future buffers (now and upcomming inputs) and the history buffers
    // should have same length (bufferLength) to keep the sync connection.
    // So the maximum length of this.inputQueue is (2 * bufferLength).
    let input = null;
    if (this.isHistoryBufferFilled) {
      if (this.inputQueue.length > bufferLength) {
        input = this.inputQueue[bufferLength];
        if (input.syncCounter !== syncCounter) {
          console.log('Something in getInput method is wrong...1');
          return;
        }
        this.inputQueue.shift();
      } else {
        console.log('Something in getInput method is wrong...2');
        return;
      }
    } else {
      for (let i = 0; i < this.inputQueue.length; i++) {
        if (this.inputQueue[i].syncCounter === syncCounter) {
          input = this.inputQueue[i];
          if (i === bufferLength) {
            this.isHistoryBufferFilled = true;
            this.inputQueue.shift();
          }
          break;
        }
      }
    }
    if (input === null) {
      console.log('Something in getInput method is wrong...3');
      return;
    }
    this.xDirection = input.xDirection;
    this.yDirection = input.yDirection;
    this.powerHit = input.powerHit;
  }
}

/**
 * Class reperesenting a user input with a corresponding sync counter
 */
export class PikaUserInputWithSync extends PikaUserInput {
  constructor(syncCounter, xDirection, yDirection, powerHit) {
    super();
    this.syncCounter = syncCounter;
    this.xDirection = xDirection;
    this.yDirection = yDirection;
    this.powerHit = powerHit;
  }
}
