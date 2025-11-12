import { convertUserInputTo5bitNumber } from '../utils/input_conversion.js';
import { relayChannel } from './relay_channel.js';

/** @typedef {import('../offline_version_js/physics.js').PikaUserInput} PikaUserInput */
/** @typedef {{speed: string, winningScore: number}} Options options communicated with the peer */

/**
 * Class representing replay saver
 */
class ReplaySaver {
  constructor() {
    this.frameCounter = 0;
    this.roomID = null; // used for set RNGs
    this.nicknames = ['', '']; // [0]: room creator's nickname, [1]: room joiner's nickname
    this.partialPublicIPs = ['*.*.*.*', '*.*.*.*']; // [0]: room creator's partial public IP address, [1]: room joiner's partial public IP address
    this.inputs = []; // number[], the number in the array represents player1, player2 input
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
    const usersInputNumber =
      (convertUserInputTo5bitNumber(player1Input) << 5) +
      convertUserInputTo5bitNumber(player2Input);
    relayChannel.send({
      type: "inputs",
      value: usersInputNumber
    });
  }

  /**
   * Record game options
   * @param {Options} usersInputOption
   */
  recordOptions(usersInputOption) {
    //this.options.push([this.frameCounter, options]);
    relayChannel.send({
      type: "options",
      options: usersInputOption
    });
  }

  /**
   * Record a chat message
   * @param {string} Message
   * @param {number} PlayerSide 1 or 2
   */
  recordChats(Message, PlayerSide) {
    //this.chats.push([this.frameCounter, whichPlayerSide, chatMessage]);
    relayChannel.send({
      type: "chat",
      whichPlayerSide: PlayerSide,
      chatMessage: Message
    });
  }

  /**
   * Save as a file
   */
  saveAsFile() {
  }
}

export const InputSaverForSpectator = new ReplaySaver();
