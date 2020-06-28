/**
 * This is the main script which executes the p2p online version game.
 * General explanations for the all source code files of the game are following.
 *
 ********************************************************************************************************************
 * This p2p online version of the Pikachu Volleyball is developed based on
 * the Pikachu Volleyball offline web version (https://github.com/gorisanson/pikachu-volleyball)
 * which is made by reverse engineering the core part of the original Pikachu Volleyball game
 * which is developed by "1997 (C) SACHI SOFT / SAWAYAKAN Programmers" & "1997 (C) Satoshi Takenouchi".
 ********************************************************************************************************************
 *
 * This p2p online version game is mainly composed of two parts below.
 *  1) Offline version: All the offline web version source code files is in the directory "offline_version_js".
 *  2) WebRTC data channels: It utilizes WebRTC data channels to communicate with the peer.
 *                           The peer-to-peer online functions are contained in "data_channel.js"
 *
 * The game is deterministic on the user (keyboard) inputs except the RNG (random number generator) used in
 * "offline_version_js/physics.js" and "offline_version_js/cloud_and_wave.js". (The RNG is contained
 * in "offline_version_js/rand.js".) So if the RNG is the same on both peers, only the user inputs need
 * to be communicated to maintain the same game state between the peers. In this p2p online version, the RNG
 * is set to the same thing on both peers at the data channel open event (handled by the function
 * "dataChannelOpened" in "data_channel.js"), then the user inputs are communicated via the data channel.
 *
 * And expainations for other source files are below.
 *  - "pikavolley_online.js": A wrapper for "offline_version_js/pikavolley.js".
 *  - "keyboard_online.js": A wrapper for offline version "offline_version_js/keyboard.js".
 *                          This module gets user inputs and load them up onto the data channel to the peer.
 *  - "generate_pushid.js": Generate a room ID easilly distinguishable by human eye.
 *  - "mod.js": To maintain game sync, sync counter is attached for each user input, and mod is used to
 *              make sync counter cycle in a range [0, 255] which fits in a byte.
 *  - "ui_online.js": For the user interface of the html page and inputs/outputs relevant to html elements.
 *  - "chat_display.js": For displaying chat messages.
 *  - "firebase_config.template.js": This p2p online version utilized firebase cloud firestore to establish
 *                                   webRTC data channel connection between peers. Fill this template and
 *                                   change the file name to "firebase_config.js".
 *  - "rtc_configuration.js": Contains RTCPeerConnection configuration.
 *  - "quick_match.js": It is for the quick match function. Manages communication with the quick match server.
 *  - "qucik_match_server_url.template.js": Fill this template the url of the quick match server and change
 *                                          the file name to "qucik_match_server_url.js"
 */
'use strict';
import * as PIXI from 'pixi.js-legacy';
import 'pixi-sound';
import { PikachuVolleyballOnline } from './pikavolley_online.js';
import { ASSETS_PATH } from './offline_version_js/assets_path.js';
import { channel } from './data_channel/data_channel.js';
import { setUpUI, setUpUIAfterLoadingGameAssets } from './ui_online.js';
import { setGetSpeechBubbleNeeded } from './chat_display.js';
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

  loader.onProgress.add(() => {
    progressBar.style.width = `${loader.progress}%`;
  });
  loader.onComplete.add(() => {
    if (!loadingBox.classList.contains('hidden')) {
      loadingBox.classList.add('hidden');
    }
  });
}

function setup() {
  const pikaVolley = new PikachuVolleyballOnline(stage, loader.resources);
  setUpUIAfterLoadingGameAssets(pikaVolley, ticker);
  setGetSpeechBubbleNeeded(pikaVolley);
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
