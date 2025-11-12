import { ASSETS_PATH } from '../offline_version_js/assets_path.js';
import { setUpUI } from './ui_spectate.js';
import { spectatorPlayer } from './spectate_player.js';

adjustAssetsPath();
setUpUI();

(() => { 
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room');

  if (roomId) {
    console.log(`Start Spectating with [${roomId}], from [Spectator] URL.`);
    spectatorPlayer.startSpectating(roomId);
  } else {
    console.error("There isn't parameter 'room' in [Spectator] URL.");
    const loadingUI = document.getElementById('spectator-loading');
    if (loadingUI) {
      loadingUI.innerHTML = "<p>Error. Room ID for spectation Isn't detected.</p>";
    }
  }
})();

function adjustAssetsPath() {
  ASSETS_PATH.SPRITE_SHEET = '../' + ASSETS_PATH.SPRITE_SHEET;
  for (const prop in ASSETS_PATH.SOUNDS) {
    ASSETS_PATH.SOUNDS[prop] = '../' + ASSETS_PATH.SOUNDS[prop];
  }
}