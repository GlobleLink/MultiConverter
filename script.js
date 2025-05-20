// JavaScript for File Compression and Format Conversion Tool

// Image Compression
function compressImage() {
    const file = document.getElementById("imageInput").files[0];
    if (!file) {
        alert("Please upload an image file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            const canvas = document.createElement("canvas");
            canvas.width = img.width * 0.8;  // 80% compression
            canvas.height = img.height * 0.8;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(function(blob) {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "compressed-image.jpg";
                link.click();
            }, "image/jpeg", 0.8);
        };
    };
    reader.readAsDataURL(file);
}

// Placeholder for other compression functions
function convertImage() {
    alert("Image conversion coming soon.");
}

function compressVideo() {
    alert("Video compression coming soon.");
}

function compressPDF() {
    alert("PDF compression coming soon.");
}

function compressAudio() {
    alert("Audio compression coming soon.");
}
