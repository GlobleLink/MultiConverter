console.log('📦 audio-compression.js loaded (smart fallback)');

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

    const file = fileObj.file;
    let blob, isCompressed = false;
    let errorMsg = '';

    // 仅 webm/ogg 走 MediaRecorder 进行“压缩”，其它全部直接返回原文件
    if (/\.(webm|ogg)$/i.test(file.name)) {
      try {
        const quality = document.querySelector('input[name="quality"]:checked').value;
        const bitrateMap = { low: 32000, medium: 64000, high: 128000 };
        blob = await recordToWebMAudio(file, bitrateMap[quality]);
        isCompressed = true;
      } catch (e) {
        console.warn(e);
        blob = file;
        errorMsg = `<span style="color:orange;">Compression failed, original file provided.</span>`;
      }
    } else {
      blob = file;
      errorMsg = `<span style="color:orange;">This audio format cannot be compressed in browser, original file provided.</span>`;
    }

    const afterSize = blob.size;
    const div = document.createElement('div');
    div.className = 'line';
    div.innerHTML = `${file.name}: ${(fileObj.originalSize/1024).toFixed(1)} KB → ${(afterSize/1024).toFixed(1)} KB` +
      (errorMsg ? `<br>${errorMsg}` : '');
    const dl = document.createElement('button');
    dl.className = 'download-btn';
    dl.textContent = 'Download';
    // 压缩/原样，下载均以 .webm 后缀（如果是压缩）或原后缀
    dl.onclick = () => saveAs(blob, isCompressed 
      ? file.name.replace(/\.[^/.]+$/, '_compressed.webm') 
      : file.name);
    div.appendChild(dl);
    outputEl.appendChild(div);

    progressEl.textContent = 'Done!';
    compressBtn.disabled = false;
  };

  // 仅 webm/ogg 可录制压缩
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
