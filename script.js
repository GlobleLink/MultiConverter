const fileInput = document.getElementById('fileInput');
const fileListContainer = document.getElementById('fileList');
const compressBtn = document.getElementById('compressBtn');
const resetBtn = document.getElementById('resetBtn');
const progress = document.getElementById('progress');
const output = document.getElementById('output');
const dropArea = document.getElementById('dropArea');

let selectedFiles = [];

// 拖拽 & 选择 监听
['dragenter','dragover','dragleave','drop'].forEach(evt =>
  dropArea.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    dropArea.classList.toggle('dragover', evt==='dragover');
  })
);
dropArea.addEventListener('drop', e => {
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => {
  handleFiles(e.target.files);
});

function handleFiles(files) {
  Array.from(files).forEach(f => {
    if (selectedFiles.length < 3 && !selectedFiles.includes(f)) {
      selectedFiles.push(f);
    }
  });
  updateFileList();
}

// 列表渲染
function updateFileList() {
  fileListContainer.innerHTML = '';
  selectedFiles.forEach(file => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 21L8.5 13L13.5 17.5L21 9V21H3Z"/></svg>
      <span>${file.name}</span>
    `;
    fileListContainer.appendChild(div);
  });
}

// Reset
resetBtn.addEventListener('click', () => {
  selectedFiles = [];
  updateFileList();
  progress.textContent = 'Waiting for upload…';
  output.innerHTML = '';
});

// compress 单个文件（返回 Promise<{blob, name}>）
function compressImageFile(file, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (!blob) return reject('Compression failed');
          const ext = file.type === 'image/png' ? 'png' : 'jpg';
          const name = file.name.replace(/\.[^/.]+$/, '') + '-compressed.' + ext;
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

// 点击压缩 -> 逐个压缩 -> 打包 ZIP -> 下载
compressBtn.addEventListener('click', async () => {
  if (!selectedFiles.length) {
    alert('Please select at least one image.');
    return;
  }
  compressBtn.disabled = resetBtn.disabled = true;
  progress.textContent = `Compressing 1/${selectedFiles.length}…`;
  const quality = parseFloat(document.querySelector('input[name="quality"]:checked').value);
  const zip = new JSZip();

  for (let i = 0; i < selectedFiles.length; i++) {
    progress.textContent = `Compressing ${i+1}/${selectedFiles.length}…`;
    try {
      const { blob, name } = await compressImageFile(selectedFiles[i], quality);
      zip.file(name, blob);
    } catch (err) {
      console.error(err);
    }
  }

  progress.textContent = 'Generating ZIP…';
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'images-compressed.zip');
  progress.textContent = 'Done!';
  compressBtn.disabled = resetBtn.disabled = false;
});
