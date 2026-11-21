const bar = document.querySelector(".bar");
const bar_1 = document.querySelector("#bar_1");
const bar_2 = document.querySelector("#bar_2");
const bar_3 = document.querySelector("#bar_3");

const card_content_page_1 = document.querySelector(".card_content_page_1");
const card_content_page_2 = document.querySelector(".card_content_page_2");
const card_content_page_3 = document.querySelector(".card_content_page_3");

// เก็บสเต็ปปัจจุบันไว้เช็คว่ากำลังกดถอยหลังหรือเดินหน้า
let currentStep = 1;
if (bar) {
    bar.className = "bar start";
}

// ================= ข้อมูลหลัก (ใช้ Server เป็นแหล่งข้อมูลหลัก) =================
const API_URL = 'api/storage.php';
const profileFields = ['full-name', 'studen_id', 'enjoy', 'tried', 'curious-about'];

const itemcount = document.getElementById("item-Count");
const itemList = document.getElementById("item-List");
const Contentcount = document.getElementById("content-Count");
const ContentList = document.getElementById("content-List");

let items = [];
let ContentIdCounter = 1;
let syncedId = null;
let ownerId = null;
let syncTimer = null;
let allPortfoliosCache = {}; // เก็บข้อมูลทั้งหมดของทุกคนไว้ในตัวแปร

// ================= ฟังก์ชันช่วยเหลือ & ความปลอดภัย =================
function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function isValidHttpUrl(str) {
    try {
        const url = new URL(str);
        return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
    } catch {
        return false;
    }
}

function getNextCounter(itemArray) {
    let maxNum = 0;
    itemArray.forEach(it => {
        const match = String(it.id || '').match(/^Item-(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });
    return maxNum + 1;
}

// PORTFOLIO ID: กรองเฉพาะตัวเลข ไม่เกิน 10 หลัก และโหลดข้อมูลจาก Server เมื่อครบ 10 หลัก
const idInput = document.getElementById('studen_id');
if (idInput) {
    idInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 10);
        if (this.value !== syncedId) {
            syncedId = null;
        }
        if (/^\d{10}$/.test(this.value)) {
            loadFromServer(this.value);
        }
    });
}

// ================= แถบเลือก Portfolio ด้านบน =================
async function loadPortfolioList() {
    const pillsContainer = document.getElementById('portfolio-pills');
    if (!pillsContainer) return;

    try {
        const res = await fetch(`${API_URL}?list=1`);
        if (!res.ok) return;
        const portfolios = await res.json();

        allPortfoliosCache = {};
        pillsContainer.innerHTML = portfolios.map(p => {
            allPortfoliosCache[p.id] = p.fullData;
            const isActive = (p.id === ownerId) ? 'active' : '';
            const itemText = p.count === 1 ? '1 item' : `${p.count} items`;
            return `
                <button type="button" 
                        class="pill-btn ${isActive}" 
                        onclick="switchPortfolio('${esc(p.id)}')">
                    ${esc(p.name)} &bull; ${itemText}
                </button>
            `;
        }).join('');
    } catch (e) {
        console.error('ไม่สามารถโหลดรายชื่อ Portfolio ได้:', e);
    }
}

async function switchPortfolio(id) {
    let data = allPortfoliosCache[id];
    if (!data) {
        const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
            alert('ไม่พบข้อมูลของรหัสนี้บน Server');
            return;
        }
        data = await res.json();
    }

    applyData(data);
    ownerId = id;
    syncedId = id;

    updateItem();
    updateContent();
    updateProfilePreview();
    loadPortfolioList();

    if (items.length > 0) {
        updateStep(3);
    } else {
        updateStep(1);
    }
}

function applyData(data) {
    const p = data.profile || data;

    const fieldValues = {
        'full-name': p['full-name'] ?? p['fullName'] ?? p['name'] ?? '',
        'studen_id': p['studen_id'] ?? p['student_id'] ?? p['id'] ?? '',
        'enjoy': p['enjoy'] ?? '',
        'tried': p['tried'] ?? '',
        'curious-about': p['curious-about'] ?? p['curiousAbout'] ?? ''
    };

    Object.entries(fieldValues).forEach(([elId, val]) => {
        const el = document.getElementById(elId);
        if (el) el.value = val;
    });

    const rawItems = Array.isArray(data.items) ? data.items : (Array.isArray(data.content) ? data.content : []);
    items = rawItems.map((it, idx) => ({
        id: it.id || `Item-${idx + 1}`,
        title: it.title || '',
        type: it.type || 'Personal Project',
        date: it.date || '',
        role: it.role || '',
        description: it.description || '',
        skills: Array.isArray(it.skills) ? it.skills.join(', ') : (it.skills || ''),
        what_i_did: it.what_i_did ?? it.whatIDid ?? '',
        what_i_learned: it.what_i_learned ?? it.whatILearned ?? '',
        challenge: it.challenge ?? '',
        next_step: it.next_step ?? it.nextStep ?? '',
        link: it.link ?? it.evidence ?? ''
    }));

    ContentIdCounter = Math.max(Number(data.counter) || 1, getNextCounter(items));
}

// เคลียร์ฟอร์มทั้งหมดและกลับไปหน้าแรก (Step 1)
function clearAllFormsAndReset() {
    ownerId = null;
    syncedId = null;
    clearTimeout(syncTimer);
    resetItems();

    profileFields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el) el.value = '';
    });

    ['item-title', 'item-date', 'item-role', 'item-description', 'item-skills',
        'item_did', 'item_learned', 'item_challenge', 'item_next', 'input-url'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    const typeSelect = document.getElementById("item-type");
    if (typeSelect) typeSelect.selectedIndex = 0;

    updateItem();
    updateContent();
    updateProfilePreview();
    loadPortfolioList();
    updateStep(1);
    document.getElementById('full-name')?.focus();
}

// ผูกกับปุ่ม + New ด้านบน
function createNewPortfolio() {
    clearAllFormsAndReset();
}

// ================= การเปลี่ยนหน้า (Step Navigation) =================
function updateStep(newStep) {
    if (newStep === 2 && currentStep < 2) {
        if (!check(2)) return;
        scheduleServerSave();
    }
    if (newStep === 3 && currentStep < 3) {
        if (items.length === 0) {
            alert('กรุณาเพิ่มผลงานอย่างน้อย 1 รายการก่อนไปต่อครับ');
            return;
        }
        scheduleServerSave();
    }
    // กดปุ่ม Next / Save ในหน้า 3: บันทึกลง Server แล้วเคลียร์ฟอร์มกลับไปหน้าแรกทันที
    if (newStep === 3 && currentStep === 3) {
        sendToServer(collectData(), true).then((success) => {
            if (success) {
                clearAllFormsAndReset();
            }
        });
        return;
    }

    bar.classList.remove('step2', 'step3', 'back-to-step2', 'back-to-step1', 'start');

    if (newStep === 1) {
        bar.className = "bar back-to-step1";
        setPageVisibility(1);
        bar_1.className = "activate";
        bar_2.className = "not_activate";
        bar_3.className = "not_activate";
    } else if (newStep === 2) {
        bar.classList.add(currentStep > 2 ? 'back-to-step2' : 'step2');
        setPageVisibility(2);
        bar_1.className = "complete";
        bar_2.className = "activate";
        bar_3.className = "not_activate";
    } else if (newStep === 3) {
        bar.classList.add('step3');
        setPageVisibility(3);
        bar_1.className = "complete";
        bar_2.className = "complete";
        bar_3.className = "activate";
    }

    updateProfilePreview();
    currentStep = newStep;
}

function setPageVisibility(activePage) {
    const pages = [card_content_page_1, card_content_page_2, card_content_page_3];
    pages.forEach((page, idx) => {
        if (!page) return;
        if (idx + 1 === activePage) {
            page.classList.remove('not_active');
            page.classList.add('active');
        } else {
            page.classList.remove('active');
            page.classList.add('not_active');
        }
    });
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
        if (currentStep === 1 && !check(2)) return;
        updateStep(2);
    });
}

if (bar_3) {
    bar_3.addEventListener("click", function (e) {
        e.preventDefault();
        if (currentStep === 1 && !check(2)) return;
        if (items.length === 0) {
            alert('กรุณาเพิ่มผลงานอย่างน้อย 1 รายการก่อนไปต่อครับ');
            return;
        }
        updateStep(3);
    });
}

// ================= ตรวจสอบข้อมูล (Client-side Validation) =================
function check(targetStep) {
    if (targetStep === 2) {
        const fullName = document.getElementById('full-name');
        const idTag = document.getElementById('studen_id');
        const tried = document.getElementById('tried');
        const curious = document.getElementById('curious-about');

        if (fullName && !fullName.value.trim()) {
            alert('กรุณากรอก FULL NAME / DISPLAY NAME ด้วยครับ');
            fullName.focus();
            return false;
        }
        if (idTag && !/^\d{10}$/.test(idTag.value.trim())) {
            alert('PORTFOLIO ID TAG ต้องเป็นตัวเลข 10 หลักพอดีครับ');
            idTag.focus();
            return false;
        }
        if (tried && !tried.value.trim()) {
            alert('กรุณากรอก WHAT I\'VE TRIED ด้วยครับ');
            tried.focus();
            return false;
        }
        if (curious && !curious.value.trim()) {
            alert('กรุณากรอก WHAT I\'M CURIOUS ABOUT ด้วยครับ');
            curious.focus();
            return false;
        }
        return true;
    }

    if (targetStep === 3) {
        const requiredFields = [
            { id: 'item-title', label: 'TITLE (ชื่อผลงาน)' },
            { id: 'item-type', label: 'TYPE (ประเภท)' },
            { id: 'item-date', label: 'DATE (วันที่)' },
            { id: 'item-role', label: 'ROLE (บทบาท)' },
            { id: 'item-description', label: 'DESCRIPTION (รายละเอียด)' },
            { id: 'item-skills', label: 'SKILLS (ทักษะ)' },
            { id: 'item_did', label: 'What I Did (ทำอะไรไปบ้าง)' },
            { id: 'item_learned', label: 'What I Learned (ได้เรียนรู้อะไร)' },
            { id: 'item_challenge', label: 'Challenge (อุปสรรค/ความท้าทาย)' },
            { id: 'item_next', label: 'Next Step (ขั้นตอนถัดไป)' }
        ];

        for (const field of requiredFields) {
            const el = document.getElementById(field.id);
            if (el && !el.value.trim()) {
                alert(`กรุณากรอก ${field.label} ด้วยครับ`);
                el.focus();
                return false;
            }
        }

        const urlInput = document.getElementById('input-url');
        if (urlInput && !isValidHttpUrl(urlInput.value.trim())) {
            alert('กรุณากรอก EVIDENCE เป็นลิงก์ URL ที่ถูกต้อง (ขึ้นต้นด้วย http:// หรือ https://) ครับ');
            urlInput.focus();
            return false;
        }
        return true;
    }

    return true;
}

// ================= หน้า 2: เพิ่ม / ลบ / แสดงรายการผลงาน =================
function updateItem() {
    itemcount.textContent = items.length + (items.length <= 1 ? " Item" : " Items");
    if (items.length === 0) {
        itemList.innerHTML = '<div class="empty-state"> ยังไม่มีรายการผลงานใน Portfolio นี้ กดเพิ่มผลงานด้านบนได้เลย </div>';
        return;
    }

    itemList.innerHTML = items.map(item => `
        <div class="item-box item-card d-flex align-items-start justify-content-between mb-3">
            <div>
                <span class="item-id">${esc(item.id)}</span>
                <span class="text-muted"> ${esc(item.type)} | ${esc(item.date)}</span>
                <h3 class="h6 fw-semibold mb-0">${esc(item.title)}</h3>
                <p class="text-muted mb-0"><strong>Role: ${esc(item.role)}</strong></p>
            </div>
            <a class="remove_Item" onclick="removeItem('${esc(item.id)}')" style="cursor:pointer;">
                <ion-icon name="trash-bin"></ion-icon>
            </a>
        </div>
    `).join("");
}

function additem() {
    if (!check(3)) return;

    const newItem = {
        id: `Item-${ContentIdCounter++}`,
        title: document.getElementById("item-title").value.trim(),
        type: document.getElementById("item-type").value,
        date: document.getElementById("item-date").value,
        role: document.getElementById("item-role").value.trim(),
        description: document.getElementById("item-description").value.trim(),
        skills: document.getElementById("item-skills").value.trim(),
        what_i_did: document.getElementById("item_did").value.trim(),
        what_i_learned: document.getElementById("item_learned").value.trim(),
        challenge: document.getElementById("item_challenge").value.trim(),
        next_step: document.getElementById("item_next").value.trim(),
        link: document.getElementById("input-url").value.trim()
    };

    items.push(newItem);

    updateItem();
    updateContent();
    scheduleServerSave();

    ['item-title', 'item-date', 'item-role', 'item-description', 'item-skills',
        'item_did', 'item_learned', 'item_challenge', 'item_next', 'input-url'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    const typeSelect = document.getElementById("item-type");
    if (typeSelect) typeSelect.selectedIndex = 0;
}

function removeItem(id) {
    items = items.filter(item => item.id !== id);
    updateItem();
    updateContent();
    scheduleServerSave();
}

// ================= หน้า 3: แสดงผล Portfolio Showcase =================
function updateProfilePreview() {
    const fullName = document.getElementById('full-name')?.value.trim() || "My profile";
    const id = document.getElementById('studen_id')?.value.trim() || "-";
    const enjoy = document.getElementById('enjoy')?.value.trim() || "-";
    const tried = document.getElementById('tried')?.value.trim() || "-";
    const curious = document.getElementById('curious-about')?.value.trim() || "-";

    const showName = document.getElementById('show_name');
    const showId = document.getElementById('id_profile');
    const showEnjoy = document.getElementById('show_enjoy');
    const showTried = document.getElementById('show_tired');
    const showCurious = document.getElementById('show_curious');

    if (showName) showName.textContent = fullName;
    if (showId) showId.textContent = "Id: " + id;
    if (showEnjoy) showEnjoy.textContent = enjoy;
    if (showTried) showTried.textContent = tried;
    if (showCurious) showCurious.textContent = curious;
}

function updateContent() {
    Contentcount.textContent = items.length + (items.length <= 1 ? " Item" : " Items");

    if (items.length === 0) {
        ContentList.innerHTML = '<div class="empty-state"> ยังไม่มีรายการผลงานใน Portfolio นี้ กดเพิ่มผลงานด้านบนได้เลย </div>';
        return;
    }

    ContentList.innerHTML = items.map((item, index) => {
        const safeLink = isValidHttpUrl(item.link) ? esc(item.link) : '#';
        const skillBadges = (item.skills || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => `<span class="badge bg-light text-dark border me-1">${esc(s)}</span>`)
            .join('');

        return `
        <div class="portfolio-item-card mb-3 p-3">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                <div>
                    <span class="item-tag-id badge">${esc(item.id || `Item-${index + 1}`)}</span>
                    <span class="item-meta-text text-muted ms-2">${esc(item.type || '-')} | <i class="fa-regular fa-calendar"></i> ${esc(item.date || '-')}</span>
                    <h5 class="item-card-title mt-2 mb-1 fw-bold">${esc(item.title)}</h5>
                    <p class="item-role-text text-muted mb-0"><i class="fa-solid fa-user-gear me-1"></i>Role: ${esc(item.role || '-')}</p>
                </div>
                <a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="btn-evidence">
                    <i class="fa-solid fa-arrow-up-right-from-square me-1"></i> View Evidence
                </a>
            </div>
            <p class="item-card-desc mb-2">${esc(item.description || '-')}</p>
            ${skillBadges ? `<div class="mb-2">${skillBadges}</div>` : ''}
            <div class="small text-muted border-top pt-2 mt-2">
                <div><strong>What I Did:</strong> ${esc(item.what_i_did || '-')}</div>
                <div><strong>What I Learned:</strong> ${esc(item.what_i_learned || '-')}</div>
                <div><strong>Challenge:</strong> ${esc(item.challenge || '-')}</div>
                <div><strong>Next Step:</strong> ${esc(item.next_step || '-')}</div>
            </div>
        </div>
        `;
    }).join("");
}

// ================= การเชื่อมต่อ Server (PHP JSON Storage) =================
function collectData() {
    const profile = {};
    profileFields.forEach(id => {
        const el = document.getElementById(id);
        profile[id] = el ? el.value.trim() : '';
    });
    return { profile, items, counter: ContentIdCounter };
}

function resetItems() {
    items = [];
    ContentIdCounter = 1;
}

function scheduleServerSave() {
    const data = collectData();
    const id = data.profile['studen_id'];
    if (!/^\d{10}$/.test(id) || id !== syncedId) return;
    if (!data.profile['full-name'] || !data.profile['tried'] || !data.profile['curious-about']) return;

    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => sendToServer(data, false), 600);
}

async function sendToServer(data, showFeedback = false) {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
            console.error('Server save failed:', result.error || res.status);
            if (showFeedback) {
                alert('บันทึกไม่สำเร็จ: ' + (result.error || 'ข้อมูลไม่ถูกต้อง'));
            }
            return false;
        }
        loadPortfolioList();
        if (showFeedback) {
            alert('บันทึกข้อมูล Portfolio ลง Server เรียบร้อยแล้วครับ!');
        }
        return true;
    } catch (e) {
        console.error('Server unreachable:', e);
        if (showFeedback) {
            alert('ไม่สามารถเชื่อมต่อ Server ได้ กรุณาลองใหม่อีกครั้งครับ');
        }
        return false;
    }
}

async function loadFromServer(id) {
    syncedId = null;
    try {
        const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`);
        const currentInputId = document.getElementById('studen_id')?.value.trim();
        if (currentInputId !== id) return;

        if (res.status === 404) {
            if (ownerId && ownerId !== id && items.length > 0) {
                const keep = confirm('เปลี่ยนรหัส ID ใหม่ ไม่พบข้อมูลเดิมบน Server ต้องการเก็บรายการผลงานที่เพิ่มไว้ตอนนี้ด้วยหรือไม่?');
                if (!keep) resetItems();
            }
            ownerId = id;
            syncedId = id;
            updateItem();
            updateContent();
            updateProfilePreview();
            scheduleServerSave();
            return;
        }

        if (!res.ok) {
            console.error('loadFromServer failed:', res.status);
            return;
        }

        const serverData = await res.json();
        applyData(serverData);
        ownerId = id;
        syncedId = id;
        updateItem();
        updateContent();
        updateProfilePreview();
    } catch (e) {
        console.error('loadFromServer failed:', e);
    }
}

profileFields.forEach(id => {
    if (id === 'studen_id') return;
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', scheduleServerSave);
});

// เริ่มต้นแสดงผลหน้าแรก และโหลดปุ่ม Portfolio Bar
updateItem();
updateContent();
updateProfilePreview();
loadPortfolioList();