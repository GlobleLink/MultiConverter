// 1. 初始化 FFmpeg.wasm
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

// 2. 获取 DOM
const fileInput   = document.getElementById('fileInput');
const dropArea    = document.getElementById('dropArea');
const fileList    = document.getElementById('fileList');
const compressBtn = document.getElementById('compressBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn    = document.getElementById('resetBtn');
const progress    = document.getElementById('progress');
const output      = document.getElementById('output');

let selectedFile = null;
let resultBlob   = null;

// 3. 点击或拖拽区都能触发选择
dropArea.addEventListener('click', () => fileInput.click());
['dragenter','dragover','dragleave','drop'].forEach(evt => {
  dropArea.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    if (evt==='dragover') dropArea.classList.add('dragover');
    if (evt==='dragleave' || evt==='drop') dropArea.classList.remove('dragover');
  });
});
dropArea.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

// 4. 选中文件后显示
function handleFile(file) {
  if (!file) return;
  selectedFile = file;
  fileList.innerHTML = `
    <div class="file-item">
      <svg viewBox="0 0 24 24">
        <path fill="none" stroke="var(--color-primary)" stroke-width="2"
              d="M4 4h16v16H4zM16 8l-6 4 6 4V8z"/>
      </svg>
      <span>${file.name}</span>
      <button class="remove-btn" onclick="resetAll()">×</button>
    </div>
  `;
}

// 5. Reset
function resetAll() {
  selectedFile = null; resultBlob = null;
  fileList.innerHTML = '';
  downloadBtn.style.display = 'none';
  downloadBtn.disabled     = true;
  progress.textContent     = 'Waiting for upload…';
  output.innerHTML         = '';
}
resetBtn.addEventListener('click', resetAll);

// 6. Compress
compressBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    alert('Please select a video 😊');
    return;
  }
  compressBtn.disabled = resetBtn.disabled = true;
  progress.textContent = 'Loading FFmpeg…';
  await ffmpeg.load();

  const qualityCRF = document.querySelector('input[name="quality"]:checked').value;
  const { blob, origSize, newSize } =
        await compressSingle(selectedFile, qualityCRF);

  resultBlob = blob;
  progress.textContent = 'Compression complete!';
  downloadBtn.style.display = 'inline-block';
  downloadBtn.disabled     = false;
  output.innerHTML = `
    <p>
      Original: ${(origSize/1024/1024).toFixed(2)} MB
      → Compressed: ${(newSize/1024/1024).toFixed(2)} MB
    </p>
  `;
  compressBtn.disabled = resetBtn.disabled = false;
});

// 7. Download
downloadBtn.addEventListener('click', () => {
  if (!resultBlob) return;
  const url = URL.createObjectURL(resultBlob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download= resultBlob.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// 8. 压缩单个视频，保持同格式输出
async function compressSingle(file, qualityCRF) {
  const ext        = getExt(file.name);
  const base       = file.name.replace(/\.[^/.]+$/, '');
  const outputName = `${base}-compressed.${ext}`;

  ffmpeg.FS('writeFile', file.name, await fetchFile(file));

  let vcodec = 'libx264';
  if (ext==='webm')     vcodec = 'libvpx-vp9';
  else if (['avi','mov','wmv','mkv'].includes(ext)) vcodec='libx264';

  await ffmpeg.run(
    '-i', file.name,
    '-c:v', vcodec,
    '-crf', qualityCRF,
    outputName
  );

  const data = ffmpeg.FS('readFile', outputName);
  const blob = new Blob([data.buffer], { type: file.type });
  blob.name = outputName;

  return { blob, origSize: file.size, newSize: blob.size };
}

// 9. 获取后缀
function getExt(name) {
  return name.split('.').pop().toLowerCase();
}
