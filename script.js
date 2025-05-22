const fileInput         = document.getElementById('fileInput');
const dropArea          = document.getElementById('dropArea');
const fileListContainer = document.getElementById('fileList');
const compressBtn       = document.getElementById('compressBtn');
const downloadZipBtn    = document.getElementById('downloadZipBtn');
const resetBtn          = document.getElementById('resetBtn');
const progress          = document.getElementById('progress');
const output            = document.getElementById('output');

let selectedFiles = [];
let zipBlob;

// 拖拽 & 选择 监听
['dragenter','dragover','dragleave','drop'].forEach(evt => {
  dropArea.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    dropArea.classList.toggle('dragover', evt==='dragover');
  });
});
dropArea.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', e => handleFiles(e.target.files));

// 处理新选文件
function handleFiles(files) {
  const arr   = Array.from(files);
  const space = 3 - selectedFiles.length;

  if (arr.length > space) {
    alert('Slow down, superstar! Only 3 images at once—drop a file before adding more ✨');
  }

  arr.slice(0, space).forEach(f => {
    if (!selectedFiles.includes(f)) selectedFiles.push(f);
  });
  updateFileList();
}

// 渲染已选列表（带删除按钮）
function updateFileList() {
  fileListContainer.innerHTML = '';
  selectedFiles.forEach((file, idx) => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 21L8.5 13L13.5 17.5L21 9V21H3Z"/></svg>
      <span>${file.name}</span>
      <button class="remove-btn" data-index="${idx}">&times;</button>
    `;
    fileListContainer.appendChild(div);
  });
  // 绑定删除事件
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const i = Number(e.currentTarget.dataset.index);
      selectedFiles.splice(i, 1);
      updateFileList();
    });
  });
}

// Reset
resetBtn.addEventListener('click', () => {
  selectedFiles = [];
  zipBlob = null;
  downloadZipBtn.disabled = true;
  downloadZipBtn.style.display = 'none';
  progress.textContent = 'Waiting for upload…';
  output.innerHTML = '';
  updateFileList();
});

// 点击 Compress...
compressBtn.addEventListener('click', async () => {
  if (!selectedFiles.length) {
    alert('Please select at least one image 😊');
    return;
  }
  compressBtn.disabled = resetBtn.disabled = true;
  output.innerHTML = '';
  progress.textContent = `Compressing 1/${selectedFiles.length}…`;

  const quality = parseFloat(
    document.querySelector('input[name="quality"]:checked').value
  );
  const zip = new JSZip();
  const results = [];

  for (let i=0; i<selectedFiles.length; i++) {
    progress.textContent = `Compressing ${i+1}/${selectedFiles.length}…`;
    const { blob, name, origSize, newSize } = 
          await compressSingle(selectedFiles[i], quality);
    zip.file(name, blob);
    results.push({ name, origSize, newSize });
  }

  progress.textContent = 'Ready to download ZIP';
  zipBlob = await zip.generateAsync({ type:'blob' });
  downloadZipBtn.style.display = 'inline-block';
  downloadZipBtn.disabled = false;

  // 显示大小对比
  const ul = document.createElement('ul');
  results.forEach(r => {
    const li = document.createElement('li');
    li.textContent = `${r.name}: ${formatBytes(r.origSize)} → ${formatBytes(r.newSize)}`;
    ul.appendChild(li);
  });
  output.appendChild(ul);

  compressBtn.disabled = resetBtn.disabled = false;
});

// Download ZIP
downloadZipBtn.addEventListener('click', () => {
  if (zipBlob) saveAs(zipBlob, 'images-compressed.zip');
});

// 工具函数
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes/1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  return (kb/1024).toFixed(1) + ' MB';
}

function compressSingle(file, quality) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (!blob) return rej('Compression failed');
          const origSize = file.size, newSize = blob.size;
          const ext  = file.type === 'image/png' ? 'png' : 'jpg';
          const name = file.name.replace(/\.[^/.]+$/, '') + '-compressed.' + ext;
          res({ blob, name, origSize, newSize });
        }, extMime(file.type), quality);
      };
      img.src = e.target.result;
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}
function extMime(mime) {
  return mime === 'image/png' ? 'image/png' : 'image/jpeg';
}
