console.log('📦 video-compression.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const dropZone    = document.getElementById('dropZone');
  const fileList    = document.getElementById('fileList');
  const compressBtn = document.getElementById('compressBtn');
  const resetBtn    = document.getElementById('resetBtn');
  const statusEl    = document.getElementById('status');

  let files = [];

  // 拖放高亮
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('hover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('hover');
  });

  // 放下文件
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('hover');
    handleFiles(e.dataTransfer.files);
  });

  // 点击打开文件对话框
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
    compressBtn.disabled = false;
  });

  // 压缩主流程
  compressBtn.addEventListener('click', async () => {
    console.log('🛠️ Compress button clicked');
    if (files.length === 0) {
      alert('Please select at least one video.');
      return;
    }
    compressBtn.disabled = true;
    statusEl.textContent = 'Loading FFmpeg…';

    try {
      // —— 关键：正确引用全大写 FFmpeg，全新 CORS 友好 CDN 路径
      const { createFFmpeg, fetchFile } = FFmpeg;
      const ffmpeg = createFFmpeg({
        log: true,
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg-core.js'
      });

      await ffmpeg.load();
      statusEl.textContent = 'Compressing…';

      const zip = new JSZip();
      const quality = document.querySelector('input[name="quality"]:checked').value;

      // 遍历每个文件
      for (let file of files) {
        const ext    = file.name.split('.').pop();
        const base   = file.name.replace(/\.[^/.]+$/, '');
        const outName = `${base}-compressed.${ext}`;

        ffmpeg.FS('writeFile', file.name, await fetchFile(file));

        const crf    = quality === 'low' ? 30
                      : quality === 'medium' ? 23
                      : 18;
        const vcodec = ext.toLowerCase() === 'webm' ? 'libvpx-vp9' : 'libx264';

        await ffmpeg.run('-i', file.name, '-c:v', vcodec, '-crf', crf, outName);

        const data = ffmpeg.FS('readFile', outName);
        zip.file(outName, data);

        ffmpeg.FS('unlink', file.name);
        ffmpeg.FS('unlink', outName);
      }

      statusEl.textContent = 'Packaging ZIP…';
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'compressed-videos.zip');

      statusEl.textContent = 'Done!';
    } catch (err) {
      console.error(err);
      alert('An error occurred:\n' + err.message);
      statusEl.textContent = 'Error occurred.';
    } finally {
      compressBtn.disabled = false;
    }
  });

  // 追加并渲染新文件
  function handleFiles(selected) {
    Array.from(selected)
      .slice(0, 3 - files.length)
      .forEach(file => {
        if (!file.type.startsWith('video/')) return;
        files.push(file);
        const li = document.createElement('li');
        li.textContent = file.name;
        fileList.appendChild(li);
      });
  }
});
