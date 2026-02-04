const PASSWORD = "luiza25041999";

if (!localStorage.getItem("data_wiped_v2")) {
    localStorage.removeItem("projects");
    localStorage.removeItem("styles");
    localStorage.setItem("data_wiped_v2", "true");
    console.log("Legacy data wiped.");
}

async function login() {
    const btn = event?.target || document.querySelector('#loginSection button');
    if (btn) btn.disabled = true;

    const adminPassInput = document.getElementById("adminPass");
    const loginSection = document.getElementById("loginSection");
    const adminPanel = document.getElementById("adminPanel");

    const password = adminPassInput.value;

    if (auth) {
        try {
            await auth.signInWithEmailAndPassword('admin@oyudesign.group', password);
            if (loginSection) loginSection.style.display = "none";
            if (adminPanel) adminPanel.style.display = "block";
        } catch (e) {
            console.error(e);
            alert("Ошибка входа (Firebase): " + e.message);
            if (btn) btn.disabled = false;
        }
    } else {
        if (password === PASSWORD) {
            if (loginSection) loginSection.style.display = "none";
            if (adminPanel) adminPanel.style.display = "block";
        } else {
            alert("Неверный пароль");
            if (btn) btn.disabled = false;
        }
    }
}

const burger = document.getElementById("burger");
const nav = document.getElementById("nav");
burger?.addEventListener("click", () => {
    nav.classList.toggle("active");
    burger.classList.toggle("active");
});
nav?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        nav.classList.remove('active');
        burger.classList.remove('active');
    });
});

document.getElementById("adminPass")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
});

const defaultProjects = [];
const defaultStyles = [];

let projects = [];
let stylesList = [];

const initialProjects = defaultProjects;
const initialStyles = defaultStyles;

async function initData() {
    const gridP = document.getElementById("projectsGrid");
    const gridS = document.getElementById("stylesGrid");
    if (gridP) gridP.innerHTML = '<div style="text-align:center; width:100%; padding: 40px; color:rgba(255,255,255,0.5);">Загрузка...</div>';
    if (gridS) gridS.innerHTML = '<div style="text-align:center; width:100%; padding: 40px; color:rgba(255,255,255,0.5);">Загрузка...</div>';

    if (db) {
        try {
            const [pSnap, sSnap] = await Promise.all([
                db.collection('projects').get(),
                db.collection('styles').get()
            ]);

            projects = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            stylesList = sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log("Firebase data loaded:", { projects: projects.length, styles: stylesList.length });
        } catch (e) {
            console.error("Firebase Error:", e);
            loadLocal();
        }
    } else {
        loadLocal();
    }

    renderProjects();
    renderStyles();
    loadContacts();
}

function loadLocal() {
    projects = JSON.parse(localStorage.getItem("projects")) || initialProjects;
    stylesList = JSON.parse(localStorage.getItem("styles")) || initialStyles;

    if (!localStorage.getItem("projects")) localStorage.setItem("projects", JSON.stringify(projects));
    if (!localStorage.getItem("styles")) localStorage.setItem("styles", JSON.stringify(stylesList));
    console.log("Data loaded from LocalStorage");
}

let editingProjectIndex = -1;
let editingStyleIndex = -1;

function renderProjects() {
    const grid = document.getElementById("projectsGrid");
    const list = document.getElementById("projectList");

    if (grid) {
        if (projects.length === 0) {
            grid.innerHTML = '<p style="text-align:center; width:100%; color:#888;">Проекты пока не добавлены.</p>';
        } else {
            grid.innerHTML = projects.map((p, i) =>
                `<div class="project-card reveal" onclick="openModal('projects', ${i})">
                    <img src="${fixLink(p.img)}" referrerpolicy="no-referrer" onerror="this.src='https://via.placeholder.com/600x400?text=Image+Not+Found'">
                    <div class="card-overlay">
                        <h3>${p.title}</h3>
                    </div>
                </div>`
            ).join("");
        }
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    if (list) {
        list.innerHTML = projects.map((p, i) =>
            `<div class="admin-item">
                <span>${p.title}</span> 
                <div class="admin-actions">
                    <button class="btn-edit" onclick="editProject(${i})">Редактировать</button>
                    <button class="btn-delete" onclick="deleteProject(${i})">Удалить</button>
                </div>
            </div>`
        ).join("");
    }
}

function renderStyles() {
    const grid = document.getElementById("stylesGrid");
    const list = document.getElementById("styleList");

    if (grid) {
        if (stylesList.length === 0) {
            grid.innerHTML = '<p style="text-align:center; width:100%; color:#888;">Готовые проекты пока не добавлены.</p>';
        } else {
            grid.innerHTML = stylesList.map((s, i) =>
                `<div class="style-card reveal" onclick="openModal('styles', ${i})">
                    <img src="${fixLink(s.img)}" referrerpolicy="no-referrer" onerror="this.src='https://via.placeholder.com/600x400?text=Image+Not+Found'">
                    <div class="card-overlay">
                        <h3>${s.title}</h3>
                    </div>
                </div>`
            ).join("");
        }
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    if (list) {
        list.innerHTML = stylesList.map((s, i) =>
            `<div class="admin-item">
                <span>${s.title}</span> 
                <div class="admin-actions">
                    <button class="btn-edit" onclick="editStyle(${i})">Редактировать</button>
                    <button class="btn-delete" onclick="deleteStyle(${i})">Удалить</button>
                </div>
            </div>`
        ).join("");
    }
}

function createModal() {
    if (document.getElementById('modalOverlay')) return;
    const modalHTML = `
        <div id="modalOverlay" class="modal-overlay">
            <div class="modal-content">
                <button class="close-modal" onclick="closeModal()">&times;</button>
                <div class="modal-gallery">
                    <div class="modal-slider">
                        <div class="slides-container" id="slidesContainer"></div>
                        <button class="slider-btn prev-btn" onclick="moveSlide(-1)">&#10094;</button>
                        <button class="slider-btn next-btn" onclick="moveSlide(1)">&#10095;</button>
                    </div>
                </div>
                <div class="modal-body">
                    <h2 id="modalTitle"></h2>
                    <p id="modalInfo"></p>
                    <button class="btn modal-order-btn" onclick="orderNow()">Сделать заказ</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') closeModal();
    });
}

let currentSlideIndex = 0;

function openModal(type, index) {
    const data = type === 'projects' ? projects[index] : stylesList[index];
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const info = document.getElementById('modalInfo');
    const slidesContainer = document.getElementById('slidesContainer');

    title.innerText = data.title;
    info.innerText = data.info || "Мы проектируем современные интерьеры, основанные на геометрии, функциональности и минимализме. Наша команда создает гармоничные пространства, где каждая деталь имеет значение.";

    const sliderImages = (data.images || [data.img]).filter(i => i).map(img => fixLink(img));
    const content = document.querySelector('.modal-content');

    if (sliderImages.length <= 1) {
        content.classList.add('no-slider');
        slidesContainer.innerHTML = sliderImages.map(img => `
            <div class="slide">
                <img src="${img}" alt="" referrerpolicy="no-referrer" onerror="this.src='https://via.placeholder.com/1200x800?text=Image+Not+Found'">
            </div>
        `).join("");
    } else {
        content.classList.remove('no-slider');
        const first = sliderImages[0];
        const last = sliderImages[sliderImages.length - 1];
        const loopedImages = [last, ...sliderImages, first];

        slidesContainer.innerHTML = loopedImages.map(img => `
            <div class="slide">
                <img src="${img}" alt="" referrerpolicy="no-referrer" onerror="this.src='https://via.placeholder.com/1200x800?text=Image+Not+Found'">
            </div>
        `).join("");

        currentSlideIndex = 1;
    }

    updateSliderPosition(true);

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function moveSlide(n) {
    const slides = document.querySelectorAll('.slide');
    if (slides.length <= 1) return;

    currentSlideIndex += n;
    updateSliderPosition();

    if (currentSlideIndex >= slides.length - 1) {
        setTimeout(() => {
            currentSlideIndex = 1;
            updateSliderPosition(true);
        }, 600);
    } else if (currentSlideIndex <= 0) {
        setTimeout(() => {
            currentSlideIndex = slides.length - 2;
            updateSliderPosition(true);
        }, 600);
    }
}

function updateSliderPosition(immediate = false) {
    const container = document.getElementById('slidesContainer');
    if (container) {
        container.style.transition = immediate ? 'none' : 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        container.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    }
}

function orderNow() {
    closeModal();
    const contactSection = document.getElementById('contactForm');
    if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        window.location.href = 'index.html#contactForm';
    }
}

function fixLink(link) {
    if (!link || typeof link !== 'string') return link;
    const s = link.trim();
    if (s.includes('drive.google.com')) {
        let fileId = "";
        try {
            if (s.includes('/file/d/')) {
                fileId = s.split('/file/d/')[1].split('/')[0].split('?')[0].split('&')[0];
            } else if (s.includes('id=')) {
                fileId = s.split('id=')[1].split('&')[0].split('#')[0];
            }
        } catch (e) { return s; }
        // Thumbnail link is often more reliable on iOS then direct dl links
        return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600` : s;
    }
    return s;
}

async function uploadFile(input, type) {
    const file = input.files[0];
    if (!file || !storage) return;

    const originalText = input.previousElementSibling ? "Загрузка..." : "Загрузка...";
    const parent = input.parentElement;
    const textInput = parent.querySelector('input[type="text"]');

    try {
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = storage.ref(`images/${fileName}`);
        const uploadTask = await storageRef.put(file);
        const downloadURL = await uploadTask.ref.getDownloadURL();

        if (textInput) {
            textInput.value = downloadURL;
            alert("Фото успешно загружено!");
        }
    } catch (e) {
        console.error(e);
        alert("Ошибка загрузки: " + e.message);
    }
}

function addGalleryInput(containerId, className, value = "") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const div = document.createElement("div");
    div.className = "dynamic-input";
    div.style.display = "flex";
    div.style.gap = "10px";
    div.style.marginBottom = "10px";

    const input = document.createElement("input");
    input.type = "text";
    input.className = className;
    input.placeholder = "Ссылка на фото";
    input.value = value;
    input.style.flex = "1";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.style.width = "200px";
    const type = className.includes('project') ? 'project' : 'style';
    fileInput.onchange = function () { uploadFile(this, type); };

    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerText = "X";
    btn.style.background = "#86321a";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.padding = "5px 10px";
    btn.style.cursor = "pointer";
    btn.onclick = function () { container.removeChild(div); };

    div.appendChild(input);
    div.appendChild(fileInput);
    div.appendChild(btn);
    container.appendChild(div);
}

function getGalleryValues(className) {
    const inputs = document.querySelectorAll(`.${className}`);
    const links = [];
    inputs.forEach(input => {
        const val = input.value.trim();
        if (val) links.push(fixLink(val));
    });
    return links;
}

async function addProject() {
    const title = document.getElementById("projectTitle").value;
    const imgInput = document.getElementById("projectImg").value;
    const info = document.getElementById("projectInfo")?.value;

    const galleryArr = getGalleryValues('project-gallery-item');

    if (!title || !imgInput) return alert("Заполните название и главное фото");

    const img = fixLink(imgInput.trim());
    const images = [img, ...galleryArr];
    const projectData = { title, img, info, images };

    if (db) {
        try {
            const btn = document.getElementById("addProjectBtn");
            if (btn) btn.disabled = true;

            if (editingProjectIndex !== -1) {
                const id = projects[editingProjectIndex].id;
                if (!id) throw new Error("ID not found for editing");
                await db.collection('projects').doc(id).update(projectData);
            } else {
                await db.collection('projects').add(projectData);
            }
            await initData();
            alert("Saved to Firebase!");
        } catch (e) {
            console.error(e);
            alert("Error saving: " + e.message);
        } finally {
            const btn = document.getElementById("addProjectBtn");
            if (btn) btn.disabled = false;
        }
    } else {
        if (editingProjectIndex === -1) {
            projects.push(projectData);
            alert("Проект добавлен");
        } else {
            projects[editingProjectIndex] = projectData;
            alert("Изменения сохранены");
        }
        localStorage.setItem("projects", JSON.stringify(projects));
        renderProjects();
    }

    editingProjectIndex = -1;
    document.getElementById("addProjectBtn").innerText = "Добавить проект";

    document.getElementById("projectTitle").value = "";
    document.getElementById("projectImg").value = "";
    document.getElementById("projectInfo").value = "";
    const container = document.getElementById("projectGalleryContainer");
    if (container) container.innerHTML = `
        <div class="dynamic-input" style="display: flex; gap: 10px; margin-bottom: 10px;">
            <input type="text" class="project-gallery-item" placeholder="Ссылка на фото" style="flex: 1;">
            <input type="file" onchange="uploadFile(this, 'project')" style="width: 200px;">
        </div>
    `;
}

function editProject(i) {
    const p = projects[i];
    editingProjectIndex = i;

    document.getElementById("projectTitle").value = p.title;
    document.getElementById("projectImg").value = p.img;
    if (document.getElementById("projectInfo")) document.getElementById("projectInfo").value = p.info || "";

    const btn = document.getElementById("addProjectBtn");
    if (btn) btn.innerText = "Сохранить изменения";

    const container = document.getElementById("projectGalleryContainer");
    if (container) {
        container.innerHTML = "";
        const galleryImages = projects[i].images.slice(1);
        if (galleryImages.length > 0) {
            galleryImages.forEach(src => addGalleryInput('projectGalleryContainer', 'project-gallery-item', src));
        } else {
            addGalleryInput('projectGalleryContainer', 'project-gallery-item');
        }
    }

    window.scrollTo({ top: document.querySelector('#adminPanel section').offsetTop, behavior: 'smooth' });
}

async function deleteProject(i) {
    if (confirm("Удалить этот проект?")) {
        if (db) {
            try {
                const id = projects[i].id;
                await db.collection('projects').doc(id).delete();
                await initData();
            } catch (e) {
                alert("Ошибка: " + e.message);
            }
        } else {
            projects.splice(i, 1);
            localStorage.setItem("projects", JSON.stringify(projects));
            renderProjects();
        }
    }
}

async function addStyle() {
    const title = document.getElementById("styleTitle").value;
    const imgInput = document.getElementById("styleImg").value;
    const info = document.getElementById("styleInfo")?.value;
    const galleryArr = getGalleryValues('style-gallery-item');

    if (!title || !imgInput) return alert("Заполните название и главное фото");

    const img = fixLink(imgInput.trim());
    const images = [img, ...galleryArr];
    const styleData = { title, img, info, images };

    if (db) {
        try {
            const btn = document.getElementById("addStyleBtn");
            if (btn) btn.disabled = true;

            if (editingStyleIndex !== -1) {
                const id = stylesList[editingStyleIndex].id;
                await db.collection('styles').doc(id).update(styleData);
            } else {
                await db.collection('styles').add(styleData);
            }
            await initData();
            alert("Saved to Firebase!");
        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
        } finally {
            const btn = document.getElementById("addStyleBtn");
            if (btn) btn.disabled = false;
        }
    } else {
        if (editingStyleIndex === -1) {
            stylesList.push(styleData);
            alert("Стиль добавлен");
        } else {
            stylesList[editingStyleIndex] = styleData;
            alert("Изменения сохранены");
        }
        localStorage.setItem("styles", JSON.stringify(stylesList));
        renderStyles();
    }

    editingStyleIndex = -1;
    document.getElementById("addStyleBtn").innerText = "Добавить стиль";

    document.getElementById("styleTitle").value = "";
    document.getElementById("styleImg").value = "";
    document.getElementById("styleInfo").value = "";
    const container = document.getElementById("styleGalleryContainer");
    if (container) container.innerHTML = `
        <div class="dynamic-input" style="display: flex; gap: 10px; margin-bottom: 10px;">
            <input type="text" class="style-gallery-item" placeholder="Ссылка на фото" style="flex: 1;">
            <input type="file" onchange="uploadFile(this, 'style')" style="width: 200px;">
        </div>
    `;
}

function editStyle(i) {
    const s = stylesList[i];
    editingStyleIndex = i;

    document.getElementById("styleTitle").value = s.title;
    document.getElementById("styleImg").value = s.img;
    if (document.getElementById("styleInfo")) document.getElementById("styleInfo").value = s.info || "";

    const btn = document.getElementById("addStyleBtn");
    if (btn) btn.innerText = "Сохранить изменения";

    const container = document.getElementById("styleGalleryContainer");
    if (container) {
        container.innerHTML = "";
        const galleryImages = stylesList[i].images.slice(1);
        if (galleryImages.length > 0) {
            galleryImages.forEach(src => addGalleryInput('styleGalleryContainer', 'style-gallery-item', src));
        } else {
            addGalleryInput('styleGalleryContainer', 'style-gallery-item');
        }
    }

    const sections = document.querySelectorAll('#adminPanel section');
    if (sections[1]) window.scrollTo({ top: sections[1].offsetTop, behavior: 'smooth' });
}

async function deleteStyle(i) {
    if (confirm("Удалить этот стиль?")) {
        if (db) {
            try {
                const id = stylesList[i].id;
                await db.collection('styles').doc(id).delete();
                await initData();
            } catch (e) {
                alert("Ошибка: " + e.message);
            }
        } else {
            stylesList.splice(i, 1);
            localStorage.setItem("styles", JSON.stringify(stylesList));
            renderStyles();
        }
    }
}

async function saveContacts() {
    const phone = document.getElementById("phone").value;
    const email = document.getElementById("email").value;
    const address = document.getElementById("address").value;
    const data = { phone, email, address };

    if (db) {
        try {
            await db.collection('settings').doc('contacts').set(data);
            alert("Contacts saved to Firebase");
        } catch (e) {
            alert("Error saving contacts: " + e.message);
        }
    } else {
        localStorage.setItem("contacts", JSON.stringify(data));
        alert("Контакты сохранены");
    }
    loadContacts();
}

async function loadContacts() {
    let contacts = { phone: "+996 997 00 77 55", email: "oyudesigngroup@gmail.com" };

    if (db) {
        try {
            const doc = await db.collection('settings').doc('contacts').get();
            if (doc.exists) contacts = doc.data();
        } catch (e) { console.error("Error loading contacts", e); }
    } else {
        const local = JSON.parse(localStorage.getItem("contacts"));
        if (local) contacts = local;
    }

    if (document.getElementById("phone")) document.getElementById("phone").value = contacts.phone;
    if (document.getElementById("email")) document.getElementById("email").value = contacts.email;
    if (document.getElementById("address")) document.getElementById("address").value = contacts.address || "";

    const cleanPhone = contacts.phone.replace(/[^+\d]/g, '');
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${contacts.email}`;

    const mainPhone = document.getElementById("mainPhone");
    const mainEmail = document.getElementById("mainEmail");
    const mainAddress = document.getElementById("mainAddress");
    const mainAddressIcon = document.getElementById("mainAddressIcon");

    if (mainPhone) {
        mainPhone.innerText = contacts.phone;
        mainPhone.href = `tel:${cleanPhone}`;
    }
    if (mainEmail) {
        mainEmail.innerText = contacts.email;
        mainEmail.href = gmailUrl;
        mainEmail.target = "_blank";
    }
    if (mainAddress) {
        mainAddress.innerText = contacts.address || "Бишкек, Кыргызстан";
    }
    if (mainAddressIcon) {
        mainAddressIcon.href = contacts.address && contacts.address.includes('http') ? contacts.address : "https://2gis.kg/bishkek/geo/70000001099776364";
    }

    const display = document.getElementById("contactsDisplay");
    if (display) {
        display.innerHTML = `
            <a href="tel:${cleanPhone}">${contacts.phone}</a>
            <a href="${gmailUrl}" target="_blank">${contacts.email}</a>
            <p>${contacts.address || ""}</p>
        `;
    }

    const yearEl = document.getElementById("currentYear");
    if (yearEl) {
        yearEl.innerText = new Date().getFullYear();
    }
}

function copyToClipboard(text, el) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = el.innerText;
        el.innerText = "Скопировано!";
        el.style.color = "var(--accent)";
        setTimeout(() => {
            el.innerText = originalText;
            el.style.color = "";
        }, 1500);
    }).catch(err => {
        console.error('Ошибка при копировании: ', err);
    });
}

function exportData() {
    const data = { projects, styles: stylesList };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "oyu_backup.json";
    a.click();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const d = JSON.parse(reader.result);
        localStorage.setItem("projects", JSON.stringify(d.projects || []));
        localStorage.setItem("styles", JSON.stringify(d.styles || []));
        location.reload();
    };
    reader.readAsText(file);
}

const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
    if (header) {
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    }
});

document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.endsWith('.html') && !href.startsWith('#')) {
            e.preventDefault();
            const container = document.querySelector('.page-fade-in');
            if (container) {
                container.classList.add('page-fade-out');
                setTimeout(() => window.location.href = href, 500);
            }
        }
    });
});

const TELEGRAM_BOT_TOKEN = '8328663191:AAHz3w5szl0ea_hZYtEvwWeMcYn2DvufQbc';
const TELEGRAM_CHAT_ID = '814722319';

const contactForm = document.getElementById("actualContactForm");
contactForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector("button");
    const originalText = btn?.innerText || "Отправить заявку";

    if (btn) {
        btn.disabled = true;
        btn.innerText = "Отправка...";
    }

    const name = document.getElementById("userName")?.value || "";
    const email = document.getElementById("userEmail")?.value || "";
    const message = document.getElementById("userMessage")?.value || "";

    const text = `🚀 Новая заявка с сайта OYU!\n\n👤 Имя: ${name}\n📧 Email: ${email}\n💬 Сообщение: ${message}`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'HTML'
            })
        });

        const result = await response.json();

        if (response.ok) {
            contactForm.reset();
        } else {
            console.error("Telegram API Error:", result);
            alert(`Ошибка API: ${result.description || "Проверьте токен и ID"}`);
        }
    } catch (err) {
        console.error("Network Error:", err);
        alert("Ошибка сети. Убедитесь, что токен бота указан верно (он ДОЛЖЕН содержать символ ':').");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
});

const nameField = document.getElementById("userName");
const msgField = document.getElementById("userMessage");

const capitalizeFirst = (e) => {
    const val = e.target.value;
    if (val.length > 0) {
        e.target.value = val.charAt(0).toUpperCase() + val.slice(1);
    }
};

nameField?.addEventListener("input", capitalizeFirst);
msgField?.addEventListener("input", capitalizeFirst);

createModal();
initData();

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("active");
    });
}, { threshold: 0.1 });
document.querySelectorAll(".reveal").forEach(el => observer.observe(el));