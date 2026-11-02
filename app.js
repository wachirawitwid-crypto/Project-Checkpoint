const bar = document.querySelector(".bar");
const bar_1 = document.querySelector("#bar_1");
const bar_2 = document.querySelector("#bar_2");
const bar_3 = document.querySelector("#bar_3");

// ประกาศตัวแปรหน้าเนื้อหาให้ครบถ้วน
const card_content_page_1 = document.querySelector(".card_content_page_1");
const card_content_page_2 = document.querySelector(".card_content_page_2");
const card_content_page_3 = document.querySelector(".card_content_page_3"); // เพิ่มตัวนี้เผื่อไว้สำหรับสเต็ป 3

// เก็บสเต็ปปัจจุบันไว้เช็คว่ากำลังกดถอยหลังหรือเดินหน้า
let currentStep = 1;
bar.className = "bar";
bar.classList.add('start');

function updateStep(newStep) {
    // ล้างคลาสแอนิเมชันเก่าทั้งหมดออกก่อน
    bar.classList.remove('step2', 'step3', 'back-to-step2', 'back-to-step1', 'start');

    if (newStep === 1) {
        // ถอยกลับมาสเต็ป 1
        bar.className = "bar"; // รีเซ็ตคลาสของ bar
        bar.classList.add('back-to-step1');

        // จัดการสลับหน้าเนื้อหาให้กลับมาหน้า 1
        if (card_content_page_1) {
            card_content_page_1.classList.remove('not_active');
            card_content_page_1.classList.add('active');
        }
        if (card_content_page_2) {
            card_content_page_2.classList.remove('active');
            card_content_page_2.classList.add('not_active');
        }
        if (card_content_page_3) {
            card_content_page_3.classList.remove('active');
            card_content_page_3.classList.add('not_active');
        }

        bar_1.className = "activate";
        bar_2.className = "not_activate";
        bar_3.className = "not_activate";
    }
    else if (newStep === 2) {
        if (currentStep > 2) {
            // กรณีถอยหลัง: มาจากสเต็ป 3 ถอยกลับมาสเต็ป 2 (หดจาก 1 เหลือ 0.5)
            bar.classList.add('back-to-step2');
        } else {
            // กรณีเดินหน้า: ไปสเต็ป 2 (วิ่งจาก 0 ไป 0.5)
            bar.classList.add('step2');
        }

        // จัดการสลับหน้าเนื้อหาไปหน้า 2
        if (card_content_page_1) {
            card_content_page_1.classList.remove('active');
            card_content_page_1.classList.add('not_active');
        }
        if (card_content_page_2) {
            card_content_page_2.classList.remove('not_active');
            card_content_page_2.classList.add('active');
        }
        if (card_content_page_3) {
            card_content_page_3.classList.remove('active');
            card_content_page_3.classList.add('not_active');
        }

        bar_1.className = "complete";
        bar_2.className = "activate";
        bar_3.className = "not_activate";
    }
    else if (newStep === 3) {
        // เดินหน้าไปสเต็ป 3 (วิ่งต่อจาก 0.5 ไป 1)
        bar.classList.add('step3');

        // จัดการสลับหน้าเนื้อหาไปหน้า 3
        if (card_content_page_1) {
            card_content_page_1.classList.remove('active');
            card_content_page_1.classList.add('not_active');
        }
        if (card_content_page_2) {
            card_content_page_2.classList.remove('active');
            card_content_page_2.classList.add('not_active');
        }
        if (card_content_page_3) {
            card_content_page_3.classList.remove('not_active');
            card_content_page_3.classList.add('active');
        }
        bar_1.className = "complete";
        bar_2.className = "complete";
        bar_3.className = "activate";
    }

    // อัปเดตเก็บค่าสเต็ปปัจจุบันไว้ใช้เทียบครั้งต่อไป
    currentStep = newStep;
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