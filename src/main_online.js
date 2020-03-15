'use strict';
import * as PIXI from 'pixi.js';
import 'pixi-sound';
import { PikachuVolleyballOnline } from './pikavolley_online.js';
import { RESOURCE_PATH } from './resource_path';

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
ticker.start();

loader.add(RESOURCE_PATH.SPRITE_SHEET);
for (const prop in RESOURCE_PATH.SOUNDS) {
  loader.add(RESOURCE_PATH.SOUNDS[prop]);
}
loader.load(setup);

function setup() {
  const pikaVolley = new PikachuVolleyballOnline(stage, loader.resources);
  document
    .querySelector('#toggle-player-number-btn')
    .addEventListener('click', event => {
      pikaVolley.amIPlayer2 = !pikaVolley.amIPlayer2;
      console.log(`toggled to amIPlayer2: ${pikaVolley.amIPlayer2}`);
    });

  start(pikaVolley);
}

function start(pikaVolley) {
  ticker.maxFPS = pikaVolley.normalFPS;
  ticker.add(delta => pikaVolley.gameLoop(delta));
}
