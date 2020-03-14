'ues strics';
import { PikachuVolleyball } from './pikavolley.js';
import { MyKeyboard, PeerKeyboard } from './pika_keyboard_online.js';
import { channel } from './data_channel';

/** @typedef GameState @type {function():void} */

export class PikachuVolleyballOnline extends PikachuVolleyball {
  constructor(stage, resources) {
    super(stage, resources);

    this.myKeyboard = new MyKeyboard( // for player2
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Enter'
    );
    this.peerKeyboard = new PeerKeyboard();

    this.amIPlayer2 = false;
    this.roundCounter = 0;
    this.noInputFrameTotal.menu = 0;
    this.noInputFrameTotal = {
      menu: Infinity
    };
  }

  /**
   * Round: the players play volleyball in this game state
   * @type {GameState}
   */
  round() {
    this.myKeyboard.updatePropertiesAndSendToPeer(this.roundCounter);
    // @ts-ignore
    const succeed = this.peerKeyboard.updatePropertiesFromPeerInput(
      this.roundCounter
    );
    if (!succeed) {
      this.myKeyboard.resendPrevProperties(this.roundCounter - 1);
      channel.callbackWhenReceivePeerInput = this.round.bind(this);
      return;
    }
    this.myKeyboard.updatePrevProperties();
    if (this.amIPlayer2) {
      // @ts-ignore
      this.keyboardArray = [this.peerKeyboard, this.myKeyboard];
    } else {
      // @ts-ignore
      this.keyboardArray = [this.myKeyboard, this.peerKeyboard];
    }
    this.physics.player1.isComputer = false;
    this.physics.player2.isComputer = false;
    super.round();
    this.roundCounter++;
  }
}
