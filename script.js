const fileInput        = document.getElementById('fileInput');
const dropArea         = document.getElementById('dropArea');
const fileListContainer= document.getElementById('fileList');
const compressBtn      = document.getElementById('compressBtn');
const downloadZipBtn   = document.getElementById('downloadZipBtn');
const resetBtn         = document.getElementById('resetBtn');
const progress         = document.getElementById('progress');
const output           = document.getElementById('output');

let selectedFiles = [];
let zipBlob;

// 拖拽 & 文件选取 事件
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
  const arr = Array.from(files);
  const space = 3 - selectedFiles.length;
  if (arr.length > space) {
    alert(`Oops! Only 3 at a time—drop ${space} more and try again! 🎉`);
  }
  arr.slice(0, space).forEach(f => {
    if (!selectedFiles.includes(f)) selectedFiles.push(f);
  });
  updateFileList();
}

// 渲染已选列表
function updateFileList() {
  fileListContainer.innerHTML = '';
  selectedFiles.forEach(file => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 21L8.5 13L13.5 17.5L21 9V21H3Z"/>
      </svg>
      <span>${file.name}</span>
    `;
    fileListContainer.appendChild(div);
  });
}

// Reset 按钮
resetBtn.addEventListener('click', () => {
  selectedFiles = [];
  zipBlob = null;
  downloadZipBtn.disabled = true;
  downloadZipBtn.style.display = 'none';
  progress.textContent = 'Waiting for upload…';
  output.innerHTML = '';
  updateFileList();
});

// 帮助函数：格式化字节
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes/1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  return (kb/1024).toFixed(1) + ' MB';
}

// 点击 Compress
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
    const file = selectedFiles[i];
    const origSize = file.size;
    const { blob, name } = await compressImageFile(file, quality);
    const newSize = blob.size;
    zip.file(name, blob);
    results.push({ name, origSize, newSize });
  }

  progress.textContent = 'Generating ZIP…';
  const content = await zip.generateAsync({ type:'blob' });
  zipBlob = content;
  downloadZipBtn.style.display = 'inline-block';
  downloadZipBtn.disabled = false;
  progress.textContent = 'Ready! Click Download ZIP';

  // 显示每个文件前后对比
  const ul = document.createElement('ul');
  results.forEach(r => {
    const li = document.createElement('li');
    li.textContent = `${r.name}: ${formatBytes(r.origSize)} → ${formatBytes(r.newSize)}`;
    ul.appendChild(li);
  });
  output.appendChild(ul);

  compressBtn.disabled = resetBtn.disabled = false;
});

// Download ZIP 按钮
downloadZipBtn.addEventListener('click', () => {
  if (zipBlob) saveAs(zipBlob, 'images-compressed.zip');
});

// 压缩单张图工具
function compressImageFile(file, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        c.toBlob(blob => {
          if (!blob) return reject('Compression failed');
          const ext = file.type === 'image/png' ? 'png' : 'jpg';
          const name = file.name.replace(/\.[^/.]+$/, '') +
                       `-compressed.${ext}`;
          resolve({ blob, name });
        }, extMime(file.type), quality);
      };
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function extMime(mime) {
  return mime === 'image/png' ? 'image/png' : 'image/jpeg';
}
