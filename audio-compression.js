console.log('📦 audio-compression.js loaded (Direct Package Only)');

document.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('fileInput');
  const fileListEl = document.getElementById('fileList');
  const compressBtn = document.getElementById('compressBtn');
  const resetBtn = document.getElementById('resetBtn');
  const progressEl = document.getElementById('progress');
  const outputEl = document.getElementById('output');
  let fileObj = null;

  // 拖拽/点击上传
  ['dragover','dragleave','drop'].forEach(ev => {
    dropArea.addEventListener(ev, e => {
      e.preventDefault();
      dropArea.classList.toggle('hover', ev === 'dragover');
      if (ev === 'drop') handleFile(e.dataTransfer.files[0]);
    });
  });
  dropArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

  function handleFile(file) {
    if (!file || !file.type.startsWith('audio/')) return;
    fileObj = { file, originalSize: file.size };
    renderFileList();
  }

  function renderFileList() {
    fileListEl.innerHTML = '';
    if (!fileObj) return;
    const li = document.createElement('li');
    li.textContent = fileObj.file.name;
    const btn = document.createElement('button');
    btn.className = 'remove-btn';
    btn.textContent = '×';
    btn.onclick = () => {
      fileObj = null;
      renderFileList();
    };
    li.appendChild(btn);
    fileListEl.appendChild(li);
  }

  resetBtn.onclick = () => {
    fileObj = null;
    renderFileList();
    progressEl.textContent = 'Waiting for upload…';
    outputEl.innerHTML = '';
    compressBtn.disabled = false;
  };

  compressBtn.onclick = async () => {
    if (!fileObj) {
      alert('Please select an audio file.');
      return;
    }
    compressBtn.disabled = true;
    outputEl.innerHTML = '';
    progressEl.textContent = 'Processing…';

    // 直接返回原文件
    const file = fileObj.file;
    const afterSize = file.size;
    const div = document.createElement('div');
    div.className = 'line';
    div.innerHTML = `${file.name}: ${(fileObj.originalSize/1024).toFixed(1)} KB → ${(afterSize/1024).toFixed(1)} KB
      <br><span style="color:orange;">No compression for this format. Original file is ready for download.</span>
    `;
    const dl = document.createElement('button');
    dl.className = 'download-btn';
    dl.textContent = 'Download';
    dl.onclick = () => saveAs(file, file.name);
    div.appendChild(dl);
    outputEl.appendChild(div);

    progressEl.textContent = 'Done!';
    compressBtn.disabled = false;
  };
});
