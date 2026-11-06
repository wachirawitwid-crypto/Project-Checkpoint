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

// ================= ข้อมูลหลัก =================
const itemcount = document.getElementById("item-Count");
const itemList = document.getElementById("item-List");
const Contentcount = document.getElementById("content-Count");
const ContentList = document.getElementById("content-List");
let items = [];
let content = [];
let ContentIdCounter = 1;

// PORTFOLIO ID: เฉพาะตัวเลข ไม่เกิน 10 หลัก
const idInput = document.getElementById('studen_id');
if (idInput) {
    idInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 10);
    });
}

// ================= ฟังก์ชันป้องกัน XSS =================
// แปลงอักขระพิเศษเป็น HTML entity ก่อนนำข้อความจากผู้ใช้ไปใส่ innerHTML
function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}


function updateStep(newStep) {
    if (newStep === 2 && currentStep < 2) {
        if (!check(2)) {
            return;
        }
    }
    if (newStep === 3 && currentStep < 3) {
        if (items.length === 0) {
            alert('กรุณาเพิ่มผลงานอย่างน้อย 1 รายการก่อนไปต่อครับ');
            return;
        }
    }
    // ล้างคลาสแอนิเมชันเก่าทั้งหมดออกก่อน
    bar.classList.remove('step2', 'step3', 'back-to-step2', 'back-to-step1', 'start');

    if (newStep === 1) {
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

    updateProfilePreview();
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
        if (currentStep === 1 && !check(2)) return;
        updateStep(2);
    });
}

if (bar_3) {
    bar_3.addEventListener("click", function (e) {
        e.preventDefault();
        if (currentStep === 1 && !check(2)) return;
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
        if (inputs.ID_TAG && !/^\d{10}$/.test(inputs.ID_TAG.value.trim())) {
            alert('PORTFOLIO ID TAG ต้องเป็นตัวเลข 10 หลักพอดีครับ');
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
        return true;
    } else if (newStep === 3) {
        const inputs_page2 = {
            title: document.getElementById('item-title'),
            type: document.getElementById('item-type'),
            date: document.getElementById('item-date'),
            role: document.getElementById('item-role')
        };

        if (inputs_page2.title && !inputs_page2.title.value.trim()) {
            alert('กรุณากรอก ITEM TITLE ด้วยครับ');
            inputs_page2.title.focus();
            return false;
        }
        if (inputs_page2.type && !inputs_page2.type.value) {
            alert('กรุณากรอก ITEM TYPE ด้วยครับ');
            inputs_page2.type.focus();
            return false;
        }
        if (inputs_page2.date && !inputs_page2.date.value) {
            alert('กรุณากรอก ITEM DATE ด้วยครับ');
            inputs_page2.date.focus();
            return false;
        }
        if (inputs_page2.role && !inputs_page2.role.value.trim()) {
            alert('กรุณากรอก ITEM ROLE ด้วยครับ');
            inputs_page2.role.focus();
            return false;
        }
        const urlInput = document.getElementById('input-url');
        if (urlInput && !/^https?:\/\/.+/.test(urlInput.value.trim())) {
            alert('กรุณากรอก EVIDENCE เป็นลิงก์ที่ขึ้นต้นด้วย http:// หรือ https:// ครับ');
            urlInput.focus();
            return false;
        }
        return true;
    }
    return true;
}

// ================= หน้า 2: รายการที่เพิ่ม =================
function updateItem() {
    itemcount.textContent = items.length + (items.length <= 1 ? " item" : " items");
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
                <p class="text-muted mb-0"><strong>Role: ${item.role}</strong></p>
            </div>
            <a class="remove_Item" onclick="removeItem('${item.id}')"><ion-icon name="trash-bin"></ion-icon></a>
        </div>
    `).join("");
}

function additem() {
    if (!check(3)) {
        return;
    }

    const title = document.getElementById("item-title").value.trim();
    const type = document.getElementById("item-type").value;
    const date = document.getElementById("item-date").value;
    const description = document.getElementById("item-description").value.trim();
    const skills = document.getElementById("item-skills").value.trim();

    const roleInput = document.getElementById("item-role");
    const role = roleInput ? roleInput.value.trim() : "";

    const what_i_did = document.getElementById("item_did")?.value.trim() || "";
    const what_i_learned = document.getElementById("item_learned")?.value.trim() || "";
    const challenge = document.getElementById("item_challenge")?.value.trim() || "";
    const next_step = document.getElementById("item_next")?.value.trim() || "";

    const linkInput = document.getElementById("input-url");
    const link = linkInput ? linkInput.value.trim() : "";

    // สร้าง id ครั้งเดียว ใช้ร่วมกันทั้ง items และ content
    const newItemId = `Item-${ContentIdCounter++}`;

    items.push({ id: newItemId, title, type, date, description, skills, role, link });

    content.push({
        id: newItemId,
        title, type, date, description, skills, role,
        what_i_did, what_i_learned, challenge, next_step, link
    });

    updateItem();
    updateContent();
    saveData();

    // เคลียร์ฟอร์ม
    document.getElementById("item-title").value = '';
    document.getElementById("item-description").value = '';
    document.getElementById("item-skills").value = '';
    if (roleInput) roleInput.value = '';
    if (document.getElementById("item_did")) document.getElementById("item_did").value = '';
    if (document.getElementById("item_learned")) document.getElementById("item_learned").value = '';
    if (document.getElementById("item_challenge")) document.getElementById("item_challenge").value = '';
    if (document.getElementById("item_next")) document.getElementById("item_next").value = '';
    if (linkInput) linkInput.value = '';
}

function removeItem(id) {
    items = items.filter(item => item.id !== id);
    content = content.filter(item => item.id !== id);
    updateItem();
    updateContent();
    saveData();
}

// ================= หน้า 3: แสดงผล =================
function updateProfilePreview() {
    const userData = {
        fullName: document.getElementById('full-name').value.trim(),
        id: document.getElementById('studen_id').value.trim(),
        enjoy: document.getElementById('enjoy').value.trim(),
        tried: document.getElementById('tried').value.trim(),
        curious: document.getElementById('curious-about').value.trim()
    };

    const userShow = {
        showNameElement: document.getElementById('show_name'),
        showIdElement: document.getElementById('id_profile'),
        showEnjoyElement: document.getElementById('show_enjoy'),
        showeTiredElement: document.getElementById('show_tired'),
        showeCuriousElement: document.getElementById('show_curious')
    };

    if (userShow.showNameElement) {
        userShow.showNameElement.textContent = userData.fullName || "My profile";
    }
    if (userShow.showEnjoyElement) {
        userShow.showEnjoyElement.textContent = userData.enjoy || "-";
    }
    if (userShow.showeTiredElement) {
        userShow.showeTiredElement.textContent = userData.tried || "-";
    }
    if (userShow.showeCuriousElement) {
        userShow.showeCuriousElement.textContent = userData.curious || "-";
    }
    if (userShow.showIdElement) {
        userShow.showIdElement.textContent = "Id: " + userData.id;
    }
}

function updateContent() {
    Contentcount.textContent = content.length + (content.length <= 1 ? " item" : " items");

    if (content.length === 0) {
        ContentList.innerHTML = '<div class="empty-state"> ยังไม่มีรายการผลงานใน Portfolio นี้ กดเพิ่มผลงานด้านบนได้เลย </div>';
        return;
    }

    ContentList.innerHTML = content.map((item, index) => `
        <div class="portfolio-item-card mb-3 p-3">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                <div>
                    <span class="item-tag-id badge">${item.id || `Item-${index + 1}`}</span>
                    <span class="item-meta-text text-muted ms-2">${item.type || '-'} | <i class="fa-regular fa-calendar"></i> ${item.date || '-'}</span>
                    <h5 class="item-card-title mt-2 mb-1 fw-bold">${item.title}</h5>
                    <p class="item-role-text text-muted mb-0"><i class="fa-solid fa-user-gear me-1"></i>Role: ${item.role || '-'}</p>
                </div>
                <a href="${item.link || '#'}" target="_blank" class="btn-evidence">
                    <i class="fa-solid fa-arrow-up-right-from-square me-1"></i> View Evidence
                </a>
            </div>
            <p class="item-card-desc mb-2">
                ${item.description || '-'}
            </p>
        </div>
    `).join("");
}

// ================= localStorage =================
const STORAGE_KEY = 'portfolioData';
const profileFields = ['full-name', 'studen_id', 'enjoy', 'tried', 'curious-about'];

function saveData() {
    try {
        const profile = {};
        profileFields.forEach(id => {
            profile[id] = document.getElementById(id).value;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            profile,
            items,
            content,
            counter: ContentIdCounter
        }));
    } catch (e) {
        console.error('saveData failed:', e);
    }
}

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);

        profileFields.forEach(id => {
            const el = document.getElementById(id);
            if (el && data.profile && data.profile[id] !== undefined) {
                el.value = data.profile[id];
            }
        });

        items = data.items || [];
        content = data.content || [];
        ContentIdCounter = data.counter || items.length + 1;
    } catch (e) {
        console.error('loadData failed:', e);
    }
}

function clearData() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}

// บันทึกโปรไฟล์ทุกครั้งที่พิมพ์
profileFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', saveData);
});

// โหลดข้อมูลและแสดงผลตอนเปิดหน้า
loadData();
updateItem();
updateContent();
updateProfilePreview();