const bar = document.querySelector(".bar");
const bar_1 = document.querySelector("#bar_1");
const bar_2 = document.querySelector("#bar_2");
const bar_3 = document.querySelector("#bar_3");

// ฟังก์ชันกลางสำหรับเปลี่ยนสเต็ป
function updateStep(step) {
    // 1. จัดการหลอด ProgressBar (.bar)
    bar.classList.remove('active', 'active2');
    
    if (step === 1) {
        // อยู่สเต็ป 1 (รีเซ็ตทุกอย่างกลับค่าเริ่มต้น)
        bar_1.className = "activate";
        bar_2.className = "not_activate";
        bar_3.className = "not_activate";
    } 
    else if (step === 2) {
        // อยู่สเต็ป 2 (เส้น active ช่วงแรก + รีเซ็ตแอนิเมชันด้วย void)
        bar.classList.remove('active');
        void bar.offsetWidth; 
        bar.classList.add('active');

        bar_1.className = "complete";
        bar_2.className = "activate";
        bar_3.className = "not_activate";
    } 
    else if (step === 3) {
        // อยู่สเต็ป 3 (เส้น active2 เต็มระยะ)
        bar.classList.remove('active2');
        void bar.offsetWidth; 
        bar.classList.add('active2');

        bar_1.className = "complete";
        bar_2.className = "complete";
        bar_3.className = "activate";
    }
}

if (bar_1) {
    bar_1.addEventListener("click", function (e) {
        e.preventDefault();
        updateStep(1);
    });
}

if (bar_2) {
    bar_2.addEventListener("click", function (e) {
        e.preventDefault();
        updateStep(2);
    });
}

if (bar_3) {
    bar_3.addEventListener("click", function (e) {
        e.preventDefault();
        updateStep(3);
    });
}