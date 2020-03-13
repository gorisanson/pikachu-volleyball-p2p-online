// TODO:

import { PikaKeyboard } from './pika_keyboard';
import { channel } from './data_channel.js';

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
    this.roundCounter = -1;
  }

  /**
   * should do nothing since it is called offline round function
   */
  updateProperties() {}

  /**
   *
   * @param {number} roundCounter
   */
  updatePropertiesAndSendToPeer(roundCounter) {
    if (roundCounter > this.roundCounter) {
      this.roundCounter = roundCounter;
      super.updateProperties();
    }
    channel.sendToPeer(
      roundCounter,
      this.xDirection,
      this.yDirection,
      this.powerHit
    );
  }

  updatePrevProperties() {
    this.xDirectionPrev = this.xDirection;
    this.yDirectionPrev = this.yDirection;
    this.powerHitPrev = this.powerHit;
  }

  resendPrevProperties(roundCounterPrev) {
    channel.sendToPeer(
      roundCounterPrev,
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
   * should do nothing since it is called offline round function
   */
  updateProperties() {}

  /**
   * @return {boolean} update properties succeeded?
   */
  updatePropertiesFromPeerInput(roundCounter) {
    const peerInputQueue = channel.peerInputQueue;
    if (peerInputQueue.length === 0) {
      return false;
    }
    let input;
    while (true) {
      input = peerInputQueue.shift();
      const peerRoundCounterModulo = input[0];
      if (peerRoundCounterModulo === roundCounter % 255) {
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
