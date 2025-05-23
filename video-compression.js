console.log('📦 video-compression.js loaded');

// 动态加载 FFmpeg 脚本，避免 CORS 或顺序问题
async function loadFFmpegScript() {
  if (window.FFmpeg) return;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg.min.js';
    s.async = true;
    s.onload  = () => { console.log('🚀 FFmpeg script loaded'); resolve(); };
    s.onerror = () => reject(new Error('Failed to load FFmpeg script'));
    document.head.appendChild(s);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const dropZone    = document.getElementById('dropZone');
  const fileList    = document.getElementById('fileList');
  const compressBtn = document.getElementById('compressBtn');
  const resetBtn    = document.getElementById('resetBtn');
  const statusEl    = document.getElementById('status');

  let files = [];

  // 拖放与点击选文件
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
    const inp = document.createElement('input');
    inp.type     = 'file';
    inp.accept   = 'video/*';
    inp.multiple = true;
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
    console.log('🛠️ Compress button clicked');
    if (files.length === 0) {
      alert('Please select at least one video.');
      return;
    }
    compressBtn.disabled = true;
    statusEl.textContent = 'Loading FFmpeg…';

    try {
      // 动态加载并确认全局 FFmpeg 已就绪
      await loadFFmpegScript();

      // 从全局拿出 createFFmpeg、fetchFile
      const { createFFmpeg, fetchFile } = FFmpeg;
      const ffmpeg = createFFmpeg({
        log: true,
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg-core.js'
      });

      await ffmpeg.load();
      statusEl.textContent = 'Compressing…';

      const zip     = new JSZip();
      const quality = document.querySelector('input[name="quality"]:checked').value;

      for (let file of files) {
        const ext     = file.name.split('.').pop();
        const base    = file.name.replace(/\.[^/.]+$/, '');
        const outName = `${base}-compressed.${ext}`;

        // 写入虚拟文件系统
        ffmpeg.FS('writeFile', file.name, await fetchFile(file));

        // 选择编码器与 CRF
        const crf    = quality === 'low' ? 30
                      : quality === 'medium' ? 23
                      : 18;
        const vcodec = ext.toLowerCase() === 'webm' ? 'libvpx-vp9' : 'libx264';

        await ffmpeg.run('-i', file.name, '-c:v', vcodec, '-crf', crf, outName);

        // 读出并打包 ZIP
        const data = ffmpeg.FS('readFile', outName);
        zip.file(outName, data);

        // 清理
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

  // 将文件加入列表并展示
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
