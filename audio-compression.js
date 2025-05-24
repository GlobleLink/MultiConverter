console.log('📦 audio-compression.js loaded');

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

  const supportMR = typeof MediaRecorder !== 'undefined';
  const supportCS = HTMLAudioElement.prototype.captureStream !== undefined;
  if (!supportMR || !supportCS) {
    warnEl.style.display = 'block';
    compressBtn.disabled = true;
    return;
  }

  ['dragover','dragleave','drop'].forEach(ev => {
    dropArea.addEventListener(ev, e => {
      e.preventDefault();
      dropArea.classList.toggle('hover', ev === 'dragover');
      if (ev === 'drop') handleFiles(e.dataTransfer.files);
    });
  });
  dropArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  function handleFiles(list) {
    for (let file of list) {
      if (!file.type.startsWith('audio/')) continue;
      if (files.length >= 3) {
        alert('Slow down, superstar! Only 3 audios at once—drop a file before adding more ✨');
        break;
      }
      files.push({ file, originalSize: file.size });
    }
    renderFileList();
  }

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

  resetBtn.addEventListener('click', () => {
    files = [];
    renderFileList();
    progressEl.textContent = 'Waiting for upload…';
    outputEl.innerHTML = '';
    downloadZipBtn.style.display = 'none';
    downloadZipBtn.disabled = true;
    compressBtn.disabled = false;
  });

  compressBtn.addEventListener('click', async () => {
    if (!files.length) {
      alert('Please select at least one audio file.');
      return;
    }
    compressBtn.disabled = true;
    progressEl.textContent = 'Starting compression…';
    outputEl.innerHTML = '';
    downloadZipBtn.style.display = 'none';
    downloadZipBtn.disabled = true;

    const zip = new JSZip();
    const quality = document.querySelector('input[name="quality"]:checked').value;
    const bitrateMap = { low: 32000, medium: 64000, high: 128000 };

    for (let obj of files) {
      const { file, originalSize } = obj;
      progressEl.textContent = `Compressing ${file.name}…`;

      let blob;
      try {
        blob = await recordToWebMAudio(file, bitrateMap[quality]);
      } catch (e) {
        console.warn(e);
        blob = file;
      }
      const afterSize = blob.size;

      const line = document.createElement('div');
      line.className = 'line';
      line.textContent = `${file.name}: ${(originalSize/1024).toFixed(1)} KB → ${(afterSize/1024).toFixed(1)} KB`;
      const dl = document.createElement('button');
      dl.className = 'download-btn';
      dl.textContent = 'Download';
      dl.onclick = () => saveAs(blob, file.name.replace(/\.[^/.]+$/, '_compressed.webm'));
      line.appendChild(dl);
      outputEl.appendChild(line);

      zip.file(file.name.replace(/\.[^/.]+$/, '_compressed.webm'), blob);
    }

    progressEl.textContent = 'Packaging ZIP…';
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadZipBtn.style.display = 'inline-block';
    downloadZipBtn.disabled = false;
    downloadZipBtn.onclick = () => saveAs(zipBlob, 'compressed-audios-webm.zip');
    progressEl.textContent = 'Done!';
  });

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
