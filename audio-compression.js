console.log('📦 audio-compression.js loaded (with ffmpeg.wasm & zip batch)');

document.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('fileInput');
  const fileListEl = document.getElementById('fileList');
  const compressBtn = document.getElementById('compressBtn');
  const progressEl = document.getElementById('progress');
  const outputEl = document.getElementById('output');
  let fileArr = [];

  // ffmpeg.wasm 初始化
  let ffmpegLoaded = false;
  let ffmpeg;
  let ffmpegLoadingPromise = null;

  async function loadFFmpeg() {
    if (ffmpegLoaded) return;
    if (ffmpegLoadingPromise) return ffmpegLoadingPromise;
    progressEl.textContent = 'Loading audio compression engine...';
    ffmpegLoadingPromise = new Promise(async (resolve) => {
      const { createFFmpeg, fetchFile } = FFmpeg;
      ffmpeg = createFFmpeg({ log: false });
      await ffmpeg.load();
      ffmpegLoaded = true;
      resolve();
    });
    return ffmpegLoadingPromise;
  }

  // 拖拽/点击上传
  ['dragover','dragleave','drop'].forEach(ev => {
    dropArea.addEventListener(ev, e => {
      e.preventDefault();
      dropArea.classList.toggle('hover', ev === 'dragover');
      if (ev === 'drop') handleFiles(e.dataTransfer.files);
    });
  });
  dropArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  function handleFiles(files) {
    fileArr = [];
    for (let file of files) {
      if (file && file.type.startsWith('audio/')) {
        fileArr.push({ file, originalSize: file.size });
      }
    }
    renderFileList();
  }

  function renderFileList() {
    fileListEl.innerHTML = '';
    if (!fileArr.length) return;
    fileArr.forEach((obj, idx) => {
      const li = document.createElement('li');
      li.textContent = obj.file.name;
      const btn = document.createElement('button');
      btn.className = 'remove-btn';
      btn.textContent = '×';
      btn.onclick = () => {
        fileArr.splice(idx, 1);
        renderFileList();
      };
      li.appendChild(btn);
      fileListEl.appendChild(li);
    });
  }

  compressBtn.onclick = async () => {
    if (!fileArr.length) {
      alert('Please select audio files.');
      return;
    }
    compressBtn.disabled = true;
    outputEl.innerHTML = '';
    progressEl.textContent = 'Processing…';

    await loadFFmpeg();
    const zip = new JSZip();
    let count = 0;

    for (let obj of fileArr) {
      const file = obj.file;
      const inputName = file.name;
      const outputName = file.name.replace(/\.[^/.]+$/, '_compressed.mp3');
      try {
        progressEl.textContent = `Compressing: ${file.name} (${count+1}/${fileArr.length})`;
        await ffmpeg.FS('writeFile', inputName, await FFmpeg.fetchFile(file));
        await ffmpeg.run('-i', inputName, '-b:a', '128k', outputName);
        const data = ffmpeg.FS('readFile', outputName);
        zip.file(outputName, data);
        // 清理
        ffmpeg.FS('unlink', inputName);
        ffmpeg.FS('unlink', outputName);
      } catch (e) {
        console.warn(e);
        zip.file(file.name, file); // 压缩失败则原样打包
      }
      count++;
    }

    progressEl.textContent = 'Packaging ZIP...';
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'compressed_audios.zip';
    a.click();

    progressEl.textContent = 'Done!';
    compressBtn.disabled = false;
  };
});