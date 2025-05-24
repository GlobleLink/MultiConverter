console.log('📦 audio-compression.js (fallback mode) loaded');

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
      dropArea.classList.toggle('hover', ev==='dragover');
      if (ev==='drop') handleFiles(e.dataTransfer.files);
    });
  });
  dropArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  function handleFiles(list) {
    for (let f of list) {
      if (!f.type.startsWith('audio/')) continue;
      if (files.length >= 3) {
        alert('Only 3 audios allowed at once.');
        break;
      }
      files.push({ file: f, originalSize: f.size });
    }
    renderList();
  }

  function renderList() {
    fileListEl.innerHTML = '';
    files.forEach((obj, idx) => {
      const li = document.createElement('li');
      li.textContent = obj.file.name;
      const btn = document.createElement('button');
      btn.textContent = '×';
      btn.className = 'remove-btn';
      btn.onclick = () => { files.splice(idx,1); renderList(); };
      li.appendChild(btn);
      fileListEl.appendChild(li);
    });
  }

  resetBtn.onclick = () => {
    files = [];
    renderList();
    progressEl.textContent = 'Waiting for upload…';
    outputEl.innerHTML = '';
    downloadZipBtn.style.display = 'none';
    downloadZipBtn.disabled = true;
    compressBtn.disabled = false;
  };

  compressBtn.onclick = async () => {
    if (!files.length) {
      alert('Select at least one audio.');
      return;
    }
    compressBtn.disabled = true;
    progressEl.textContent = 'Processing…';
    outputEl.innerHTML = '';
    downloadZipBtn.style.display = 'none';
    downloadZipBtn.disabled = true;

    const zip = new JSZip();

    // 遍历每个文件，打包原文件并显示对比
    for (const {file, originalSize} of files) {
      progressEl.textContent = `Processing ${file.name}…`;
      // 这里暂时直接用原文件；后续可替换为 ffmpeg.wasm 真实压缩
      const blob = file;
      const afterSize = blob.size;

      const div = document.createElement('div');
      div.className = 'line';
      div.innerHTML = 
        `${file.name}: ${(originalSize/1024).toFixed(1)} KB → ${(afterSize/1024).toFixed(1)} KB`;
      const dl = document.createElement('button');
      dl.className = 'download-btn';
      dl.textContent = 'Download';
      dl.onclick = () => saveAs(blob, file.name.replace(/\.[^/.]+$/, '_packed.webm'));
      div.appendChild(dl);
      outputEl.appendChild(div);

      zip.file(file.name.replace(/\.[^/.]+$/, '_packed.webm'), blob);
    }

    // 生成 ZIP 下载
    progressEl.textContent = 'Packaging ZIP…';
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadZipBtn.style.display = 'inline-block';
    downloadZipBtn.disabled = false;
    downloadZipBtn.onclick = () => saveAs(zipBlob, 'audios.zip');
    progressEl.textContent = 'Done!';
    compressBtn.disabled = false;
  };
});
