'use strict';
import { settings } from '@pixi/settings';
import { SCALE_MODES } from '@pixi/constants';
import { Renderer, BatchRenderer, autoDetectRenderer } from '@pixi/core';
import { Prepare } from '@pixi/prepare';
import { Container } from '@pixi/display';
import { Loader } from '@pixi/loaders';
import { SpritesheetLoader } from '@pixi/spritesheet';
import { Ticker } from '@pixi/ticker';
import { CanvasRenderer } from '@pixi/canvas-renderer';
import { CanvasSpriteRenderer } from '@pixi/canvas-sprite';
import { CanvasPrepare } from '@pixi/canvas-prepare';
import '@pixi/canvas-display';
import { ASSETS_PATH } from '../offline_version_js/assets_path.js';
import { PikachuVolleyballReplay } from './pikavolley_spectate.js'; 
import { setGetSpeechBubbleNeeded, hideChat } from '../chat_display.js';

import {
  setMaxForScrubberRange,
  adjustPlayPauseBtnIcon,
  showTotalTimeDuration,
  showTimeCurrent,
  enableReplayScrubberAndBtns,
  hideNoticeEndOfSpectation,
  adjustFPSInputValue,
  moveScrubberTo,
} from './ui_spectate.js'; 
import '../../style.css';

const SERVER_URL = "wss://pikavolley-relay-server.onrender.com";

class SpectatorPlayer { // ReplayPlayer -> SpectatorPlayer
  constructor() {
    Renderer.registerPlugin('prepare', Prepare);
    Renderer.registerPlugin('batch', BatchRenderer);
    CanvasRenderer.registerPlugin('prepare', CanvasPrepare);
    CanvasRenderer.registerPlugin('sprite', CanvasSpriteRenderer);
    Loader.registerPlugin(SpritesheetLoader);
    settings.RESOLUTION = 2;
    settings.SCALE_MODE = SCALE_MODES.NEAREST;
    settings.ROUND_PIXELS = true;

    this.ticker = new Ticker();
    this.ticker.minFPS = 1;
    this.renderer = autoDetectRenderer({
      width: 432,
      height: 304,
      antialias: false,
      backgroundColor: 0x000000,
      backgroundAlpha: 1,
      forceCanvas: true,
    });
    this.stage = new Container();
    this.loader = new Loader();
    this.pikaVolley = null;
    this.playBackSpeedTimes = 1;
    this.playBackSpeedFPS = null;
    this.ws = null; // WebSocket
  }
  
  startSpectating(roomId) {
    if (this.ws) { 
      return;
    }    
    const connectUrl = `${SERVER_URL}/${roomId}`;
    this.ws = new WebSocket(connectUrl);

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: "watch" }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "replay_pack") {
          this.initialize(data.pack); 
        } else if (data.type === "live_input") {
          this.pushInput(data.value);
        } else if (data.type === "live_options") {
          this.pushOptions(data.value);
        } else if (data.type === "live_chat") {
          this.pushChat(data.value);
        }
      } catch (e) {
        console.error("Failed to parse server message:", e);
      }
    };
    
    this.ws.onclose = () => { 
      console.log("WebSocket connection ended");
    };
    this.ws.onerror = (err) => { 
      console.error("WebSocket error:", err);
    };
  }

  initialize(pack) {
    document.querySelector('#game-canvas-container').appendChild(this.renderer.view);
    this.renderer.render(this.stage);
    
    this.ticker.add(() => {
      this.renderer.render(this.stage);
      if (!this.pikaVolley) return;
      showTimeCurrent(this.pikaVolley.timeCurrent);
      showTotalTimeDuration(this.pikaVolley.timeCurrent);
      moveScrubberTo(this.pikaVolley.replayFrameCounter);
      this.pikaVolley.gameLoop();
    });

    this.loader.add(ASSETS_PATH.SPRITE_SHEET);
    for (const prop in ASSETS_PATH.SOUNDS) {
      this.loader.add(ASSETS_PATH.SOUNDS[prop]);
    }

    this.loader.load(() => {
        this.pikaVolley = new PikachuVolleyballReplay(
          this.stage,
          this.loader.resources,
          pack.roomID,
          pack.nicknames,
          pack.partialPublicIPs,
          pack.inputs,
          pack.options,
          pack.chats
        );
        //@ts-ignore
        setGetSpeechBubbleNeeded(this.pikaVolley);
        
        this.seekFrame(pack.inputs.length); 
        setMaxForScrubberRange(pack.inputs.length);

        this.ticker.maxFPS = this.pikaVolley.normalFPS;

        this.ticker.start();
        adjustPlayPauseBtnIcon();
        enableReplayScrubberAndBtns();

        const loadingUI = document.getElementById('spectator-loading');
        if (loadingUI) {
          loadingUI.style.display = 'none';
        }
        const controlsUI = document.getElementById('replay-controls');
        if (controlsUI) {
          controlsUI.style.display = 'block';
        }
    });
  }
  
  pushInput(usersInputNumber) {
    if (!this.pikaVolley) { 
      return; 
    }
    this.pikaVolley.inputs.push(usersInputNumber);
    setMaxForScrubberRange(this.pikaVolley.inputs.length);
  }

  pushOptions(optionsData) {
    if (!this.pikaVolley) { 
      return; 
    }
    this.pikaVolley.options.push(optionsData); 
  }

  pushChat(chatData) {
    if (!this.pikaVolley) { 
      return; 
    }
    this.pikaVolley.chats.push(chatData); 
  }

  /**
   * Seek the specific frame
   * @param {number} frameNumber
   */
  seekFrame(frameNumber) {
    hideChat();
    hideNoticeEndOfSpectation();
    this.ticker.stop();

    // Cleanup previous pikaVolley
    if (this.pikaVolley) {
      this.pikaVolley.initializeForReplay();
    } else {
      return;
    }

    if (frameNumber > 0) {
      for (let i = 0; i < frameNumber; i++) {
        if (i < this.pikaVolley.inputs.length) {
          this.pikaVolley.gameLoopSilent();
        }
      }
      this.renderer.render(this.stage);
    }
    showTimeCurrent(this.pikaVolley.timeCurrent);
  }

  /**
   * Seek forward/backward the relative time (seconds).
   * @param {number} seconds
   */
  seekRelativeTime(seconds) {
    if (!this.pikaVolley) {
      return;
    }
    const seekFrameCounter = Math.max(
      0,
      this.pikaVolley.replayFrameCounter + seconds * this.pikaVolley.normalFPS
    );
    this.seekFrame(seekFrameCounter);
  }

  /**
   * Adjust playback speed by times
   * @param {number} times
   */
  adjustPlaybackSpeedTimes(times) {
    if (!this.pikaVolley) {
      return;
    }
    this.playBackSpeedFPS = null;
    this.playBackSpeedTimes = times;
    this.ticker.maxFPS = this.pikaVolley.normalFPS * this.playBackSpeedTimes;
    adjustFPSInputValue();
  }

  /**
   * Adjust playback speed by fps
   * @param {number} fps
   */
  adjustPlaybackSpeedFPS(fps) {
    this.playBackSpeedTimes = null;
    this.playBackSpeedFPS = fps;
    this.ticker.maxFPS = this.playBackSpeedFPS;
    adjustFPSInputValue();
  }

  stopBGM() {
    if (this.pikaVolley) {
      this.pikaVolley.audio.sounds.bgm.center.stop();
    }
  }

  playBGMProperly() {
    if (!this.pikaVolley) {
      return;
    }
    if (this.pikaVolley.isBGMPlaying) {
      this.pikaVolley.audio.sounds.bgm.center.play({
        start: this.pikaVolley.timeBGM,
      });
    }
  }
}

export const spectatorPlayer = new SpectatorPlayer();

/**
 * Set ticker.maxFPS according to PikachuVolleyball object's normalFPS properly
 * @param {number} normalFPS
 */
export function setTickerMaxFPSAccordingToNormalFPS(normalFPS) {
  if (spectatorPlayer.playBackSpeedFPS) {
    spectatorPlayer.ticker.maxFPS = spectatorPlayer.playBackSpeedFPS;
  } else if (spectatorPlayer.playBackSpeedTimes) {
    spectatorPlayer.ticker.maxFPS = normalFPS * spectatorPlayer.playBackSpeedTimes;
  } else {
    spectatorPlayer.ticker.maxFPS = normalFPS;
  }
  adjustFPSInputValue();
}