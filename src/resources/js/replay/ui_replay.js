import { replayPlayer } from './replay_player.js';
import '../../style.css';

let pausedByBtn = false;

const scrubberRangeInput = document.getElementById('scrubber-range-input');
const playPauseBtn = document.getElementById('play-pause-btn');
const seekBackward1Btn = document.getElementById('seek-backward-1');
const seekForward1Btn = document.getElementById('seek-forward-1');
const seekBackward3Btn = document.getElementById('seek-backward-3');
const seekForward3Btn = document.getElementById('seek-forward-3');
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
    replayPlayer.readFile(files[0]);
  }

  scrubberRangeInput.addEventListener('touchstart', () => {
    if (replayPlayer.ticker.started) {
      replayPlayer.ticker.stop();
      replayPlayer.stopBGM();
    }
  });
  scrubberRangeInput.addEventListener('mousedown', () => {
    if (replayPlayer.ticker.started) {
      replayPlayer.ticker.stop();
      replayPlayer.stopBGM();
    }
  });
  scrubberRangeInput.addEventListener('touchend', () => {
    if (!pausedByBtn && !replayPlayer.ticker.started) {
      replayPlayer.ticker.start();
      replayPlayer.playBGMProperlyAfterScrubbbing();
    }
  });
  scrubberRangeInput.addEventListener('mouseup', () => {
    if (!pausedByBtn && !replayPlayer.ticker.started) {
      replayPlayer.ticker.start();
      replayPlayer.playBGMProperlyAfterScrubbbing();
    }
  });
  scrubberRangeInput.addEventListener('input', (e) => {
    // @ts-ignore
    replayPlayer.seekFrame(Number(e.currentTarget.value));
  });

  // @ts-ignore
  playPauseBtn.disabled = true;
  playPauseBtn.addEventListener('click', () => {
    if (replayPlayer.ticker.started) {
      replayPlayer.ticker.stop();
      replayPlayer.pauseBGM();
      pausedByBtn = true;
      adjustPlayPauseBtnIcon();
    } else {
      replayPlayer.ticker.start();
      replayPlayer.resumeBGM();
      pausedByBtn = false;
      adjustPlayPauseBtnIcon();
    }
  });

  seekBackward1Btn.addEventListener('click', () => {
    replayPlayer.seekRelativeTime(-1);
    if (!pausedByBtn && !replayPlayer.ticker.started) {
      replayPlayer.ticker.start();
      replayPlayer.playBGMProperlyAfterScrubbbing();
    }
  });
  seekForward1Btn.addEventListener('click', () => {
    replayPlayer.seekRelativeTime(1);
    if (!pausedByBtn && !replayPlayer.ticker.started) {
      replayPlayer.ticker.start();
      replayPlayer.playBGMProperlyAfterScrubbbing();
    }
  });
  seekBackward3Btn.addEventListener('click', () => {
    replayPlayer.seekRelativeTime(-3);
    if (!pausedByBtn && !replayPlayer.ticker.started) {
      replayPlayer.ticker.start();
      replayPlayer.playBGMProperlyAfterScrubbbing();
    }
  });
  seekForward3Btn.addEventListener('click', () => {
    replayPlayer.seekRelativeTime(3);
    if (!pausedByBtn && !replayPlayer.ticker.started) {
      replayPlayer.ticker.start();
      replayPlayer.playBGMProperlyAfterScrubbbing();
    }
  });

  speedBtn1FPS.addEventListener('click', (e) => {
    processSelected(e);
    replayPlayer.adjustPlaybackSpeedFPS(1);
  });
  speedBtn2FPS.addEventListener('click', (e) => {
    processSelected(e);
    replayPlayer.adjustPlaybackSpeedFPS(2);
  });
  speedBtn5FPS.addEventListener('click', (e) => {
    processSelected(e);
    replayPlayer.adjustPlaybackSpeedFPS(5);
  });
  speedBtnHalfTimes.addEventListener('click', (e) => {
    processSelected(e);
    replayPlayer.adjustPlaybackSpeedTimes(0.5);
  });
  speedBtn1Times.addEventListener('click', (e) => {
    processSelected(e);
    replayPlayer.adjustPlaybackSpeedTimes(1);
  });
  speedBtn2Times.addEventListener('click', (e) => {
    processSelected(e);
    replayPlayer.adjustPlaybackSpeedTimes(2);
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

  const noticeBoxFileErrorOKBtn = document.getElementById(
    'notice-file-open-error-ok-btn'
  );
  noticeBoxFileErrorOKBtn.addEventListener('click', () => {
    location.reload();
  });
}

export function adjustPlayPauseBtnIcon() {
  const playPauseBtn = document.getElementById('play-pause-btn');
  if (replayPlayer.ticker.started) {
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

export function hideNoticeEndOfReplay() {
  const noticeBoxEndOfReplay = document.getElementById('notice-end-of-replay');
  if (!noticeBoxEndOfReplay.classList.contains('hidden')) {
    noticeBoxEndOfReplay.classList.add('hidden');
  }
}

export function noticeFileOpenError() {
  const noticeBoxFileOpenError = document.getElementById(
    'notice-file-open-error'
  );
  noticeBoxFileOpenError.classList.remove('hidden');
}

export function getCommentText() {
  return document.getElementById('replay-viewer-at').textContent;
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
  seekBackward1Btn.disabled = false;
  // @ts-ignore
  seekForward1Btn.disabled = false;
  // @ts-ignore
  seekBackward3Btn.disabled = false;
  // @ts-ignore
  seekForward3Btn.disabled = false;
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
  seekBackward1Btn.disabled = true;
  // @ts-ignore
  seekForward1Btn.disabled = true;
  // @ts-ignore
  seekBackward3Btn.disabled = true;
  // @ts-ignore
  seekForward3Btn.disabled = true;
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
