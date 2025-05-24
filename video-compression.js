console.log('📦 video-compression.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const dropArea    = document.getElementById('dropArea');
  const fileInput   = document.getElementById('fileInput');
  const fileListEl  = document.getElementById('fileList');
  const compressBtn = document.getElementById('compressBtn');
  const resetBtn    = document.getElementById('resetBtn');
  const progressEl  = document.getElementById('progress');
  const outputEl    = document.getElementById('output');
  const warnEl      = document.getElementById('compatibilityMessage');

  let files = [];

  // 特性检测
  const supportMR = typeof MediaRecorder !== 'undefined';
  const supportCS = HTMLVideoElement.prototype.captureStream !== undefined;
  if (!supportMR || !supportCS) {
    warnEl.style.display = 'block';
    return;
  }

  // 拖拽事件
  dropArea.addEventListener('dragover', e => {
    e.preventDefault();
    dropArea.classList.add('hover');
  });
  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('hover');
  });
  dropArea.addEventListener('drop', e => {
    e.preventDefault();
    dropArea.classList.remove('hover');
    handleFiles(e.dataTransfer.files);
  });
  dropArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  // 重置
  resetBtn.addEventListener('click', () => {
    files = [];
    renderFileList();
    progressEl.textContent = 'Waiting for upload…';
    outputEl.innerHTML = '';
    compressBtn.disabled = false;
  });

  // 处理文件
  function handleFiles(list) {
    for (let file of list) {
      if (!file.type.startsWith('video/')) continue;
      if (files.length >= 3) {
        alert('Slow down, superstar! Only 3 videos at once—drop a file before adding more ✨');
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
      btn.innerHTML = '×';
      btn.className = 'remove-btn';
      btn.onclick = () => {
        files.splice(idx, 1);
        renderFileList();
      };
      li.appendChild(btn);
      fileListEl.appendChild(li);
    });
  }

  // 压缩流程
  compressBtn.addEventListener('click', async () => {
    if (files.length === 0) {
      alert('Please select at least one video.');
      return;
    }
    compressBtn.disabled = true;
    progressEl.textContent = 'Starting compression…';
    outputEl.innerHTML = '';

    const zip = new JSZip();
    const quality = document.querySelector('input[name="quality"]:checked').value;
    const bitrateMap = { low: 200_000, medium: 500_000, high: 1_000_000 };

    for (let obj of files) {
      const { file, originalSize } = obj;
      progressEl.textContent = `Compressing ${file.name}…`;
      try {
        const blob = await recordToWebM(file, bitrateMap[quality]);
        const afterSize = blob.size;
        // 显示对比
        const line = document.createElement('div');
        line.className = 'line';
        line.innerHTML = `
          ${file.name}: ${(originalSize/1024).toFixed(1)} KB → ${(afterSize/1024).toFixed(1)} KB
          <button class="download-btn">Download</button>
        `;
        line.querySelector('.download-btn').onclick = () => saveAs(blob, file.name.replace(/\.[^/.]+$/, '_compressed.webm'));
        outputEl.appendChild(line);

        // 打包
        zip.file(file.name.replace(/\.[^/.]+$/, '_compressed.webm'), blob);
      } catch (err) {
        console.error(err);
      }
    }

    // ZIP 下载
    progressEl.textContent = 'Packaging ZIP…';
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipBtn  = document.createElement('button');
    zipBtn.className = 'download-btn';
    zipBtn.textContent = 'Download ZIP';
    zipBtn.onclick = () => saveAs(zipBlob, 'compressed-videos-webm.zip');
    outputEl.appendChild(zipBtn);

    progressEl.textContent = 'Done!';
  });

  // MediaRecorder 重录到 WebM
  function recordToWebM(file, videoBitsPerSecond) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;
      video.style.display = 'none';
      document.body.appendChild(video);

      video.onloadedmetadata = () => {
        const stream = video.captureStream();
        const mime   = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm;codecs=vp8';
        const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond });
        const chunks = [];
        rec.ondataavailable = e => e.data && chunks.push(e.data);
        rec.onerror          = e => reject(e.error || new Error('Recording failed'));
        rec.onstop           = () => {
          const out = new Blob(chunks, { type: mime });
          document.body.removeChild(video);
          resolve(out);
        };
        rec.start();
        video.play().catch(err => reject(err));
        video.onended = () => rec.stop();
      };

      video.onerror = () => reject(new Error('Failed to load video'));
    });
  }
});
