/**
 * PESO Digos Scholarship Portal - Main Script
 */

// --- SUPABASE ---
const { createClient } = supabase;
const client = createClient(
    "https://ixhsiwkkdwcaagckjeyt.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4aHNpd2trZHdjYWFnY2tqZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MzY3NDAsImV4cCI6MjA4MDIxMjc0MH0.Amo_FM2wQd5Iw3l-TnlGawZmdW9wTnxLn2A23N8TKos"
);

// --- HELPERS ---
const SIDEBAR_WIDTH = 256;

function isMobile() { return window.innerWidth < 768; }

function updateBackground() {
    const bg = document.getElementById('bgLogo');
    const sidebar = document.getElementById('mainSidebar');
    if (!bg) return;
    if (isMobile()) {
        bg.style.left = '0';
        bg.style.right = '0';
    } else {
        const offset = sidebar.classList.contains('collapsed') ? 0 : SIDEBAR_WIDTH;
        bg.style.left = offset + 'px';
        bg.style.right = '0';
    }
}

// --- HEADER: live date ---
function updateHeaderDate() {
    const el = document.getElementById('headerDate');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString('en-PH', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
}

// --- HEADER: update title per tab ---
const TAB_META = {
    'bulletin':          { title: 'Home',          sub: 'Welcome to the PESO Digos Scholarship Portal' },
    'announcements-page':{ title: 'Announcements', sub: 'Latest news and updates from PESO Digos' },
    'application-form':  { title: 'Apply Now',     sub: 'Scholarship Renewal Application Form' },
    'admin-panel':       { title: 'Admin Panel',   sub: 'Manage announcements and candidate selection' },
};

function updateHeaderMeta(tabId) {
    const meta = TAB_META[tabId];
    if (!meta) return;
    const titleEl = document.getElementById('headerPageTitle');
    const subEl   = document.getElementById('headerPageSub');
    if (titleEl) titleEl.textContent = meta.title;
    if (subEl)   subEl.textContent   = meta.sub;
}

// --- SIDEBAR TOGGLE ---
function toggleSidebar() {
    const sidebar   = document.getElementById('mainSidebar');
    const reopenBtn = document.getElementById('reopenToggle');
    const overlay   = document.getElementById('sidebarOverlay');

    const isCollapsed = sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    reopenBtn.style.display = isCollapsed ? 'flex' : 'none';
    if (isMobile()) overlay.classList.toggle('active', !isCollapsed);
    updateBackground();
}

// --- TAB NAVIGATION ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btnMap = {
        'bulletin':           'btn-bulletin',
        'announcements-page': 'btn-announcements',
        'application-form':   'btn-apply',
        'admin-panel':        'btn-admin'
    };
    const targetBtn = document.getElementById(btnMap[tabId]);
    if (targetBtn) targetBtn.classList.add('active');

    updateHeaderMeta(tabId);

    if (isMobile()) {
        const sidebar = document.getElementById('mainSidebar');
        if (!sidebar.classList.contains('collapsed')) toggleSidebar();
    }

    if (tabId === 'announcements-page') loadPosts();
    if (tabId === 'admin-panel') loadAI();
}

// ================================================================
// BULLETIN SLIDES — Dynamic Carousel from Supabase
// ================================================================

let carouselSlides   = [];
let carouselCounter  = 1;
let carouselInterval = null;
let isTransitioning  = false;

const wrapper = document.getElementById('carouselWrapper');

// Build carousel DOM from slides array
function buildCarousel(slides) {
    if (!wrapper) return;
    carouselSlides = slides;

    if (slides.length === 0) {
        wrapper.innerHTML = `<div class="carousel-slide" style="display:flex;align-items:center;justify-content:center;background:#1e293b;">
            <p style="color:#94a3b8;font-size:0.9rem;">No slides yet. Add some via Edit Slides.</p>
        </div>`;
        buildDots(0);
        return;
    }

    // [clone of last] + [real slides] + [clone of first]
    const all = [slides[slides.length - 1], ...slides, slides[0]];

    wrapper.innerHTML = all.map(s => `
        <div class="carousel-slide">
            <img src="${s.image_url}" loading="lazy" onerror="this.src='images/digos_logo.png'">
            <div class="carousel-caption">
                <h2>${s.title || ''}</h2>
                <p>${s.subtitle || ''}</p>
            </div>
        </div>
    `).join('');

    carouselCounter = 1;
    wrapper.style.transition = 'none';
    wrapper.style.transform = `translateX(-${carouselCounter * 100}%)`;

    buildDots(slides.length);
    updateDots();
    startCarousel();
}

function buildDots(count) {
    const dotsEl = document.getElementById('carouselDots');
    if (!dotsEl) return;
    dotsEl.innerHTML = Array.from({ length: count }, (_, i) =>
        `<span class="carousel-dot" onclick="goToSlide(${i + 1})"></span>`
    ).join('');
}

function updateDots() {
    const dots = document.querySelectorAll('.carousel-dot');
    const realIndex = ((carouselCounter - 1 + carouselSlides.length) % carouselSlides.length);
    dots.forEach((d, i) => d.classList.toggle('active', i === realIndex));
}

function goToSlide(realIndex) {
    if (isTransitioning) return;
    isTransitioning = true;
    carouselCounter = realIndex;
    wrapper.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    wrapper.style.transform = `translateX(-${carouselCounter * 100}%)`;
    updateDots();
    resetCarouselTimer();
}

function moveSlide() {
    if (isTransitioning) return;
    isTransitioning = true;
    carouselCounter++;
    wrapper.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    wrapper.style.transform = `translateX(-${carouselCounter * 100}%)`;
    updateDots();
}

function startCarousel() {
    if (carouselInterval) clearInterval(carouselInterval);
    if (carouselSlides.length > 1) {
        carouselInterval = setInterval(moveSlide, 3500);
    }
}

function resetCarouselTimer() {
    if (carouselInterval) clearInterval(carouselInterval);
    if (carouselSlides.length > 1) {
        carouselInterval = setInterval(moveSlide, 3500);
    }
}

if (wrapper) {
    wrapper.addEventListener('transitionend', () => {
        const total = carouselSlides.length;
        if (total === 0) { isTransitioning = false; return; }
        if (carouselCounter >= total + 1) {
            wrapper.style.transition = 'none';
            carouselCounter = 1;
            wrapper.style.transform = `translateX(-${carouselCounter * 100}%)`;
        }
        if (carouselCounter <= 0) {
            wrapper.style.transition = 'none';
            carouselCounter = total;
            wrapper.style.transform = `translateX(-${carouselCounter * 100}%)`;
        }
        updateDots();
        isTransitioning = false;
    });
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(carouselInterval);
    } else {
        isTransitioning = false;
        startCarousel();
    }
});

// Load slides from Supabase; fallback to hardcoded if table is empty
async function loadBulletinSlides() {
    const { data, error } = await client
        .from('bulletin_slides')
        .select('*')
        .order('sort_order', { ascending: true });

    const fallback = [
        { id: 'f1', image_url: 'images/Mosa.png',   title: 'Requirements Updated',  subtitle: 'Check the 2026 criteria.' },
        { id: 'f2', image_url: 'images/Hiyuki.png', title: 'Welcome to PESO Digos', subtitle: 'Official Scholarship Portal' },
        { id: 'f3', image_url: 'images/Fadia.png',  title: "Mayor's Scholarship",   subtitle: 'Applications are now open.' },
    ];

    const slides = (!error && data && data.length > 0) ? data : fallback;
    buildCarousel(slides);
}

// ================================================================
// BULLETIN EDITOR MODAL
// ================================================================

function openBulletinEditor() {
    document.getElementById('bulletinEditorModal')?.classList.add('open');
    loadBulletinSlidesList();
}

function closeBulletinEditor(e) {
    if (e && e.target !== document.getElementById('bulletinEditorModal')) return;
    document.getElementById('bulletinEditorModal')?.classList.remove('open');
}

async function loadBulletinSlidesList() {
    const list = document.getElementById('bulletinSlidesList');
    if (!list) return;
    list.innerHTML = `<p style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:1rem 0;">Loading...</p>`;

    const { data, error } = await client
        .from('bulletin_slides')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
        list.innerHTML = `<p style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:1.5rem 0;">No slides yet. Add one above!</p>`;
        return;
    }

    list.innerHTML = data.map((s) => `
        <div class="bulletin-slide-item" id="slide-item-${s.id}">
            <img src="${s.image_url}" class="bulletin-slide-thumb" onerror="this.src='images/digos_logo.png'">
            <div class="bulletin-slide-info">
                <input class="bulletin-inline-input" value="${escHtml(s.title)}"
                       onchange="updateSlideField('${s.id}', 'title', this.value)"
                       placeholder="Title">
                <input class="bulletin-inline-input" value="${escHtml(s.subtitle)}"
                       onchange="updateSlideField('${s.id}', 'subtitle', this.value)"
                       placeholder="Subtitle" style="font-size:0.72rem;color:#94a3b8;">
                <div style="display:flex;align-items:center;gap:0.4rem;margin-top:4px;">
                    <label class="bulletin-reimg-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                             style="width:12px;height:12px;">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        Change Image
                        <input type="file" accept="image/*" style="display:none;"
                               onchange="replaceSlideImage('${s.id}', this)">
                    </label>
                    <span style="color:#94a3b8;font-size:0.65rem;">Order: ${s.sort_order}</span>
                </div>
            </div>
            <div class="bulletin-slide-actions">
                <button class="bulletin-order-btn" onclick="moveSlideOrder('${s.id}', -1)" title="Move up">↑</button>
                <button class="bulletin-order-btn" onclick="moveSlideOrder('${s.id}', 1)" title="Move down">↓</button>
                <button class="bulletin-delete-btn" onclick="deleteBulletinSlide('${s.id}')" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                         style="width:14px;height:14px;">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function previewNewSlideImg() {
    const file = document.getElementById('bulletinNewImg').files[0];
    const preview = document.getElementById('bulletinNewImgPreview');
    const labelText = document.getElementById('bulletinImgLabelText');
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    labelText.textContent = file.name.length > 20 ? file.name.slice(0, 18) + '…' : file.name;
}

async function addBulletinSlide() {
    const fileInput = document.getElementById('bulletinNewImg');
    const title     = document.getElementById('bulletinNewTitle').value.trim();
    const subtitle  = document.getElementById('bulletinNewSubtitle').value.trim();
    const file      = fileInput.files[0];
    const addBtn    = document.querySelector('.bulletin-add-btn');

    if (!file) { alert('Please choose an image.'); return; }

    addBtn.disabled = true;
    addBtn.textContent = 'Uploading…';

    const fileName = `bulletin-slides/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
    const { error: upErr } = await client.storage.from('post-images').upload(fileName, file);
    if (upErr) {
        alert('Upload failed: ' + upErr.message);
        addBtn.disabled = false;
        addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Slide`;
        return;
    }

    const imageUrl = client.storage.from('post-images').getPublicUrl(fileName).data.publicUrl;

    const { data: existing } = await client
        .from('bulletin_slides')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);

    const nextOrder = (existing && existing.length > 0) ? (existing[0].sort_order + 1) : 0;

    const { error: insErr } = await client.from('bulletin_slides').insert([{
        image_url: imageUrl, title, subtitle, sort_order: nextOrder
    }]);

    addBtn.disabled = false;
    addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Slide`;

    if (insErr) { alert('Insert failed: ' + insErr.message); return; }

    // Reset form
    fileInput.value = '';
    document.getElementById('bulletinNewImgPreview').style.display = 'none';
    document.getElementById('bulletinImgLabelText').textContent = 'Choose Image';
    document.getElementById('bulletinNewTitle').value = '';
    document.getElementById('bulletinNewSubtitle').value = '';

    loadBulletinSlidesList();
    loadBulletinSlides();
}

async function updateSlideField(id, field, value) {
    const { error } = await client.from('bulletin_slides').update({ [field]: value }).eq('id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    loadBulletinSlides();
}

async function replaceSlideImage(id, input) {
    const file = input.files[0];
    if (!file) return;
    const fileName = `bulletin-slides/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
    const { error: upErr } = await client.storage.from('post-images').upload(fileName, file);
    if (upErr) { alert('Upload failed: ' + upErr.message); return; }
    const imageUrl = client.storage.from('post-images').getPublicUrl(fileName).data.publicUrl;
    await updateSlideField(id, 'image_url', imageUrl);
    loadBulletinSlidesList();
}

async function deleteBulletinSlide(id) {
    if (!confirm('Delete this slide?')) return;
    const { error } = await client.from('bulletin_slides').delete().eq('id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadBulletinSlidesList();
    loadBulletinSlides();
}

async function moveSlideOrder(id, dir) {
    const { data: all } = await client
        .from('bulletin_slides')
        .select('id, sort_order')
        .order('sort_order', { ascending: true });
    if (!all) return;
    const idx = all.findIndex(s => s.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= all.length) return;
    const a = all[idx], b = all[swapIdx];
    await client.from('bulletin_slides').update({ sort_order: b.sort_order }).eq('id', a.id);
    await client.from('bulletin_slides').update({ sort_order: a.sort_order }).eq('id', b.id);
    loadBulletinSlidesList();
    loadBulletinSlides();
}

// ================================
// MEDIA HELPERS
// ================================

function isVideoUrl(url) {
    return /\.(mp4|webm|mov|ogg|avi|mkv)(\?|$)/i.test(url);
}

function renderPostMedia(imageUrl, forFeed = false) {
    if (!imageUrl) return '';

    let items = [];
    try {
        items = JSON.parse(imageUrl);
        if (!Array.isArray(items)) items = [imageUrl];
    } catch {
        items = [imageUrl];
    }

    if (items.length === 0) return '';

    if (items.length === 1) {
        const url = items[0];
        if (isVideoUrl(url)) {
            const videoId = 'vid_' + Math.random().toString(36).slice(2);
            return `<div class="post-media-single post-video-wrap" onclick="playVideo('${videoId}')">
                <video id="${videoId}" class="post-video" preload="none" controls style="display:none;">
                    <source src="${url}">
                </video>
                <canvas id="${videoId}_canvas" class="post-video-thumb-canvas"></canvas>
                <div class="post-video-play-btn">
                    <svg viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
            </div>`;
        } else {
            return `<div class="post-media-single">
                <img src="${url}" ${forFeed ? `onclick="openModal('${url}')"` : ''} class="post-img-single">
            </div>`;
        }
    }

    const gridClass = items.length === 2 ? 'post-media-grid-2' :
                      items.length === 3 ? 'post-media-grid-3' : 'post-media-grid-4';

    const itemsHtml = items.slice(0, 4).map((url, i) => {
        const isLast = i === 3 && items.length > 4;
        const extraCount = items.length - 4;

        if (isVideoUrl(url)) {
            const videoId = 'vid_' + Math.random().toString(36).slice(2);
            return `<div class="post-media-cell post-video-wrap" onclick="playVideo('${videoId}')">
                <video id="${videoId}" class="post-video-grid" preload="none" controls style="display:none;">
                    <source src="${url}">
                </video>
                <canvas id="${videoId}_canvas" class="post-video-thumb-canvas" style="width:100%;height:100%;object-fit:cover;"></canvas>
                <div class="post-video-play-btn">
                    <svg viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                ${isLast ? `<div class="post-media-more">+${extraCount}</div>` : ''}
            </div>`;
        } else {
            return `<div class="post-media-cell" ${forFeed ? `onclick="openModal('${url}')"` : ''}>
                <img src="${url}" class="post-img-grid">
                ${isLast ? `<div class="post-media-more">+${extraCount}</div>` : ''}
            </div>`;
        }
    }).join('');

    return `<div class="post-media-grid ${gridClass}">${itemsHtml}</div>`;
}

function captureVideoThumbnail(videoId) {
    const video  = document.getElementById(videoId);
    const canvas = document.getElementById(videoId + '_canvas');
    if (!video || !canvas) return;

    video.addEventListener('loadeddata', () => {
        video.currentTime = 0.1;
    }, { once: true });

    video.addEventListener('seeked', () => {
        const ctx = canvas.getContext('2d');
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 360;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        video.currentTime = 0;
    }, { once: true });

    video.preload = 'metadata';
    video.load();
}

function playVideo(videoId) {
    const video  = document.getElementById(videoId);
    const canvas = document.getElementById(videoId + '_canvas');
    const wrap   = video?.closest('.post-video-wrap');
    if (!video) return;

    if (canvas) canvas.style.display = 'none';
    if (wrap) {
        const playBtn = wrap.querySelector('.post-video-play-btn');
        if (playBtn) playBtn.style.display = 'none';
    }
    video.style.display  = 'block';
    video.preload = 'auto';
    video.load();
    video.play();
}

// ================================
// DATA LOADING
// ================================

async function loadHomeAnnouncements() {
    const homeFeed = document.getElementById("homeAnnouncements");
    if (!homeFeed) return;
    const { data, error } = await client.from("posts").select("*")
        .order("created_at", { ascending: false }).limit(2);
    if (error) { console.error("Error loading home posts:", error); return; }
    homeFeed.innerHTML = "";
    data.forEach(post => {
        homeFeed.innerHTML += `
            <div class="bg-white p-4 rounded-xl border shadow-sm flex flex-col h-full">
                <p class="text-sm text-slate-700 line-clamp-3 mb-3 flex-grow">${linkifyText(post.content)}</p>
                ${post.image_url ? renderPostMedia(post.image_url, false) : ''}
                <button onclick="showTab('announcements-page')" class="text-sm text-blue-600 font-bold mt-4 text-left py-2 border-t border-slate-100 w-full">Read More →</button>
            </div>`;

        setTimeout(() => {
            document.querySelectorAll('[id^="vid_"]').forEach(el => {
                if (el.tagName === 'VIDEO') captureVideoThumbnail(el.id);
            });
        }, 100);
    });
}

async function loadPosts() {
    const feed = document.getElementById("postsFeed");
    if (!feed) return;
    const { data, error } = await client.from("posts").select("*")
        .order("created_at", { ascending: false });
    if (error) { console.error("Error loading full feed:", error); return; }
    feed.innerHTML = "";
    data.forEach(post => {
        feed.innerHTML += `
            <div class="fb-post">
                <div class="flex items-center mb-3" style="position:relative;">
                    <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">P</div>
                    <div>
                        <div class="font-bold text-sm">PESO Digos Official</div>
                        <div class="text-[11px] text-gray-500">Just now</div>
                    </div>
                    <div class="post-menu-wrap" style="margin-left:auto;">
                        <button class="post-menu-btn" onclick="togglePostMenu('menu_${post.id}', event)" title="More options">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                <circle cx="12" cy="5" r="1.5"/>
                                <circle cx="12" cy="12" r="1.5"/>
                                <circle cx="12" cy="19" r="1.5"/>
                            </svg>
                        </button>
                        <div class="post-menu-dropdown" id="menu_${post.id}">
                            <button class="post-menu-item post-menu-delete" onclick="deletePost('${post.id}', 'menu_${post.id}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14H6L5 6"/>
                                    <path d="M10 11v6M14 11v6"/>
                                    <path d="M9 6V4h6v2"/>
                                </svg>
                                Delete Post
                            </button>
                        </div>
                    </div>
                </div>
                <p class="text-[15px] mb-3 text-slate-800" style="white-space:pre-wrap;">${linkifyText(post.content)}</p>
                ${renderPostMedia(post.image_url, true)}
            </div>`;

        setTimeout(() => {
            document.querySelectorAll('[id^="vid_"]').forEach(el => {
                if (el.tagName === 'VIDEO') captureVideoThumbnail(el.id);
            });
        }, 100);
    });
}

function linkifyText(text) {
    if (!text) return '';
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    return escaped.replace(
        /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="post-link">$1</a>'
    );
}

function togglePostMenu(menuId, e) {
    e.stopPropagation();
    document.querySelectorAll('.post-menu-dropdown.open').forEach(m => {
        if (m.id !== menuId) m.classList.remove('open');
    });
    document.getElementById(menuId)?.classList.toggle('open');
}

document.addEventListener('click', () => {
    document.querySelectorAll('.post-menu-dropdown.open')
        .forEach(m => m.classList.remove('open'));
});

async function deletePost(postId, menuId) {
    document.getElementById(menuId)?.classList.remove('open');
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error } = await client.from("posts").delete().eq("id", postId);
    if (error) {
        alert("Delete failed: " + error.message);
    } else {
        loadPosts();
        loadHomeAnnouncements();
    }
}

// ================================
// ADMIN — CREATE POST
// ================================

async function createPost() {
    const content   = document.getElementById("postContent").value;
    const fileInput = document.getElementById("mediaInput");
    const files     = fileInput.files;

    if (!content && files.length === 0) {
        alert("Please add text or attach a file.");
        return;
    }

    const postBtn = document.querySelector('button[onclick="createPost()"]');
    const originalText = postBtn.innerHTML;
    postBtn.disabled = true;
    postBtn.innerHTML = `
        <svg style="width:16px;height:16px;stroke:white;animation:spin 1s linear infinite;display:inline-block;vertical-align:middle;margin-right:6px;"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        Posting...
    `;

    let mediaUrls = [];
    if (files.length > 0) {
        for (const file of files) {
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
            const { error: uploadError } = await client.storage
                .from("post-images")
                .upload(fileName, file);

            if (uploadError) {
                alert(`Upload failed for "${file.name}": ${uploadError.message}`);
                postBtn.disabled = false;
                postBtn.innerHTML = originalText;
                return;
            }

            const url = client.storage.from("post-images").getPublicUrl(fileName).data.publicUrl;
            mediaUrls.push(url);
        }
    }

    const mediaValue = mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null;

    const { error: insertError } = await client.from("posts").insert([{
        content,
        image_url: mediaValue
    }]);

    postBtn.disabled = false;
    postBtn.innerHTML = originalText;

    if (insertError) {
        alert("Post failed: " + insertError.message);
    } else {
        alert("Update posted successfully!");
        document.getElementById("postContent").value = "";
        fileInput.value = "";
        updateMediaPreview();
        loadPosts();
        loadHomeAnnouncements();
    }
}

function updateMediaPreview() {
    const fileInput = document.getElementById("mediaInput");
    const preview   = document.getElementById("mediaPreview");
    if (!preview) return;

    preview.innerHTML = "";
    const files = fileInput ? fileInput.files : [];

    if (files.length === 0) {
        preview.style.display = "none";
        return;
    }

    preview.style.display = "flex";
    Array.from(files).forEach((file) => {
        const url  = URL.createObjectURL(file);
        const isVid = file.type.startsWith("video/");
        const cell = document.createElement("div");
        cell.className = "media-preview-cell";
        cell.innerHTML = isVid
            ? `<video src="${url}" class="media-preview-thumb"></video>
               <span class="media-preview-label">Video</span>`
            : `<img src="${url}" class="media-preview-thumb">`;
        preview.appendChild(cell);
    });

    if (files.length > 1) {
        const badge = document.createElement("span");
        badge.className = "media-count-badge";
        badge.textContent = `${files.length} files selected`;
        preview.appendChild(badge);
    }
}

// --- MODAL (image lightbox) ---
function openModal(url) {
    document.getElementById("imageModal").style.display = "block";
    document.getElementById("modalImg").src = url;
}
function closeModal() {
    document.getElementById("imageModal").style.display = "none";
}

// --- AI DEMO ---
function loadAI() {
    const tbody = document.getElementById('aiTableBody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr class="border-b">
            <td class="p-4 font-bold text-sm text-slate-700">Juan Luna</td>
            <td class="p-4 text-sm">1.25 (GPA)</td>
            <td class="p-4 text-blue-600 font-black text-sm">95% Match</td>
            <td class="p-4"><span class="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Ready</span></td>
        </tr>`;
}

// --- INIT ---
window.onload = () => {
    const sidebar   = document.getElementById('mainSidebar');
    const reopenBtn = document.getElementById('reopenToggle');

    if (isMobile()) {
        sidebar.classList.add('collapsed');
        document.body.classList.add('sidebar-collapsed');
        reopenBtn.style.display = 'flex';
    }

    updateBackground();
    updateHeaderDate();
    updateHeaderMeta('bulletin');
    window.addEventListener('resize', updateBackground);

    // Scholarship Cards
    const grid     = document.getElementById('scholarshipGrid');
    const programs = ["Full Merit Scholarship", "Half Merit Scholarship", "Educational Assistance"];
    if (grid) {
        programs.forEach(p => {
            grid.innerHTML += `
                <div class="bg-white p-5 md:p-6 rounded-2xl border shadow-sm hover:shadow-md transition">
                    <h3 class="font-bold text-base md:text-lg text-slate-800">${p}</h3>
                    <p class="text-sm text-slate-500 mt-2">Renew your application for the current semester.</p>
                    <button onclick="showTab('application-form')" class="w-full py-2 bg-slate-900 text-white rounded-xl mt-4 font-semibold hover:bg-slate-800 transition">
                        Apply Now
                    </button>
                </div>`;
        });
    }

    // Form submit
    const mainForm = document.getElementById('mainAppForm');
    if (mainForm) {
        mainForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.categories = formData.getAll('category');
            saveProfileFromForm(data);
            alert("Thank you! Your Scholarship Renewal Form has been submitted. Your profile has been updated!");
            e.target.reset();
            showTab('bulletin');
        });
    }

    loadSavedPreferences();
    loadProfile();
    loadBulletinSlides();
    loadHomeAnnouncements();
    loadPosts();
};

// ========================
// PREFERENCES DROPDOWN
// ========================

const FONT_SIZES = [
    { label: 'Small',   value: '13px' },
    { label: 'Medium',  value: '15px' },
    { label: 'Large',   value: '17px' },
    { label: 'X-Large', value: '19px' },
];
let currentFontIndex = 1;

const LANG_STRINGS = {
    en: {
        home: 'Home', homeSub: 'Welcome to the PESO Digos Scholarship Portal',
        announcements: 'Announcements', announceSub: 'Latest news and updates from PESO Digos',
        apply: 'Apply Now', applySub: 'Scholarship Renewal Application Form',
        admin: 'Admin Panel', adminSub: 'Manage announcements and candidate selection',
        appsOpen: 'Applications Open',
    },
    fil: {
        home: 'Pangunahing Pahina', homeSub: 'Maligayang pagdating sa PESO Digos Scholarship Portal',
        announcements: 'Mga Anunsyo', announceSub: 'Pinakabagong balita mula sa PESO Digos',
        apply: 'Mag-apply', applySub: 'Scholarship Renewal Application Form',
        admin: 'Admin Panel', adminSub: 'Pamahalaan ang mga anunsyo at kandidato',
        appsOpen: 'Bukas ang Aplikasyon',
    }
};
let currentLang = 'en';

function togglePrefDropdown() {
    document.getElementById('prefBtn').classList.toggle('open');
    document.getElementById('prefDropdown').classList.toggle('open');
}

document.addEventListener('click', (e) => {
    const btn      = document.getElementById('prefBtn');
    const dropdown = document.getElementById('prefDropdown');
    if (btn && dropdown && !btn.contains(e.target) && !dropdown.contains(e.target)) {
        btn.classList.remove('open');
        dropdown.classList.remove('open');
    }
});

function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeDark').classList.add('active');
        document.getElementById('themeLight').classList.remove('active');
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('themeLight').classList.add('active');
        document.getElementById('themeDark').classList.remove('active');
    }
    localStorage.setItem('peso_theme', theme);
}

function changeFontSize(dir) {
    currentFontIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, currentFontIndex + dir));
    const chosen = FONT_SIZES[currentFontIndex];
    document.documentElement.style.fontSize = chosen.value;
    document.getElementById('fontSizeLabel').textContent = chosen.label;
    localStorage.setItem('peso_fontIndex', currentFontIndex);
}

function setLanguage(lang) {
    currentLang = lang;
    const s = LANG_STRINGS[lang];
    const navMap = {
        'btn-bulletin': s.home, 'btn-announcements': s.announcements,
        'btn-apply': s.apply,   'btn-admin': s.admin,
    };
    Object.entries(navMap).forEach(([id, text]) => {
        const btn = document.getElementById(id);
        if (btn) { const icon = btn.querySelector('i'); btn.textContent = ' ' + text; if (icon) btn.prepend(icon); }
    });
    const titleEl   = document.getElementById('headerPageTitle');
    const subEl     = document.getElementById('headerPageSub');
    const activeBtn = document.querySelector('.nav-btn.active');
    if (activeBtn) {
        const idToTab = {
            'btn-bulletin': ['home','homeSub'], 'btn-announcements': ['announcements','announceSub'],
            'btn-apply': ['apply','applySub'],  'btn-admin': ['admin','adminSub'],
        };
        const key = Object.keys(idToTab).find(k => document.getElementById(k) === activeBtn);
        if (key) {
            const [tKey, sKey] = idToTab[key];
            if (titleEl) titleEl.textContent = s[tKey];
            if (subEl)   subEl.textContent   = s[sKey];
        }
    }
    document.getElementById('langEN').classList.toggle('active', lang === 'en');
    document.getElementById('langFIL').classList.toggle('active', lang === 'fil');
    localStorage.setItem('peso_lang', lang);
}

function resetPreferences() {
    setTheme('light');
    currentFontIndex = 1;
    document.documentElement.style.fontSize = FONT_SIZES[1].value;
    document.getElementById('fontSizeLabel').textContent = FONT_SIZES[1].label;
    setLanguage('en');
    localStorage.removeItem('peso_theme');
    localStorage.removeItem('peso_fontIndex');
    localStorage.removeItem('peso_lang');
}

function loadSavedPreferences() {
    const savedTheme = localStorage.getItem('peso_theme');
    if (savedTheme) setTheme(savedTheme);
    const savedFont = localStorage.getItem('peso_fontIndex');
    if (savedFont !== null) {
        currentFontIndex = parseInt(savedFont);
        document.documentElement.style.fontSize = FONT_SIZES[currentFontIndex].value;
        document.getElementById('fontSizeLabel').textContent = FONT_SIZES[currentFontIndex].label;
    }
    const savedLang = localStorage.getItem('peso_lang');
    if (savedLang) setLanguage(savedLang);
}

// ========================
// PROFILE SYSTEM
// ========================

function saveProfileFromForm(data) {
    localStorage.setItem('peso_profile', JSON.stringify(data));
    renderProfile(data);
}

function renderProfile(data) {
    const hasData = data && data.firstName;
    const headerName   = document.getElementById('profileHeaderName');
    const headerAvatar = document.getElementById('profileHeaderAvatar');
    if (hasData) {
        if (headerName) headerName.textContent = data.firstName || 'User';
        if (headerAvatar) {
            const initials = ((data.firstName?.[0] || '') + (data.lastName?.[0] || '')).toUpperCase();
            headerAvatar.textContent = initials || '?';
            headerAvatar.style.fontSize = '11px';
        }
    }
    const fullName = hasData
        ? `${data.firstName || ''} ${data.middleName ? data.middleName[0] + '. ' : ''}${data.lastName || ''}`.trim()
        : 'No Profile Yet';
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
    const modalAvatar = document.getElementById('profileAvatar');
    if (modalAvatar) {
        modalAvatar.textContent = hasData
            ? ((data.firstName?.[0] || '') + (data.lastName?.[0] || '')).toUpperCase() || '?'
            : '?';
    }
    set('profileFullName', fullName);
    set('profileEmail',     data?.email);
    set('profileSchool',    data?.school);
    set('profileCourse',    data?.course);
    set('profileYear',      data?.yearLevel);
    set('profileContact',   data?.contact);
    set('profileAddress',   data?.address);
    set('profileBarangay',  data?.barangay);
    set('profileGender',    data?.gender);
    set('profileEthnicity', data?.ethnicity);
    const catsEl   = document.getElementById('profileCategories');
    const catsWrap = document.getElementById('profileCatsWrap');
    const cats     = data?.categories || [];
    if (catsEl) {
        catsEl.innerHTML = cats.length > 0 ? cats.map(c => `<span class="profile-cat-chip">${c}</span>`).join('') : '';
        if (catsWrap) catsWrap.style.display = cats.length > 0 ? 'block' : 'none';
    }
    const emptyState = document.getElementById('profileEmptyState');
    const footerNote = document.getElementById('profileFooterNote');
    const infoGrid   = document.querySelector('.profile-info-grid');
    const nameRow    = document.querySelector('.profile-name-row');
    const emailEl    = document.querySelector('.profile-email');
    if (hasData) {
        emptyState?.classList.remove('show');
        if (footerNote) footerNote.style.display = 'flex';
        if (infoGrid)   infoGrid.style.display   = 'grid';
        if (nameRow)    nameRow.style.display     = 'flex';
        if (emailEl)    emailEl.style.display     = 'block';
    } else {
        emptyState?.classList.add('show');
        if (footerNote) footerNote.style.display = 'none';
        if (infoGrid)   infoGrid.style.display   = 'none';
        if (nameRow)    nameRow.style.display     = 'none';
        if (emailEl)    emailEl.style.display     = 'none';
        if (catsWrap)   catsWrap.style.display    = 'none';
    }
}

function openProfileModal() {
    document.getElementById('profileModal')?.classList.add('open');
}
function closeProfileModal(e) {
    if (e && e.target !== document.getElementById('profileModal')) return;
    document.getElementById('profileModal')?.classList.remove('open');
}
function loadProfile() {
    const saved = localStorage.getItem('peso_profile');
    try { renderProfile(saved ? JSON.parse(saved) : null); }
    catch { renderProfile(null); }
}
