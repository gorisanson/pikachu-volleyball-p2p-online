'use strict';
import * as PIXI from 'pixi.js';
import 'pixi-sound';
import { PikachuVolleyballOnline } from './pikavolley_online.js';
import { ASSETS_PATH } from './offline_version_js/assets_path.js';
import { channel } from './data_channel.js';
import { setUpUI } from './ui_online.js';
import '../style.css';

const TEXTURES = ASSETS_PATH.TEXTURES;
TEXTURES.WITH_COMPUTER = TEXTURES.WITH_FRIEND;

const settings = PIXI.settings;
settings.RESOLUTION = window.devicePixelRatio;
settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
settings.ROUND_PIXELS = true;

const renderer = PIXI.autoDetectRenderer({
  width: 432,
  height: 304,
  antialias: false,
  backgroundColor: 0x000000,
  transparent: false,
});
const stage = new PIXI.Container();
const ticker = new PIXI.Ticker();
const loader = new PIXI.Loader();

document.querySelector('#game-canvas-container').appendChild(renderer.view);

renderer.render(stage); // To make the initial canvas painting stable in the Firefox browser.
loader.add(ASSETS_PATH.SPRITE_SHEET);
for (const prop in ASSETS_PATH.SOUNDS) {
  loader.add(ASSETS_PATH.SOUNDS[prop]);
}
setUpLoaderProgresBar();
channel.callbackAfterDataChannelOpened = () => {
  loader.load(setup);
};

setUpUI();

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

function setup() {
  const pikaVolley = new PikachuVolleyballOnline(stage, loader.resources);
  start(pikaVolley);
}

function start(pikaVolley) {
  ticker.maxFPS = pikaVolley.normalFPS;
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
    pikaVolley.gameLoop();
  });
  ticker.start();
}
