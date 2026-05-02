/**
 * PESO Digos Scholarship Portal - Main Script
 * Features: Infinite Carousel, News Feed, Supabase Integration, Official Renewal Form
 */

// --- SUPABASE CONFIGURATION ---
const { createClient } = supabase;
const client = createClient(
    "https://ixhsiwkkdwcaagckjeyt.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4aHNpd2trZHdjYWFnY2tqZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MzY3NDAsImV4cCI6MjA4MDIxMjc0MH0.Amo_FM2wQd5Iw3l-TnlGawZmdW9wTnxLn2A23N8TKos"
);

// --- HELPERS ---
const SIDEBAR_WIDTH = 256;

function isMobile() {
    return window.innerWidth < 768;
}

// Updates the background logo position to always center on the visible main content
function updateBackground() {
    const bg = document.getElementById('bgLogo');
    const sidebar = document.getElementById('mainSidebar');
    if (!bg) return;

    if (isMobile()) {
        // On mobile sidebar overlays, so bg always covers full screen
        bg.style.left = '0';
        bg.style.right = '0';
    } else {
        const isCollapsed = sidebar.classList.contains('collapsed');
        const offset = isCollapsed ? 0 : SIDEBAR_WIDTH;
        bg.style.left = offset + 'px';
        bg.style.right = '0';
    }
}

// --- SIDEBAR TOGGLE ---
function toggleSidebar() {
    const sidebar = document.getElementById('mainSidebar');
    const reopenBtn = document.getElementById('reopenToggle');
    const overlay = document.getElementById('sidebarOverlay');

    const isCollapsed = sidebar.classList.toggle('collapsed');

    // Show/hide floating reopen button
    reopenBtn.style.display = isCollapsed ? 'flex' : 'none';

    // Mobile overlay (darkens background when sidebar is open)
    if (isMobile()) {
        overlay.classList.toggle('active', !isCollapsed);
    }

    // Reposition background logo
    updateBackground();
}

// Also hide sidebar when a nav item is tapped on mobile
function showTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.remove('hidden');

    // Update active button
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btnMap = {
        'bulletin': 'btn-bulletin',
        'announcements-page': 'btn-announcements',
        'application-form': 'btn-apply',
        'admin-panel': 'btn-admin'
    };
    const targetBtn = document.getElementById(btnMap[tabId]);
    if (targetBtn) targetBtn.classList.add('active');

    // On mobile: auto-close sidebar after navigation
    if (isMobile()) {
        const sidebar = document.getElementById('mainSidebar');
        if (!sidebar.classList.contains('collapsed')) {
            toggleSidebar();
        }
    }

    if (tabId === 'announcements-page') loadPosts();
    if (tabId === 'admin-panel') loadAI();
}


// --- INFINITE CAROUSEL ---
const wrapper = document.getElementById('carouselWrapper');
const slides = document.querySelectorAll('.carousel-slide');
let counter = 1;
const size = 100;

wrapper.style.transform = `translateX(${-size * counter}%)`;

function moveSlide() {
    if (counter >= slides.length - 1) return;
    wrapper.classList.add('smooth-transition');
    counter++;
    wrapper.style.transform = `translateX(${-size * counter}%)`;
}

wrapper.addEventListener('transitionend', () => {
    if (slides[counter].id === 'lastClone' || counter === 0) {
        wrapper.classList.remove('smooth-transition');
        counter = slides.length - 2;
        wrapper.style.transform = `translateX(${-size * counter}%)`;
    }
    if (slides[counter].id === 'firstClone' || counter === slides.length - 1) {
        wrapper.classList.remove('smooth-transition');
        counter = 1;
        wrapper.style.transform = `translateX(${-size * counter}%)`;
    }
});

setInterval(moveSlide, 5000);


// --- DATA LOADING ---
async function loadHomeAnnouncements() {
    const homeFeed = document.getElementById("homeAnnouncements");
    if (!homeFeed) return;

    const { data, error } = await client
        .from("posts").select("*")
        .order("created_at", { ascending: false }).limit(2);

    if (error) { console.error("Error loading home posts:", error); return; }

    homeFeed.innerHTML = "";
    data.forEach(post => {
        homeFeed.innerHTML += `
            <div class="bg-white p-4 rounded-xl border shadow-sm flex flex-col h-full">
                <p class="text-sm text-slate-700 line-clamp-3 mb-3 flex-grow">${post.content}</p>
                ${post.image_url ? `<img src="${post.image_url}" class="h-32 w-full object-cover rounded-lg mb-2">` : ''}
                <button onclick="showTab('announcements-page')" class="text-xs text-blue-600 font-bold mt-auto text-left">Read More →</button>
            </div>`;
    });
}

async function loadPosts() {
    const feed = document.getElementById("postsFeed");
    if (!feed) return;

    const { data, error } = await client
        .from("posts").select("*")
        .order("created_at", { ascending: false });

    if (error) { console.error("Error loading full feed:", error); return; }

    feed.innerHTML = "";
    data.forEach(post => {
        feed.innerHTML += `
            <div class="fb-post">
                <div class="flex items-center mb-3">
                    <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">P</div>
                    <div>
                        <div class="font-bold text-sm">PESO Digos Official</div>
                        <div class="text-[11px] text-gray-500">Just now</div>
                    </div>
                </div>
                <p class="text-[15px] mb-3 text-slate-800">${post.content}</p>
                ${post.image_url ? `<img src="${post.image_url}" onclick="openModal('${post.image_url}')" class="rounded-lg shadow-sm border">` : ""}
            </div>`;
    });
}


// --- ADMIN & POST CREATION ---
async function createPost() {
    const content = document.getElementById("postContent").value;
    const fileInput = document.getElementById("imageInput");
    const file = fileInput.files[0];
    let imageUrl = null;

    if (!content && !file) { alert("Please add text or an image."); return; }

    if (file) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await client.storage.from("post-images").upload(fileName, file);
        if (uploadError) { alert("Upload failed: " + uploadError.message); return; }
        imageUrl = client.storage.from("post-images").getPublicUrl(fileName).data.publicUrl;
    }

    const { error: insertError } = await client.from("posts").insert([{ content, image_url: imageUrl }]);

    if (insertError) {
        alert("Post failed: " + insertError.message);
    } else {
        alert("Update posted successfully!");
        document.getElementById("postContent").value = "";
        fileInput.value = "";
        loadPosts();
        loadHomeAnnouncements();
    }
}


// --- IMAGE MODAL ---
function openModal(url) {
    document.getElementById("imageModal").style.display = "block";
    document.getElementById("modalImg").src = url;
}
function closeModal() {
    document.getElementById("imageModal").style.display = "none";
}


// --- AI RANKING DEMO ---
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


// --- INITIALIZATION ---
window.onload = () => {
    const sidebar = document.getElementById('mainSidebar');
    const reopenBtn = document.getElementById('reopenToggle');

    // On mobile: start with sidebar collapsed
    if (isMobile()) {
        sidebar.classList.add('collapsed');
        reopenBtn.style.display = 'flex';
    }

    // Set background position
    updateBackground();

    // Re-adjust background on window resize
    window.addEventListener('resize', updateBackground);

    // Scholarship Cards
    const grid = document.getElementById('scholarshipGrid');
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

    // Application Form Submit
    const mainForm = document.getElementById('mainAppForm');
    if (mainForm) {
        mainForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.categories = formData.getAll('category');
            console.log("Submitting Application:", data);
            alert("Thank you! Your Scholarship Renewal Form has been submitted.");
            e.target.reset();
            showTab('bulletin');
        });
    }

    loadHomeAnnouncements();
    loadPosts();
};