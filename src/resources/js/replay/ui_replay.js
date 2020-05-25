import {
  ticker,
  replayReader,
  setup,
  adjustPlaybackSeeedFPS,
  adjustPlaybackSpeedTimes,
  playBGMProperlyAfterScrubbbing,
  stopBGM,
  resumeBGM,
  pauseBGM,
} from './replay.js';
import '../../style.css';

let pausedByBtn = false;

const scrubberRangeInput = document.getElementById('scrubber-range-input');
const playPauseBtn = document.getElementById('play-pause-btn');
const speedBtn1FPS = document.getElementById('speed-btn-1-fps');
const speedBtn2FPS = document.getElementById('speed-btn-2-fps');
const speedBtn5FPS = document.getElementById('speed-btn-5-fps');
const speedBtnHalfTimes = document.getElementById('speed-btn-half-times');
const speedBtn1Times = document.getElementById('speed-btn-1-times');
const speedBtn2Times = document.getElementById('speed-btn-2-times');

export function setUpUI() {
  disableReplayScrubberAndBtns();

  // File input code is from: https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications
  const fileInputElement = document.getElementById('file-input');
  fileInputElement.addEventListener('change', (e) => {
    document.getElementById('loading-box').classList.remove('hidden');
    dropbox.classList.add('hidden');
    // @ts-ignore
    handleFiles(e.target.files);
  });

  // Dropbox code is from: https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications
  const dropbox = document.getElementById('dropbox');
  dropbox.addEventListener('dragenter', dragenter, false);
  dropbox.addEventListener('dragover', dragover, false);
  dropbox.addEventListener('drop', drop, false);
  function dragenter(e) {
    e.stopPropagation();
    e.preventDefault();
  }
  function dragover(e) {
    e.stopPropagation();
    e.preventDefault();
  }
  function drop(e) {
    e.stopPropagation();
    e.preventDefault();

    const dt = e.dataTransfer;
    const files = dt.files;

    document.getElementById('loading-box').classList.remove('hidden');
    dropbox.classList.add('hidden');

    handleFiles(files);
  }
  function handleFiles(files) {
    replayReader.readFile(files[0]);
  }

  scrubberRangeInput.addEventListener('touchstart', () => {
    if (ticker.started) {
      ticker.stop();
      stopBGM();
    }
  });
  scrubberRangeInput.addEventListener('mousedown', () => {
    if (ticker.started) {
      ticker.stop();
      stopBGM();
    }
  });
  scrubberRangeInput.addEventListener('touchend', () => {
    if (!pausedByBtn && !ticker.started) {
      ticker.start();
      playBGMProperlyAfterScrubbbing();
    }
  });
  scrubberRangeInput.addEventListener('mouseup', () => {
    if (!pausedByBtn && !ticker.started) {
      ticker.start();
      playBGMProperlyAfterScrubbbing();
    }
  });
  scrubberRangeInput.addEventListener('input', (e) => {
    // @ts-ignore
    setup(Number(e.currentTarget.value));
  });

  // @ts-ignore
  playPauseBtn.disabled = true;
  playPauseBtn.addEventListener('click', () => {
    if (ticker.started) {
      ticker.stop();
      pauseBGM();
      pausedByBtn = true;
      adjustPlayPauseBtnIcon();
    } else {
      ticker.start();
      resumeBGM();
      pausedByBtn = false;
      adjustPlayPauseBtnIcon();
    }
  });

  speedBtn1FPS.addEventListener('click', (e) => {
    processSelected(e);
    adjustPlaybackSeeedFPS(1);
  });
  speedBtn2FPS.addEventListener('click', (e) => {
    processSelected(e);
    adjustPlaybackSeeedFPS(2);
  });
  speedBtn5FPS.addEventListener('click', (e) => {
    processSelected(e);
    adjustPlaybackSeeedFPS(5);
  });
  speedBtnHalfTimes.addEventListener('click', (e) => {
    processSelected(e);
    adjustPlaybackSpeedTimes(0.5);
  });
  speedBtn1Times.addEventListener('click', (e) => {
    processSelected(e);
    adjustPlaybackSpeedTimes(1);
  });
  speedBtn2Times.addEventListener('click', (e) => {
    processSelected(e);
    adjustPlaybackSpeedTimes(2);
  });
  function processSelected(e) {
    unselectSpeedBtns();
    // @ts-ignore
    if (!e.currentTarget.classList.contains('selected')) {
      // @ts-ignore
      e.currentTarget.classList.add('selected');
    }
  }
  function unselectSpeedBtns() {
    for (const btn of [
      speedBtn1FPS,
      speedBtn2FPS,
      speedBtn5FPS,
      speedBtnHalfTimes,
      speedBtn1Times,
      speedBtn2Times,
    ]) {
      btn.classList.remove('selected');
    }
  }

  const noticeBoxEndOfReplayOKBtn = document.getElementById(
    'notice-end-of-replay-ok-btn'
  );
  noticeBoxEndOfReplayOKBtn.addEventListener('click', () => {
    location.reload();
  });
}

export function adjustPlayPauseBtnIcon() {
  const playPauseBtn = document.getElementById('play-pause-btn');
  if (ticker.started) {
    playPauseBtn.textContent = document.getElementById(
      'pause-mark'
    ).textContent;
  } else {
    playPauseBtn.textContent = document.getElementById('play-mark').textContent;
  }
}

export function noticeEndOfReplay() {
  const noticeBoxEndOfReplay = document.getElementById('notice-end-of-replay');
  noticeBoxEndOfReplay.classList.remove('hidden');
}

export function setMaxForScrubberRange(max) {
  // @ts-ignore
  scrubberRangeInput.max = max;
}

export function moveScrubberTo(value) {
  // @ts-ignore
  scrubberRangeInput.value = value;
}

/**
 *
 * @param {number} timeCurrent unit: second
 */
export function showTimeCurrent(timeCurrent) {
  document.getElementById('time-current').textContent = getTimeText(
    timeCurrent
  );
}

/**
 *
 * @param {number} timeDuration unit: second
 */
export function showTotalTimeDuration(timeDuration) {
  document.getElementById('time-duration').textContent = getTimeText(
    timeDuration
  );
}

export function enableReplayScrubberAndBtns() {
  // @ts-ignore
  scrubberRangeInput.disabled = false;
  // @ts-ignore
  playPauseBtn.disabled = false;
  // @ts-ignore
  speedBtn1FPS.disabled = false;
  // @ts-ignore
  speedBtn2FPS.disabled = false;
  // @ts-ignore
  speedBtn5FPS.disabled = false;
  // @ts-ignore
  speedBtnHalfTimes.disabled = false;
  // @ts-ignore
  speedBtn1Times.disabled = false;
  // @ts-ignore
  speedBtn2Times.disabled = false;
}

function disableReplayScrubberAndBtns() {
  // @ts-ignore
  scrubberRangeInput.disabled = true;
  // @ts-ignore
  playPauseBtn.disabled = true;
  // @ts-ignore
  speedBtn1FPS.disabled = true;
  // @ts-ignore
  speedBtn2FPS.disabled = true;
  // @ts-ignore
  speedBtn5FPS.disabled = true;
  // @ts-ignore
  speedBtnHalfTimes.disabled = true;
  // @ts-ignore
  speedBtn1Times.disabled = true;
  // @ts-ignore
  speedBtn2Times.disabled = true;
}

/**
 *
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
