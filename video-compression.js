const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

const fileInput    = document.getElementById('fileInput');
const dropArea     = document.getElementById('dropArea');
const fileList     = document.getElementById('fileList');
const compressBtn  = document.getElementById('compressBtn');
const downloadBtn  = document.getElementById('downloadBtn');
const resetBtn     = document.getElementById('resetBtn');
const progress     = document.getElementById('progress');
const output       = document.getElementById('output');

let selectedFile = null;
let resultBlob = null;

// 拖拽 & 选取
['dragenter','dragover','dragleave','drop'].forEach(evt => {
  dropArea.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    dropArea.classList.toggle('dragover', evt==='dragover');
  });
});
dropArea.addEventListener('drop', e => {
  handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => {
  handleFile(e.target.files[0]);
});

function handleFile(file) {
  if (!file) return;
  selectedFile = file;
  fileList.innerHTML = `
    <div class="file-item">
      <svg viewBox="0 0 24 24"><path fill="none" stroke="var(--color-primary)" stroke-width="2" d="M4 4h16v16H4zM16 8l-6 4 6 4V8z"/></svg>
      <span>${file.name}</span>
      <button class="remove-btn" onclick="resetAll()">×</button>
    </div>
  `;
}

// Reset
function resetAll() {
  selectedFile = null;
  resultBlob = null;
  fileList.innerHTML = '';
  downloadBtn.style.display = 'none';
  downloadBtn.disabled = true;
  progress.textContent = 'Waiting for upload…';
  output.innerHTML = '';
}
resetBtn.addEventListener('click', resetAll);

// Compress
compressBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    alert('Please select a video 😊');
    return;
  }
  compressBtn.disabled = resetBtn.disabled = true;
  progress.textContent = 'Loading FFmpeg…';
  await ffmpeg.load();

  const qualityCRF = document.querySelector('input[name="quality"]:checked').value;
  const fname = selectedFile.name;
  const outName = fname.replace(/\.[^/.]+$/, '') + '-compressed.mp4';

  ffmpeg.FS('writeFile', fname, await fetchFile(selectedFile));
  progress.textContent = 'Compressing…';
  await ffmpeg.run('-i', fname, '-vcodec', 'libx264', '-crf', qualityCRF, outName);
  const data = ffmpeg.FS('readFile', outName);
  resultBlob = new Blob([data.buffer], { type: 'video/mp4' });

  progress.textContent = 'Compression complete!';
  downloadBtn.style.display = 'inline-block';
  downloadBtn.disabled = false;

  output.innerHTML = `<p>Original: ${(selectedFile.size/1024/1024).toFixed(2)} MB → Compressed: ${(resultBlob.size/1024/1024).toFixed(2)} MB</p>`;
  compressBtn.disabled = resetBtn.disabled = false;
});

// Download
downloadBtn.addEventListener('click', () => {
  if (!resultBlob) return;
  const url = URL.createObjectURL(resultBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = selectedFile.name.replace(/\.[^/.]+$/, '') + '-compressed.mp4';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
