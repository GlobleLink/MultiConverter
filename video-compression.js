console.log('📦 WebM-only video-compression.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const dropZone    = document.getElementById('dropZone');
  const fileList    = document.getElementById('fileList');
  const compressBtn = document.getElementById('compressBtn');
  const resetBtn    = document.getElementById('resetBtn');
  const statusEl    = document.getElementById('status');
  const warnEl      = document.getElementById('compatibilityMessage');
  let files = [];

  // 兼容性检测
  const supportMR  = typeof MediaRecorder !== 'undefined';
  const supportCS  = HTMLVideoElement.prototype.captureStream !== undefined;
  if (!supportMR || !supportCS) {
    warnEl.style.display = 'block';
    compressBtn.disabled = true;
    return;
  }

  // 拖拽 & 点击选文件
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('hover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('hover'));
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('hover'); handleFiles(e.dataTransfer.files); });
  dropZone.addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'video/*'; inp.multiple = true;
    inp.onchange = () => handleFiles(inp.files);
    inp.click();
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    files = [];
    fileList.innerHTML = '';
    statusEl.textContent = 'Waiting for upload…';
    compressBtn.disabled = false;
  });

  // Compress 主流程
  compressBtn.addEventListener('click', async () => {
    if (files.length === 0) {
      alert('Please select at least one video.');
      return;
    }
    compressBtn.disabled = true;
    statusEl.textContent = 'Starting compression…';

    try {
      const zip = new JSZip();
      const quality = document.querySelector('input[name="quality"]:checked').value;
      const bitrateMap = { low: 200_000, medium: 500_000, high: 1_000_000 };

      for (let file of files) {
        statusEl.textContent = `Compressing ${file.name}…`;
        const blob = await recordToWebM(file, bitrateMap[quality]);
        const base    = file.name.replace(/\.[^/.]+$/, '');
        const outName = `${base}-compressed.webm`;
        zip.file(outName, blob);
      }

      statusEl.textContent = 'Packaging ZIP…';
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'compressed-videos-webm.zip');
      statusEl.textContent = 'Done!';
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
      statusEl.textContent = 'Error occurred.';
    } finally {
      compressBtn.disabled = false;
    }
  });

  // 处理文件列表
  function handleFiles(selected) {
    Array.from(selected).slice(0, 3 - files.length).forEach(file => {
      if (!file.type.startsWith('video/')) return;
      files.push(file);
      const li = document.createElement('li');
      li.textContent = file.name;
      fileList.appendChild(li);
    });
  }

  // MediaRecorder 重录到 WebM 的核心函数
  async function recordToWebM(file, videoBitsPerSecond) {
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

        recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        recorder.onerror = e => reject(e.error || new Error('Recording failed'));
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mime });
          document.body.removeChild(video);
          resolve(blob);
        };

        recorder.start();
        video.play().catch(err => reject(err));
        video.onended = () => recorder.stop();
      };

      video.onerror = () => reject(new Error('Failed to load video'));
    });
  }
});