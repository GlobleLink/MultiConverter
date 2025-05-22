// video-compression.js

// —— 1. 初始化 FFmpeg.wasm，指定 corePath 才能正确 load —— //
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
  log: true,
  // 一定要指向 ffmpeg-core.js 的 CDN 地址：
  corePath: 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg-core.js'
});

// —— 2. 拿到 DOM 元素 —— //
const fileInput    = document.getElementById('fileInput');
const dropArea     = document.getElementById('dropArea');
const fileList     = document.getElementById('fileList');
const compressBtn  = document.getElementById('compressBtn');
const downloadBtn  = document.getElementById('downloadBtn');
const resetBtn     = document.getElementById('resetBtn');
const progress     = document.getElementById('progress');
const output       = document.getElementById('output');

// 改为数组支持多文件
let selectedFiles = [];
let resultBlobs   = [];

// —— 3. 点击/拖拽都能选文件 —— //
dropArea.addEventListener('click', () => fileInput.click());
['dragenter','dragover','dragleave','drop'].forEach(evt => {
  dropArea.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    if (evt === 'dragover') dropArea.classList.add('dragover');
    if (evt === 'dragleave' || evt === 'drop') dropArea.classList.remove('dragover');
  });
});
dropArea.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', e => handleFiles(e.target.files));

// —— 4. 处理并显示已选文件 —— //
function handleFiles(fileList) {
  // 合并去重，并限制最多 3 个
  Array.from(fileList).forEach(f => {
    if (selectedFiles.length < 3 && !selectedFiles.find(x => x.name === f.name)) {
      selectedFiles.push(f);
    }
  });
  renderFileList();
}

function renderFileList() {
  fileList.innerHTML = '';
  selectedFiles.forEach((file, i) => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path fill="none" stroke="var(--color-primary)" stroke-width="2"
              d="M4 4h16v16H4zM16 8l-6 4 6 4V8z"/>
      </svg>
      <span>${file.name}</span>
      <button class="remove-btn" data-index="${i}">×</button>
    `;
    fileList.appendChild(div);
  });
  // 绑定删除
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.onclick = e => {
      selectedFiles.splice(+e.currentTarget.dataset.index, 1);
      renderFileList();
    };
  });
}

// —— 5. Reset —— //
resetBtn.addEventListener('click', () => {
  selectedFiles = [];
  resultBlobs   = [];
  fileList.innerHTML = '';
  output.innerHTML   = '';
  progress.textContent = 'Waiting for upload…';
  downloadBtn.style.display = 'none';
  downloadBtn.disabled     = true;
});

// —— 6. 点击 Compress —— //
compressBtn.addEventListener('click', async () => {
  if (!selectedFiles.length) {
    return alert('Please select at least one video 😊');
  }

  // 禁用按钮，清空上次结果
  compressBtn.disabled = resetBtn.disabled = true;
  output.innerHTML     = '';
  progress.textContent = 'Loading FFmpeg core…';

  // 1) 加载 wasm
  await ffmpeg.load();

  const crf = document.querySelector('input[name="quality"]:checked').value;
  resultBlobs = [];

  // 2) 逐个压缩
  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    progress.textContent = `Compressing ${i+1}/${selectedFiles.length}: ${file.name}`;
    const { blob, origSize, newSize } = await compressSingle(file, crf);
    resultBlobs.push({ blob, name: blob.name, origSize, newSize });
  }

  // 3) 显示对比 & 显示下载所有按钮
  progress.textContent = 'Done! Choose download option.';
  const ul = document.createElement('ul');
  resultBlobs.forEach(r => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${r.name}: ${(r.origSize/1024/1024).toFixed(2)}MB → ${(r.newSize/1024/1024).toFixed(2)}MB
      <a href="#" class="single-download" data-name="${r.name}">Download</a>
    `;
    ul.appendChild(li);
  });
  output.appendChild(ul);

  // 绑定单个下载
  document.querySelectorAll('.single-download').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      const info = resultBlobs.find(x => x.name === e.currentTarget.dataset.name);
      const url  = URL.createObjectURL(info.blob);
      const link = document.createElement('a');
      link.href = url; link.download = info.name;
      document.body.appendChild(link); link.click();
      link.remove(); URL.revokeObjectURL(url);
    };
  });

  downloadBtn.style.display = 'inline-block';
  downloadBtn.disabled     = false;
  compressBtn.disabled     = resetBtn.disabled = false;
});

// —— 7. 下载所有 ZIP —— //
downloadBtn.addEventListener('click', async () => {
  const zip = new JSZip();
  resultBlobs.forEach(r => zip.file(r.name, r.blob));
  progress.textContent = 'Packing ZIP…';
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'videos-compressed.zip');
});

// —— 8. 单个文件压缩函数 —— //
async function compressSingle(file, qualityCRF) {
  const ext = file.name.split('.').pop().toLowerCase();
  const base = file.name.replace(/\.[^/.]+$/, '');
  const outName = `${base}-compressed.${ext}`;

  ffmpeg.FS('writeFile', file.name, await fetchFile(file));

  let vcodec = 'libx264';
  if (ext === 'webm') vcodec = 'libvpx-vp9';

  await ffmpeg.run(
    '-i', file.name,
    '-c:v', vcodec,
    '-crf', qualityCRF,
    outName
  );

  const data = ffmpeg.FS('readFile', outName);
  const blob = new Blob([data.buffer], { type: file.type });
  blob.name = outName;

  return { blob, origSize: file.size, newSize: blob.size };
}
