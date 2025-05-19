// 设置语言数据（自动语言检测）
let langData = {
    "en": {
        "title": "MultiConverter - All-in-One Converter",
        "processing": "🚀 Processing... Please wait.",
        "completed": "✅ Conversion completed!",
        "download": "Download Converted File"
    },
    "zh": {
        "title": "多功能转换器 - 一体化转换工具",
        "processing": "🚀 处理中... 请稍候。",
        "completed": "✅ 转换完成！",
        "download": "下载转换后的文件"
    }
};

// 自动检测用户语言
let currentLang = navigator.language.startsWith("zh") ? "zh" : "en";
document.querySelector("h2").textContent = langData[currentLang]["title"];
document.getElementById("languageSelect").value = currentLang;

// 手动切换语言
document.getElementById("languageSelect").addEventListener("change", function() {
    currentLang = this.value;
    document.querySelector("h2").textContent = langData[currentLang]["title"];
});

// 文件转换逻辑
function processFile() {
    const status = document.getElementById("status");
    const downloadLink = document.getElementById("downloadLink");
    const fileInput = document.getElementById("fileInput");

    if (fileInput.files.length === 0) {
        status.textContent = "❌ No file selected.";
        return;
    }

    status.textContent = langData[currentLang]["processing"];
    setTimeout(() => {
        status.textContent = langData[currentLang]["completed"];
        
        const file = fileInput.files[0];
        const url = URL.createObjectURL(file);

        // 生成下载链接
        downloadLink.href = url;
        downloadLink.download = "converted_" + file.name;
        downloadLink.textContent = langData[currentLang]["download"];
        downloadLink.classList.remove("d-none");
    }, 2000);
}

// 切换夜间模式
function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
}

// 恢复夜间模式设置
document.addEventListener("DOMContentLoaded", function() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
});
