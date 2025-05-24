console.log('📦 video-compression.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const dropArea       = document.getElementById('dropArea');
  const fileInput      = document.getElementById('fileInput');
  const fileListEl     = document.getElementById('fileList');
  const compressBtn    = document.getElementById('compressBtn');
  const downloadZipBtn = document.getElementById('downloadZipBtn');
  const resetBtn       = document.getElementById('resetBtn');
  const progressEl     = document.getElementById('progress');
  const outputEl       = document.getElementById('output');
  const warnEl         = document.getElementById('compatibilityMessage');

  let files = [];

  // 特性检测
  const supportMR = typeof MediaRecorder !== 'undefined';
  const supportCS = HTMLVideoElement.prototype.captureStream !== undefined;
  if (!supportMR || !supportCS) {
    warnEl.style.display = 'block';
    compressBtn.disabled = true;
    return;
  }

  // 拖拽 & 点击
  ['dragover','dragleave','drop'].forEach(ev =>
    dropArea.addEventListener(ev, e => {
      e.preventDefault();
      dropArea.classList.toggle('hover', ev === 'dragover');
      if (ev === 'drop') handleFiles(e.dataTransfer.files);
    })
  );
  dropArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  // 文件处理
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

  // 压缩主流程
  compressBtn.addEventListener('click', async () => {
    if (!files.length) {
      alert('Please select at least one video.');
      return;
    }
    compressBtn.disabled = true;
    progressEl.textContent = 'Starting compression…';
    outputEl.innerHTML = '';
    downloadZipBtn.style.display = 'none';
    downloadZipBtn.disabled = true;

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
        `;
        const dl = document.createElement('button');
        dl.className = 'download-btn';
        dl.textContent = 'Download';
        dl.onclick = () =>
          saveAs(blob, file.name.replace(/\.[^/.]+$/, '_compressed.webm'));
        line.appendChild(dl);
        outputEl.appendChild(line);

        // 加入 ZIP
        zip.file(
          file.name.replace(/\.[^/.]+$/, '_compressed.webm'),
          blob
        );
      } catch (err) {
        console.error(err);
      }
    }

    // ZIP 下载
    progressEl.textContent = 'Packaging ZIP…';
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadZipBtn.style.display = 'inline-block';
    downloadZipBtn.disabled = false;
    downloadZipBtn.onclick = () => saveAs(zipBlob, 'compressed-videos-webm.zip');
    progressEl.textContent = 'Done!';
  });

  // MediaRecorder 重录
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
        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm;codecs=vp8';
        const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond });
        const chunks = [];
        recorder.ondataavailable = e => e.data && chunks.push(e.data);
        recorder.onerror = e => reject(e.error || new Error('Recording failed'));
        recorder.onstop = () => {
          const out = new Blob(chunks, { type: mime });
          document.body.removeChild(video);
          resolve(out);
        };
        recorder.start();
        video.play().catch(err => reject(err));
        video.onended = () => recorder.stop();
      };

      video.onerror = () => reject(new Error('Failed to load video'));
    });
  }
});
