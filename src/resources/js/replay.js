import { saveAs } from 'file-saver';

/** @typedef {{speed: string, winningScore: number}} Options options communicated with the peer */

class ReplaySaver {
  constructor() {
    this.frameCounter = 0;
    this.roomID = null; // used for set RNGs
    this.inputs = []; // [[xDirection, yDirection, powerHit], [xDirection, yDirection, powerHit]][], left side is for player 1.
    this.options = [];
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
      inputs: this.inputs,
      chats: this.chats,
    };
    const blob = new Blob([JSON.stringify(pack)], {
      type: 'text/plain;charset=utf-8',
    });
    saveAs(blob, 'replay.txt', { autoBom: true });
  }
}

class ReplayReader {
  constructor() {
    this.frameCounter = 0;
    this.roomID = null;
    this.inputs = null;
    this.options = null;
    this.chats = null;
  }

  readFile(filename) {
    var reader = new FileReader();
    reader.onload = function (event) {
      console.log(event.target.result);
    };
    reader.readAsText(filename);
  }
}

export const replaySaver = new ReplaySaver();
export const replayReader = new ReplayReader();
