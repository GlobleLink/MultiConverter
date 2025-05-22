// video-compression.js

// —— 1. 初始化 & 变量 —— //
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
  log: true,
  corePath: 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg-core.js'
});

const MAX_FILES    = 3;
const fileInput    = document.getElementById('fileInput');
const dropArea     = document.getElementById('dropArea');
const fileListEl   = document.getElementById('fileList');
const compressBtn  = document.getElementById('compressBtn');
const downloadBtn  = document.getElementById('downloadBtn');
const resetBtn     = document.getElementById('resetBtn');
const progressEl   = document.getElementById('progress');
const outputEl     = document.getElementById('output');

let selectedFiles = [];
let resultBlobs   = [];

// —— 2. 选文件 & 渲染列表 —— //
function renderFileList() {
  fileListEl.innerHTML = '';
  selectedFiles.forEach((file, i) => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
      <svg viewBox="0 0 24 24" class="file-icon">
        <path fill="none" stroke="var(--color-primary)" stroke-width="2"
          d="M4 4h16v16H4zM16 8l-6 4 6 4V8z"/>
      </svg>
      <span class="file-name">${file.name}</span>
      <button class="remove-btn" data-i="${i}">×</button>
    `;
    fileListEl.appendChild(div);
  });
  fileListEl.querySelectorAll('.remove-btn').forEach(btn => {
    btn.onclick = e => {
      selectedFiles.splice(+e.currentTarget.dataset.i, 1);
      renderFileList();
    };
  });
}

function handleFiles(files) {
  const arr = Array.from(files);
  const space = MAX_FILES - selectedFiles.length;
  if (arr.length > space) {
    alert('Slow down, superstar! Only 3 videos at once—drop a file before adding more ✨');
  }
  arr.slice(0, space).forEach(f => {
    if (!selectedFiles.find(x => x.name === f.name)) {
      selectedFiles.push(f);
    }
  });
  renderFileList();
}

// 点/拖事件
dropArea.addEventListener('click', () => fileInput.click());
['dragenter','dragover','dragleave','drop'].forEach(evt => {
  dropArea.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    dropArea.classList.toggle('dragover', evt === 'dragover');
  });
});
dropArea.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', e => handleFiles(e.target.files));

// Reset
resetBtn.onclick = () => {
  selectedFiles = [];
  resultBlobs   = [];
  fileListEl.innerHTML = '';
  outputEl.innerHTML   = '';
  progressEl.textContent = 'Waiting for upload…';
  downloadBtn.style.display = 'none';
  downloadBtn.disabled     = true;
};

// —— 3. 压缩逻辑 —— //
compressBtn.onclick = async () => {
  if (!selectedFiles.length) return alert('Please select at least one video 😊');

  compressBtn.disabled = resetBtn.disabled = true;
  outputEl.innerHTML   = '';
  progressEl.textContent = 'Loading FFmpeg…';

  await ffmpeg.load();

  const crf = document.querySelector('input[name="quality"]:checked').value;
  resultBlobs = [];

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    progressEl.textContent = `Compressing ${i+1}/${selectedFiles.length}: ${file.name}`;
    const { blob, origSize, newSize } = await compressOne(file, crf);
    resultBlobs.push({ blob, name: blob.name, origSize, newSize });
  }

  // 显示结果
  progressEl.textContent = 'Compression complete! Choose download option.';
  const ul = document.createElement('ul');
  resultBlobs.forEach(r => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${r.name}: ${(r.origSize/1024/1024).toFixed(2)}MB →
      ${(r.newSize/1024/1024).toFixed(2)}MB
      <a href="#" class="single-download" data-name="${r.name}">Download</a>
    `;
    ul.appendChild(li);
  });
  outputEl.appendChild(ul);

  // 单文件下载
  ul.querySelectorAll('.single-download').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      const info = resultBlobs.find(x => x.name === e.currentTarget.dataset.name);
      const url  = URL.createObjectURL(info.blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = info.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };
  });

  // 批量 ZIP
  downloadBtn.style.display = 'inline-block';
  downloadBtn.disabled     = false;
  downloadBtn.onclick = async () => {
    const zip = new JSZip();
    resultBlobs.forEach(r => zip.file(r.name, r.blob));
    progressEl.textContent = 'Packaging ZIP…';
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'videos-compressed.zip');
  };

  compressBtn.disabled = resetBtn.disabled = false;
};

// —— 4. 单文件压缩函数 —— //
async function compressOne(file, crf) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const base = file.name.replace(/\.[^/.]+$/, '');
  const out  = `${base}-compressed.${ext}`;

  ffmpeg.FS('writeFile', file.name, await fetchFile(file));

  let vcodec = 'libx264';
  if (ext === 'webm') vcodec = 'libvpx-vp9';

  await ffmpeg.run('-i', file.name, '-c:v', vcodec, '-crf', crf, out);

  const data = ffmpeg.FS('readFile', out);
  const blob = new Blob([data.buffer], { type: file.type });
  blob.name = out;

  return { blob, origSize: file.size, newSize: blob.size };
}
