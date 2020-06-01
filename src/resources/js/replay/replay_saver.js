import { saveAs } from 'file-saver';
import { serialize } from './serialize.js';
import { getHashCode } from './hash_code.js';
import { convertUserInputTo5bitNumber } from '../input_conversion.js';

/** @typedef {import('../offline_version_js/physics.js').PikaUserInput} PikaUserInput */
/** @typedef {{speed: string, winningScore: number}} Options options communicated with the peer */

/**
 * Classs representing replay saver
 */
class ReplaySaver {
  constructor() {
    this.frameCounter = 0;
    this.roomID = null; // used for set RNGs
    this.nicknames = ['', '']; // [0]: room creator's nickname, [1]: room joiner's nickname
    this.partialPublicIPs = ['*.*.*.*', '*.*.*.*']; // [0]: room creator's partial public IP address, [1]: room joiner's partial public IP address
    this.inputs = []; // [player1Input5bitNumber, player2Input5bitNumber][]
    this.options = []; // [frameCounter, options][];
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
   * Record nicknames
   * @param {string} roomCreatorNickname
   * @param {string} roomJoinerNickname
   */
  recordNicknames(roomCreatorNickname, roomJoinerNickname) {
    this.nicknames[0] = roomCreatorNickname;
    this.nicknames[1] = roomJoinerNickname;
  }

  /**
   * Record partial public ips
   * @param {string} roomCreatorPartialPublicIP
   * @param {string} roomJoinerPartialPublicIP
   */
  recordPartialPublicIPs(
    roomCreatorPartialPublicIP,
    roomJoinerPartialPublicIP
  ) {
    this.partialPublicIPs[0] = roomCreatorPartialPublicIP;
    this.partialPublicIPs[1] = roomJoinerPartialPublicIP;
  }

  /**
   * Record user inputs
   * @param {PikaUserInput} player1Input
   * @param {PikaUserInput} player2Input
   */
  recordInputs(player1Input, player2Input) {
    this.inputs.push([
      convertUserInputTo5bitNumber(player1Input),
      convertUserInputTo5bitNumber(player2Input),
    ]);
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

  /**
   * Save as a file
   */
  saveAsFile() {
    const pack = {
      roomID: this.roomID,
      nicknames: this.nicknames,
      partialPublicIPs: this.partialPublicIPs,
      chats: this.chats,
      options: this.options,
      inputs: this.inputs,
      hash: 0,
    };

    // This is for making it annoying to modify/fabricate the replay file.
    // I'm worried about fabricating the replay file and distributing it even if it is unlikely.
    // I doubt about the effect of inserting a hash code. But It would be better than doing nothing.
    const hash = getHashCode(serialize(pack));
    pack.hash = hash;

    const packWithComment = {
      _comment:
        'You can play this replay file at: https://gorisanson.github.io/pikachu-volleyball-p2p-online/en/replay/',
      pack: pack,
    };

    const blob = new Blob([JSON.stringify(packWithComment)], {
      type: 'text/plain;charset=utf-8',
    });
    const d = new Date();
    // The code removing illegal characters in Windows by replace method is from:
    // https://stackoverflow.com/a/42210346/8581025
    const filename = `${d.getFullYear()}${('0' + d.getMonth()).slice(-2)}${(
      '0' + d.getDate()
    ).slice(-2)}_${this.nicknames[0]}_${this.partialPublicIPs[0].replace(
      '.*.*',
      ''
    )}_vs_${this.nicknames[1]}_${this.partialPublicIPs[1].replace(
      '.*.*',
      ''
    )}.txt`.replace(/[/\\?%*:|"<>]/g, '_');
    saveAs(blob, filename, { autoBom: true });
  }
}

export const replaySaver = new ReplaySaver();
