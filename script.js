let langData = {};
let currentLang = "en";

// 加载语言文件
fetch("lang.json")
    .then(response => response.json())
    .then(data => {
        langData = data;
        setLanguage(localStorage.getItem("language") || "en");
    });

// 设置语言
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem("language", lang);
    document.querySelector("h2").textContent = langData[lang]["title"];
    document.querySelector("label[for='actionSelect']").textContent = langData[lang]["choose_action"];
    document.querySelector("button").textContent = langData[lang]["convert_button"];
}

// 用户手动切换语言
document.getElementById("languageSelect").addEventListener("change", function() {
    setLanguage(this.value);
});

// 切换夜间模式
function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
}

// 恢复主题设置
document.addEventListener("DOMContentLoaded", function() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
});

// 文件转换逻辑
async function processFile() {
    document.getElementById("status").textContent = langData[currentLang]["processing"];
    setTimeout(() => {
        document.getElementById("status").textContent = langData[currentLang]["completed"];
        document.getElementById("downloadLink").classList.remove("d-none");
    }, 2000);
}
