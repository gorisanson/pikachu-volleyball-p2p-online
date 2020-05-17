import { saveAs } from 'file-saver';

class ReplaySaver {
  constructor() {
    this.frameCounter = 0;
    this.roomID = null; // used for set RNGs
    this.inputs = []; // [[xDirection, yDirection, powerHit], [xDirection, yDirection, powerHit]][], left side is for player 1.
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
   * Record a chat message
   * @param {string} chatMessage
   * @param {boolean} isOfPlayer2 is the chat message of player 2
   */
  recordChats(chatMessage, isOfPlayer2) {
    const playerIndex = isOfPlayer2 ? 2 : 1;
    this.chats.push([this.frameCounter, playerIndex, chatMessage]);
  }

  saveAsFile() {
    const pack = {
      roomID: this.roomID,
      inputs: this.inputs,
      chats: this.chats,
    };
    const blob = new Blob([JSON.stringify(pack)], {
      type: 'text/plain;charset=utf-8',
    });
    saveAs(blob, 'replay.txt', { autoBom: true });
  }
}

export const replaySaver = new ReplaySaver();
