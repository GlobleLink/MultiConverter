console.log('📦 audio-compression.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('fileInput');
  const fileListEl = document.getElementById('fileList');
  const compressBtn = document.getElementById('compressBtn');
  const resetBtn = document.getElementById('resetBtn');
  const progressEl = document.getElementById('progress');
  const outputEl = document.getElementById('output');
  const warnEl = document.getElementById('compatibilityMessage');

  let fileObj = null;

  // 检查浏览器支持
  const supportMR = typeof MediaRecorder !== 'undefined';
  const supportCS = HTMLAudioElement.prototype.captureStream !== undefined;
  if (!supportMR || !supportCS) {
    warnEl.style.display = 'block';
    compressBtn.disabled = true;
    return;
  }

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
    progressEl.textContent = 'Compressing…';

    const quality = document.querySelector('input[name="quality"]:checked').value;
    const bitrateMap = { low: 32000, medium: 64000, high: 128000 };
    let blob;
    try {
      blob = await recordToWebMAudio(fileObj.file, bitrateMap[quality]);
    } catch (e) {
      console.warn(e);
      blob = fileObj.file;
    }
    const afterSize = blob.size;
    const div = document.createElement('div');
    div.className = 'line';
    div.innerHTML = `${fileObj.file.name}: ${(fileObj.originalSize/1024).toFixed(1)} KB → ${(afterSize/1024).toFixed(1)} KB`;
    const dl = document.createElement('button');
    dl.className = 'download-btn';
    dl.textContent = 'Download';
    dl.onclick = () => saveAs(blob, fileObj.file.name.replace(/\.[^/.]+$/, '_compressed.webm'));
    div.appendChild(dl);
    outputEl.appendChild(div);
    progressEl.textContent = 'Done!';
    compressBtn.disabled = false;
  };

  function recordToWebMAudio(file, audioBitsPerSecond) {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      audio.src = URL.createObjectURL(file);
      audio.muted = true;
      audio.playsInline = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);

      audio.onloadedmetadata = () => {
        const stream = audio.captureStream();
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond });
        const chunks = [];
        recorder.ondataavailable = e => e.data && chunks.push(e.data);
        recorder.onerror = e => reject(e.error || new Error('Recording failed'));
        recorder.onstop = () => {
          const out = new Blob(chunks, { type: mime });
          document.body.removeChild(audio);
          resolve(out);
        };
        recorder.start();
        audio.play().catch(err => reject(err));
        audio.onended = () => recorder.stop();
      };
      audio.onerror = () => reject(new Error('Failed to load audio'));
    });
  }
});
