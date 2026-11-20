// เชื่อมต่อหน้าเว็บกับ Backend (api/portfolio.php และ api/items.php)
const API_PORTFOLIO = 'api/portfolio.php';
const API_ITEMS = 'api/items.php';
const LAST_PORTFOLIO_KEY = 'cs100_lastPortfolioId'; // จำแค่ว่ากำลังเปิดแท็บไหนอยู่ (ข้อมูลหลักอยู่บน Server)

const bar = document.querySelector(".bar");
const bar_1 = document.querySelector("#bar_1");
const bar_2 = document.querySelector("#bar_2");
const bar_3 = document.querySelector("#bar_3");

const card_content_page_1 = document.querySelector(".card_content_page_1");
const card_content_page_2 = document.querySelector(".card_content_page_2");
const card_content_page_3 = document.querySelector(".card_content_page_3");

const itemcount = document.getElementById("item-Count");
const itemList = document.getElementById("item-List");
const Contentcount = document.getElementById("content-Count");
const ContentList = document.getElementById("content-List");
const portfolioTabsEl = document.getElementById("portfolio-tabs");
const serverStatusEl = document.getElementById("server-status");
const offlineBannerEl = document.getElementById("server-offline-banner");
const editingLabelEl = document.getElementById("editing-portfolio-label");
const deletePortfolioBtn = document.getElementById("btn-delete-portfolio");

const profileFields = ['full-name', 'studen_id', 'enjoy', 'tried', 'curious-about'];

let currentStep = 1;
let portfolioList = [];
let activePortfolioId = null;
let items = [];
let content = [];
let ContentIdCounter = 1;

if (bar) {
    bar.className = "bar start";
}

// PORTFOLIO ID: เฉพาะตัวเลข ไม่เกิน 10 หลัก
const idInput = document.getElementById('studen_id');
if (idInput) {
    idInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 10);
        if (/^\d{10}$/.test(this.value) && this.value !== activePortfolioId) {
            const exists = portfolioList.some(p => p.id === this.value);
            if (exists) {
                selectPortfolio(this.value);
            }
        }
    });
}

// ================= ฟังก์ชันป้องกัน XSS และตรวจ URL =================

function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function safeUrl(url) {
    const trimmed = String(url ?? '').trim();
    return /^https?:\/\/.+/i.test(trimmed) ? trimmed : '#';
}

function showAlertBox(elementId, message, errors = [], isSuccess = false) {
    const box = document.getElementById(elementId);
    if (!box) return;
    if (!message && (!errors || errors.length === 0)) {
        box.hidden = true;
        box.innerHTML = '';
        box.classList.remove('is-success');
        return;
    }
    box.hidden = false;
    box.classList.toggle('is-success', Boolean(isSuccess));
    let html = `<div><strong>${esc(message)}</strong></div>`;
    if (Array.isArray(errors) && errors.length > 0) {
        html += `<ul class="mb-0 mt-1 ps-3">${errors.map(err => `<li>${esc(err)}</li>`).join('')}</ul>`;
    }
    box.innerHTML = html;
}

function clearAllAlerts() {
    showAlertBox('page1-error', '');
    showAlertBox('page2-error', '');
}

function setServerStatus(state, text) {
    if (!serverStatusEl) return;
    serverStatusEl.className = `server-status-badge status-${state}`;
    serverStatusEl.textContent = text;
}

// ================= ฟังก์ชันส่งและรับข้อมูลจาก Server (PHP API) =================

async function fetchApi(url, options = {}) {
    const fetchOptions = {
        method: options.method || 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
    };

    if (options.body !== undefined) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(options.body);
    }

    try {
        const res = await fetch(url, fetchOptions);
        const rawText = await res.text();

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (err) {
            throw new Error(
                'ไม่สามารถเรียก PHP API ได้ (กรุณาเปิดผ่าน PHP Server เช่น php -S localhost:8000 หรือ URL ของ AWS EC2)'
            );
        }

        if (!res.ok) {
            return {
                ok: false,
                status: res.status,
                error: data.error || `Server ตอบกลับข้อผิดพลาด (${res.status})`,
                errors: Array.isArray(data.errors) ? data.errors : []
            };
        }

        if (offlineBannerEl) offlineBannerEl.hidden = true;
        setServerStatus('connected', 'Server Connected');
        return { ok: true, status: res.status, data };
    } catch (networkErr) {
        setServerStatus('error', 'Server Offline');
        if (offlineBannerEl) {
            showAlertBox(
                'server-offline-banner',
                'เชื่อมต่อ Server ไม่สำเร็จ',
                [networkErr.message || 'กรุณาเปิดเว็บผ่าน PHP Server หรือ URL ของ AWS EC2']
            );
        }
        return {
            ok: false,
            status: 0,
            error: networkErr.message || 'ไม่สามารถเชื่อมต่อ Server ได้',
            errors: []
        };
    }
}

// ================= จัดการหลาย Portfolio (แถบเลือก Portfolio) =================

function collectProfileForm() {
    const profile = {};
    profileFields.forEach(id => {
        const el = document.getElementById(id);
        profile[id] = el ? el.value.trim() : '';
    });
    return profile;
}

function applyPortfolioData(data) {
    profileFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = (data && data.profile && data.profile[id] !== undefined) ? data.profile[id] : '';
        }
    });
    items = (data && Array.isArray(data.items)) ? data.items : [];
    content = (data && Array.isArray(data.content)) ? data.content : [];
    ContentIdCounter = (data && typeof data.counter === 'number' && data.counter >= 1)
        ? data.counter
        : items.length + 1;
}

function renderPortfolioTabs() {
    if (!portfolioTabsEl) return;

    if (portfolioList.length === 0) {
        portfolioTabsEl.innerHTML = `<span class="switcher-empty">ยังไม่มี Portfolio บน Server</span>`;
    } else {
        portfolioTabsEl.innerHTML = portfolioList.map(pf => {
            const count = Number(pf.itemCount || 0);
            const unit = count === 1 ? 'item' : 'items';
            const isActive = pf.id === activePortfolioId;
            return `
                <button type="button"
                    class="portfolio-pill ${isActive ? 'active' : ''}"
                    onclick="selectPortfolio('${esc(pf.id)}')">
                    <span class="pill-name">${esc(pf.name || pf.id)}</span>
                    <span class="pill-dot">&bull;</span>
                    <span class="pill-count">${count} ${unit}</span>
                </button>
            `;
        }).join('');
    }

    const activeMeta = portfolioList.find(p => p.id === activePortfolioId);
    if (editingLabelEl) {
        editingLabelEl.textContent = activeMeta
            ? `Editing: ${activeMeta.name}`
            : 'Editing: New Portfolio';
    }
    if (deletePortfolioBtn) {
        deletePortfolioBtn.hidden = !activePortfolioId;
    }
}

async function refreshPortfolioList(preferredId = null) {
    setServerStatus('loading', 'กำลังโหลดจาก Server...');
    const res = await fetchApi(`${API_PORTFOLIO}?action=list`);
    if (!res.ok) {
        renderPortfolioTabs();
        updateItem();
        updateContent();
        updateProfilePreview();
        return;
    }

    portfolioList = Array.isArray(res.data.portfolios) ? res.data.portfolios : [];

    let targetId = preferredId;
    if (!targetId) {
        try {
            targetId = localStorage.getItem(LAST_PORTFOLIO_KEY);
        } catch (e) {
            targetId = null;
        }
    }

    if (targetId && portfolioList.some(p => p.id === targetId)) {
        await selectPortfolio(targetId);
    } else if (portfolioList.length > 0) {
        await selectPortfolio(portfolioList[0].id);
    } else {
        activePortfolioId = null;
        applyPortfolioData(null);
        renderPortfolioTabs();
        updateItem();
        updateContent();
        updateProfilePreview();
    }
}

async function selectPortfolio(portfolioId) {
    const res = await fetchApi(`${API_PORTFOLIO}?id=${encodeURIComponent(portfolioId)}`);
    if (!res.ok) {
        showAlertBox('page1-error', res.error, res.errors);
        return;
    }

    activePortfolioId = portfolioId;
    try {
        localStorage.setItem(LAST_PORTFOLIO_KEY, portfolioId);
    } catch (e) { /* ignore */ }

    clearAllAlerts();
    applyPortfolioData(res.data);
    renderPortfolioTabs();
    updateItem();
    updateContent();
    updateProfilePreview();
}

function startNewPortfolio() {
    activePortfolioId = null;
    try {
        localStorage.removeItem(LAST_PORTFOLIO_KEY);
    } catch (e) { /* ignore */ }

    clearAllAlerts();
    applyPortfolioData(null);
    renderPortfolioTabs();
    updateItem();
    updateContent();
    updateProfilePreview();
    goToStepVisual(1);

    const nameInput = document.getElementById('full-name');
    if (nameInput) nameInput.focus();
}

// ================= สลับหน้า 1 / 2 / 3 =================

function goToStepVisual(newStep) {
    bar.classList.remove('step2', 'step3', 'back-to-step2', 'back-to-step1', 'start');

    if (newStep === 1) {
        bar.className = "bar back-to-step1";
        card_content_page_1?.classList.remove('not_active');
        card_content_page_1?.classList.add('active');
        card_content_page_2?.classList.remove('active');
        card_content_page_2?.classList.add('not_active');
        card_content_page_3?.classList.remove('active');
        card_content_page_3?.classList.add('not_active');

        bar_1.className = "activate";
        bar_2.className = "not_activate";
        bar_3.className = "not_activate";
    } else if (newStep === 2) {
        bar.classList.add(currentStep > 2 ? 'back-to-step2' : 'step2');
        card_content_page_1?.classList.remove('active');
        card_content_page_1?.classList.add('not_active');
        card_content_page_2?.classList.remove('not_active');
        card_content_page_2?.classList.add('active');
        card_content_page_3?.classList.remove('active');
        card_content_page_3?.classList.add('not_active');

        bar_1.className = "complete";
        bar_2.className = "activate";
        bar_3.className = "not_activate";
    } else if (newStep === 3) {
        bar.classList.add('step3');
        card_content_page_1?.classList.remove('active');
        card_content_page_1?.classList.add('not_active');
        card_content_page_2?.classList.remove('active');
        card_content_page_2?.classList.add('not_active');
        card_content_page_3?.classList.remove('not_active');
        card_content_page_3?.classList.add('active');

        bar_1.className = "complete";
        bar_2.className = "complete";
        bar_3.className = "activate";
    }

    updateProfilePreview();
    currentStep = newStep;
}

function updateStep(newStep) {
    if (newStep === 2 && currentStep < 2) {
        saveProfileAndContinue();
        return;
    }
    if (newStep === 3 && currentStep < 3) {
        if (!activePortfolioId) {
            alert('กรุณาบันทึกโปรไฟล์ในขั้นตอนที่ 1 ก่อนครับ');
            goToStepVisual(1);
            return;
        }
        if (items.length === 0) {
            alert('กรุณาเพิ่มผลงานอย่างน้อย 1 รายการก่อนไปหน้า Showcase ครับ');
            return;
        }
    }
    goToStepVisual(newStep);
}

if (bar_1) {
    bar_1.addEventListener("click", function (e) {
        e.preventDefault();
        goToStepVisual(1);
    });
}

if (bar_2) {
    bar_2.addEventListener("click", function (e) {
        e.preventDefault();
        if (currentStep === 1) {
            saveProfileAndContinue();
            return;
        }
        goToStepVisual(2);
    });
}

if (bar_3) {
    bar_3.addEventListener("click", function (e) {
        e.preventDefault();
        if (!activePortfolioId) {
            alert('กรุณาบันทึกโปรไฟล์ในขั้นตอนที่ 1 ก่อนครับ');
            goToStepVisual(1);
            return;
        }
        updateStep(3);
    });
}

// ================= ตรวจข้อมูลเบื้องต้นหน้าเว็บ =================

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
            showAlertBox('page1-error', 'กรุณากรอก FULL NAME / DISPLAY NAME ด้วยครับ');
            inputs.fullName.focus();
            return false;
        }
        if (inputs.ID_TAG && !/^\d{10}$/.test(inputs.ID_TAG.value.trim())) {
            showAlertBox('page1-error', 'PORTFOLIO ID TAG ต้องเป็นตัวเลข 10 หลักพอดีครับ');
            inputs.ID_TAG.focus();
            return false;
        }
        if (inputs.enjoy && !inputs.enjoy.value.trim()) {
            showAlertBox('page1-error', 'กรุณากรอก WHAT I ENJOY ด้วยครับ');
            inputs.enjoy.focus();
            return false;
        }
        if (inputs.tried && !inputs.tried.value.trim()) {
            showAlertBox('page1-error', "กรุณากรอก WHAT I'VE TRIED ด้วยครับ");
            inputs.tried.focus();
            return false;
        }
        if (inputs.curious && !inputs.curious.value.trim()) {
            showAlertBox('page1-error', "กรุณากรอก WHAT I'M CURIOUS ABOUT ด้วยครับ");
            inputs.curious.focus();
            return false;
        }
        showAlertBox('page1-error', '');
        return true;
    }

    if (newStep === 3) {
        const requiredFields = [
            { id: 'item-title', label: 'TITLE (ชื่อผลงาน)' },
            { id: 'item-type', label: 'TYPE (ประเภท)' },
            { id: 'item-date', label: 'DATE (วันที่)' },
            { id: 'item-role', label: 'ROLE (บทบาท)' },
            { id: 'item-description', label: 'DESCRIPTION (รายละเอียด)' },
            { id: 'item-skills', label: 'SKILLS (ทักษะ)' },
            { id: 'item_did', label: 'Reflection: What I Did' },
            { id: 'item_learned', label: 'Reflection: What I Learned' },
            { id: 'item_challenge', label: 'Reflection: Challenge' },
            { id: 'item_next', label: 'Reflection: Next Step' }
        ];

        for (const field of requiredFields) {
            const el = document.getElementById(field.id);
            if (el && !el.value.trim()) {
                showAlertBox('page2-error', `กรุณากรอก ${field.label} ให้ครบถ้วนครับ`);
                el.focus();
                return false;
            }
        }

        const urlInput = document.getElementById('input-url');
        if (urlInput && !/^https?:\/\/.+/.test(urlInput.value.trim())) {
            showAlertBox('page2-error', 'กรุณากรอก EVIDENCE เป็นลิงก์ที่ขึ้นต้นด้วย http:// หรือ https:// ครับ');
            urlInput.focus();
            return false;
        }

        showAlertBox('page2-error', '');
        return true;
    }
    return true;
}

// ================= หน้า 1: บันทึกโปรไฟล์ขึ้น Server =================

async function saveProfileAndContinue() {
    if (!check(2)) return;

    const profile = collectProfileForm();
    const newId = profile['studen_id'];

    // ถ้าเปลี่ยนไปใช้ ID ใหม่ที่ไม่ตรงกับของเดิม ให้เคลียร์รายการเก่าออกก่อน
    if (activePortfolioId && activePortfolioId !== newId) {
        const alreadyExists = portfolioList.some(p => p.id === newId);
        if (!alreadyExists) {
            items = [];
            content = [];
            ContentIdCounter = 1;
        }
    }

    const payload = {
        profile,
        items,
        content,
        counter: ContentIdCounter
    };

    const res = await fetchApi(API_PORTFOLIO, {
        method: 'POST',
        body: payload
    });

    if (!res.ok) {
        showAlertBox('page1-error', res.error, res.errors);
        return;
    }

    activePortfolioId = newId;
    if (Array.isArray(res.data.portfolios)) {
        portfolioList = res.data.portfolios;
    }
    try {
        localStorage.setItem(LAST_PORTFOLIO_KEY, activePortfolioId);
    } catch (e) { /* ignore */ }

    showAlertBox('page1-error', '');
    renderPortfolioTabs();
    updateItem();
    updateContent();
    updateProfilePreview();
    goToStepVisual(2);
}

async function deleteCurrentPortfolio() {
    if (!activePortfolioId) return;
    const currentName = document.getElementById('full-name')?.value.trim() || activePortfolioId;
    if (!confirm(`ต้องการลบ Portfolio "${currentName}" ออกจาก Server ใช่หรือไม่?`)) return;

    const res = await fetchApi(`${API_PORTFOLIO}?id=${encodeURIComponent(activePortfolioId)}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        showAlertBox('page1-error', res.error, res.errors);
        return;
    }

    portfolioList = Array.isArray(res.data.portfolios) ? res.data.portfolios : [];
    if (portfolioList.length > 0) {
        await selectPortfolio(portfolioList[0].id);
    } else {
        startNewPortfolio();
    }
}

// ================= หน้า 2: เพิ่มและลบผลงานผ่าน api/items.php =================

function updateItem() {
    itemcount.textContent = items.length + (items.length <= 1 ? " item" : " items");
    if (items.length === 0) {
        itemList.innerHTML = '<div class="empty-state"> ยังไม่มีรายการผลงานใน Portfolio นี้ กดเพิ่มผลงานด้านบนได้เลย </div>';
        return;
    }

    itemList.innerHTML = items.map(item => `
        <div class="item-box item-card d-flex align-items-start justify-content-between mb-3">
            <div>
                <span class="item-id">${esc(item.id)}</span>
                <span class="text-muted"> ${esc(item.type)} | ${esc(item.date)}</span>
                <h3 class="h6 fw-semibold mb-0 mt-1">${esc(item.title)}</h3>
                <p class="text-muted mb-0"><strong>Role: ${esc(item.role)}</strong></p>
            </div>
            <a class="remove_Item" title="ลบรายการนี้" onclick="removeItem('${esc(item.id)}')">
                <ion-icon name="trash-bin"></ion-icon>
            </a>
        </div>
    `).join("");
}

async function additem() {
    if (!activePortfolioId) {
        showAlertBox('page2-error', 'กรุณาบันทึกโปรไฟล์ในขั้นตอนที่ 1 ก่อนเพิ่มผลงานครับ');
        goToStepVisual(1);
        return;
    }
    if (!check(3)) return;

    const payload = {
        title: document.getElementById("item-title").value.trim(),
        type: document.getElementById("item-type").value.trim(),
        date: document.getElementById("item-date").value.trim(),
        description: document.getElementById("item-description").value.trim(),
        skills: document.getElementById("item-skills").value.trim(),
        role: document.getElementById("item-role").value.trim(),
        what_i_did: document.getElementById("item_did").value.trim(),
        what_i_learned: document.getElementById("item_learned").value.trim(),
        challenge: document.getElementById("item_challenge").value.trim(),
        next_step: document.getElementById("item_next").value.trim(),
        link: document.getElementById("input-url").value.trim()
    };

    const res = await fetchApi(`${API_ITEMS}?id=${encodeURIComponent(activePortfolioId)}`, {
        method: 'POST',
        body: payload
    });

    if (!res.ok) {
        showAlertBox('page2-error', res.error, res.errors);
        return;
    }

    if (res.data.portfolio) {
        applyPortfolioData(res.data.portfolio);
    }
    if (Array.isArray(res.data.portfolios)) {
        portfolioList = res.data.portfolios;
    }

    showAlertBox('page2-error', 'บันทึกผลงานลง Server เรียบร้อยแล้ว!', [], true);
    renderPortfolioTabs();
    updateItem();
    updateContent();

    // เคลียร์ฟอร์มเพื่อกรอกรายการถัดไป
    document.getElementById("item-title").value = '';
    document.getElementById("item-type").value = '';
    document.getElementById("item-date").value = '';
    document.getElementById("item-role").value = '';
    document.getElementById("item-description").value = '';
    document.getElementById("item-skills").value = '';
    document.getElementById("item_did").value = '';
    document.getElementById("item_learned").value = '';
    document.getElementById("item_challenge").value = '';
    document.getElementById("item_next").value = '';
    document.getElementById("input-url").value = '';
}

async function removeItem(itemId) {
    if (!activePortfolioId) return;

    const url = `${API_ITEMS}?id=${encodeURIComponent(activePortfolioId)}&itemId=${encodeURIComponent(itemId)}`;
    const res = await fetchApi(url, { method: 'DELETE' });

    if (!res.ok) {
        showAlertBox('page2-error', res.error, res.errors);
        return;
    }

    if (res.data.portfolio) {
        applyPortfolioData(res.data.portfolio);
    }
    if (Array.isArray(res.data.portfolios)) {
        portfolioList = res.data.portfolios;
    }

    renderPortfolioTabs();
    updateItem();
    updateContent();
}

// ================= หน้า 3: แสดงผล Portfolio Showcase =================

function toStandardItemJson(item) {
    const skillsArr = Array.isArray(item.skills)
        ? item.skills
        : String(item.skills || '').split(',').map(s => s.trim()).filter(Boolean);

    const evidenceArr = Array.isArray(item.evidence) && item.evidence.length > 0
        ? item.evidence
        : (item.link ? [item.link] : []);

    return {
        id: item.id || 'item001',
        title: item.title || '',
        type: item.type || '',
        date: item.date || '',
        role: item.role || '',
        description: item.description || '',
        skills: skillsArr,
        reflection: {
            whatIDid: item.what_i_did || item.reflection?.whatIDid || '',
            whatILearned: item.what_i_learned || item.reflection?.whatILearned || '',
            challenge: item.challenge || item.reflection?.challenge || '',
            nextStep: item.next_step || item.reflection?.nextStep || ''
        },
        evidence: evidenceArr
    };
}

function updateProfilePreview() {
    const profile = collectProfileForm();
    const showName = document.getElementById('show_name');
    const showId = document.getElementById('id_profile');
    const showEnjoy = document.getElementById('show_enjoy');
    const showTried = document.getElementById('show_tired');
    const showCurious = document.getElementById('show_curious');

    if (showName) showName.textContent = profile['full-name'] || "My profile";
    if (showId) showId.textContent = profile['studen_id'] ? `Id: ${profile['studen_id']}` : "Id: -";
    if (showEnjoy) showEnjoy.textContent = profile['enjoy'] || "-";
    if (showTried) showTried.textContent = profile['tried'] || "-";
    if (showCurious) showCurious.textContent = profile['curious-about'] || "-";
}

function updateContent() {
    Contentcount.textContent = content.length + (content.length <= 1 ? " item" : " items");

    if (content.length === 0) {
        ContentList.innerHTML = '<div class="empty-state"> ยังไม่มีรายการผลงานใน Portfolio นี้ กดเพิ่มผลงานด้านบนได้เลย </div>';
        return;
    }

    ContentList.innerHTML = content.map((rawItem, index) => {
        const item = toStandardItemJson(rawItem);
        const skillsHtml = item.skills.map(s => `<span class="portfolio-skill-pill">${esc(s)}</span>`).join('');
        const evidenceHtml = item.evidence.map((url, i) => `
            <a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer" class="btn-evidence">
                <i class="fa-solid fa-arrow-up-right-from-square me-1"></i>
                ${item.evidence.length > 1 ? `Evidence ${i + 1}` : 'View Evidence'}
            </a>
        `).join('');

        return `
            <div class="portfolio-item-card mb-3 p-3">
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                    <div>
                        <span class="item-tag-id badge">${esc(item.id || `Item-${index + 1}`)}</span>
                        <span class="item-meta-text text-muted ms-2">${esc(item.type || '-')} | <i class="fa-regular fa-calendar"></i> ${esc(item.date || '-')}</span>
                        <h5 class="item-card-title mt-2 mb-1 fw-bold">${esc(item.title)}</h5>
                        <p class="item-role-text text-muted mb-0"><i class="fa-solid fa-user-gear me-1"></i>Role: ${esc(item.role || '-')}</p>
                    </div>
                    <div class="d-flex align-items-center flex-wrap gap-2">
                        ${evidenceHtml}
                        <button type="button" class="btn-copy-json" onclick="copyItemJson('${esc(item.id)}')" title="คัดลอก Portfolio Item JSON สำหรับแลกเปลี่ยนกับเพื่อน">
                            <i class="fa-regular fa-copy me-1"></i> Copy JSON
                        </button>
                    </div>
                </div>
                <p class="item-card-desc mb-2">${esc(item.description || '-')}</p>
                ${skillsHtml ? `<div class="d-flex flex-wrap gap-2 mb-3">${skillsHtml}</div>` : ''}
                <div class="showcase-reflection-grid">
                    <div class="showcase-ref-box">
                        <span class="showcase-ref-label">What I Did</span>
                        <p>${esc(item.reflection.whatIDid || '-')}</p>
                    </div>
                    <div class="showcase-ref-box">
                        <span class="showcase-ref-label">What I Learned</span>
                        <p>${esc(item.reflection.whatILearned || '-')}</p>
                    </div>
                    <div class="showcase-ref-box">
                        <span class="showcase-ref-label">Challenge</span>
                        <p>${esc(item.reflection.challenge || '-')}</p>
                    </div>
                    <div class="showcase-ref-box">
                        <span class="showcase-ref-label">Next Step</span>
                        <p>${esc(item.reflection.nextStep || '-')}</p>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// ================= Challenge Exchange (Import / Export JSON) =================

function toggleExchangePanel() {
    const panel = document.getElementById('challenge-exchange-panel');
    const btn = document.getElementById('btn-toggle-exchange');
    const chevron = document.getElementById('exchange-chevron');
    if (!panel) return;

    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    if (btn) btn.setAttribute('aria-expanded', String(willOpen));
    if (chevron) chevron.classList.toggle('rotated', willOpen);
}

const importFileInput = document.getElementById('import-json-file');
if (importFileInput) {
    importFileInput.addEventListener('change', function (e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
            const textarea = document.getElementById('import-json-input');
            if (textarea) textarea.value = String(reader.result || '');
            showAlertBox('import-feedback', `โหลดไฟล์ "${file.name}" แล้ว กรุณากดปุ่มนำเข้าด้านล่าง`, [], true);
        };
        reader.readAsText(file, 'utf-8');
        e.target.value = '';
    });
}

function parseImportTextarea() {
    const raw = document.getElementById('import-json-input')?.value.trim() || '';
    if (!raw) {
        showAlertBox('import-feedback', 'กรุณาวาง JSON ในช่องข้อความ หรือเลือกไฟล์ .json ก่อนครับ');
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            showAlertBox('import-feedback', 'JSON ต้องเป็น Object ของ Portfolio Item 1 รายการ (ขึ้นต้นด้วย { ... })');
            return null;
        }
        return parsed;
    } catch (err) {
        showAlertBox('import-feedback', 'รูปแบบ JSON ไม่ถูกต้อง กรุณาตรวจสอบเครื่องหมายปีกกาและเครื่องหมายคำพูด', [err.message]);
        return null;
    }
}

function loadImportJsonToForm() {
    if (!activePortfolioId) {
        showAlertBox('import-feedback', 'กรุณาเลือกหรือสร้าง Portfolio ในขั้นตอนที่ 1 ก่อนนำเข้าผลงานครับ');
        return;
    }
    const item = parseImportTextarea();
    if (!item) return;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
    };

    setVal('item-title', item.title || '');
    setVal('item-date', item.date || '');
    setVal('item-role', item.role || '');
    setVal('item-description', item.description || '');
    setVal('item-skills', Array.isArray(item.skills) ? item.skills.join(', ') : (item.skills || ''));

    // ถ้ากลุ่มเพื่อนส่งชื่อ type ใหม่มา ให้เพิ่ม option ใน dropdown อัตโนมัติ
    const typeSelect = document.getElementById('item-type');
    if (typeSelect && item.type) {
        const typeStr = String(item.type).trim();
        const exists = Array.from(typeSelect.options).some(opt => opt.value === typeStr);
        if (!exists && typeStr !== '') {
            const opt = document.createElement('option');
            opt.value = typeStr;
            opt.textContent = typeStr;
            typeSelect.appendChild(opt);
        }
        typeSelect.value = typeStr;
    }

    const ref = item.reflection || {};
    setVal('item_did', ref.whatIDid ?? item.what_i_did ?? '');
    setVal('item_learned', ref.whatILearned ?? item.what_i_learned ?? '');
    setVal('item_challenge', ref.challenge ?? item.challenge ?? '');
    setVal('item_next', ref.nextStep ?? item.next_step ?? '');

    const firstEvidence = Array.isArray(item.evidence)
        ? (item.evidence[0] || '')
        : (item.evidence || item.link || '');
    setVal('input-url', firstEvidence);

    goToStepVisual(2);
    showAlertBox(
        'page2-error',
        'นำเข้าข้อมูลลงฟอร์มแล้ว! กรุณาตรวจสอบ/เพิ่มเติม Reflection และลิงก์หลักฐาน แล้วกด "Add Item To Portfolio" เพื่อบันทึกลง Server',
        [],
        true
    );
    showAlertBox('import-feedback', 'นำเข้าข้อมูลลงฟอร์มหน้า 2 เรียบร้อยแล้ว', [], true);
}

async function importItemToServer() {
    if (!activePortfolioId) {
        showAlertBox('import-feedback', 'กรุณาเลือกหรือสร้าง Portfolio ก่อน Import ครับ');
        return;
    }
    const item = parseImportTextarea();
    if (!item) return;

    const res = await fetchApi(`${API_ITEMS}?id=${encodeURIComponent(activePortfolioId)}`, {
        method: 'POST',
        body: item
    });

    if (!res.ok) {
        showAlertBox('import-feedback', res.error, res.errors);
        return;
    }

    if (res.data.portfolio) {
        applyPortfolioData(res.data.portfolio);
    }
    if (Array.isArray(res.data.portfolios)) {
        portfolioList = res.data.portfolios;
    }

    renderPortfolioTabs();
    updateItem();
    updateContent();

    const textarea = document.getElementById('import-json-input');
    if (textarea) textarea.value = '';

    showAlertBox(
        'import-feedback',
        `Import ผลงาน "${res.data.item?.title || item.title}" และบันทึกลง Server สำเร็จ!`,
        [],
        true
    );
}

function exportMyPortfolio() {
    if (!activePortfolioId) {
        alert('กรุณาเลือกหรือสร้าง Portfolio ก่อน Export ครับ');
        return;
    }
    const url = `${API_PORTFOLIO}?action=export&id=${encodeURIComponent(activePortfolioId)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-portfolio.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function copyCurrentPortfolioJson() {
    if (!activePortfolioId) {
        showAlertBox('import-feedback', 'กรุณาเลือก Portfolio ที่ต้องการคัดลอกก่อนครับ');
        return;
    }
    const profile = collectProfileForm();
    const exportObj = {
        portfolioId: activePortfolioId,
        displayName: profile['full-name'] || '',
        whatIEnjoy: profile['enjoy'] || '',
        whatIVeTried: profile['tried'] || '',
        whatIMCuriousAbout: profile['curious-about'] || '',
        items: content.map(toStandardItemJson)
    };
    const text = JSON.stringify(exportObj, null, 2);
    try {
        await navigator.clipboard.writeText(text);
        showAlertBox('import-feedback', `คัดลอก JSON ของ "${exportObj.displayName || activePortfolioId}" เรียบร้อยแล้ว!`, [], true);
    } catch (e) {
        showAlertBox('import-feedback', 'เบราว์เซอร์ไม่อนุญาตคัดลอกอัตโนมัติ กรุณากด Export my-portfolio.json แทนครับ');
    }
}

async function copyItemJson(itemId) {
    const rawItem = content.find(it => it.id === itemId);
    if (!rawItem) return;
    const text = JSON.stringify(toStandardItemJson(rawItem), null, 2);
    try {
        await navigator.clipboard.writeText(text);
        alert(`คัดลอก Portfolio Item JSON (${rawItem.id}: ${rawItem.title}) เรียบร้อยแล้ว! นำไปส่งให้เพื่อน Import ได้เลย`);
    } catch (e) {
        prompt('คัดลอก JSON ด้านล่างนี้:', text);
    }
}

// โหลดรายชื่อและข้อมูล Portfolio จาก Server ทันทีเมื่อเปิดหน้าเว็บ
refreshPortfolioList();
