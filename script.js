/**
 * PESO Digos Scholarship Portal - Main Script
 * Features: Infinite Carousel, News Feed, Supabase Integration, Official Renewal Form
 */

// --- SUPABASE CONFIGURATION ---
const { createClient } = supabase;
// Using the provided project credentials
const client = createClient(
    "https://ixhsiwkkdwcaagckjeyt.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4aHNpd2trZHdjYWFnY2tqZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MzY3NDAsImV4cCI6MjA4MDIxMjc0MH0.Amo_FM2wQd5Iw3l-TnlGawZmdW9wTnxLn2A23N8TKos"
);

// --- INFINITE CAROUSEL LOGIC ---
const wrapper = document.getElementById('carouselWrapper');
const slides = document.querySelectorAll('.carousel-slide');
let counter = 1; // Start at 1 because index 0 is a clone
const size = 100; // Percentage shift per slide

// Initial positioning to hide the first clone
wrapper.style.transform = `translateX(${-size * counter}%)`;

/**
 * Moves the carousel to the next slide
 */
function moveSlide() {
    if (counter >= slides.length - 1) return;
    wrapper.classList.add('smooth-transition');
    counter++;
    wrapper.style.transform = `translateX(${-size * counter}%)`;
}

// Reset position seamlessly when reaching clones
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

// Auto-advance every 5 seconds
setInterval(moveSlide, 5000);


// --- TAB NAVIGATION ---
/**
 * Handles switching between different sections (Home, Announcements, Apply, Admin)
 */
function showTab(tabId) {
    // Hide all contents
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.add('hidden'));

    // Show the selected tab
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.remove('hidden');
    }

    // Update Sidebar Button styling
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => btn.classList.remove('active'));

    const btnMap = {
        'bulletin': 'btn-bulletin',
        'announcements-page': 'btn-announcements',
        'application-form': 'btn-apply',
        'admin-panel': 'btn-admin'
    };

    const targetBtn = document.getElementById(btnMap[tabId]);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }

    // Trigger data loading based on tab
    if (tabId === 'announcements-page') {
        loadPosts();
    }
    if (tabId === 'admin-panel') {
        loadAI();
    }
}


// --- DATA LOADING (FEED & ANNOUNCEMENTS) ---

/**
 * Loads the 2 latest updates for the Home/Bulletin screen
 */
async function loadHomeAnnouncements() {
    const homeFeed = document.getElementById("homeAnnouncements");
    if (!homeFeed) return;

    const { data, error } = await client
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2);

    if (error) {
        console.error("Error loading home posts:", error);
        return;
    }

    homeFeed.innerHTML = "";
    data.forEach(post => {
        homeFeed.innerHTML += `
            <div class="bg-white p-4 rounded-xl border shadow-sm flex flex-col h-full">
                <p class="text-sm text-slate-700 line-clamp-3 mb-3 flex-grow">${post.content}</p>
                ${post.image_url ? `<img src="${post.image_url}" class="h-32 w-full object-cover rounded-lg mb-2">` : ''}
                <button onclick="showTab('announcements-page')" class="text-xs text-blue-600 font-bold mt-auto text-left">
                    Read More →
                </button>
            </div>
        `;
    });
}

/**
 * Loads the full Facebook-style feed in the Announcements tab
 */
async function loadPosts() {
    const feed = document.getElementById("postsFeed");
    if (!feed) return;

    const { data, error } = await client
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error loading full feed:", error);
        return;
    }

    feed.innerHTML = "";
    data.forEach(post => {
        feed.innerHTML += `
            <div class="fb-post">
                <div class="flex items-center mb-3">
                    <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">P</div>
                    <div>
                        <div class="font-bold text-sm">PESO Digos Official</div>
                        <div class="text-[11px] text-gray-500">Just now</div>
                    </div>
                </div>
                <p class="text-[15px] mb-3 text-slate-800">${post.content}</p>
                ${post.image_url ? `<img src="${post.image_url}" onclick="openModal('${post.image_url}')" class="rounded-lg shadow-sm border">` : ""}
            </div>
        `;
    });
}


// --- ADMIN & POST CREATION ---

/**
 * Uploads an image (if present) and creates a new database entry
 */
async function createPost() {
    const content = document.getElementById("postContent").value;
    const fileInput = document.getElementById("imageInput");
    const file = fileInput.files[0];
    let imageUrl = null;

    if (!content && !file) {
        alert("Please add text or an image.");
        return;
    }

    // Image Upload Logic
    if (file) {
        const fileName = `${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await client.storage
            .from("post-images")
            .upload(fileName, file);

        if (uploadError) {
            alert("Upload failed: " + uploadError.message);
            return;
        }

        imageUrl = client.storage.from("post-images").getPublicUrl(fileName).data.publicUrl;
    }

    // Database Insert
    const { error: insertError } = await client
        .from("posts")
        .insert([{ content, image_url: imageUrl }]);

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


// --- IMAGE MODAL LOGIC ---
function openModal(url) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImg");
    modal.style.display = "block";
    modalImg.src = url;
}

function closeModal() {
    document.getElementById("imageModal").style.display = "none";
}


// --- AI RANKING DEMO ---
function loadAI() {
    const tbody = document.getElementById('aiTableBody');
    if (!tbody) return;

    // Static placeholder to demonstrate the AI Scoring table in the Admin panel
    tbody.innerHTML = `
        <tr class="border-b">
            <td class="p-4 font-bold text-sm text-slate-700">Juan Luna</td>
            <td class="p-4 text-sm">1.25 (GPA)</td>
            <td class="p-4 text-blue-600 font-black text-sm">95% Match</td>
            <td class="p-4">
                <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Ready</span>
            </td>
        </tr>
    `;
}


// --- INITIALIZATION ---
window.onload = () => {
    // 1. Initialize Scholarship Cards on the Home screen
    const grid = document.getElementById('scholarshipGrid');
    const programs = ["Full Merit Scholarship", "Half Merit Scholarship", "Educational Assistance"];
    
    if (grid) {
        programs.forEach(p => {
            grid.innerHTML += `
                <div class="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition">
                    <h3 class="font-bold text-lg text-slate-800">${p}</h3>
                    <p class="text-sm text-slate-500 mt-2">Renew your application for the current semester.</p>
                    <button onclick="showTab('application-form')" class="w-full py-2 bg-slate-900 text-white rounded-xl mt-4 font-semibold hover:bg-slate-800 transition">
                        Apply Now
                    </button>
                </div>
            `;
        });
    }

    // 2. Handle Application Form Submission (official layout from image_4acb5e.png)
    const mainForm = document.getElementById('mainAppForm');
    if (mainForm) {
        mainForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Collect Form Data
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.categories = formData.getAll('category'); // Get all checked special categories

            console.log("Submitting Application:", data);
            
            // Show feedback
            alert("Thank you! Your Scholarship Renewal Form has been submitted.");
            e.target.reset();
            showTab('bulletin');
        });
    }

    // 3. Initial Data Fetch
    loadHomeAnnouncements();
    loadPosts();
};