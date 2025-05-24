console.log('📦 pdf-compression.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const dropArea       = document.getElementById('dropArea');
  const fileInput      = document.getElementById('fileInput');
  const fileListEl     = document.getElementById('fileList');
  const compressBtn    = document.getElementById('compressBtn');
  const downloadZipBtn = document.getElementById('downloadZipBtn');
  const resetBtn       = document.getElementById('resetBtn');
  const progressEl     = document.getElementById('progress');
  const outputEl       = document.getElementById('output');

  let files = [];

  // 拖拽 & 点击
  ['dragover','dragleave','drop'].forEach(ev => {
    dropArea.addEventListener(ev, e => {
      e.preventDefault();
      dropArea.classList.toggle('hover', ev === 'dragover');
      if (ev === 'drop') handleFiles(e.dataTransfer.files);
    });
  });
  dropArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  // 处理文件
  function handleFiles(list) {
    for (let file of list) {
      if (file.type !== 'application/pdf') continue;
      if (files.length >= 3) {
        alert('Slow down, superstar! Only 3 PDFs at once—drop a file before adding more ✨');
        break;
      }
      files.push({ file, originalSize: file.size });
    }
    renderFileList();
  }

  // 渲染文件列表
  function renderFileList() {
    fileListEl.innerHTML = '';
    files.forEach((obj, idx) => {
      const li = document.createElement('li');
      li.textContent = obj.file.name;
      const btn = document.createElement('button');
      btn.className = 'remove-btn';
      btn.textContent = '×';
      btn.onclick = () => {
        files.splice(idx, 1);
        renderFileList();
      };
      li.appendChild(btn);
      fileListEl.appendChild(li);
    });
  }

  // 重置
  resetBtn.addEventListener('click', () => {
    files = [];
    renderFileList();
    progressEl.textContent = 'Waiting for upload…';
    outputEl.innerHTML = '';
    downloadZipBtn.style.display = 'none';
    downloadZipBtn.disabled = true;
    compressBtn.disabled = false;
  });

  // 压缩（示例：直接打包原文件）
  compressBtn.addEventListener('click', async () => {
    if (!files.length) {
      alert('Please select at least one PDF.');
      return;
    }
    compressBtn.disabled = true;
    progressEl.textContent = 'Starting compression…';
    outputEl.innerHTML = '';
    downloadZipBtn.style.display = 'none';
    downloadZipBtn.disabled = true;

    const zip = new JSZip();

    for (let obj of files) {
      const { file, originalSize } = obj;
      progressEl.textContent = `Processing ${file.name}…`;

      // 原样打包
      const blob = file;
      const afterSize = blob.size;

      // 显示对比
      const line = document.createElement('div');
      line.className = 'line';
      line.innerHTML = `
        ${file.name}: ${(originalSize/1024).toFixed(1)} KB → ${(afterSize/1024).toFixed(1)} KB
      `;
      const dl = document.createElement('button');
      dl.className = 'download-btn';
      dl.textContent = 'Download';
      dl.onclick = () => saveAs(blob, file.name);
      line.appendChild(dl);
      outputEl.appendChild(line);

      // 添加到 ZIP
      zip.file(file.name, blob);
    }

    // ZIP 下载
    progressEl.textContent = 'Packaging ZIP…';
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadZipBtn.style.display = 'inline-block';
    downloadZipBtn.disabled = false;
    downloadZipBtn.onclick = () => saveAs(zipBlob, 'compressed-pdfs.zip');
    progressEl.textContent = 'Done!';
  });
});
