// 引入 FFmpeg.wasm 全局对象
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

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

// 拖拽 & 选取
['dragenter','dragover','dragleave','drop'].forEach(evt => {
  dropArea.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    dropArea.classList.toggle('dragover', evt==='dragover');
  });
});
dropArea.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

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

// 重置
function resetAll() {
  selectedFile = null;
  resultBlob   = null;
  fileList.innerHTML = '';
  downloadBtn.style.display = 'none';
  downloadBtn.disabled     = true;
  progress.textContent     = 'Waiting for upload…';
  output.innerHTML         = '';
}
resetBtn.addEventListener('click', resetAll);

// 点击压缩
compressBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    alert('Please select a video 😊');
    return;
  }
  compressBtn.disabled = resetBtn.disabled = true;
  progress.textContent = 'Loading FFmpeg…';
  await ffmpeg.load();

  // 读取 CRF 值
  const qualityCRF = document.querySelector('input[name="quality"]:checked').value;

  // 执行压缩
  const { blob, origSize, newSize, outputName } =
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

// 单文件下载
downloadBtn.addEventListener('click', () => {
  if (!resultBlob) return;
  const url = URL.createObjectURL(resultBlob);
  const link = document.createElement('a');
  link.href = url;
  // download 属性保持与源文件相同的后缀
  link.download = resultBlob.name || selectedFile.name.replace(/\.[^/.]+$/, '') + '-compressed.' + getExt(selectedFile.name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

/**
 * 压缩单个视频，保持同格式输出
 * @param {File} file      原始视频文件
 * @param {string} qualityCRF CRF 数值（越小质量越高）
 * @returns {Promise<{blob:Blob, origSize:number, newSize:number, outputName:string}>}
 */
async function compressSingle(file, qualityCRF) {
  // 1. 提取扩展名和输出文件名
  const ext = getExt(file.name);                      // e.g. "mp4", "mov"
  const base = file.name.replace(/\.[^/.]+$/, '');
  const outputName = `${base}-compressed.${ext}`;

  // 2. 写入 FFmpeg 文件系统
  ffmpeg.FS('writeFile', file.name, await fetchFile(file));

  // 3. 根据 ext 动态选择视频编码器
  let vcodec = 'libx264';
  if (ext === 'webm')      vcodec = 'libvpx-vp9';
  else if (ext === 'avi')  vcodec = 'libx264';
  else if (ext === 'mov')  vcodec = 'libx264';
  // （如需支持更多容器，可在此分支添加）

  // 4. 执行转码
  await ffmpeg.run(
    '-i', file.name,
    '-c:v', vcodec,
    '-crf', qualityCRF,
    outputName
  );

  // 5. 读取输出并生成 Blob
  const data = ffmpeg.FS('readFile', outputName);
  const blob = new Blob([data.buffer], { type: file.type });
  // 把文件名也附加到 Blob 以便下载用
  blob.name = outputName;

  return {
    blob,
    origSize: file.size,
    newSize: blob.size,
    outputName
  };
}

// 获取小写后缀
function getExt(filename) {
  return filename.split('.').pop().toLowerCase();
}
