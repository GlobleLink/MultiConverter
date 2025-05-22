// video-compression.js

// 1) 初始化 FFmpeg
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

// 2) 拿到页面元素
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

// 3) 确保点击或拖拽都能触发文件选择
dropArea.addEventListener('click', ()=> fileInput.click());
['dragenter','dragover','dragleave','drop'].forEach(evt=>{
  dropArea.addEventListener(evt, e=>{
    e.preventDefault(); e.stopPropagation();
    if(evt==='dragover') dropArea.classList.add('dragover');
    if(evt==='dragleave'||evt==='drop') dropArea.classList.remove('dragover');
  });
});
dropArea.addEventListener('drop', e => {
  if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => {
  if(e.target.files.length) handleFile(e.target.files[0]);
});

// 4) 显示已选文件名
function handleFile(file) {
  selectedFile = file;
  // 清空旧列表
  fileList.innerHTML = '';
  // 新增一行显示文件名 + 删除按钮
  const div = document.createElement('div');
  div.className = 'file-item';
  div.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path fill="none" stroke="var(--color-primary)" stroke-width="2"
            d="M4 4h16v16H4zM16 8l-6 4 6 4V8z"/>
    </svg>
    <span>${file.name}</span>
    <button class="remove-btn" title="Remove" onclick="resetAll()">×</button>
  `;
  fileList.appendChild(div);
}

// 5) Reset 回到初始状态
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

// 6) 压缩 & 下载 流程（同格式输出）
compressBtn.addEventListener('click', async () => {
  if (!selectedFile) return alert('Please select a video first 😊');
  compressBtn.disabled = resetBtn.disabled = true;
  progress.textContent = 'Loading FFmpeg…';
  await ffmpeg.load();

  const qualityCRF = document.querySelector('input[name="quality"]:checked').value;
  const { blob, origSize, newSize } = 
        await compressSingle(selectedFile, qualityCRF);

  resultBlob = blob;
  progress.textContent = 'Done! 🎉';
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

downloadBtn.addEventListener('click', () => {
  if (!resultBlob) return;
  const url = URL.createObjectURL(resultBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = resultBlob.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// 7) 核心压缩函数：保留原格式
async function compressSingle(file, qualityCRF) {
  const ext = getExt(file.name);
  const base = file.name.replace(/\.[^/.]+$/, '');
  const outputName = `${base}-compressed.${ext}`;

  // 写入虚拟文件
  ffmpeg.FS('writeFile', file.name, await fetchFile(file));

  // 选编码器
  let vcodec = 'libx264';
  if (ext === 'webm')      vcodec = 'libvpx-vp9';
  else if (['avi','mov','wmv','mkv'].includes(ext)) vcodec = 'libx264';

  // 运行 ffmpeg
  await ffmpeg.run(
    '-i', file.name,
    '-c:v', vcodec,
    '-crf', qualityCRF,
    outputName
  );

  // 读取输出
  const data = ffmpeg.FS('readFile', outputName);
  const blob = new Blob([data.buffer], { type: file.type });
  blob.name = outputName;

  return {
    blob,
    origSize: file.size,
    newSize: blob.size
  };
}

// 提取文件后缀
function getExt(name) {
  return name.split('.').pop().toLowerCase();
}
