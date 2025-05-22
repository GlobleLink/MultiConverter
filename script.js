const fileInput = document.getElementById('fileInput');
const fileListContainer = document.getElementById('fileList');
const compressBtn = document.getElementById('compressBtn');
const resetBtn = document.getElementById('resetBtn');
const progress = document.getElementById('progress');
const output = document.getElementById('output');

let selectedFiles = [];

// 监听文件选择／拖拽
fileInput.addEventListener('change', handleFiles);
['dragenter','dragover','dragleave','drop'].forEach(eventName => {
  document.getElementById('dropArea').addEventListener(eventName, preventDefaults, false);
});
document.getElementById('dropArea').addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  handleFiles({ target: { files: dt.files } });
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// 处理选中文件
function handleFiles(e) {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    if (selectedFiles.length < 3) {
      selectedFiles.push(file);
    }
  });
  updateFileList();
}

// 更新文件列表显示
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

// 重置
resetBtn.addEventListener('click', () => {
  selectedFiles = [];
  updateFileList();
  progress.textContent = 'Waiting for upload…';
  output.innerHTML = '';
});

// TODO: 在这里接入你的压缩逻辑，使用 selectedFiles 数组
compressBtn.addEventListener('click', () => {
  if (!selectedFiles.length) {
    alert('Please select at least one image.');
    return;
  }
  // 示例：仅演示进度反馈
  progress.textContent = `Ready to compress ${selectedFiles.length} file(s)…`;
  // 你的压缩实现…
});
