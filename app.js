const bar = document.querySelector(".bar");
const bar_1 = document.querySelector("#bar_1");
const bar_2 = document.querySelector("#bar_2");
const bar_3 = document.querySelector("#bar_3");
const back_page = document.querySelectorAll(".back_page");

const card_content_page_1 = document.querySelector(".card_content_page_1");
const card_content_page_2 = document.querySelector(".card_content_page_2");
const card_content_page_3 = document.querySelector(".card_content_page_3");

// เก็บสเต็ปปัจจุบันไว้เช็คว่ากำลังกดถอยหลังหรือเดินหน้า
let currentStep = 1;
bar.className = "bar";
bar.classList.add('start');

function updateStep(newStep) {
    // ถ้าผู้ใช้กำลังจะเดินหน้าไปสเต็ป 2 ให้ทำการตรวจเช็กข้อมูลก่อน
    if (newStep === 2 && currentStep < 2) {
        if (!check(2)) {
            return; // ถ้าข้อมูลไม่ครบ ให้หยุดการทำงานทันที (ไม่เปลี่ยนหน้า)
        }
    } else if (newStep === 3 && currentStep < 3) {
        if (!check(3)) {
            return; // ถ้าข้อมูลไม่ครบ ให้หยุดการทำงานทันที (ไม่เปลี่ยนหน้า)
        }
    }

    // ล้างคลาสแอนิเมชันเก่าทั้งหมดออกก่อน
    bar.classList.remove('step2', 'step3', 'back-to-step2', 'back-to-step1', 'start');

    if (newStep === 1) {
        // ถอยกลับมาสเต็ป 1
        bar.className = "bar";
        bar.classList.add('back-to-step1');

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
            bar.classList.add('back-to-step2');
        } else {
            bar.classList.add('step2');
        }

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
        bar.classList.add('step3');

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

    currentStep = newStep;
}

// Event Listeners ต่างๆ
if (bar_1) {
    bar_1.addEventListener("click", function (e) {
        e.preventDefault();
        updateStep(1);
    });
}

if (bar_2) {
    bar_2.addEventListener("click", function (e) {
        e.preventDefault();
        // ถ้าจะคลิกข้ามไปหน้า 2 โดยตรง ก็จะเช็กข้อมูลหน้า 1 ก่อนเช่นกัน
        if (currentStep === 1 && !check(2)) return;
        updateStep(2);
    });
}

if (bar_3) {
    bar_3.addEventListener("click", function (e) {
        e.preventDefault();
        updateStep(3);
    });
}

function check(newStep) {
    if (newStep === 2) {
        const inputs = {
            fullName: document.getElementById('full-name'),
            enjoy: document.getElementById('enjoy'),
            tried: document.getElementById('tried'),
            curious: document.getElementById('curious-about'),
            ID_TAG: document.getElementById('studen_id')
        };

        if (inputs.fullName && !inputs.fullName.value.trim()) {
            alert('กรุณากรอก FULL NAME / DISPLAY NAME ด้วยครับ');
            inputs.fullName.focus();
            return false;
        }
        if (inputs.ID_TAG && !inputs.ID_TAG.value.trim()) {
            alert('กรุณากรอก PORTFOLIO ID TAG ด้วยครับ');
            inputs.ID_TAG.focus();
            return false;
        }
        if (inputs.enjoy && !inputs.enjoy.value.trim()) {
            alert('กรุณากรอก WHAT I ENJOY ด้วยครับ');
            inputs.enjoy.focus();
            return false;
        }
        if (inputs.tried && !inputs.tried.value.trim()) {
            alert('กรุณากรอก WHAT I\'VE TRIED ด้วยครับ');
            inputs.tried.focus();
            return false;
        }

        if (inputs.curious && !inputs.curious.value.trim()) {
            alert('กรุณากรอก WHAT I\'M CURIOUS ABOUT ด้วยครับ');
            inputs.curious.focus();
            return false;
        }
        console.log(inputs);
        return true; // ผ่านทุกเงื่อนไข
    } else if (newStep === 3) {
        const inputs_page2 = {
            title : document.getElementById('item-title'),
            type : document.getElementById('item-type'),
            date : document.getElementById('item-date'),
            role: document.getElementById('item-role'),
            description : document.getElementById('item-description'),
            skills: document.getElementById('item-skills'),
            what_i_did: document.getElementById('item_did'),
            what_i_learned : document.getElementById('item_learned'),
            challenge : document.getElementById('item_challenge'),
            next_step : document.getElementById('item_next')
        };

        if (inputs_page2.title && !inputs_page2.title.value.trim()) {
            alert('กรุณากรอก ITEM TITLE ด้วยครับ');
            inputs_page2.title.focus();
            return false;
        }

        if (inputs_page2.type && !inputs_page2.type.value.trim()) {
            alert('กรุณากรอก ITEM TYPE ด้วยครับ');
            inputs_page2.type.focus();
            return false;
        }

        if (inputs_page2.date && !inputs_page2.date.value.trim()) {
            alert('กรุณากรอก ITEM DATE ด้วยครับ');
            inputs_page2.date.focus();
            return false;
        }

        if (inputs_page2.role && !inputs_page2.role.value.trim()) {
            alert('กรุณากรอก ITEM ROLE ด้วยครับ');
            inputs_page2.role.focus();
            return false;
        }
        
        // หมายเหตุ: หากต้องการบังคับกรอกฟิลด์อื่นๆ ของหน้า 2 เพิ่มเติม (เช่น description, skills ฯลฯ) 
        // สามารถเพิ่มเงื่อนไข if เช็กในลักษณะเดียวกันตรงนี้ได้เลยครับ

        console.log(inputs_page2);
        return true; // ผ่านทุกเงื่อนไข
    }
    
    return true;
}

//เกี่ยวกับ add item
const itemcount = document.getElementById("item-Count");
const itemList = document.getElementById("item-List");
let items = [];
function updateItem() {
    itemcount.textContent = items.length + " items";
    if (items.length === 0) {
        itemList.innerHTML = '<div class="empty-state"> ยังไม่มีรายการผลงานใน Portfolio นี้ กดเพิ่มผลงานด้านบนได้เลย </div>';
        return;
    }
    itemList.innerHTML = items.map(item => `
        <div class="item-box item-card d-flex align-items-start justify-content-between mb-3">  
            <div>
                <span class="item-id">${item.id}</span>
                <span class="text-muted"> ${item.type} | ${item.date}</span>
                <h3 class="h6 fw-semibold mb-0">${item.title}</h3>
                <p class="text-muted mb-0"><strong>${item.description}</strong></p>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger remove-btn flex-shrink-0" onclick="removeItem('${item.id}')">Remove</button>
        </div>
    `).join("");
}

let itemIdCounter = 1;
function additem() {
    const title = document.getElementById("item-title").value.trim();
    const type = document.getElementById("item-type").value;
    const date = document.getElementById("item-date").value;
    const description = document.getElementById("item-description").value.trim();
    const skills = document.getElementById("item-skills").value.trim();

    if (title && type && date && description && skills) {
        items.push({
            id: `Item-${itemIdCounter++}`, title, type, date, description, skills
        });
        updateItem();
    }
}

function removeItem(id) {
    items = items.filter(item => item.id !== id);
    updateItem();
}
updateItem();