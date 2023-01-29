import seedrandom from 'seedrandom';
import { PikachuVolleyball } from '../offline_version_js/pikavolley.js';
import { setCustomRng } from '../offline_version_js/rand.js';
import { setChatRngs, displayChatMessageAt } from '../chat_display.js';
import {
  displayNicknameFor,
  displayPartialIPFor,
} from '../nickname_display.js';
import { Cloud, Wave } from '../offline_version_js/cloud_and_wave.js';
import { PikaPhysics } from '../offline_version_js/physics.js';
import { convert5bitNumberToUserInput } from '../utils/input_conversion.js';
import {
  noticeEndOfReplay,
  moveScrubberTo,
  showKeyboardInputs,
} from './ui_replay.js';
import { setTickerMaxFPSAccordingToNormalFPS } from './replay_player.js';

/** @typedef GameState @type {function():void} */

/**
 * Class representing Pikachu Volleyball Replay
 */
// @ts-ignore
export class PikachuVolleyballReplay extends PikachuVolleyball {
  constructor(
    stage,
    resources,
    roomId,
    nicknames,
    partialPublicIPs,
    inputs,
    options,
    chats
  ) {
    super(stage, resources);
    this.noInputFrameTotal.menu = Infinity;

    this.roomId = roomId;
    this.nicknames = nicknames;
    this.partialPublicIPs = partialPublicIPs;
    this.inputs = inputs;
    this.options = options;
    this.chats = chats;
    this.player1Keyboard = {
      xDirection: 0,
      yDirection: 0,
      powerHit: 0,
      getInput: () => {},
    };
    this.player2Keyboard = {
      xDirection: 0,
      yDirection: 0,
      powerHit: 0,
      getInput: () => {},
    };
    this.keyboardArray = [this.player1Keyboard, this.player2Keyboard];
    this.willDisplayChat = true;

    const fakeSound = {
      play: () => {},
      stop: () => {},
    };
    const fakeBGM = {
      fake: true,
      center: {
        isPlaying: false,
      },
      play: function () {
        this.center.isPlaying = true;
      },
      stop: function () {
        this.center.isPlaying = false;
      },
    };
    this.fakeAudio = {
      sounds: {
        bgm: fakeBGM,
        pipikachu: fakeSound,
        pika: fakeSound,
        chu: fakeSound,
        pi: fakeSound,
        pikachu: fakeSound,
        powerHit: fakeSound,
        ballTouchesGround: fakeSound,
      },
    };

    this.initializeForReplay();
  }

  /**
   * This is mainly for reinitialization for reusing the PikachuVolleyballReplay object
   */
  initializeForReplay() {
    // Stop if sounds are playing
    for (const prop in this.audio.sounds) {
      this.audio.sounds[prop].stop();
    }

    this.timeCurrent = 0; // unit: second
    this.timeBGM = 0;
    this.isBGMPlaying = false;
    this.replayFrameCounter = 0;
    this.chatCounter = 0;
    this.optionsCounter = 0;

    // Set the same RNG (used for the game) for both peers
    const customRng = seedrandom.alea(this.roomId.slice(10));
    setCustomRng(customRng);

    // Set the same RNG (used for displaying chat messages) for both peers
    const rngForPlayer1Chat = seedrandom.alea(this.roomId.slice(10, 15));
    const rngForPlayer2Chat = seedrandom.alea(this.roomId.slice(15));
    setChatRngs(rngForPlayer1Chat, rngForPlayer2Chat);

    // Reinitialize things which needs exact RNG
    this.view.game.cloudArray = [];
    const NUM_OF_CLOUDS = 10;
    for (let i = 0; i < NUM_OF_CLOUDS; i++) {
      this.view.game.cloudArray.push(new Cloud());
    }
    this.view.game.wave = new Wave();
    this.view.intro.visible = false;
    this.view.menu.visible = false;
    this.view.game.visible = false;
    this.view.fadeInOut.visible = false;

    this.physics = new PikaPhysics(true, true);

    this.normalFPS = 25;
    this.slowMotionFPS = 5;
    this.SLOW_MOTION_FRAMES_NUM = 6;
    this.slowMotionFramesLeft = 0;
    this.slowMotionNumOfSkippedFrames = 0;
    this.selectedWithWho = 0;
    this.scores = [0, 0];
    this.winningScore = 15;
    this.gameEnded = false;
    this.roundEnded = false;
    this.isPlayer2Serve = false;
    this.frameCounter = 0;
    this.noInputFrameCounter = 0;

    this.paused = false;
    this.isStereoSound = true;
    this._isPracticeMode = false;
    this.isRoomCreatorPlayer2 = false;
    this.state = this.intro;
  }

  /**
   * Override the "intro" method in the super class.
   * It is to ask for one more game with the peer after quick match game ends.
   * @type {GameState}
   */
  intro() {
    if (this.frameCounter === 0) {
      this.selectedWithWho = 0;
      if (this.nicknames) {
        displayNicknameFor(this.nicknames[0], this.isRoomCreatorPlayer2);
        displayNicknameFor(this.nicknames[1], !this.isRoomCreatorPlayer2);
      }
      if (this.partialPublicIPs) {
        displayPartialIPFor(
          this.partialPublicIPs[0],
          this.isRoomCreatorPlayer2
        );
        displayPartialIPFor(
          this.partialPublicIPs[1],
          !this.isRoomCreatorPlayer2
        );
      }
    }
    super.intro();
  }

  /**
   * Override the "menu" method in the super class.
   * It changes "am I player 1 or player 2" setting accordingly.
   * @type {GameState}
   */
  menu() {
    const selectedWithWho = this.selectedWithWho;
    super.menu();
    if (this.selectedWithWho !== selectedWithWho) {
      this.isRoomCreatorPlayer2 = !this.isRoomCreatorPlayer2;
      if (this.nicknames) {
        displayNicknameFor(this.nicknames[0], this.isRoomCreatorPlayer2);
        displayNicknameFor(this.nicknames[1], !this.isRoomCreatorPlayer2);
      }
      if (this.partialPublicIPs) {
        displayPartialIPFor(
          this.partialPublicIPs[0],
          this.isRoomCreatorPlayer2
        );
        displayPartialIPFor(
          this.partialPublicIPs[1],
          !this.isRoomCreatorPlayer2
        );
      }
    }
  }

  /**
   * Game loop which play no sound, display no chat, does not move scrubber
   */
  gameLoopSilent() {
    const audio = this.audio;
    this.willDisplayChat = false;
    // @ts-ignore
    this.audio = this.fakeAudio;
    this.gameLoop();
    this.willDisplayChat = true;
    this.audio = audio;
  }

  /**
   * Game loop
   * This function should be called at regular intervals ( interval = (1 / FPS) second )
   */
  gameLoop() {
    if (this.replayFrameCounter >= this.inputs.length) {
      noticeEndOfReplay();
      return;
    }

    moveScrubberTo(this.replayFrameCounter);

    const usersInputNumber = this.inputs[this.replayFrameCounter];
    const player1Input = convert5bitNumberToUserInput(usersInputNumber >>> 5);
    const player2Input = convert5bitNumberToUserInput(
      usersInputNumber % (1 << 5)
    );
    this.player1Keyboard.xDirection = player1Input.xDirection;
    this.player1Keyboard.yDirection = player1Input.yDirection;
    this.player1Keyboard.powerHit = player1Input.powerHit;
    this.player2Keyboard.xDirection = player2Input.xDirection;
    this.player2Keyboard.yDirection = player2Input.yDirection;
    this.player2Keyboard.powerHit = player2Input.powerHit;
    showKeyboardInputs(player1Input, player2Input);

    let options = this.options[this.optionsCounter];
    while (options && options[0] === this.replayFrameCounter) {
      if (options[1].speed) {
        switch (options[1].speed) {
          case 'slow':
            this.normalFPS = 20;
            break;
          case 'medium':
            this.normalFPS = 25;
            break;
          case 'fast':
            this.normalFPS = 30;
            break;
        }
        setTickerMaxFPSAccordingToNormalFPS(this.normalFPS);
      }
      if (options[1].winningScore) {
        switch (options[1].winningScore) {
          case 5:
            this.winningScore = 5;
            break;
          case 10:
            this.winningScore = 10;
            break;
          case 15:
            this.winningScore = 15;
            break;
        }
      }
      this.optionsCounter++;
      options = this.options[this.optionsCounter];
    }
    this.timeCurrent += 1 / this.normalFPS;

    this.isBGMPlaying = this.audio.sounds.bgm.center.isPlaying;
    if (this.isBGMPlaying) {
      this.timeBGM = (this.timeBGM + 1 / this.normalFPS) % 83; // 83 is total duration of bgm
    } else {
      this.timeBGM = 0;
    }

    let chat = this.chats[this.chatCounter];
    while (chat && chat[0] === this.replayFrameCounter) {
      if (this.willDisplayChat) {
        displayChatMessageAt(chat[2], chat[1]);
      }
      this.chatCounter++;
      chat = this.chats[this.chatCounter];
    }

    this.replayFrameCounter++;
    this.physics.player1.isComputer = false;
    this.physics.player2.isComputer = false;
    super.gameLoop();
  }
}
