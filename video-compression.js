// video-compression.js

// 1. 初始化 FFmpeg.wasm
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

// 2. 获取 DOM 元素
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

// 3. 让整个拖拽区可点击打开文件对话框
dropArea.addEventListener('click', () => fileInput.click());

// 4. 拖拽 & 选取 文件 监听
['dragenter','dragover','dragleave','drop'].forEach(evt => {
  dropArea.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    if (evt === 'dragover') dropArea.classList.add('dragover');
    if (evt === 'dragleave' || evt === 'drop') dropArea.classList.remove('dragover');
  });
});
dropArea.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

// 5. 处理用户选中文件
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

// 6. 重置所有状态
function resetAll() {
  selectedFile = null;
  resultBlob   = null;
  fileList.innerHTML      = '';
  downloadBtn.style.display = 'none';
  downloadBtn.disabled      = true;
  progress.textContent      = 'Waiting for upload…';
  output.innerHTML          = '';
}
resetBtn.addEventListener('click', resetAll);

// 7. 点击“Compress Video”按钮
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
  downloadBtn.disabled = false;

  output.innerHTML = `
    <p>
      Original: ${(origSize/1024/1024).toFixed(2)} MB
      → Compressed: ${(newSize/1024/1024).toFixed(2)} MB
    </p>
  `;
  compressBtn.disabled = resetBtn.disabled = false;
});

// 8. 下载压缩后的视频
downloadBtn.addEventListener('click', () => {
  if (!resultBlob) return;
  const url = URL.createObjectURL(resultBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = resultBlob.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

// 9. 核心压缩函数：保持同格式输出
async function compressSingle(file, qualityCRF) {
  const ext       = getExt(file.name);                    // e.g. "mp4", "mov"
  const base      = file.name.replace(/\.[^/.]+$/, '');
  const outputName= `${base}-compressed.${ext}`;

  // 写入虚拟文件系统
  ffmpeg.FS('writeFile', file.name, await fetchFile(file));

  // 根据扩展名选择编码器
  let vcodec = 'libx264';
  if (ext === 'webm')      vcodec = 'libvpx-vp9';
  else if (ext === 'avi')  vcodec = 'libx264';
  else if (ext === 'mov')  vcodec = 'libx264';
  else if (ext === 'wmv')  vcodec = 'libx264';
  else if (ext === 'mkv')  vcodec = 'libx264';

  // 执行 FFmpeg 命令
  await ffmpeg.run(
    '-i', file.name,
    '-c:v', vcodec,
    '-crf', qualityCRF,
    outputName
  );

  // 读取输出并生成 Blob
  const data = ffmpeg.FS('readFile', outputName);
  const blob = new Blob([data.buffer], { type: file.type });
  blob.name = outputName;

  return {
    blob,
    origSize: file.size,
    newSize: blob.size
  };
}

// 10. 辅助：提取文件扩展名
function getExt(filename) {
  return filename.split('.').pop().toLowerCase();
}
