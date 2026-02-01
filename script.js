const PASSWORD = "admin123";

/* LOGIN */
async function login() {
    const btn = event?.target || document.querySelector('#loginSection button');
    if (btn) btn.disabled = true;

    const adminPassInput = document.getElementById("adminPass");
    const loginSection = document.getElementById("loginSection");
    const adminPanel = document.getElementById("adminPanel");

    const password = adminPassInput.value;

    if (auth) {
        // Firebase Login
        try {
            // Using a designated admin email. Setup this user in Firebase Auth!
            await auth.signInWithEmailAndPassword('admin@oyudesign.group', password);
            if (loginSection) loginSection.style.display = "none";
            if (adminPanel) adminPanel.style.display = "block";
        } catch (e) {
            console.error(e);
            alert("Ошибка входа (Firebase): " + e.message);
            if (btn) btn.disabled = false;
        }
    } else {
        // Local Fallback
        if (password === PASSWORD) {
            if (loginSection) loginSection.style.display = "none";
            if (adminPanel) adminPanel.style.display = "block";
        } else {
            alert("Неверный пароль");
            if (btn) btn.disabled = false;
        }
    }
}

/* BURGER */
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

// Admin login with Enter key
document.getElementById("adminPass")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
});

/* DATA */
/* DATA */
const defaultProjects = [];

const defaultStyles = [];

let projects = [];
let stylesList = [];

// Ensure defaults are available if needed
const initialProjects = defaultProjects;
const initialStyles = defaultStyles;

async function initData() {
    if (db) {
        try {
            // Projects
            const pSnap = await db.collection('projects').get();
            if (!pSnap.empty) {
                projects = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                // Seed Firestore if empty? Use defaults.
                // Optional: Upload defaults to Firestore (Admin only ideally, but ok here)
                projects = initialProjects;
            }

            // Styles
            const sSnap = await db.collection('styles').get();
            if (!sSnap.empty) {
                stylesList = sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                stylesList = initialStyles;
            }
            console.log("Data loaded from Firebase");
        } catch (e) {
            console.error("Error loading from Firebase:", e);
            loadLocal();
        }
    } else {
        loadLocal();
    }

    renderProjects();
    renderStyles();
    loadContacts(); // Contacts also need to be async-capable if in DB
}

function loadLocal() {
    projects = JSON.parse(localStorage.getItem("projects")) || initialProjects;
    stylesList = JSON.parse(localStorage.getItem("styles")) || initialStyles;

    // Ensure sync defaults
    if (!localStorage.getItem("projects")) localStorage.setItem("projects", JSON.stringify(projects));
    if (!localStorage.getItem("styles")) localStorage.setItem("styles", JSON.stringify(stylesList));
    console.log("Data loaded from LocalStorage");
}

let editingProjectIndex = -1;
let editingStyleIndex = -1;

/* RENDER */
function renderProjects() {
    const grid = document.getElementById("projectsGrid");
    const list = document.getElementById("projectList");

    // Grid (Public View)
    if (grid) {
        if (projects.length === 0) {
            grid.innerHTML = '<p style="text-align:center; width:100%; color:#888;">Проекты пока не добавлены.</p>';
        } else {
            grid.innerHTML = projects.map((p, i) =>
                `<div class="project-card" onclick="openModal('projects', ${i})">
                    <img src="${fixLink(p.img)}" onerror="this.src='https://via.placeholder.com/600x400?text=Image+Not+Found'">
                    <span>${p.title}</span>
                </div>`
            ).join("");
        }
    }

    // List (Admin View)
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

    // Grid (Public View)
    if (grid) {
        if (stylesList.length === 0) {
            grid.innerHTML = '<p style="text-align:center; width:100%; color:#888;">Стили пока не добавлены.</p>';
        } else {
            grid.innerHTML = stylesList.map((s, i) =>
                `<div class="style-card" onclick="openModal('styles', ${i})">
                    <img src="${fixLink(s.img)}" onerror="this.src='https://via.placeholder.com/600x400?text=Image+Not+Found'">
                    <h3>${s.title}</h3>
                </div>`
            ).join("");
        }
    }

    // List (Admin View)
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

/* MODAL LOGIC */
function createModal() {
    if (document.getElementById('modalOverlay')) return;
    const modalHTML = `
        <div id="modalOverlay" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-body">
                    <h2 id="modalTitle"></h2>
                    <p id="modalInfo"></p>
                    <button class="btn modal-order-btn" onclick="orderNow()">Сделать заказ интерьера</button>
                </div>
                <div class="modal-gallery">
                    <div class="modal-slider">
                        <div class="slides-container" id="slidesContainer"></div>
                        <button class="slider-btn prev-btn" onclick="moveSlide(-1)">&#10094;</button>
                        <button class="slider-btn next-btn" onclick="moveSlide(1)">&#10095;</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Добавляем закрытие при клике по фону
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
                <img src="${img}" alt="" onerror="this.src='https://via.placeholder.com/1200x800?text=Image+Not+Found'">
            </div>
        `).join("");
    } else {
        content.classList.remove('no-slider');
        // Seamless loop clones
        const first = sliderImages[0];
        const last = sliderImages[sliderImages.length - 1];
        const loopedImages = [last, ...sliderImages, first];

        slidesContainer.innerHTML = loopedImages.map(img => `
            <div class="slide">
                <img src="${img}" alt="" onerror="this.src='https://via.placeholder.com/1200x800?text=Image+Not+Found'">
            </div>
        `).join("");

        currentSlideIndex = 1; // Start at real first slide
    }

    updateSliderPosition(true); // Immediate jump

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

    // Check for "phantom" slides
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

/* HELPER: AUTO-CONVERT GOOGLE DRIVE LINKS */
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
        return fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : s;
    }
    return s;
}

/* CRUD */
/* CRUD */
async function addProject() {
    const title = document.getElementById("projectTitle").value;
    const imgInput = document.getElementById("projectImg").value;
    const galleryInput = document.getElementById("projectGallery")?.value;
    const info = document.getElementById("projectInfo")?.value;

    if (!title || !imgInput) return alert("Заполните все поля");

    const img = fixLink(imgInput.trim());
    const galleryArr = galleryInput ? galleryInput.split(',').map(s => fixLink(s.trim())).filter(s => s !== "") : [];
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

    // Clear inputs
    document.getElementById("projectTitle").value = "";
    document.getElementById("projectImg").value = "";
    if (document.getElementById("projectGallery")) document.getElementById("projectGallery").value = "";
    if (document.getElementById("projectInfo")) document.getElementById("projectInfo").value = "";
}

function editProject(i) {
    const p = projects[i];
    editingProjectIndex = i;

    document.getElementById("projectTitle").value = p.title;
    document.getElementById("projectImg").value = p.img;

    // Gallery processing: exclude main image if it's the first one in images
    const gallery = p.images ? p.images.filter(img => img !== p.img).join(", ") : "";
    if (document.getElementById("projectGallery")) document.getElementById("projectGallery").value = gallery;
    if (document.getElementById("projectInfo")) document.getElementById("projectInfo").value = p.info || "";

    const btn = document.getElementById("addProjectBtn");
    if (btn) btn.innerText = "Сохранить изменения";

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
    const galleryInput = document.getElementById("styleGallery")?.value;
    const info = document.getElementById("styleInfo")?.value;

    if (!title || !imgInput) return alert("Заполните все поля");

    const img = fixLink(imgInput.trim());
    const galleryArr = galleryInput ? galleryInput.split(',').map(s => fixLink(s.trim())).filter(s => s !== "") : [];
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

    // Clear inputs
    document.getElementById("styleTitle").value = "";
    document.getElementById("styleImg").value = "";
    if (document.getElementById("styleGallery")) document.getElementById("styleGallery").value = "";
    if (document.getElementById("styleInfo")) document.getElementById("styleInfo").value = "";
}

function editStyle(i) {
    const s = stylesList[i];
    editingStyleIndex = i;

    document.getElementById("styleTitle").value = s.title;
    document.getElementById("styleImg").value = s.img;

    const gallery = s.images ? s.images.filter(img => img !== s.img).join(", ") : "";
    if (document.getElementById("styleGallery")) document.getElementById("styleGallery").value = gallery;
    if (document.getElementById("styleInfo")) document.getElementById("styleInfo").value = s.info || "";

    const btn = document.getElementById("addStyleBtn");
    if (btn) btn.innerText = "Сохранить изменения";

    // Scroll to styles section
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

/* CONTACTS */
async function saveContacts() {
    const phone = document.getElementById("phone").value;
    const email = document.getElementById("email").value;
    const data = { phone, email };

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
    const display = document.getElementById("contactsDisplay");
    if (display) {
        display.innerHTML = `
            <p onclick="copyToClipboard('${contacts.phone}', this)" title="Нажмите, чтобы скопировать">${contacts.phone}</p>
            <p onclick="copyToClipboard('${contacts.email}', this)" title="Нажмите, чтобы скопировать">${contacts.email}</p>
        `;
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

/* BACKUP */
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

/* SCROLL EFFECT */
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
    if (header) {
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    }
});

/* PAGE TRANSITIONS */
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

/* CONTACT FORM (TELEGRAM INTEGRATION) */
// Инструкция: 
// 1. Создайте бота в @BotFather и получите TOKEN
// 2. Узнайте свой Chat ID (через @userinfobot)
// 3. Замените значения ниже:
const TELEGRAM_BOT_TOKEN = '8328663191:AAHz3w5szl0ea_hZYtEvwWeMcYn2DvufQbc'; // <- Здесь должен быть токен от @BotFather (с двоеточием)
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

// Auto-capitalize first letter
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

/* INIT */
createModal();
initData();
// renderProjects(); // Moved to initData
// renderStyles();   // Moved to initData
// loadContacts();   // Moved to initData

// Observer for reveals
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("active");
    });
}, { threshold: 0.1 });
document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
