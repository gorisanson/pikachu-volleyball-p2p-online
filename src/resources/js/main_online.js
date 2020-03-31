'use strict';
import * as PIXI from 'pixi.js';
import 'pixi-sound';
import { PikachuVolleyballOnline } from './pikavolley_online.js';
import { ASSETS_PATH } from './offline_version_js/assets_path.js';

const settings = PIXI.settings;
settings.RESOLUTION = window.devicePixelRatio;
settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
settings.ROUND_PIXELS = true;

const renderer = PIXI.autoDetectRenderer({
  width: 432,
  height: 304,
  antialias: false,
  backgroundColor: 0x000000,
  transparent: false
});
const stage = new PIXI.Container();
const ticker = new PIXI.Ticker();
const loader = new PIXI.Loader();

document.querySelector('#canvas-here').appendChild(renderer.view);
ticker.add(() => {
  renderer.render(stage);
}, PIXI.UPDATE_PRIORITY.LOW);

renderer.render(stage); // To make the initial canvas painting stable in the Firefox browser.
loader.add(ASSETS_PATH.SPRITE_SHEET);
for (const prop in ASSETS_PATH.SOUNDS) {
  loader.add(ASSETS_PATH.SOUNDS[prop]);
}
loader.load(setup);

function setup() {
  const pikaVolley = new PikachuVolleyballOnline(stage, loader.resources);
  start(pikaVolley);
}

function start(pikaVolley) {
  ticker.maxFPS = pikaVolley.normalFPS;
  ticker.add(() => {
    pikaVolley.gameLoop();
  });
  ticker.start();
}
