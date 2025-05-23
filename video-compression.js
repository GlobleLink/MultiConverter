console.log('📦 video-compression.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  // 元素引用
  const dropZone   = document.getElementById('dropZone');
  const fileList   = document.getElementById('fileList');
  const compressBtn = document.getElementById('compressBtn');
  const resetBtn    = document.getElementById('resetBtn');
  const statusEl    = document.getElementById('status');

  let files = [];

  // 拖放 & 选择文件处理
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('hover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('hover');
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('hover');
    handleFiles(e.dataTransfer.files);
  });
  dropZone.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.multiple = true;
    input.onchange = () => handleFiles(input.files);
    input.click();
  });

  // 重置
  resetBtn.addEventListener('click', () => {
    files = [];
    fileList.innerHTML = '';
    statusEl.textContent = 'Waiting for upload…';
  });

  // Compress 按钮
  compressBtn.addEventListener('click', async () => {
    console.log('🛠️ Compress button clicked');
    if (files.length === 0) return alert('Please select at least one video.');

    compressBtn.disabled = true;
    statusEl.textContent = 'Loading FFmpeg…';

    // —— 关键：使用全大写 FFmpeg
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({
      log: true,
      corePath: 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg-core.js'
    });

    await ffmpeg.load();
    statusEl.textContent = 'Compressing…';

    const zip = new JSZip();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const quality = document.querySelector('input[name="quality"]:checked').value;
      const outName = file.name.replace(/\.(\w+)$/, `_compressed.$1`);

      // 写入内存
      ffmpeg.FS('writeFile', file.name, await fetchFile(file));

      // 调用 ffmpeg.run
      const args = [
        '-i', file.name,
        '-vcodec', 'libx264',
        ...(quality === 'low'   ? ['-crf', '30']
           : quality === 'medium'? ['-crf', '23']
           : ['-crf', '18']),
        outName
      ];
      await ffmpeg.run(...args);

      // 读取压缩结果
      const data = ffmpeg.FS('readFile', outName);
      zip.file(outName, data);

      // 清理 FS
      ffmpeg.FS('unlink', file.name);
      ffmpeg.FS('unlink', outName);
    }

    statusEl.textContent = 'Packaging ZIP…';
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'compressed-videos.zip');

    statusEl.textContent = 'Done!';
    compressBtn.disabled = false;
  });

  // 处理用户选择的文件
  function handleFiles(selected) {
    Array.from(selected).slice(0, 3).forEach(file => {
      if (!file.type.startsWith('video/')) return;
      files.push(file);
      const li = document.createElement('li');
      li.textContent = file.name;
      fileList.appendChild(li);
    });
  }
});
