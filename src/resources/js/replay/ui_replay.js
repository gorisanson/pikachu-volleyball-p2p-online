import { replayReader, setup, setWillMoveScrubber } from './replay.js';
import '../../style.css';

const scrubberRangeInput = document.getElementById('scrubber-range-input');

export function setUpUI() {
  // Dropbox code is from: https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications
  const dropbox = document.getElementById('dropbox');
  dropbox.addEventListener('dragenter', dragenter, false);
  dropbox.addEventListener('dragover', dragover, false);
  dropbox.addEventListener('drop', drop, false);

  const noticeBoxEndOfReplayOKBtn = document.getElementById(
    'notice-end-of-replay-ok-btn'
  );
  noticeBoxEndOfReplayOKBtn.addEventListener('click', () => {
    location.reload();
  });

  scrubberRangeInput.addEventListener('mousedown', () => {
    setWillMoveScrubber(false);
  });

  scrubberRangeInput.addEventListener('change', (event) => {
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

export function noticeEndOfReplay() {
  const noticeBoxEndOfReplay = document.getElementById('notice-end-of-replay');
  noticeBoxEndOfReplay.classList.remove('hidden');
}

export function setMaxForScrubberRange(max) {
  // @ts-ignore
  document.getElementById('scrubber-range-input').max = max;
}

export function moveScrubberTo(value) {
  // @ts-ignore
  scrubberRangeInput.value = value;
}
