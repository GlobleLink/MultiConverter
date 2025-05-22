// —— video-compression.js —— //

// 1. 脚本加载日志
console.log('🚀 video-compression.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('📦 DOM fully loaded');

  // —— 元素引用 —— //
  const fileInput    = document.getElementById('fileInput');
  const dropArea     = document.getElementById('dropArea');
  const fileListEl   = document.getElementById('fileList');
  const compressBtn  = document.getElementById('compressBtn');
  const downloadBtn  = document.getElementById('downloadBtn');
  const resetBtn     = document.getElementById('resetBtn');
  const progressEl   = document.getElementById('progress');
  const outputEl     = document.getElementById('output');

  console.log('🔍 Found compressBtn?', compressBtn);

  // —— （省略前面文件列表的 handleFiles / renderFileList 代码，因为你那部分已经 OK） —— //

  // —— 主要绑定：Compress Videos —— //
  compressBtn.addEventListener('click', async () => {
    console.log('🛠️ Compress button clicked');

    if (selectedFiles.length === 0) {
      console.log('⚠️ No files to compress');
      return alert('Please select at least one video 😊');
    }

    // 禁用按钮，防止重复点击
    compressBtn.disabled = resetBtn.disabled = true;
    outputEl.innerHTML   = '';
    progressEl.textContent = 'Loading FFmpeg…';

    // 初始化与加载 core
    await ffmpeg.load();
    console.log('✅ FFmpeg core loaded');

    const crf = document.querySelector('input[name="quality"]:checked').value;
    resultBlobs = [];

    // 批量压缩
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      console.log(`🔄 Compressing file ${i+1}/${selectedFiles.length}:`, file.name);
      const { blob, origSize, newSize } = await compressOne(file, crf);
      resultBlobs.push({ blob, name: blob.name, origSize, newSize });
    }

    // 显示结果
    console.log('🎉 All files compressed');
    progressEl.textContent = 'Compression complete!';

    const ul = document.createElement('ul');
    resultBlobs.forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${r.name}: ${(r.origSize/1024/1024).toFixed(2)}MB →
        ${(r.newSize/1024/1024).toFixed(2)}MB
        <a href="#" class="single-download" data-name="${r.name}">Download</a>
      `;
      ul.appendChild(li);
    });
    outputEl.appendChild(ul);

    // 单文件下载绑定
    ul.querySelectorAll('.single-download').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const info = resultBlobs.find(x => x.name === e.currentTarget.dataset.name);
        const url  = URL.createObjectURL(info.blob);
        const link= document.createElement('a');
        link.href    = url;
        link.download= info.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      });
    });

    // ZIP 下载按钮
    downloadBtn.style.display = 'inline-block';
    downloadBtn.disabled     = false;
    downloadBtn.addEventListener('click', async () => {
      console.log('🗜️ Creating ZIP');
      const zip = new JSZip();
      resultBlobs.forEach(r => zip.file(r.name, r.blob));
      const z = await zip.generateAsync({ type: 'blob' });
      saveAs(z, 'videos-compressed.zip');
    });

    // 恢复按钮
    compressBtn.disabled = resetBtn.disabled = false;
  });

  // —— 剩余 compressOne、文件列表、reset 等函数保留不变 —— //
});
