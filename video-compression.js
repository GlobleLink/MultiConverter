// video-compression.js

// —— 1. 先把“文件列表显示”逻辑跑起来 —— //
document.addEventListener('DOMContentLoaded', () => {
  const dropArea   = document.getElementById('dropArea');
  const fileInput  = document.getElementById('fileInput');
  const fileListEl = document.getElementById('fileList');
  const MAX_FILES  = 3;
  let selectedFiles = [];

  // 样式标记
  ['dragenter','dragover','dragleave','drop'].forEach(evt => {
    dropArea.addEventListener(evt, e => {
      e.preventDefault(); e.stopPropagation();
      dropArea.classList.toggle('dragover', evt === 'dragover');
    });
  });

  // 点击或选取文件
  dropArea.addEventListener('click', () => fileInput.click());
  dropArea.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
  fileInput.addEventListener('change', e => handleFiles(e.target.files));

  function handleFiles(files) {
    const arr = Array.from(files);
    const space = MAX_FILES - selectedFiles.length;
    if (arr.length > space) {
      alert('Slow down, superstar! Only 3 videos at once—drop a file before adding more ✨');
    }
    // 只取能放下的，并去重
    arr.slice(0, space).forEach(f => {
      if (!selectedFiles.find(x => x.name === f.name)) {
        selectedFiles.push(f);
      }
    });
    renderFileList();
  }

  function renderFileList() {
    fileListEl.innerHTML = '';
    selectedFiles.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'file-item';
      row.innerHTML = `
        <svg viewBox="0 0 24 24" class="file-icon">
          <path fill="none" stroke="var(--color-primary)" stroke-width="2"
            d="M4 4h16v16H4zM16 8l-6 4 6 4V8z"/>
        </svg>
        <span class="file-name">${f.name}</span>
        <button class="remove-btn" data-i="${i}">×</button>
      `;
      fileListEl.appendChild(row);
    });
    // 绑定删除按钮
    fileListEl.querySelectorAll('.remove-btn').forEach(btn => {
      btn.onclick = e => {
        const idx = +e.currentTarget.dataset.i;
        selectedFiles.splice(idx, 1);
        renderFileList();
      };
    });
  }

  // —— 2. 然后再加载 FFmpeg & 绑定“Compress”按钮 —— //
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg-core.js'
  });

  const compressBtn = document.getElementById('compressBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn    = document.getElementById('resetBtn');
  const progressEl  = document.getElementById('progress');
  const outputEl    = document.getElementById('output');

  resetBtn.onclick = () => {
    selectedFiles = [];
    renderFileList();
    outputEl.innerHTML   = '';
    progressEl.textContent = 'Waiting for upload…';
    downloadBtn.style.display = 'none';
    downloadBtn.disabled     = true;
  };

  compressBtn.onclick = async () => {
    if (!selectedFiles.length) {
      return alert('Please select at least one video 😊');
    }

    compressBtn.disabled = resetBtn.disabled = true;
    outputEl.innerHTML   = '';
    progressEl.textContent = 'Loading FFmpeg…';
    await ffmpeg.load();

    const crf = document.querySelector('input[name="quality"]:checked').value;
    const blobs = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const f = selectedFiles[i];
      progressEl.textContent = `Compressing ${i+1}/${selectedFiles.length}: ${f.name}`;
      // 写文件、执行
      ffmpeg.FS('writeFile', f.name, await fetchFile(f));
      await ffmpeg.run('-i', f.name, '-c:v', 'libx264', '-crf', crf, `out_${i}.${f.name.split('.').pop()}`);
      const data = ffmpeg.FS('readFile', `out_${i}.${f.name.split('.').pop()}`);
      const blob = new Blob([data.buffer], { type: f.type });
      blob.name = `compressed-${f.name}`;
      blobs.push({ blob, orig: f.size, out: blob.size });
    }

    // 显示对比 + 下载按钮
    progressEl.textContent = 'Done! Choose download option.';
    const ul = document.createElement('ul');
    blobs.forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${r.blob.name}: ${(r.orig/1024/1024).toFixed(2)}MB →
        ${(r.out/1024/1024).toFixed(2)}MB
        <a href="#" class="single-download" data-name="${r.blob.name}">Download</a>
      `;
      ul.appendChild(li);
    });
    outputEl.appendChild(ul);

    // 单文件下载
    ul.querySelectorAll('.single-download').forEach(a => {
      a.onclick = e => {
        e.preventDefault();
        const info = blobs.find(x => x.blob.name === e.currentTarget.dataset.name);
        const url  = URL.createObjectURL(info.blob);
        const link = document.createElement('a');
        link.href = url; link.download = info.blob.name;
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
      blobs.forEach(r => zip.file(r.blob.name, r.blob));
      progressEl.textContent = 'Packing ZIP…';
      const z = await zip.generateAsync({ type: 'blob' });
      saveAs(z, 'videos.zip');
    };

    compressBtn.disabled = resetBtn.disabled = false;
  };
});
