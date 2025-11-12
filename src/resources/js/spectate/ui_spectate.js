import { spectatorPlayer } from './spectate_player.js';
import { enableChat, hideChat } from '../chat_display.js';
import { PikaUserInput } from '../offline_version_js/physics.js';
import '../../style.css';

let pausedByBtn = false;

export function setUpUI() {
  disableReplayScrubberAndBtns();
  setUpLoaderProgressBar(spectatorPlayer.loader);
  const scrubberRangeInput = document.getElementById('scrubber-range-input');
  if (scrubberRangeInput) {
    scrubberRangeInput.addEventListener('touchstart', () => {
      if (spectatorPlayer.ticker.started) {
        spectatorPlayer.ticker.stop();
        spectatorPlayer.stopBGM();
      }
    });
    scrubberRangeInput.addEventListener('mousedown', () => {
      if (spectatorPlayer.ticker.started) {
        spectatorPlayer.ticker.stop();
        spectatorPlayer.stopBGM();
      }
    });
    scrubberRangeInput.addEventListener('touchend', () => {
      if (!pausedByBtn && !spectatorPlayer.ticker.started) {
        spectatorPlayer.ticker.start();
        spectatorPlayer.playBGMProperly();
      }
    });
    scrubberRangeInput.addEventListener('mouseup', () => {
      if (!pausedByBtn && !spectatorPlayer.ticker.started) { 
        spectatorPlayer.ticker.start();
        spectatorPlayer.playBGMProperly();
      }
    });
    scrubberRangeInput.addEventListener('input', (e) => {
      // @ts-ignore
      spectatorPlayer.seekFrame(Number(e.currentTarget.value));
    });
  }

  // --- play/pause ---
  const playPauseBtn = document.getElementById('play-pause-btn');
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      if (spectatorPlayer.ticker.started) {
        spectatorPlayer.ticker.stop();
        spectatorPlayer.stopBGM();
        pausedByBtn = true;
      } else {
        spectatorPlayer.ticker.start();
        spectatorPlayer.playBGMProperly();
        pausedByBtn = false;
      }
      adjustPlayPauseBtnIcon();
    });
  }

  const seekBackward1Btn = document.getElementById('seek-backward-1');
  if (seekBackward1Btn) {
    seekBackward1Btn.addEventListener('click', () => {
      spectatorPlayer.seekRelativeTime(-1);
      if (!pausedByBtn && !spectatorPlayer.ticker.started) {
        spectatorPlayer.ticker.start();
        spectatorPlayer.playBGMProperly();
      }
    });
  }
  const seekForward1Btn = document.getElementById('seek-forward-1');
  if (seekForward1Btn) {
    seekForward1Btn.addEventListener('click', () => {
      spectatorPlayer.seekRelativeTime(1);
      if (!pausedByBtn && !spectatorPlayer.ticker.started) {
        spectatorPlayer.ticker.start();
        spectatorPlayer.playBGMProperly();
      }
    });
  }
  const seekBackward3Btn = document.getElementById('seek-backward-3');
  if (seekBackward3Btn) {
    seekBackward3Btn.addEventListener('click', () => {
      spectatorPlayer.seekRelativeTime(-3);
      if (!pausedByBtn && !spectatorPlayer.ticker.started) {
        spectatorPlayer.ticker.start();
        spectatorPlayer.playBGMProperly();
      }
    });
  }
  const seekForward3Btn = document.getElementById('seek-forward-3');
  if (seekForward3Btn) {
    seekForward3Btn.addEventListener('click', () => {
      spectatorPlayer.seekRelativeTime(3);
      if (!pausedByBtn && !spectatorPlayer.ticker.started) {
        spectatorPlayer.ticker.start();
        spectatorPlayer.playBGMProperly();
      }
    });
  }

  // --- Speed ---
  const speedBtn5FPS = document.getElementById('speed-btn-5-fps');
  const speedBtnHalfTimes = document.getElementById('speed-btn-half-times');
  const speedBtn1Times = document.getElementById('speed-btn-1-times');
  const speedBtn2Times = document.getElementById('speed-btn-2-times');

  function processSelected(e) {
    unselectSpeedBtns();
    // @ts-ignore
    e.currentTarget.classList.add('selected');
  }
  function unselectSpeedBtns() {
    [speedBtn5FPS, speedBtnHalfTimes, speedBtn1Times, speedBtn2Times].forEach(btn => {
      if (btn) btn.classList.remove('selected');
    });
  }
  
  if (speedBtn5FPS) speedBtn5FPS.addEventListener('click', (e) => {
    processSelected(e);
    spectatorPlayer.adjustPlaybackSpeedFPS(5);
  });
  if (speedBtnHalfTimes) speedBtnHalfTimes.addEventListener('click', (e) => {
    processSelected(e);
    spectatorPlayer.adjustPlaybackSpeedTimes(0.5);
  });
  if (speedBtn1Times) speedBtn1Times.addEventListener('click', (e) => {
    processSelected(e);
    spectatorPlayer.adjustPlaybackSpeedTimes(1);
  });
  if (speedBtn2Times) speedBtn2Times.addEventListener('click', (e) => {
    processSelected(e);
    spectatorPlayer.adjustPlaybackSpeedTimes(2);
  });
  
  // --- FPS ---
  const fpsInput = document.getElementById('fps-input');
  if (fpsInput) {
    fpsInput.addEventListener('change', (e) => {
      // @ts-ignore
      let value = e.target.value;
      if (value < 0) value = 0;
      else if (value > 60) value = 60;
      spectatorPlayer.adjustPlaybackSpeedFPS(value);
      unselectSpeedBtns();
    });
  }

  const noticeBoxEndOfSpectationOKBtn = document.getElementById('notice-end-of-spectation-ok-btn');
  if (noticeBoxEndOfSpectationOKBtn) {
    noticeBoxEndOfSpectationOKBtn.addEventListener('click', () => {
      window.location.href = '../';
    });
  }

  const noticeBoxEndOfSpectationNOBtn = document.getElementById('notice-end-of-spectation-no-btn');
  if (noticeBoxEndOfSpectationNOBtn) {
    noticeBoxEndOfSpectationNOBtn.addEventListener('click', () => {
      hideNoticeEndOfSpectation();
    });
  }
  
  const noticeBoxFileErrorOKBtn = document.getElementById('notice-file-open-error-ok-btn');
  if (noticeBoxFileErrorOKBtn) {
    noticeBoxFileErrorOKBtn.addEventListener('click', () => {
      window.location.href = '../';
    });
  }

  // --- Checkboxes ---
  const keyboardContainer = document.getElementById('keyboard-container');
  const showKeyboardCheckbox = document.getElementById('show-keyboard-checkbox');
  if (showKeyboardCheckbox) {
    showKeyboardCheckbox.addEventListener('change', () => {
      // @ts-ignore
      if (showKeyboardCheckbox.checked) {
        if (keyboardContainer) keyboardContainer.classList.remove('hidden');
      } else {
        if (keyboardContainer) keyboardContainer.classList.add('hidden');
      }
    });
  }

  const showChatCheckbox = document.getElementById('show-chat-checkbox');
  if (showChatCheckbox) {
    showChatCheckbox.addEventListener('change', () => {
      // @ts-ignore
      if (showChatCheckbox.checked) {
        enableChat(true);
      } else {
        enableChat(false);
        hideChat();
      }
    });
  }

  const showNicknamesCheckbox = document.getElementById('show-nicknames-checkbox');
  const player1NicknameElem = document.getElementById('player1-nickname');
  const player2NicknameElem = document.getElementById('player2-nickname');
  if (showNicknamesCheckbox) {
    showNicknamesCheckbox.addEventListener('change', () => {
      // @ts-ignore
      if (showNicknamesCheckbox.checked) {
        if (player1NicknameElem) {
          player1NicknameElem.classList.remove('hidden');
        }
        if (player2NicknameElem) {
          player2NicknameElem.classList.remove('hidden');
        }
      } else {
        if (player1NicknameElem) {
          player1NicknameElem.classList.add('hidden');
        }
        if (player2NicknameElem) {
          player2NicknameElem.classList.add('hidden');
        }
      }
    });
  }

  const showIPsCheckbox = document.getElementById('show-ip-addresses-checkbox');
  const player1IPElem = document.getElementById('player1-partial-ip');
  const player2IPElem = document.getElementById('player2-partial-ip');
  if (showIPsCheckbox) {
    showIPsCheckbox.addEventListener('change', () => {
      // @ts-ignore
      if (showIPsCheckbox.checked) {
        if (player1IPElem) {
          player1IPElem.classList.remove('hidden');
        }
        if (player2IPElem) {
          player2IPElem.classList.remove('hidden');
        }
      } else {
        if (player1IPElem) {
          player1IPElem.classList.add('hidden');
        }
        if (player2IPElem) {
          player2IPElem.classList.add('hidden');
        }
      }
    });
  }

  const turnOnBGMCheckbox = document.getElementById('turn-on-bgm-checkbox');
  if (turnOnBGMCheckbox) {
    turnOnBGMCheckbox.addEventListener('change', () => {
      if (spectatorPlayer.pikaVolley === null) {
        //return;
      }
      // @ts-ignore
      if (turnOnBGMCheckbox.checked) {
        spectatorPlayer.pikaVolley.audio.turnBGMVolume(true);
      } else {
        spectatorPlayer.pikaVolley.audio.turnBGMVolume(false);
      }
    });
  }

  const turnOnSFXCheckbox = document.getElementById('turn-on-sfx-checkbox');
  if (turnOnSFXCheckbox) {
    turnOnSFXCheckbox.addEventListener('change', () => {
      if (spectatorPlayer.pikaVolley === null) {
        //return;
      }
      // @ts-ignore
      if (turnOnSFXCheckbox.checked) {
        spectatorPlayer.pikaVolley.audio.turnSFXVolume(true);
      } else {
        spectatorPlayer.pikaVolley.audio.turnSFXVolume(false);
      }
    });
  }
  
  const graphicSharpCheckbox = document.getElementById('graphic-sharp-checkbox');
  if (graphicSharpCheckbox) {
    graphicSharpCheckbox.addEventListener('change', () => {
      if (spectatorPlayer.pikaVolley === null) {
        //return;
      }
      const canvas = document.querySelector('#game-canvas-container>canvas');
      if (!canvas) {
        return;
      }
      
      // @ts-ignore
      if (graphicSharpCheckbox.checked) {
        canvas.classList.remove('graphic-soft');
      } else {
        canvas.classList.add('graphic-soft');
      }
    });
  }

  // --- Keyboards ---
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (playPauseBtn) playPauseBtn.click();
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      if (seekBackward3Btn) seekBackward3Btn.click();
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      if (seekForward3Btn) seekForward3Btn.click();
    }
  });
}

/**
 * Set up the loader progress bar.
 * @param {import('@pixi/loaders').Loader} loader
 */
export function setUpLoaderProgressBar(loader) {
  const loadingBox = document.getElementById('loading-box');
  const progressBar = document.getElementById('progress-bar');
  if (!loadingBox || !progressBar) {
        return;
      }

  loader.onProgress.add(() => {
    progressBar.style.width = `${loader.progress}%`;
  });
  loader.onComplete.add(() => {
    loadingBox.classList.add('hidden');
  });
}

export function adjustFPSInputValue() {
  const fpsInput = document.getElementById('fps-input');
  // @ts-ignore
  if (fpsInput && spectatorPlayer.ticker) fpsInput.value = spectatorPlayer.ticker.maxFPS;
}

export function adjustPlayPauseBtnIcon() {
  const playPauseBtn = document.getElementById('play-pause-btn');
  if (!playPauseBtn || !spectatorPlayer.ticker) {
    return;
  }
  
  const pauseMark = document.getElementById('pause-mark');
  const playMark = document.getElementById('play-mark');
  if (!pauseMark || !playMark)  {
    return;
  }

  if (spectatorPlayer.ticker.started) {
    playPauseBtn.textContent = pauseMark.textContent;
  } else {
    playPauseBtn.textContent = playMark.textContent;
  }
}

export function noticeEndOfSpectation() {
  const noticeBoxEndOfReplay = document.getElementById('notice-end-of-spectation');
  if (noticeBoxEndOfReplay) {
    noticeBoxEndOfReplay.classList.remove('hidden');
  }
}

export function hideNoticeEndOfSpectation() {
  const noticeBoxEndOfReplay = document.getElementById('notice-end-of-spectation');
  if (noticeBoxEndOfReplay) {
    noticeBoxEndOfReplay.classList.add('hidden');
  }
}

export function noticeFileOpenError() {
  const noticeBoxFileOpenError = document.getElementById(
    'notice-file-open-error'
  );
  if (noticeBoxFileOpenError) {
    noticeBoxFileOpenError.classList.remove('hidden');
  }
}

export function getCommentText() {
  const elem = document.getElementById('replay-viewer-at');
  return elem ? elem.textContent : '';
}

export function setMaxForScrubberRange(max) {
  const scrubberRangeInput = document.getElementById('scrubber-range-input');
  if (scrubberRangeInput) {
    // @ts-ignore
    scrubberRangeInput.max = max;
  }
}

export function moveScrubberTo(value) {
  const scrubberRangeInput = document.getElementById('scrubber-range-input');
  if (scrubberRangeInput) {
    // @ts-ignore
    scrubberRangeInput.value = value;
  }
}

/**
 * @param {number} timeCurrent unit: second
 */
export function showTimeCurrent(timeCurrent) {
  const elem = document.getElementById('time-current');
  if (elem) {
    elem.textContent = getTimeText(timeCurrent);
  }
}

/**
 * @param {number} timeDuration unit: second
 */
export function showTotalTimeDuration(timeDuration) {
  const elem = document.getElementById('time-duration');
  if (elem) elem.textContent = getTimeText(timeDuration);
}

/**
 * Show Keyboard inputs
 * @param {PikaUserInput} player1Input
 * @param {PikaUserInput} player2Input
 */
export function showKeyboardInputs(player1Input, player2Input) {
  const zKey = document.getElementById('z-key');
  const rKey = document.getElementById('r-key');
  const vKey = document.getElementById('v-key');
  const dKey = document.getElementById('d-key');
  const gKey = document.getElementById('g-key');

  const enterKey = document.getElementById('enter-key');
  const upKey = document.getElementById('up-key');
  const downKey = document.getElementById('down-key');
  const leftKey = document.getElementById('left-key');
  const rightKey = document.getElementById('right-key');

  function pressKeyElm(keyElm) {
    if (keyElm) keyElm.classList.add('pressed');
  }
  function unpressKeyElm(keyElm) {
    if (keyElm) keyElm.classList.remove('pressed');
  }

  // Player 1
  switch (player1Input.xDirection) {
    case 0: unpressKeyElm(dKey); unpressKeyElm(gKey); break;
    case -1: pressKeyElm(dKey); unpressKeyElm(gKey); break;
    case 1: unpressKeyElm(dKey); pressKeyElm(gKey); break;
  }
  switch (player1Input.yDirection) {
    case 0: unpressKeyElm(rKey); unpressKeyElm(vKey); break;
    case -1: pressKeyElm(rKey); unpressKeyElm(vKey); break;
    case 1: unpressKeyElm(rKey); pressKeyElm(vKey); break;
  }
  switch (player1Input.powerHit) {
    case 0: unpressKeyElm(zKey); break;
    case 1: pressKeyElm(zKey); break;
  }

  // Player 2
  switch (player2Input.xDirection) {
    case 0: unpressKeyElm(leftKey); unpressKeyElm(rightKey); break;
    case -1: pressKeyElm(leftKey); unpressKeyElm(rightKey); break;
    case 1: unpressKeyElm(leftKey); pressKeyElm(rightKey); break;
  }
  switch (player2Input.yDirection) {
    case 0: unpressKeyElm(upKey); unpressKeyElm(downKey); break;
    case -1: pressKeyElm(upKey); unpressKeyElm(downKey); break;
    case 1: unpressKeyElm(upKey); pressKeyElm(downKey); break;
  }
  switch (player2Input.powerHit) {
    case 0: unpressKeyElm(enterKey); break;
    case 1: pressKeyElm(enterKey); break;
  }
}

export function enableReplayScrubberAndBtns() {
  const scrubberRangeInput = document.getElementById('scrubber-range-input');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const seekBackward1Btn = document.getElementById('seek-backward-1');
  const seekForward1Btn = document.getElementById('seek-forward-1');
  const seekBackward3Btn = document.getElementById('seek-backward-3');
  const seekForward3Btn = document.getElementById('seek-forward-3');
  const speedBtn5FPS = document.getElementById('speed-btn-5-fps');
  const speedBtnHalfTimes = document.getElementById('speed-btn-half-times');
  const speedBtn1Times = document.getElementById('speed-btn-1-times');
  const speedBtn2Times = document.getElementById('speed-btn-2-times');

  // @ts-ignore
  if (scrubberRangeInput) scrubberRangeInput.disabled = false;
  // @ts-ignore
  if (playPauseBtn) playPauseBtn.disabled = false;
  // @ts-ignore
  if (seekBackward1Btn) seekBackward1Btn.disabled = false;
  // @ts-ignore
  if (seekForward1Btn) seekForward1Btn.disabled = false;
  // @ts-ignore
  if (seekBackward3Btn) seekBackward3Btn.disabled = false;
  // @ts-ignore
  if (seekForward3Btn) seekForward3Btn.disabled = false;
  // @ts-ignore
  if (speedBtn5FPS) speedBtn5FPS.disabled = false;
  // @ts-ignore
  if (speedBtnHalfTimes) speedBtnHalfTimes.disabled = false;
  // @ts-ignore
  if (speedBtn1Times) speedBtn1Times.disabled = false;
  // @ts-ignore
  if (speedBtn2Times) speedBtn2Times.disabled = false;
}

function disableReplayScrubberAndBtns() {
  const scrubberRangeInput = document.getElementById('scrubber-range-input');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const seekBackward1Btn = document.getElementById('seek-backward-1');
  const seekForward1Btn = document.getElementById('seek-forward-1');
  const seekBackward3Btn = document.getElementById('seek-backward-3');
  const seekForward3Btn = document.getElementById('seek-forward-3');
  const speedBtn5FPS = document.getElementById('speed-btn-5-fps');
  const speedBtnHalfTimes = document.getElementById('speed-btn-half-times');
  const speedBtn1Times = document.getElementById('speed-btn-1-times');
  const speedBtn2Times = document.getElementById('speed-btn-2-times');

  // @ts-ignore
  if (scrubberRangeInput) scrubberRangeInput.disabled = true;
  // @ts-ignore
  if (playPauseBtn) playPauseBtn.disabled = true;
  // @ts-ignore
  if (seekBackward1Btn) seekBackward1Btn.disabled = true;
  // @ts-ignore
  if (seekForward1Btn) seekForward1Btn.disabled = true;
  // @ts-ignore
  if (seekBackward3Btn) seekBackward3Btn.disabled = true;
  // @ts-ignore
  if (seekForward3Btn) seekForward3Btn.disabled = true;
  // @ts-ignore
  if (speedBtn5FPS) speedBtn5FPS.disabled = true;
  // @ts-ignore
  if (speedBtnHalfTimes) speedBtnHalfTimes.disabled = true;
  // @ts-ignore
  if (speedBtn1Times) speedBtn1Times.disabled = true;
  // @ts-ignore
  if (speedBtn2Times) speedBtn2Times.disabled = true;
}

export function hideWaitingPeerAssetsStartBox() {
  const StartBox = document.getElementById("start-box");
  StartBox.classList.add("hidden");
}

/**
 * @param {number} time unit: second
 */
function getTimeText(time) {
  const seconds = Math.floor(time % 60);
  const minutes = Math.floor(time / 60) % 60;
  const hours = Math.floor(Math.floor(time / 60) / 60);

  if (hours > 0) {
    return `${String(hours)}:${('0' + minutes).slice(-2)}:${(
      '0' + seconds
    ).slice(-2)}`;
  } else {
    return `${String(minutes)}:${('0' + seconds).slice(-2)}`;
  }
}