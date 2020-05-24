import { ticker, replayReader, setup } from './replay.js';
import '../../style.css';

let pausedByBtn = false;

const scrubberRangeInput = document.getElementById('scrubber-range-input');

export function setUpUI() {
  // Dropbox code is from: https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications
  const dropbox = document.getElementById('dropbox');
  dropbox.addEventListener('dragenter', dragenter, false);
  dropbox.addEventListener('dragover', dragover, false);
  dropbox.addEventListener('drop', drop, false);

  const playPauseBtn = document.getElementById('play-pause-btn');
  playPauseBtn.addEventListener('click', () => {
    if (ticker.started) {
      ticker.stop();
      pausedByBtn = true;
      adjustPlayPauseBtnIcon();
    } else {
      ticker.start();
      pausedByBtn = false;
      adjustPlayPauseBtnIcon();
    }
  });

  const noticeBoxEndOfReplayOKBtn = document.getElementById(
    'notice-end-of-replay-ok-btn'
  );
  noticeBoxEndOfReplayOKBtn.addEventListener('click', () => {
    location.reload();
  });

  // @ts-ignore
  scrubberRangeInput.disabled = true;

  scrubberRangeInput.addEventListener('mousedown', () => {
    ticker.stop();
  });

  scrubberRangeInput.addEventListener('mouseup', () => {
    if (!pausedByBtn) {
      ticker.start();
    }
  });

  scrubberRangeInput.addEventListener('input', (event) => {
    // @ts-ignore
    setup(Number(event.target.value));
  });

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

export function enableScrubber() {
  // @ts-ignore
  scrubberRangeInput.disabled = false;
}

export function setMaxForScrubberRange(max) {
  // @ts-ignore
  scrubberRangeInput.max = max;
}

export function moveScrubberTo(value) {
  // @ts-ignore
  scrubberRangeInput.value = value;
}
