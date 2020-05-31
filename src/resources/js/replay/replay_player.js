'use strict';
import * as PIXI from 'pixi.js-legacy';
import 'pixi-sound';
import { ASSETS_PATH } from '../offline_version_js/assets_path.js';
import { PikachuVolleyballReplay } from './pikavolley_replay.js';
import { setGetSpeechBubbleNeeded, hideChat } from '../chat_display.js';
import {
  setMaxForScrubberRange,
  adjustPlayPauseBtnIcon,
  showTotalTimeDuration,
  showTimeCurrent,
  enableReplayScrubberAndBtns,
} from './ui_replay.js';

import '../../style.css';

export const ticker = new PIXI.Ticker();
ticker.minFPS = 1;
let renderer = null;
let stage = null;
let loader = null;
let pikaVolley = null;
let pack = null;
let playBackSpeedTimes = 1;
let playBackSpeedFPS = null;

class ReplayPlayer {
  readFile(filename) {
    const TEXTURES = ASSETS_PATH.TEXTURES;
    TEXTURES.WITH_COMPUTER = TEXTURES.WITH_FRIEND;

    const settings = PIXI.settings;
    settings.RESOLUTION = window.devicePixelRatio;
    settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    settings.ROUND_PIXELS = true;

    renderer = PIXI.autoDetectRenderer({
      width: 432,
      height: 304,
      antialias: false,
      backgroundColor: 0x000000,
      transparent: false,
    });
    stage = new PIXI.Container();
    loader = new PIXI.Loader();

    document.querySelector('#game-canvas-container').appendChild(renderer.view);

    renderer.render(stage); // To make the initial canvas painting stable in the Firefox browser.
    ticker.add(() => {
      // Redering and gameLoop order is the opposite of
      // the offline web version (refer: ./offline_version_js/main.js).
      // It's for the smooth rendering for the online version
      // which gameLoop can not always succeed right on this "ticker.add"ed code
      // because of the transfer delay or connection status. (If gameLoop here fails,
      // it is recovered by the callback gameLoop which is called after peer input received.)
      // Now the rendering is delayed 40ms (when pikaVolley.normalFPS == 25)
      // behind gameLoop.
      renderer.render(stage);
      showTimeCurrent(pikaVolley.timeCurrent);
      pikaVolley.gameLoop();
    });

    loader.add(ASSETS_PATH.SPRITE_SHEET);
    for (const prop in ASSETS_PATH.SOUNDS) {
      loader.add(ASSETS_PATH.SOUNDS[prop]);
    }
    setUpLoaderProgresBar();
    const reader = new FileReader();
    reader.onload = function (event) {
      // @ts-ignore
      pack = JSON.parse(event.target.result);
      showTotalTimeDuration(getTotalTimeDuration(pack));
      loader.load(() => {
        pikaVolley = new PikachuVolleyballReplay(
          stage,
          loader.resources,
          pack.roomID,
          pack.nicknames,
          pack.partialPublicIPs,
          pack.inputs,
          pack.options,
          pack.chats
        );
        // @ts-ignore
        setGetSpeechBubbleNeeded(pikaVolley);
        setMaxForScrubberRange(pack.inputs.length);
        setup(0);
        ticker.start();
        adjustPlayPauseBtnIcon();
        enableReplayScrubberAndBtns();
      });
    };
    reader.readAsText(filename);
  }
}

export const replayPlayer = new ReplayPlayer();

export function setup(startFrameNumber) {
  ticker.stop();

  // Cleanup previous pikaVolley
  hideChat();
  for (const prop in pikaVolley.audio.sounds) {
    pikaVolley.audio.sounds[prop].stop();
  }
  pikaVolley.initilizeForReplay();

  if (startFrameNumber > 0) {
    for (let i = 0; i < startFrameNumber; i++) {
      pikaVolley.gameLoopSilent();
    }
    renderer.render(stage);
  }
  showTimeCurrent(pikaVolley.timeCurrent);
}

export function stopBGM() {
  pikaVolley.audio.sounds.bgm.center.stop();
}

export function pauseBGM() {
  pikaVolley.audio.sounds.bgm.center.pause();
}

export function resumeBGM() {
  pikaVolley.audio.sounds.bgm.center.resume();
}

export function playBGMProperlyAfterScrubbbing() {
  if (pikaVolley.fakeAudio.sounds.bgm.playing) {
    pikaVolley.audio.sounds.bgm.center.play({ start: pikaVolley.timeBGM });
  }
}

/**
 *
 * @param {number} seconds
 */
export function seek(seconds) {
  const seekFrameCounter = Math.max(
    0,
    pikaVolley.replayFrameCounter + seconds * pikaVolley.normalFPS
  );
  setup(seekFrameCounter);
}

/**
 *
 * @param {number} times
 */
export function adjustPlaybackSpeedTimes(times) {
  playBackSpeedFPS = null;
  playBackSpeedTimes = times;
  ticker.maxFPS = pikaVolley.normalFPS * playBackSpeedTimes;
}

/**
 *
 * @param {number} fps
 */
export function adjustPlaybackSpeedFPS(fps) {
  playBackSpeedTimes = null;
  playBackSpeedFPS = fps;
  ticker.maxFPS = playBackSpeedFPS;
}

/**
 * Set ticker.maxFPS according to PikachuVolleyball object's normalFPS properly
 * @param {number} normalFPS
 */
export function setTickerMaxFPSAccordingToNormalFPS(normalFPS) {
  if (playBackSpeedFPS) {
    ticker.maxFPS = playBackSpeedFPS;
  } else if (playBackSpeedTimes) {
    ticker.maxFPS = normalFPS * playBackSpeedTimes;
  }
}

/**
 * Set up the loader progress bar.
 */
function setUpLoaderProgresBar() {
  const loadingBox = document.getElementById('loading-box');
  const progressBar = document.getElementById('progress-bar');

  loader.on('progress', () => {
    progressBar.style.width = `${loader.progress}%`;
  });
  loader.on('complete', () => {
    if (!loadingBox.classList.contains('hidden')) {
      loadingBox.classList.add('hidden');
    }
  });
}

function getTotalTimeDuration(pack) {
  const speedChangeRecord = [];

  let optionsCounter = 0;
  let options = pack.options[optionsCounter];
  while (options) {
    if (options[1].speed) {
      let fpsFromNowOn = null;
      switch (options[1].speed) {
        case 'slow':
          fpsFromNowOn = 20;
          break;
        case 'medium':
          fpsFromNowOn = 25;
          break;
        case 'fast':
          fpsFromNowOn = 30;
          break;
      }
      const frameCounter = options[0];
      speedChangeRecord.push([frameCounter, fpsFromNowOn]);
    }
    optionsCounter++;
    options = pack.options[optionsCounter];
  }

  let timeDuration = 0; // unit: second
  let currentFrameCounter = 0;
  let currentFPS = 25;
  for (let i = 0; i < speedChangeRecord.length; i++) {
    const futureFrameCounter = speedChangeRecord[i][0];
    const futureFPS = speedChangeRecord[i][1];
    timeDuration += (futureFrameCounter - currentFrameCounter) / currentFPS;
    currentFrameCounter = futureFrameCounter;
    currentFPS = futureFPS;
  }
  timeDuration += (pack.inputs.length - currentFrameCounter) / currentFPS;

  return timeDuration;
}
