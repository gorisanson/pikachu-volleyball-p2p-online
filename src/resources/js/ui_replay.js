import { replayReader } from './replay.js';
import '../style.css';

// From: https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications
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

  dropbox.classList.add('hidden');

  handleFiles(files);
}

function handleFiles(files) {
  replayReader.readFile(files[0]);
}
