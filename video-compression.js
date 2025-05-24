console.log('📦 image-compression.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const dropZone       = document.getElementById('dropZone');
  const fileInput      = document.getElementById('fileInput');
  const fileList       = document.getElementById('fileList');
  const resultList     = document.getElementById('resultList');
  const compressBtn    = document.getElementById('compressBtn');
  const downloadZipBtn = document.getElementById('downloadZipBtn');
  const resetBtn       = document.getElementById('resetBtn');
  const statusEl       = document.getElementById('status');

  let files = [];

  // 打开文件选择
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  // 拖放
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('hover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('hover'));
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('hover'); handleFiles(e.dataTransfer.files); });

  // 处理文件上限与列表
  function handleFiles(selected) {
    Array.from(selected).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (files.length >= 3) {
        alert('Slow down, superstar! Only 3 images at once—drop a file before adding more ✨');
        return;
      }
      files.push({ file, originalSize: file.size });
      renderFileList();
    });
  }

  function renderFileList() {
    fileList.innerHTML = '';
    files.forEach((obj, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${obj.file.name}
        <button class="removeBtn">×</button>
      `;
      li.querySelector('.removeBtn').addEventListener('click', () => {
        files.splice(idx, 1);
        renderFileList();
      });
      fileList.appendChild(li);
    });
  }

  // 压缩主流程
  compressBtn.addEventListener('click', async () => {
    if (files.length === 0) { alert('Please select at least one image.'); return; }
    compressBtn.disabled = true;
    statusEl.textContent = 'Compressing...';
    resultList.innerHTML = '';

    const zip = new JSZip();
    const qualityMap = { low: 0.3, medium: 0.6, high: 0.9 };
    const quality = document.querySelector('input[name="quality"]:checked').value;

    for (let obj of files) {
      const { file, originalSize } = obj;
      statusEl.textContent = `Compressing ${file.name}...`;
      const blob = await compressImage(file, qualityMap[quality]);
      zip.file(file.name.replace(/\.(\w+)$/, '_compressed.$1'), blob);

      // 显示结果对比
      const li = document.createElement('li');
      const afterSize = blob.size;
      li.innerHTML = `
        ${file.name}: ${(originalSize/1024).toFixed(1)} KB → ${(afterSize/1024).toFixed(1)} KB
        <button class="downloadBtn">Download</button>
      `;
      li.querySelector('.downloadBtn').addEventListener('click', () => saveAs(blob, file.name.replace(/\.(\w+)$/, '_compressed.$1')));
      resultList.appendChild(li);
    }

    // ZIP 下载
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadZipBtn.style.display = 'inline-block';
    downloadZipBtn.onclick = () => saveAs(zipBlob, 'compressed-images.zip');

    statusEl.textContent = 'Done!';
    compressBtn.disabled = false;
  });

  // 图片压缩函数，基于 Canvas
  function compressImage(file, quality) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          blob => resolve(blob),
          file.type,
          quality
        );
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // 重置
  resetBtn.addEventListener('click', () => {
    files = [];
    fileList.innerHTML = '';
    resultList.innerHTML = '';
    statusEl.textContent = 'Waiting for upload…';
    downloadZipBtn.style.display = 'none';
  });
});