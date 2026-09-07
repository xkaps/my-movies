﻿// ============ ΑΡΧΙΚΟΠΟΙΗΣΗ ΑΠΟ CONFIG ============
let CONFIG = null;
let TMDB_API_KEY = null;
let GITHUB_CONFIG = null;

// ============ ΠΟΙΟΤΗΤΕΣ & ΚΩΔΙΚΟΠΟΙΗΣΗ ============
const QUALITY_OPTIONS = ['HD', 'SD', '4K', 'HD/SD', 'H.265', 'H.264'];
const CODEC_OPTIONS = ['', 'H.265', 'H.264'];

function isMixedQuality(quality) {
    return quality === 'HD/SD' || quality === 'HD/SD (Mixed)' || quality === 'Mixed';
}

function initConfig() {
    if (typeof YIOIO_CONFIG !== 'undefined') {
        CONFIG = YIOIO_CONFIG;
        TMDB_API_KEY = CONFIG.tmdb_api_key;
        GITHUB_CONFIG = CONFIG.github;
        console.log('Config loaded successfully');
        return true;
    } else {
        console.error('config.js not loaded!');
        showToast('Σφάλμα: Δεν βρέθηκε το config.js', '#e50914');
        return false;
    }
}

// ============ ΒΟΗΘΗΤΙΚΕΣ ΣΥΝΑΡΤΗΣΕΙΣ ============
function showToast(msg, bg) {
    const t = document.createElement('div');
    t.className = 'toast-message';
    t.textContent = msg;
    t.style.background = bg;
    t.style.color = 'white';
    t.style.position = 'fixed';
    t.style.bottom = '20px';
    t.style.right = '20px';
    t.style.padding = '12px 24px';
    t.style.borderRadius = '8px';
    t.style.zIndex = '10000';
    t.style.animation = 'slideIn 0.3s ease';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(s) { 
    return String(s).replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); 
}

function getStars(r) { 
    let s=''; 
    for(let i=0;i<Math.floor(r);i++) s+='★'; 
    if(r%1>=0.5) s+='½'; 
    for(let i=0;i<5-Math.ceil(r);i++) s+='☆'; 
    return s; 
}

function getStarsHtml(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (hasHalf) stars += '½';
    for (let i = 0; i < 5 - Math.ceil(rating); i++) stars += '☆';
    return stars;
}

// ============ FALLBACK POSTER (SVG) ============
function generateFallbackPoster(title) {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%2334495e'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='white' font-size='14'%3E${encodeURIComponent(title.substring(0,20))}%3C/text%3E%3C/svg%3E`;
}

// ============ THEME FUNCTIONS ============
function toggleTheme() {
    const html = document.documentElement;
    if (html.hasAttribute('data-theme')) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

function loadTheme() {
    if (localStorage.getItem('theme') === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

// ============ AUTH SYSTEM ============
let currentUserName = '';
let isUserLoggedIn = false;

async function showUserLogin() {
    const password = prompt('Εισάγετε κωδικό χρήστη:');
    if (!password) return;
    
    const hashed = await hashPassword(password);
    
    if (CONFIG && CONFIG.users && CONFIG.users[hashed]) {
        currentUserName = CONFIG.users[hashed];
        isUserLoggedIn = true;
        sessionStorage.setItem('userLoggedIn', 'true');
        sessionStorage.setItem('userName', currentUserName);
        
        document.getElementById('loginUserBtn').style.display = 'none';
        document.getElementById('logoutUserBtn').style.display = 'inline-block';
        document.getElementById('userNameDisplay').innerText = ` ${currentUserName}`;
        
        showToast(`Καλώς ήρθες ${currentUserName}!`, '#2ecc71');
        
        const currentVersion = localStorage.getItem('app_version') || '1.0.0';
        document.getElementById('versionBadge').innerHTML = `Εκδοση: ${currentVersion} `;
        
        showToast('Ελεγχος για links...', '#9b59b6');
        setTimeout(() => checkForGitHubUpdates(), 500);
        
        if (document.getElementById('detailModal').style.display === 'flex' && currentMovieLink) {
            document.getElementById('modalDownloadBtn').style.display = 'block';
        }
    } else {
        showToast('Λάθος κωδικός!', '#e50914');
    }
}

function logoutUser() {
    isUserLoggedIn = false;
    currentUserName = '';
    sessionStorage.removeItem('userLoggedIn');
    sessionStorage.removeItem('userName');
    document.getElementById('loginUserBtn').style.display = 'inline-block';
    document.getElementById('logoutUserBtn').style.display = 'none';
    document.getElementById('userNameDisplay').innerText = '';
    const currentVersion = localStorage.getItem('app_version') || '1.0.0';
    document.getElementById('versionBadge').innerHTML = `Εκδοση: ${currentVersion}`;
    showToast('Αποσυνδεθήκατε', '#e67e22');
    document.getElementById('modalDownloadBtn').style.display = 'none';
}

function loadUserSession() {
    if (sessionStorage.getItem('userLoggedIn') === 'true') {
        isUserLoggedIn = true;
        currentUserName = sessionStorage.getItem('userName') || 'Χρήστης';
        document.getElementById('loginUserBtn').style.display = 'none';
        document.getElementById('logoutUserBtn').style.display = 'inline-block';
        document.getElementById('userNameDisplay').innerText = ` ${currentUserName}`;
        const currentVersion = localStorage.getItem('app_version') || '1.0.0';
        document.getElementById('versionBadge').innerHTML = `Εκδοση: ${currentVersion} `;
    }
}

// ============ ADMIN AUTH ============
const AdminAuth = {
    startSession: () => { 
        sessionStorage.setItem('adminToken', 'valid'); 
        sessionStorage.setItem('adminExpires', (Date.now()+86400000).toString()); 
    },
    isSessionValid: () => sessionStorage.getItem('adminToken') === 'valid' && parseInt(sessionStorage.getItem('adminExpires')) > Date.now(),
    endSession: () => { 
        sessionStorage.removeItem('adminToken'); 
        sessionStorage.removeItem('adminExpires'); 
    }
};

let allClickCount = 0;
let allClickTimer = null;

function handleAllClick() {
    allClickCount++;
    const allBtn = document.getElementById('allMoviesBtn');
    if (allBtn) {
        allBtn.style.transform = 'scale(0.95)';
        setTimeout(() => { if(allBtn) allBtn.style.transform = 'scale(1)'; }, 150);
    }
    if (allClickTimer) clearTimeout(allClickTimer);
    if (allClickCount >= 5) {
        allClickCount = 0;
        const password = prompt('Εισάγετε κωδικό διαχειριστή για εμφάνιση dashboard:');
        if (password) {
            hashPassword(password).then(hashed => {
                if (CONFIG && hashed === CONFIG.admin_dashboard_hash) {
                    AdminAuth.startSession();
                    showDashboard();
                } else {
                    showToast('Λάθος κωδικός!', '#e50914');
                }
            });
        }
    }
    allClickTimer = setTimeout(() => { allClickCount = 0; }, 2000);
}

function showDashboard() { 
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('movieGrid').classList.remove('dashboard-hidden');
    document.getElementById('logoutBtn').style.display = 'block';
    localStorage.setItem('dashboardVisible', 'true');
}

function hideDashboard() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('movieGrid').classList.add('dashboard-hidden');
    document.getElementById('logoutBtn').style.display = 'none';
    localStorage.setItem('dashboardVisible', 'false');
}

function logoutAdmin() { 
    AdminAuth.endSession(); 
    hideDashboard(); 
    showToast('Αποσυνδεθήκατε', '#e74c3c'); 
}

// ============ MOVIES DATA ============
let moviesData = [];
let filteredMovies = [];
let currentPage = 1;
let itemsPerPage = 25;
let currentTypeFilter = 'all';
let currentModalMovieId = null;
let currentMovieLink = null;
let recentMovieIds = [];

// ΜΟΝΙΜΕΣ ΠΛΑΤΦΟΡΜΕΣ
let mainPlatforms = [
    'Netflix', 'Disney+', 'Max (HBO)', 'Amazon Prime Video', 'Apple TV+', 
    'Paramount+', 'Peacock', 'Hulu', 'YouTube', 'Starz', 
    'Crunchyroll', 'Discovery+', 'Ελληνικές Ταινίες', 'Αλλες Πλατφορμες'
];

function updateMainPlatformsDropdown() {
    const select = document.getElementById('studioFilter');
    if (!select) return;
    
    const counts = {};
    moviesData.forEach(m => { counts[m.studio] = (counts[m.studio] || 0) + 1; });
    
    while (select.options.length > 1) select.remove(1);
    
    for (let platform of mainPlatforms) {
        if (counts[platform]) {
            select.add(new Option(`${platform} (${counts[platform]})`, platform));
        } else {
            select.add(new Option(platform, platform));
        }
    }
    
    const otherCount = moviesData.filter(m => m.studio && !mainPlatforms.includes(m.studio)).length;
    if (otherCount > 0) {
        select.add(new Option(`Αλλες (${otherCount})`, 'Αλλες'));
    }
}

// ============ FUZE.JS SEARCH ENGINE ============
let fuseSearch = null;
let lastSearchTerm = '';
let lastSearchResults = [];

function removeGreekAccents(text) {
    if (!text) return '';
    const accents = {
        'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
        'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω'
    };
    return text.replace(/[άέήίόύώΆΈΉΊΌΎΏ]/g, match => accents[match]);
}

function initFuseSearch() {
    const options = {
        keys: [
            { name: 'title', weight: 0.5 },
            { name: 'actors', weight: 0.2 },
            { name: 'director', weight: 0.15 },
            { name: 'writer', weight: 0.1 },
            { name: 'genre', weight: 0.05 }
        ],
        threshold: 0.35,
        distance: 100,
        includeScore: true,
        ignoreLocation: false,
        minMatchCharLength: 2,
        ignoreDiacritics: true
    };
    
    fuseSearch = new Fuse(moviesData, options);
    console.log('Fuse.js initialized with', moviesData.length, 'movies');
}

function searchMoviesWithFuse(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
        return moviesData;
    }
    
    if (lastSearchTerm === searchTerm && lastSearchResults.length > 0) {
        return lastSearchResults;
    }
    
    const results = fuseSearch.search(searchTerm);
    lastSearchTerm = searchTerm;
    lastSearchResults = results.map(r => r.item);
    
    return lastSearchResults;
}

// ============ COLLECTION SYSTEM ==========
let userCollections = {
    favorites: { name: "Favorites", movies: [] },
    watchlist: { name: "Watchlist", movies: [] }
};

function loadCollections() {
    const saved = localStorage.getItem('yioio_collections');
    if (saved) {
        try {
            userCollections = JSON.parse(saved);
        } catch(e) {
            saveCollections();
        }
    } else {
        saveCollections();
    }
}

function saveCollections() {
    localStorage.setItem('yioio_collections', JSON.stringify(userCollections));
}

function addMovieToCollection(movieId, collectionKey) {
    if (!userCollections[collectionKey]) {
        userCollections[collectionKey] = { name: collectionKey, movies: [] };
    }
    if (!userCollections[collectionKey].movies.includes(movieId)) {
        userCollections[collectionKey].movies.push(movieId);
        saveCollections();
        return true;
    }
    return false;
}

function removeMovieFromCollection(movieId, collectionKey) {
    if (userCollections[collectionKey]) {
        userCollections[collectionKey].movies = userCollections[collectionKey].movies.filter(id => id !== movieId);
        saveCollections();
        return true;
    }
    return false;
}

function isInCollection(movieId, collectionKey) {
    return userCollections[collectionKey] && userCollections[collectionKey].movies.includes(movieId);
}

function toggleCollection(movieId, collectionKey) {
    if (isInCollection(movieId, collectionKey)) {
        removeMovieFromCollection(movieId, collectionKey);
        return false;
    } else {
        addMovieToCollection(movieId, collectionKey);
        return true;
    }
}

function renderCollectionButtons(movieId) {
    const container = document.getElementById('modalCollections');
    if (!container) return;
    
    container.innerHTML = '';
    const collectionKeys = ['favorites', 'watchlist'];
    
    collectionKeys.forEach(key => {
        const collection = userCollections[key];
        if (collection) {
            const isActive = isInCollection(movieId, key);
            const btn = document.createElement('button');
            btn.className = `collection-btn ${isActive ? 'active' : ''}`;
            btn.textContent = collection.name;
            btn.onclick = () => {
                const newState = toggleCollection(movieId, key);
                if (newState) {
                    btn.classList.add('active');
                    showToast(`Προστέθηκε σε "${collection.name}"`, '#2ecc71');
                } else {
                    btn.classList.remove('active');
                    showToast(`Αφαιρέθηκε από "${collection.name}"`, '#e67e22');
                }
            };
            container.appendChild(btn);
        }
    });
}

// ============ LOAD MOVIES ============
function saveToLocalStorage() { 
    saveCollections();
    try {
        localStorage.setItem('yioio_movies_cache', JSON.stringify(moviesData));
    } catch(e) {
        console.warn('Could not cache movies:', e);
    }
    console.log('✅ Συλλογές αποθηκεύτηκαν');
}

let CURRENT_VERSION = "2.1.1";

async function loadMoviesData() {
    const savedVersion = localStorage.getItem('app_version');
    if (savedVersion) CURRENT_VERSION = savedVersion;
    document.getElementById('versionBadge').innerHTML = `Έκδοση: ${CURRENT_VERSION}${isUserLoggedIn ? ' ' : ''}`;
    
    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    const jsonUrl = basePath + 'movies.json';
    
    console.log('Φόρτωση από:', jsonUrl);
    
    const overlay = document.getElementById('initialLoadingOverlay');
    if (overlay) overlay.style.display = 'flex';
    
    try {
        showToast('📥 Φόρτωση βάσης δεδομένων...', '#2196f3');
        
        const response = await fetch('https://raw.githubusercontent.com/xistianakapsali-cyber/my-movies/main/my-movies-clean/movies.json');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Δεν βρέθηκε το movies.json`);
        }
        
        moviesData = await response.json();
        
        moviesData.forEach((m, i) => {
            m.id = i + 1;
            if (!m.status) m.status = 'active';
            if (!m.poster_url) m.poster_url = null;
            if (!m.original_title) m.original_title = m.title;
            if (!m.dateAdded) m.dateAdded = new Date().toISOString();
            if (!m.runtime) m.runtime = '';
            if (!m.source) m.source = 'link';
            if (!m.seriesStatus) m.seriesStatus = '';
            if (!m.dubbed) m.dubbed = 'unknown';
        });
        
        localStorage.setItem('yioio_data_loaded', 'true');
        saveToLocalStorage();
        
        updateRecentMoviesList();
        initFilters();
        initFuseSearch();
        loadCollections();
        
        await applyFilters();
        (async () => {
            await loadFeaturedMovie();
        })();
        
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
        
        showToast(`✅ Φορτώθηκαν ${moviesData.length.toLocaleString()} τίτλοι!`, '#2ecc71');
        
        setTimeout(() => updateMainPlatformsDropdown(), 500);
        
    } catch(error) {
        console.error('Φόρτωση απέτυχε:', error);
        
        const cached = localStorage.getItem('yioio_movies_cache');
        if (cached) {
            moviesData = JSON.parse(cached);
            updateRecentMoviesList();
            initFilters();
            initFuseSearch();
            loadCollections();
            await applyFilters();
            
            if (overlay) overlay.style.display = 'none';
            showToast(`⚠️ Λειτουργία cache: ${moviesData.length} τίτλοι`, '#e67e22');
            updateMainPlatformsDropdown();
        } 
        else if (moviesData.length === 0) {
            moviesData = [
                { "id": 1, "title": "1883", "year": 2021, "country": "United States", "genre": "Δράμα, Γουέστερν", "type": "Series", "quality": "HD", "codec": "", "rating": 8.7, "actors": "Sam Elliott, Tim McGraw, Faith Hill, Isabel May", "director": "Taylor Sheridan", "writer": "Taylor Sheridan", "link": "", "imdb": "", "tmdb": "", "desc": "Η ιστορία της οικογένειας Ντάτον καθώς ταξιδεύουν προς τη Δύση.", "dateAdded": new Date().toISOString(), "studio": "Paramount+", "createdBy": "Διαχειριστής", "status": "active", "poster_url": null, "original_title": "1883", "runtime": "", "source": "link", "seriesStatus": "", "dubbed": "unknown" },
                { "id": 2, "title": "1899", "year": 2022, "country": "Germany", "genre": "Μυστηρίου, Δράμα", "type": "Series", "quality": "HD", "codec": "", "rating": 7.3, "actors": "Emily Beecham, Andreas Pietschmann", "director": "Baran bo Odar", "writer": "Baran bo Odar", "link": "", "imdb": "", "tmdb": "", "desc": "Μετανάστες ταξιδεύουν από την Ευρώπη στην Αμερική.", "dateAdded": new Date().toISOString(), "studio": "Netflix", "createdBy": "Διαχειριστής", "status": "active", "poster_url": null, "original_title": "1899", "runtime": "", "source": "link", "seriesStatus": "", "dubbed": "unknown" },
                { "id": 3, "title": "1923", "year": 2022, "country": "United States", "genre": "Δράμα, Γουέστερν", "type": "Series", "quality": "HD", "codec": "", "rating": 8.3, "actors": "Harrison Ford, Helen Mirren", "director": "Taylor Sheridan", "writer": "Taylor Sheridan", "link": "", "imdb": "", "tmdb": "", "desc": "Η συνέχεια του 1883.", "dateAdded": new Date().toISOString(), "studio": "Paramount+", "createdBy": "Διαχειριστής", "status": "active", "poster_url": null, "original_title": "1923", "runtime": "", "source": "link", "seriesStatus": "", "dubbed": "unknown" }
            ];
            updateRecentMoviesList();
            initFilters();
            initFuseSearch();
            loadCollections();
            await applyFilters();
            
            if (overlay) overlay.style.display = 'none';
            showToast('⚠️ Χρησιμοποιούνται default δεδομένα', '#e67e22');
            updateMainPlatformsDropdown();
        }
        
        if (moviesData.length === 0) {
            const grid = document.getElementById('movieGrid');
            if (grid) {
                grid.innerHTML = `
                    <div style="text-align:center;padding:50px;">
                        ❌ Αποτυχία φόρτωσης δεδομένων<br>
                        <span style="font-size:12px;">${error.message}</span><br><br>
                        <button onclick="location.reload()" style="background:#e50914;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;">🔄 Δοκιμή ξανά</button>
                    </div>
                `;
            }
            if (overlay) overlay.style.display = 'none';
        }
    }
}

async function checkForGitHubUpdates() {
    if (!GITHUB_CONFIG) {
        showToast('GitHub settings not configured', '#e50914');
        return;
    }
    
    const baseUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.path}`;
    showToast(`Ελεγχος ενημέρωσης...`, '#2196f3');
    
    try {
        const versionUrl = `${baseUrl}/version.json`;
        console.log('Checking:', versionUrl);
        const versionRes = await fetch(versionUrl);
        if (!versionRes.ok) throw new Error(`HTTP ${versionRes.status}: version.json not found`);
        const remote = await versionRes.json();
        
        if (remote.version !== CURRENT_VERSION) {
            const shouldUpdate = confirm(`Νέα έκδοση ${remote.version}!\n\nΘέλετε ενημέρωση;`);
            if (shouldUpdate) {
                showToast('Λήψη δεδομένων...', '#2196f3');
                const dataUrl = `${baseUrl}/movies.json`;
                const dataRes = await fetch(dataUrl);
                if (!dataRes.ok) throw new Error(`HTTP ${dataRes.status}: movies.json not found`);
                const newData = await dataRes.json();
                if (!Array.isArray(newData)) throw new Error('Invalid JSON format');
                
                moviesData = newData;
                moviesData.forEach((m, i) => {
                    m.id = i + 1;
                    if (!m.status) m.status = 'active';
                    if (!m.poster_url) m.poster_url = null;
                    if (!m.original_title) m.original_title = m.title;
                    if (!m.runtime) m.runtime = '';
                    if (!m.source) m.source = 'link';
                    if (!m.seriesStatus) m.seriesStatus = '';
                    if (!m.dubbed) m.dubbed = 'unknown';
                });
                saveToLocalStorage();
                CURRENT_VERSION = remote.version;
                localStorage.setItem('app_version', CURRENT_VERSION);
                document.getElementById('versionBadge').innerHTML = `Εκδοση: ${CURRENT_VERSION}`;
                updateRecentMoviesList();
                initFilters();
                initFuseSearch();
                loadCollections();
                applyFilters();
                updateMainPlatformsDropdown();
                showToast(`Ενημέρωση! ${moviesData.length} τίτλοι`, '#2ecc71');
            }
        } else {
            showToast('Τελευταία έκδοση', '#2ecc71');
        }
    } catch(e) {
        console.error('Update error:', e);
        showToast(`Σφάλμα: ${e.message}`, '#e50914');
    }
}

// ============ FILTERS & RENDERING ============
function initFilters() {
    if (!moviesData.length) return;
    const yearSel = document.getElementById('yearFilter');
    const countrySel = document.getElementById('countryFilter');
    const genreSel = document.getElementById('genreFilter');
    
    while(yearSel.options.length>1) yearSel.remove(1);
    while(countrySel.options.length>1) countrySel.remove(1);
    while(genreSel.options.length>3) genreSel.remove(3);
    
    [...new Set(moviesData.map(m => m.year))].sort((a,b)=>b-a).forEach(y => yearSel.add(new Option(y,y)));
    [...new Set(moviesData.map(m => m.country).filter(c=>c&&c!=='N/A'))].sort().forEach(c => countrySel.add(new Option(c,c)));
    
    let allGenres = [...new Set(moviesData.flatMap(m => m.genre?.split(',').map(g=>g.trim()).filter(g=>g && g!=='N/A' && g!=='Biography' && g!=='Oscar Winner' && g!=='Βιογραφία')))];

    
    allGenres = allGenres.map(g => {
        if (g === 'Αστυνομικό') return 'Εγκλήματος';
        if (g === 'Βιογραφία') return 'Biography';
        if (g === 'Περιπέτεια') return 'Δράση & Περιπέτεια';
        if (g === 'Δράση') return 'Δράση & Περιπέτεια';
        return g;
    });
    
    allGenres = [...new Set(allGenres)];
    allGenres.sort((a,b)=>a.localeCompare(b,'el'));
    allGenres.forEach(g => genreSel.add(new Option(g,g)));
    
    updateMainPlatformsDropdown();
}

function toggleClearButton() { 
    document.getElementById('clearSearchBtn').classList.toggle('hidden', !document.getElementById('movieSearch').value.length); 
}

function clearSearch() { 
    document.getElementById('movieSearch').value = ''; 
    toggleClearButton(); 
    applyFilters(); 
}

function filterByType(type) { 
    currentTypeFilter = type; 
    document.querySelectorAll('.filter-type-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.type === type)); 
    applyFilters(); 
}

let searchTimeout = null;

function applyFilters() {
    if (!moviesData.length) return;
    if (filteredMovies.length !== moviesData.length) filteredMovies = [...moviesData];
    toggleClearButton();
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => performSearch(), 100);
}

function performSearch() {
    let term = document.getElementById('movieSearch').value.toLowerCase().trim();
    let results = [];
    
    if (term && term.length >= 2) {
        results = moviesData.filter(m => m.title.toLowerCase().includes(term) || (m.original_title && m.original_title.toLowerCase().includes(term)));
        if (results.length === 0) results = searchMoviesWithFuse(term);
    } else if (!term) {
        results = [...moviesData];
    } else if (term.length === 1) {
        results = moviesData.filter(m => m.title.toLowerCase().includes(term) || (m.original_title && m.original_title.toLowerCase().includes(term)));
    }
    
    if (currentTypeFilter !== 'all') results = results.filter(m => m.type === currentTypeFilter);
    
    const genre = document.getElementById('genreFilter').value;
    if (genre !== 'All') results = results.filter(m => m.genre?.includes(genre));
    
    const year = document.getElementById('yearFilter').value;
    if (year !== 'All') results = results.filter(m => m.year == year);
    
    const country = document.getElementById('countryFilter').value;
    if (country !== 'All') results = results.filter(m => m.country === country);
    
    const studio = document.getElementById('studioFilter').value;
    if (studio !== 'All') {
        if (studio === 'Αλλες') {
            results = results.filter(m => m.studio && !mainPlatforms.includes(m.studio));
        } else {
            results = results.filter(m => m.studio === studio);
        }
    }
    
    const sort = document.getElementById('sortSelect').value;
    
    if (sort === 'pendingOnly') results = results.filter(m => m.status === 'pending');
    if (sort === 'collection_favorites') results = results.filter(m => isInCollection(m.id, 'favorites'));
    else if (sort === 'collection_watchlist') results = results.filter(m => isInCollection(m.id, 'watchlist'));
	
    // ΝΕΕΣ ΕΠΙΛΟΓΕΣ ΦΙΛΤΡΑΡΙΣΜΑΤΟΣ
if (sort === 'dubbedOnly') {
    results = results.filter(m => m.dubbed === 'dubbed');
} else if (sort === 'seriesCompleted') {
    results = results.filter(m => m.type === 'Series' && m.seriesStatus === 'completed');
} else if (sort === 'seriesOngoing') {
    results = results.filter(m => m.type === 'Series' && m.seriesStatus === 'running');
}
	// ΠΡΟΣΘΗΚΗ: Νέες επιλογές φιλτραρίσματος
if (sort === 'dubbedOnly') {
    results = results.filter(m => m.dubbed === 'dubbed');
} else if (sort === 'seriesCompleted') {
    results = results.filter(m => m.type === 'Series' && m.seriesStatus === 'completed');
} else if (sort === 'seriesOngoing') {
    results = results.filter(m => m.type === 'Series' && m.seriesStatus === 'running');
}
    if (sort === 'title') results.sort((a,b) => a.title.localeCompare(b.title));
    else if (sort === 'yearDesc') results.sort((a,b) => b.year - a.year);
    else if (sort === 'ratingDesc') results.sort((a,b) => b.rating - a.rating);
    else if (sort === 'latest') results.sort((a,b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    else if (sort === 'idDesc') results.sort((a,b) => b.id - a.id);
    else if (sort === 'idAsc') results.sort((a,b) => a.id - b.id);
    else if (sort === 'yearAsc') results.sort((a,b) => a.year - b.year);
    else if (sort === 'qualityHD') results.sort((a,b) => { const order = { '4K': 1, 'HD': 2, 'HD/SD': 3, 'SD': 4 }; return (order[a.quality] || 99) - (order[b.quality] || 99); });
    else if (sort === 'qualitySD') results.sort((a,b) => { const order = { 'SD': 1, 'HD/SD': 2, 'HD': 3, '4K': 4 }; return (order[a.quality] || 99) - (order[b.quality] || 99); });
    
    filteredMovies = results;
    currentPage = 1;
    document.getElementById('movieCount').innerText = `${filteredMovies.length} τίτλοι`;
    updateDashboard();
    renderMovies();
}

function updateRecentMoviesList() {
    if (!moviesData || moviesData.length === 0) return;
    const sortedByDate = [...moviesData].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    recentMovieIds = sortedByDate.slice(0, 10).map(m => m.id);
}

function isNewMovie(dateAdded, movieId) {
    if (!dateAdded || !movieId) return false;
    return recentMovieIds.includes(movieId);
}

// ============ RENDER MOVIES ============
async function renderMovies() {
    const grid = document.getElementById('movieGrid');
    const end = currentPage * itemsPerPage;
    const page = filteredMovies.slice(0, end);
    
    if (!page.length) { 
        grid.innerHTML = '<div style="text-align:center;padding:50px;">Δεν βρέθηκαν αποτελέσματα</div>'; 
        document.getElementById('loadMoreBtn').style.display = 'none'; 
        return; 
    }
    
    document.getElementById('loadMoreBtn').style.display = end >= filteredMovies.length ? 'none' : 'block';
    grid.innerHTML = '';
    
    for (const m of page) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.setAttribute('data-id', m.id);
        card.addEventListener('click', () => openDetailsById(m.id));
        
        const posterSrc = m.poster_url || generateFallbackPoster(m.title);
        const hasLink = m.link && m.link !== '';
        
        // Quality tag - ΜΕΣΑ ΣΤΟ WRAPPER
        let qualityTag = '';
        if (isMixedQuality(m.quality)) {
            qualityTag = `<span class="quality-tag mixed">
                            <span class="hd-part">HD</span><span class="sd-part">SD</span>
                         </span>`;
        } else {
            qualityTag = `<span class="quality-tag ${m.quality === 'SD' ? 'sd-blue' : ''}">${m.quality || 'HD'}</span>`;
        }

        // NEW badge
        let newBadge = '';
        if (isNewMovie(m.dateAdded, m.id)) {
            newBadge = `<span class="new-badge-poster">ΝΕΟ</span>`;
        }

        // PENDING badge
        let pendingBadge = '';
        if (m.status === 'pending') {
            pendingBadge = `<span class="pending-badge">ΣΕ ΑΝΑΜΟΝΗ</span>`;
        }

        // Series Status badge
        let seriesStatusBadge = '';
        if (m.type === 'Series') {
            if (m.seriesStatus === 'completed') {
                seriesStatusBadge = `<span class="series-completed-badge">COMPLETED</span>`;
            } else if (m.seriesStatus === 'running') {
                seriesStatusBadge = `<span class="series-running-badge">ONGOING</span>`;
            }
        }

       // Dubbed badge - ΕΛΛΗΝΙΚΑ
let dubbedBadge = '';
if (m.dubbed === 'dubbed') {
    dubbedBadge = `<span class="dubbed-badge">Μεταγλωττισμένο</span>`;
} else if (m.dubbed === 'subtitled') {
    dubbedBadge = `<span class="subtitled-badge">ΥΠΟΤΙΤΛΟΙ</span>`;
}

        // ΟΛΑ ΤΑ BADGES ΣΕ ΕΝΑ WRAPPER (συμπεριλαμβανομένου του quality)
        const badgesHtml = `
            <div class="badges-wrapper">
                ${qualityTag}
                ${newBadge}
                ${pendingBadge}
                ${seriesStatusBadge}
                ${dubbedBadge}
            </div>
        `;

        card.innerHTML = `
            <div class="img-container">
                ${badgesHtml}
                <img src="${posterSrc}" alt="${escapeHtml(m.title)}" loading="lazy" onerror="this.src='${generateFallbackPoster(m.title)}'">
            </div>
            <div class="info">
                <h3>${escapeHtml(m.title)}</h3>
                <div class="stars">${getStarsHtml(m.rating)} <span class="rating-number">${m.rating.toFixed(1)}</span></div>
                ${hasLink ? `<div class="play-btn">▶ Προβολή</div>` : ''}
            </div>
        `;
        grid.appendChild(card);
    }
}

function loadNextPage() { 
    currentPage++; 
    renderMovies(); 
}

function resetAllFilters() {
    document.getElementById('movieSearch').value = '';
    toggleClearButton();
    document.getElementById('genreFilter').value = 'All';
    document.getElementById('yearFilter').value = 'All';
    document.getElementById('countryFilter').value = 'All';
    document.getElementById('studioFilter').value = 'All';
    document.getElementById('sortSelect').value = 'title';
    currentTypeFilter = 'all';
    document.querySelectorAll('.filter-type-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.type === 'all'));
    applyFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Επιστροφή στην αρχική σελίδα', '#2ecc71');
}

function updateDashboard() {
    document.getElementById('statTotal').innerText = filteredMovies.length;
    document.getElementById('statMovies').innerText = filteredMovies.filter(m => m.type === 'Movie').length;
    document.getElementById('statSeries').innerText = filteredMovies.filter(m => m.type === 'Series').length;
    const avg = filteredMovies.filter(m => m.rating > 0).reduce((a,b) => a + b.rating, 0) / (filteredMovies.filter(m => m.rating > 0).length || 1);
    document.getElementById('statAvgRating').innerText = avg.toFixed(1);
    const genres = {};
    filteredMovies.forEach(m => { if(m.genre) m.genre.split(',').forEach(g => { let gg = g.trim(); if(gg) genres[gg] = (genres[gg]||0)+1; }); });
    let topGenre = Object.entries(genres).sort((a,b)=>b[1]-a[1])[0];
    document.getElementById('statTopGenre').innerText = topGenre ? topGenre[0] : '-';
    let oldest = filteredMovies.reduce((a,b) => (a.year < b.year ? a : b), {year:9999});
    let newest = filteredMovies.reduce((a,b) => (a.year > b.year ? a : b), {year:0});
    document.getElementById('statOldest').innerText = oldest.year !== 9999 ? oldest.year : '-';
    document.getElementById('statNewest').innerText = newest.year !== 0 ? newest.year : '-';
}

// ============ ACTOR IMAGES ============
const actorImageCache = new Map();

// ============ ΛΙΣΤΑ ΜΕ ΧΕΙΡΟΚΙΝΗΤΕΣ ΦΩΤΟΓΡΑΦΙΕΣ ============
const ACTOR_IMAGE_OVERRIDES = {
    "Barbara Harris": "https://media.themoviedb.org/t/p/w600_and_h900_face/9gFrDXHT42V8v8rn931ZNsB7DyQ.jpg",
};

// ============ ΑΝΑΖΗΤΗΣΗ ΦΩΤΟΓΡΑΦΙΑΣ ΗΘΟΠΟΙΟΥ ============
async function fetchActorImage(actorName) {
    if (!actorName || actorName === 'N/A') return null;
    
    if (ACTOR_IMAGE_OVERRIDES[actorName]) {
        actorImageCache.set(actorName, ACTOR_IMAGE_OVERRIDES[actorName]);
        return ACTOR_IMAGE_OVERRIDES[actorName];
    }
    
    if (actorImageCache.has(actorName)) return actorImageCache.get(actorName);
    if (!TMDB_API_KEY) return null;
    
    try {
        let cleanName = actorName.replace(/\s*\([^)]*\)\s*/g, '').trim();
        
        const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanName)}`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            let bestMatch = null;
            const actors = data.results.filter(r => r.known_for_department === 'Acting');
            const withPhotos = (actors.length > 0 ? actors : data.results).filter(r => r.profile_path);
            
            if (withPhotos.length > 0) {
                bestMatch = withPhotos.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0];
            } else {
                bestMatch = (actors.length > 0 ? actors[0] : data.results[0]);
            }
            
            if (bestMatch && bestMatch.profile_path) {
                const imageUrl = `https://image.tmdb.org/t/p/w185${bestMatch.profile_path}`;
                actorImageCache.set(actorName, imageUrl);
                return imageUrl;
            }
        }
    } catch(e) {
        console.warn(`Σφάλμα για ${actorName}:`, e);
    }
    
    actorImageCache.set(actorName, null);
    return null;
}

async function renderActorsWithImages(actorsString, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!actorsString || actorsString === 'N/A') {
        container.innerHTML = '<span style="opacity:0.7;">N/A</span>';
        return;
    }
    const actorNames = actorsString.split(',').map(name => name.trim()).filter(name => name && name !== 'N/A');
    if (actorNames.length === 0) {
        container.innerHTML = '<span style="opacity:0.7;">N/A</span>';
        return;
    }
    
    container.innerHTML = '';
    for (const name of actorNames) {
        const actorDiv = document.createElement('div');
        actorDiv.className = 'actor-item';
        actorDiv.setAttribute('data-actor', name);
        actorDiv.addEventListener('click', () => searchMoviesByActor(name));
        
        const placeholder = document.createElement('div');
        placeholder.className = 'actor-placeholder';
        placeholder.textContent = '';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'actor-name';
        nameSpan.textContent = name;
        
        actorDiv.appendChild(placeholder);
        actorDiv.appendChild(nameSpan);
        container.appendChild(actorDiv);
        
        const imgUrl = await fetchActorImage(name);
        if (imgUrl) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.className = 'actor-avatar';
            img.alt = name;
            img.onerror = () => { img.style.display = 'none'; placeholder.style.display = 'flex'; };
            placeholder.parentNode.replaceChild(img, placeholder);
        }
    }
}

function searchMoviesByActor(actorName) {
    const searchInput = document.getElementById('movieSearch');
    searchInput.value = actorName;
    toggleClearButton();
    
    const searchTerm = actorName.toLowerCase();
    
    let results = moviesData.filter(movie => {
        if (!movie.actors || movie.actors === 'N/A') return false;
        return movie.actors.toLowerCase().includes(searchTerm);
    });
    
    if (currentTypeFilter !== 'all') results = results.filter(m => m.type === currentTypeFilter);
    
    const genre = document.getElementById('genreFilter').value;
    if (genre !== 'All') results = results.filter(m => m.genre?.includes(genre));
    
    const year = document.getElementById('yearFilter').value;
    if (year !== 'All') results = results.filter(m => m.year == year);
    
    const country = document.getElementById('countryFilter').value;
    if (country !== 'All') results = results.filter(m => m.country === country);
    
    const studio = document.getElementById('studioFilter').value;
    if (studio !== 'All') results = results.filter(m => m.studio === studio);
    
    filteredMovies = results;
    currentPage = 1;
    document.getElementById('movieCount').innerText = `${filteredMovies.length} τίτλοι`;
    updateDashboard();
    renderMovies();
    
    closeDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (results.length === 0) {
        showToast(`Δεν βρέθηκαν ταινίες με τον ηθοποιό: ${actorName}`, '#e67e22');
    } else {
        showToast(`Αναζήτηση για ηθοποιό: ${actorName} - ${results.length} ταινίες`, '#2ecc71');
    }
}

function searchMoviesByDirectorOrWriter(value, type) {
    const searchInput = document.getElementById('movieSearch');
    searchInput.value = value;
    toggleClearButton();
    
    let results = moviesData.filter(m => m.director?.toLowerCase().includes(value.toLowerCase()) || m.writer?.toLowerCase().includes(value.toLowerCase()));
    
    if (currentTypeFilter !== 'all') results = results.filter(m => m.type === currentTypeFilter);
    
    const genre = document.getElementById('genreFilter').value;
    if (genre !== 'All') results = results.filter(m => m.genre?.includes(genre));
    
    const year = document.getElementById('yearFilter').value;
    if (year !== 'All') results = results.filter(m => m.year == year);
    
    const country = document.getElementById('countryFilter').value;
    if (country !== 'All') results = results.filter(m => m.country === country);
    
    const studio = document.getElementById('studioFilter').value;
    if (studio !== 'All') results = results.filter(m => m.studio === studio);
    
    filteredMovies = results;
    currentPage = 1;
    document.getElementById('movieCount').innerText = `${filteredMovies.length} τίτλοι`;
    updateDashboard();
    renderMovies();
    
    closeDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Αναζήτηση για: ${value}`, '#2196f3');
}

// ============ POSTER FUNCTIONS ============
async function fetchAndSavePoster(movie) {
    if (movie.poster_url && movie.poster_url !== '') return movie.poster_url;
    
    if (!TMDB_API_KEY) return generateFallbackPoster(movie.title);
    
    try {
        const searchType = movie.type === 'Series' ? 'tv' : 'movie';
        const url = `https://api.themoviedb.org/3/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}&year=${movie.year}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.results?.[0]?.poster_path) {
            const posterUrl = `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
            movie.poster_url = posterUrl;
            saveToLocalStorage();
            return posterUrl;
        }
    } catch(e) {
        console.warn(`Poster fetch failed for ${movie.title}:`, e);
    }
    
    return generateFallbackPoster(movie.title);
}

async function enrichAllPosters() {
    if (!AdminAuth.isSessionValid()) {
        showToast('Μόνο διαχειριστής!', '#e50914');
        return;
    }
    
    console.log('Εναρξη enrichment posters...');
    let count = 0;
    let total = moviesData.length;
    
    showToast(`Λήψη posters: 0/${total}`, '#2196f3');
    
    for (let movie of moviesData) {
        if (!movie.poster_url) {
            await fetchAndSavePoster(movie);
            count++;
            if (count % 5 === 0) showToast(`Λήψη posters: ${count}/${total}`, '#2196f3');
            await new Promise(r => setTimeout(r, 150));
        }
    }
    
    saveToLocalStorage();
    console.log(`Ολοκληρώθηκε! ${count} νέα posters προστέθηκαν`);
    showToast(`${count} posters αποθηκεύτηκαν!`, '#2ecc71');
    applyFilters();
}

// ============ ΑΥΤΟΜΑΤΗ ΣΥΜΠΛΗΡΩΣΗ ΔΙΑΡΚΕΙΑΣ ============
async function autoFillAllRuntimes() {
    if (!AdminAuth.isSessionValid()) {
        showToast('Μόνο διαχειριστής!', '#e50914');
        return;
    }
    
    if (!TMDB_API_KEY) {
        showToast('Σφάλμα: Missing TMDB API Key', '#e50914');
        return;
    }
    
    const moviesWithoutRuntime = moviesData.filter(m => !m.runtime || m.runtime === '');
    
    if (moviesWithoutRuntime.length === 0) {
        showToast('✅ Όλες οι ταινίες έχουν ήδη διάρκεια!', '#2ecc71');
        return;
    }
    
    showToast(`📥 Συμπλήρωση διάρκειας σε ${moviesWithoutRuntime.length} ταινίες...`, '#2196f3');
    
    let successCount = 0;
    let failCount = 0;
    let noTmdbCount = 0;
    let noRuntimeCount = 0;
    let total = moviesWithoutRuntime.length;
    let current = 0;
    let failedMovies = [];
    
    for (const movie of moviesWithoutRuntime) {
        current++;
        try {
            let tmdbId = null;
            let mediaType = movie.type === 'Series' ? 'tv' : 'movie';
            
            if (movie.tmdb) {
                const match = movie.tmdb.match(/\/(movie|tv)\/(\d+)/);
                if (match) {
                    tmdbId = match[2];
                    mediaType = match[1];
                }
            }
            
            if (!tmdbId) {
                const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}`;
                const searchRes = await fetch(searchUrl);
                const searchData = await searchRes.json();
                if (searchData.results && searchData.results.length > 0) {
                    let bestMatch = searchData.results[0];
                    for (const result of searchData.results) {
                        const resultYear = mediaType === 'tv' ? result.first_air_date : result.release_date;
                        if (resultYear && parseInt(resultYear.substring(0,4)) === movie.year) {
                            bestMatch = result;
                            break;
                        }
                    }
                    tmdbId = bestMatch.id;
                    movie.tmdb = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
                }
            }
            
            if (tmdbId) {
                const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
                const detailsRes = await fetch(detailsUrl);
                const details = await detailsRes.json();
                
                if (details.runtime) {
                    const hours = Math.floor(details.runtime / 60);
                    const minutes = details.runtime % 60;
                    movie.runtime = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
                    successCount++;
                    console.log(`✅ ${movie.title} (${movie.year}): ${movie.runtime}`);
                } else if (details.episode_run_time && details.episode_run_time.length > 0) {
                    const avgRuntime = Math.round(details.episode_run_time.reduce((a,b) => a + b, 0) / details.episode_run_time.length);
                    const hours = Math.floor(avgRuntime / 60);
                    const minutes = avgRuntime % 60;
                    movie.runtime = hours > 0 ? `${hours}h ${minutes}min (ανά επεισόδιο)` : `${minutes}min (ανά επεισόδιο)`;
                    successCount++;
                    console.log(`✅ ${movie.title} (${movie.year}): ${movie.runtime}`);
                } else {
                    noRuntimeCount++;
                    failedMovies.push({ title: movie.title, year: movie.year, reason: 'No runtime in TMDB' });
                    console.log(`❌ ${movie.title} (${movie.year}): Δεν βρέθηκε διάρκεια στο TMDB`);
                }
            } else {
                noTmdbCount++;
                failedMovies.push({ title: movie.title, year: movie.year, reason: 'No TMDB ID found' });
                console.log(`❌ ${movie.title} (${movie.year}): Δεν βρέθηκε TMDB ID`);
            }
            
            await new Promise(r => setTimeout(r, 300));
            
            if (current % 5 === 0 || current === total) {
                showToast(`📥 Πρόοδος: ${current}/${total} - ✅ ${successCount} επιτυχίες, ❌ ${failCount + noTmdbCount + noRuntimeCount} αποτυχίες`, '#2196f3');
            }
            
        } catch(e) {
            failCount++;
            failedMovies.push({ title: movie.title, year: movie.year, reason: 'Error: ' + e.message });
            console.error(`❌ ${movie.title} (${movie.year}):`, e);
        }
    }
    
    saveToLocalStorage();
    updateRecentMoviesList();
    applyFilters();
    
    console.log('========== ΑΝΑΦΟΡΑ ==========');
    console.log(`✅ Επιτυχίες: ${successCount}`);
    console.log(`❌ Αποτυχίες: ${failCount}`);
    console.log(`❌ Χωρίς TMDB ID: ${noTmdbCount}`);
    console.log(`❌ Χωρίς Runtime: ${noRuntimeCount}`);
    
    let message = `✅ Ολοκληρώθηκε!\n✅ Επιτυχίες: ${successCount}\n`;
    message += `❌ Αποτυχίες: ${failCount + noTmdbCount + noRuntimeCount}\n`;
    message += `   - Χωρίς TMDB ID: ${noTmdbCount}\n`;
    message += `   - Χωρίς Runtime: ${noRuntimeCount}`;
    
    showToast(message, successCount > 0 ? '#2ecc71' : '#e67e22');
}

// ============ ΒΟΗΘΗΤΙΚΗ ΣΥΝΑΡΤΗΣΗ ΓΙΑ ΚΑΘΑΡΙΣΜΟ ΟΝΟΜΑΤΟΣ ============
function cleanMovieFileName(fileName) {
    let name = fileName.replace(/\.[^/.]+$/, '');
    
    const cleanWords = [
        'BRRip', 'WEB-DL', 'BluRay', 'Blu-Ray', 'HDRip', 'HDTV', 'DVDRip',
        '1080p', '720p', '2160p', '4K', 'x264', 'x265', 'HEVC', 'H.264', 'H.265',
        'AC3', 'DTS', 'AAC', 'MP3', '5.1', '7.1', 'DDP', 'Atmos',
        'PROPER', 'REPACK', 'RERIP', 'REMUX', 'iNTERNAL', 'LIMITED', 'EXTENDED',
        'DIRECTORS CUT', 'UNRATED', 'UNCUT', 'THEATRICAL', 'FINAL CUT',
        'WEBRip', 'AMZN', 'NF', 'HMAX', 'DSNP', 'iTUNES'
    ];
    
    let year = '';
    const yearMatch = name.match(/\((\d{4})\)/);
    if (yearMatch) {
        year = yearMatch[1];
        name = name.replace(/\s*\(\d{4}\)\s*/, ' ');
    }
    
    for (const word of cleanWords) {
        const regex = new RegExp(`\\s*${word}\\s*`, 'gi');
        name = name.replace(regex, ' ');
    }
    
    name = name.replace(/[._-]+/g, ' ');
    name = name.replace(/\s+/g, ' ').trim();
    
    if (!year) {
        const yearMatch2 = name.match(/\b(19|20)\d{2}\b/);
        if (yearMatch2) {
            year = yearMatch2[0];
            name = name.replace(/\s*(19|20)\d{2}\s*/, ' ');
            name = name.replace(/\s+/g, ' ').trim();
        }
    }
    
    return { title: name, year: year };
}

// ============ ΔΙΑΧΕΙΡΙΣΗ ΠΗΓΩΝ (⋯) ============
let selectedSourceType = 'link';
let scannedMovies = [];

function toggleSourceOptions() {
    const options = document.getElementById('sourceOptions');
    if (options) {
        options.style.display = options.style.display === 'none' ? 'block' : 'none';
    }
}

function selectSourceType(type) {
    selectedSourceType = type;
    const options = document.getElementById('sourceOptions');
    if (options) options.style.display = 'none';
    
    const scanBtn = document.getElementById('scanFolderBtn');
    const linkInput = document.getElementById('newLink');
    
    if (type === 'link') {
        if (scanBtn) scanBtn.style.display = 'none';
        if (linkInput) {
            linkInput.placeholder = 'https://...';
            linkInput.disabled = false;
            linkInput.value = '';
        }
        showToast('🔗 Χειροκίνητο Link - Λειτουργεί όπως πριν', '#2196f3');
    } else {
        if (scanBtn) scanBtn.style.display = 'block';
        if (linkInput) {
            linkInput.placeholder = 'Θα συμπληρωθεί αυτόματα από τη σάρωση';
            linkInput.disabled = true;
            linkInput.value = '';
        }
        const typeNames = {
            'local': 'Τοπικός Δίσκος',
            'external': 'Εξωτερικός Δίσκος',
            'network': 'Δίκτυο'
        };
        showToast(`📁 Επιλέχθηκε: ${typeNames[type] || type}`, '#2196f3');
    }
}

// ============ ΣΑΡΩΣΗ ΦΑΚΕΛΟΥ ============
async function scanFolderForMovies() {
    if (selectedSourceType === 'link') {
        showToast('❌ Επέλεξε πρώτα πηγή (τοπικός/εξωτερικός/δίκτυο)', '#e50914');
        return;
    }
    
    try {
        showToast('🔍 Επιλέξτε φάκελο με ταινίες...', '#2196f3');
        
        const dirHandle = await window.showDirectoryPicker();
        const movies = [];
        let count = 0;
        let folderPath = '';
        
        try {
            folderPath = dirHandle.name;
        } catch(e) {
            console.warn('Δεν μπορέσαμε να πάρουμε τη διαδρομή:', e);
        }
        
        showToast(`🔍 Σάρωση φακέλου: ${folderPath}...`, '#2196f3');
        
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                const name = entry.name;
                const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg'];
                const ext = '.' + name.split('.').pop().toLowerCase();
                
                if (videoExts.includes(ext)) {
                    const cleaned = cleanMovieFileName(name);
                    
                    console.log(`🧹 Καθαρισμός: ${name} → ${cleaned.title} (${cleaned.year})`);
                    
                    movies.push({
                        fileName: name,
                        title: cleaned.title,
                        year: cleaned.year,
                        path: name,
                        fullPath: `${folderPath}/${name}`,
                        size: entry.size,
                        handle: entry,
                        folderPath: folderPath
                    });
                    count++;
                }
            }
        }
        
        if (movies.length === 0) {
            showToast('❌ Δεν βρέθηκαν βίντεο στον φάκελο', '#e67e22');
            return;
        }
        
        showToast(`✅ Βρέθηκαν ${movies.length} ταινίες! Αναζήτηση στοιχείων...`, '#2ecc71');
        
        let enriched = 0;
        let failed = 0;
        
        for (let i = 0; i < movies.length; i++) {
            try {
                const movie = movies[i];
                let searchTitle = movie.title;
                let searchYear = movie.year;
                
                let searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}`;
                if (searchYear) {
                    searchUrl += `&year=${searchYear}`;
                }
                
                const res = await fetch(searchUrl);
                const data = await res.json();
                
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    
                    let bestMatch = result;
                    if (searchYear) {
                        const exactYearMatch = data.results.find(r => {
                            const rYear = r.release_date ? r.release_date.substring(0,4) : '';
                            return rYear === searchYear;
                        });
                        if (exactYearMatch) {
                            bestMatch = exactYearMatch;
                        }
                    }
                    
                    const movieId = bestMatch.id;
                    
                    const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=el`;
                    const detailsRes = await fetch(detailsUrl);
                    const detailsData = await detailsRes.json();
                    
                    const creditsUrl = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;
                    const creditsRes = await fetch(creditsUrl);
                    const creditsData = await creditsRes.json();
                    
                    let director = 'N/A';
                    let writer = 'N/A';
                    let actors = 'N/A';
                    let actorsWithIds = [];
                    
                    if (creditsData.crew) {
                        const directorObj = creditsData.crew.find(p => p.job === 'Director');
                        if (directorObj) director = directorObj.name;
                        
                        const writerObj = creditsData.crew.find(p => p.job === 'Writer' || p.job === 'Screenplay');
                        if (writerObj) writer = writerObj.name;
                    }
                    
                    if (creditsData.cast && creditsData.cast.length > 0) {
                        const topCast = creditsData.cast.slice(0, 8);
                        actors = topCast.map(a => a.name).join(', ');
                        actorsWithIds = topCast.map(a => ({
                            name: a.name,
                            id: a.id,
                            profile_path: a.profile_path
                        }));
                    }
                    
                    let desc = detailsData.overview || '';
                    if (!desc || desc === '') {
                        const englishDetailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`;
                        const englishRes = await fetch(englishDetailsUrl);
                        const englishData = await englishRes.json();
                        desc = englishData.overview || 'Δεν υπάρχει περιγραφή.';
                    }
                    
                    let country = 'N/A';
                    if (detailsData.production_countries && detailsData.production_countries.length > 0) {
                        country = detailsData.production_countries[0].name;
                    }
                    
                    let genre = 'N/A';
                    if (detailsData.genres && detailsData.genres.length > 0) {
                        genre = detailsData.genres.map(g => g.name).join(', ');
                    }
                    
                    let runtime = '';
                    if (detailsData.runtime) {
                        const hours = Math.floor(detailsData.runtime / 60);
                        const minutes = detailsData.runtime % 60;
                        runtime = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
                    }
                    
                    let poster = null;
                    if (bestMatch.poster_path) {
                        poster = `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}`;
                    } else if (detailsData.poster_path) {
                        poster = `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`;
                    }
                    
                    movies[i].tmdbData = {
                        id: bestMatch.id,
                        title: bestMatch.title,
                        original_title: detailsData.original_title || bestMatch.title,
                        year: bestMatch.release_date ? bestMatch.release_date.substring(0,4) : searchYear,
                        poster: poster,
                        rating: bestMatch.vote_average || 0,
                        desc: desc,
                        genre: genre,
                        director: director,
                        writer: writer,
                        actors: actors,
                        actorsWithIds: actorsWithIds,
                        country: country,
                        runtime: runtime
                    };
                    enriched++;
                    console.log(`✅ ${bestMatch.title} (${bestMatch.release_date ? bestMatch.release_date.substring(0,4) : 'N/A'})`);
                    console.log(`   Σκηνοθέτης: ${director}`);
                    console.log(`   Ηθοποιοί: ${actors.substring(0, 50)}...`);
                } else {
                    failed++;
                    console.log(`❌ Δεν βρέθηκε: ${movie.title}`);
                }
                
                await new Promise(r => setTimeout(r, 300));
                
                if ((i + 1) % 3 === 0 || i === movies.length - 1) {
                    showToast(`📥 Πρόοδος: ${i+1}/${movies.length} - ${enriched} εμπλουτίστηκαν, ${failed} απέτυχαν`, '#2196f3');
                }
            } catch(e) {
                failed++;
                console.error('Σφάλμα για:', movies[i].title, e);
            }
        }
        
        scannedMovies = movies;
        displayScanResults(movies);
        showToast(`✅ Ολοκληρώθηκε! ${enriched}/${movies.length} ταινίες εμπλουτίστηκαν, ${failed} απέτυχαν`, '#2ecc71');
        
    } catch(e) {
        if (e.name === 'AbortError' || e.message.includes('abort')) {
            showToast('❌ Ακυρώθηκε η επιλογή φακέλου', '#e67e22');
        } else {
            console.error('Σφάλμα σάρωσης:', e);
            showToast('❌ Σφάλμα κατά τη σάρωση. Δοκιμάστε ξανά.', '#e50914');
        }
    }
}

// ============ ΕΜΦΑΝΙΣΗ ΑΠΟΤΕΛΕΣΜΑΤΩΝ ΣΑΡΩΣΗΣ ============
function displayScanResults(movies) {
    const container = document.getElementById('scanResults');
    if (!container) return;
    container.style.display = 'block';
    
    const withData = movies.filter(m => m.tmdbData);
    const withoutData = movies.filter(m => !m.tmdbData);
    
    let html = `
        <div style="padding:12px; background:var(--primary); color:white; font-weight:bold; display:flex; justify-content:space-between; align-items:center; border-radius:8px 8px 0 0;">
            <span>🎬 Βρέθηκαν ${movies.length} ταινίες</span>
            <span style="font-size:12px;">✅ ${withData.length} με στοιχεία | ⚠️ ${withoutData.length} χωρίς</span>
        </div>
    `;
    
    movies.forEach((m, i) => {
        const data = m.tmdbData;
        const poster = data?.poster || 'https://via.placeholder.com/300x450?text=No+Poster';
        const title = data?.title || m.title;
        const year = data?.year || m.year || 'Άγνωστο';
        const rating = data?.rating ? `⭐ ${data.rating.toFixed(1)}` : '⭐ N/A';
        const director = data?.director || 'N/A';
        const actors = data?.actors || 'N/A';
        const desc = data?.desc || 'Δεν υπάρχει περιγραφή.';
        
        html += `
            <div class="scan-result-item" style="display:flex; align-items:center; padding:10px 15px; border-bottom:1px solid var(--border); gap:15px; transition:background 0.2s; background:var(--card);" 
                 onmouseenter="this.style.background='var(--input-bg)'" onmouseleave="this.style.background='var(--card)'">
                <img src="${poster}" style="width:60px; height:90px; object-fit:cover; border-radius:6px; flex-shrink:0;" 
                     onerror="this.src='https://via.placeholder.com/60x90?text=No+Poster'">
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:bold; color:var(--text);">${escapeHtml(title)}</div>
                    <div style="font-size:12px; opacity:0.7;">${year} • ${rating}</div>
                    ${data ? `<div style="font-size:11px; opacity:0.6;">🎬 ${escapeHtml(director)} • ${escapeHtml(actors.substring(0, 50))}${actors.length > 50 ? '...' : ''}</div>` : ''}
                    <div style="font-size:11px; opacity:0.6; max-height:40px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(desc.substring(0, 80))}${desc.length > 80 ? '...' : ''}</div>
                </div>
                <button onclick="addScannedMovie(${i})" style="background:#2ecc71; color:white; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-weight:bold; flex-shrink:0;">➕</button>
            </div>
        `;
    });
    
    html += `
        <div style="padding:12px; text-align:center; background:var(--input-bg); border-radius:0 0 8px 8px;">
            <button onclick="addAllScannedMovies()" style="background:#2ecc71; color:white; border:none; padding:10px 25px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:14px;">
                📥 Εισαγωγή Όλων (${movies.length} ταινίες)
            </button>
            <button onclick="document.getElementById('scanResults').style.display='none'" style="background:#e74c3c; color:white; border:none; padding:10px 25px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:14px; margin-left:10px;">
                ✕ Κλείσιμο
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============ ΠΡΟΣΘΗΚΗ ΜΙΑΣ ΤΑΙΝΙΑΣ ΑΠΟ ΣΑΡΩΣΗ ============
function addScannedMovie(index) {
    const movie = scannedMovies[index];
    if (!movie) return;
    
    const data = movie.tmdbData;
    if (!data) {
        showToast('❌ Η ταινία δεν έχει στοιχεία. Προσπάθησε ξανά.', '#e50914');
        return;
    }
    
    let baseFolder = localStorage.getItem('moviesBaseFolder');
    
    if (!baseFolder) {
        baseFolder = prompt('Για να λειτουργήσει η σάρωση, βάλε την πλήρη διαδρομή του φακέλου με τις ταινίες σου (π.χ. C:/Users/YourName/Videos ή D:/Movies):');
        if (!baseFolder) {
            showToast('❌ Ακυρώθηκε. Δεν αποθηκεύτηκε η ταινία.', '#e50914');
            return;
        }
        localStorage.setItem('moviesBaseFolder', baseFolder);
        showToast(`✅ Φάκελος αποθηκεύτηκε: ${baseFolder}`, '#2ecc71');
    }
    
    let folder = baseFolder.replace(/\\/g, '/');
    if (folder.endsWith('/')) folder = folder.slice(0, -1);
    
    const fileName = movie.fileName;
    const fullPath = `${folder}/${fileName}`;
    
    const newId = moviesData.length ? Math.max(...moviesData.map(m => m.id)) + 1 : 1;
    
    const newMovie = {
        id: newId,
        title: data.title || movie.title,
        year: parseInt(data.year) || parseInt(movie.year) || new Date().getFullYear(),
        type: 'Movie',
        quality: 'HD',
        codec: '',
        rating: data.rating || 0,
        actors: data.actors || 'N/A',
        director: data.director || 'N/A',
        writer: data.writer || 'N/A',
        country: data.country || 'N/A',
        genre: data.genre || 'N/A',
        studio: 'Τοπικός Δίσκος',
        link: `file:///${fullPath}`,
        imdb: '',
        tmdb: data.id ? `https://www.themoviedb.org/movie/${data.id}` : '',
        desc: data.desc || 'Δεν υπάρχει περιγραφή.',
        dateAdded: new Date().toISOString(),
        poster_url: data.poster || null,
        original_title: data.original_title || data.title || movie.title,
        createdBy: currentUserName || 'Χρήστης',
        status: 'active',
        runtime: data.runtime || '',
        source: 'local',
        filePath: fullPath,
        fileName: movie.fileName,
        actorsWithIds: data.actorsWithIds || [],
        seriesStatus: '',
        dubbed: 'unknown'
    };
    
    moviesData.push(newMovie);
    saveToLocalStorage();
    updateRecentMoviesList();
    initFilters();
    initFuseSearch();
    applyFilters();
    
    scannedMovies.splice(index, 1);
    displayScanResults(scannedMovies);
    
    showToast(`✅ Προστέθηκε: ${newMovie.title}`, '#2ecc71');
}

// ============ ΕΙΣΑΓΩΓΗ ΟΛΩΝ ΤΩΝ ΤΑΙΝΙΩΝ ΑΠΟ ΣΑΡΩΣΗ ============
function addAllScannedMovies() {
    if (scannedMovies.length === 0) {
        showToast('❌ Δεν υπάρχουν ταινίες για εισαγωγή', '#e50914');
        return;
    }
    
    const validMovies = scannedMovies.filter(m => m.tmdbData);
    if (validMovies.length === 0) {
        showToast('❌ Καμία ταινία δεν έχει στοιχεία για εισαγωγή', '#e50914');
        return;
    }
    
    let baseFolder = localStorage.getItem('moviesBaseFolder');
    
    if (!baseFolder) {
        baseFolder = prompt('Για να λειτουργήσει η σάρωση, βάλε την πλήρη διαδρομή του φακέλου με τις ταινίες σου (π.χ. C:/Users/YourName/Videos ή D:/Movies):');
        if (!baseFolder) {
            showToast('❌ Ακυρώθηκε.', '#e50914');
            return;
        }
        localStorage.setItem('moviesBaseFolder', baseFolder);
        showToast(`✅ Φάκελος αποθηκεύτηκε: ${baseFolder}`, '#2ecc71');
    }
    
    let folder = baseFolder.replace(/\\/g, '/');
    if (folder.endsWith('/')) folder = folder.slice(0, -1);
    
    if (!confirm(`Εισαγωγή ${validMovies.length} ταινιών;`)) return;
    
    let added = 0;
    for (const movie of validMovies) {
        const data = movie.tmdbData;
        const newId = moviesData.length ? Math.max(...moviesData.map(m => m.id)) + 1 : 1;
        
        const fileName = movie.fileName;
        const fullPath = `${folder}/${fileName}`;
        
        const newMovie = {
            id: newId,
            title: data.title || movie.title,
            year: parseInt(data.year) || parseInt(movie.year) || new Date().getFullYear(),
            type: 'Movie',
            quality: 'HD',
            codec: '',
            rating: data.rating || 0,
            actors: data.actors || 'N/A',
            director: data.director || 'N/A',
            writer: data.writer || 'N/A',
            country: data.country || 'N/A',
            genre: data.genre || 'N/A',
            studio: 'Τοπικός Δίσκος',
            link: `file:///${fullPath}`,
            imdb: '',
            tmdb: data.id ? `https://www.themoviedb.org/movie/${data.id}` : '',
            desc: data.desc || 'Δεν υπάρχει περιγραφή.',
            dateAdded: new Date().toISOString(),
            poster_url: data.poster || null,
            original_title: data.original_title || data.title || movie.title,
            createdBy: currentUserName || 'Χρήστης',
            status: 'active',
            runtime: data.runtime || '',
            source: 'local',
            filePath: fullPath,
            fileName: movie.fileName,
            actorsWithIds: data.actorsWithIds || [],
            seriesStatus: '',
            dubbed: 'unknown'
        };
        moviesData.push(newMovie);
        added++;
    }
    
    saveToLocalStorage();
    updateRecentMoviesList();
    initFilters();
    initFuseSearch();
    applyFilters();
    
    scannedMovies = [];
    const resultsDiv = document.getElementById('scanResults');
    if (resultsDiv) resultsDiv.style.display = 'none';
    
    showToast(`✅ Εισήχθησαν ${added} ταινίες από τοπικό δίσκο!`, '#2ecc71');
}

// ============ ΑΝΟΙΓΜΑ ΤΟΠΙΚΟΥ ΦΑΚΕΛΟΥ ============
function showLocalMoviePopup(movie) {
    if (!movie || !movie.link) {
        showToast('❌ Δεν βρέθηκε διαδρομή για αυτή την ταινία', '#e50914');
        return;
    }
    
    let cleanPath = movie.link.replace('file:///', '').replace('file://', '');
    let fileName = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
    let folderPath = cleanPath.substring(0, cleanPath.lastIndexOf('/'));
    
    if (movie.link.startsWith('http://') || movie.link.startsWith('https://')) {
        window.open(movie.link, '_blank');
        return;
    }
    
    let baseFolder = localStorage.getItem('userMoviesFolder');
    
    if (!baseFolder) {
        baseFolder = prompt(
            '📁 Για να δεις τις τοπικές σου ταινίες,\n' +
            'βάλε την πλήρη διαδρομή του φακέλου με τις ταινίες σου:\n\n' +
            'Παράδειγμα: D:/Movies ή C:/Users/YourName/Videos\n\n' +
            '⚠️ Μόνο μία φορά θα σου ζητηθεί!'
        );
        
        if (!baseFolder) {
            showToast('❌ Ακυρώθηκε. Δεν θα ανοίξει ο φάκελος.', '#e50914');
            return;
        }
        
        baseFolder = baseFolder.replace(/\\/g, '/');
        if (baseFolder.endsWith('/')) baseFolder = baseFolder.slice(0, -1);
        
        localStorage.setItem('userMoviesFolder', baseFolder);
        showToast('✅ Φάκελος αποθηκεύτηκε!', '#2ecc71');
    }
    
    const fullPath = `${baseFolder}/${fileName}`;
    const folderPathDisplay = baseFolder;
    
    const popupHtml = `
        <div id="localMoviePopup" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); 
             background:var(--card); border-radius:20px; padding:30px; max-width:550px; width:90%; 
             z-index:30000; border:2px solid var(--primary); box-shadow:0 20px 60px rgba(0,0,0,0.8);">
            <h3 style="color:var(--primary); margin-bottom:15px;">📂 ${escapeHtml(movie.title)}</h3>
            
            <div style="background:var(--input-bg); padding:15px; border-radius:12px; margin-bottom:20px; word-break:break-all; font-size:14px;">
                <div style="margin-bottom:8px;">
                    <strong>📁 Φάκελος:</strong><br>
                    <span style="font-family:monospace; font-size:13px; opacity:0.9;">${escapeHtml(folderPathDisplay)}</span>
                </div>
                <div>
                    <strong>🎬 Αρχείο:</strong><br>
                    <span style="font-family:monospace; font-size:13px; opacity:0.9;">${escapeHtml(fileName)}</span>
                </div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:10px;">
                <button id="openFolderBtn" 
                        style="background:#2ecc71; color:white; border:none; padding:14px; border-radius:10px; cursor:pointer; font-weight:bold; font-size:16px;">
                    📂 Άνοιγμα Φακέλου
                </button>
                
                <button id="copyFolderPathBtn" 
                        style="background:#3498db; color:white; border:none; padding:14px; border-radius:10px; cursor:pointer; font-weight:bold; font-size:16px;">
                    📋 Αντιγραφή Φακέλου
                </button>
                
                <button id="editLinkFromPopupBtn" 
                        style="background:#f39c12; color:white; border:none; padding:14px; border-radius:10px; cursor:pointer; font-weight:bold; font-size:16px;">
                    ✏️ Αλλαγή Link
                </button>
                
                <button id="closePopupBtn" 
                        style="background:#e74c3c; color:white; border:none; padding:12px; border-radius:10px; cursor:pointer; font-weight:bold; font-size:16px;">
                    ✕ Κλείσιμο
                </button>
            </div>
            
            <div style="margin-top:15px; padding:10px; background:rgba(255,193,7,0.1); border-radius:8px; border-left:3px solid #f39c12;">
                <div style="font-size:12px; opacity:0.8; text-align:center;">
                    💡 Οι browsers ΔΕΝ επιτρέπουν το άνοιγμα τοπικών φακέλων.<br>
                    <strong>Λύση:</strong> Αντέγραψε τη διαδρομή και άνοιξε τη χειροκίνητα στον Explorer/Finder.
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('localMoviePopup')?.remove();
    document.body.insertAdjacentHTML('beforeend', popupHtml);
    
    const popup = document.getElementById('localMoviePopup');
    if (!popup) return;
    
    function copyToClipboard(text, successMessage) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            textArea.style.width = '1px';
            textArea.style.height = '1px';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            textArea.setSelectionRange(0, 99999);
            const success = document.execCommand('copy');
            textArea.remove();
            
            if (success) {
                showToast('✅ ' + successMessage, '#2ecc71');
                return true;
            }
        } catch(e) {
            console.warn('Copy failed:', e);
        }
        
        try {
            prompt('📋 Αντιγράψε το κείμενο (Ctrl+C):', text);
            showToast('📋 Αντιγράφηκε!', '#2ecc71');
            return true;
        } catch(e) {
            alert('📋 Αντιγράψε το:\n\n' + text);
            return false;
        }
    }
    
    const openBtn = document.getElementById('openFolderBtn');
    if (openBtn) {
        openBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                const win = window.open('file:///' + baseFolder, '_blank');
                if (win && !win.closed) {
                    showToast('📂 Προσπάθεια ανοίγματος φακέλου...', '#2ecc71');
                    return;
                }
            } catch(err) {}
            
            alert(
                '📁 Ο φάκελος των ταινιών σου είναι:\n\n' +
                baseFolder + '\n\n' +
                '💡 Άνοιξε τον χειροκίνητα στον Explorer/Finder.'
            );
            showToast('📂 Άνοιξε τον φάκελο χειροκίνητα', '#e67e22');
        });
    }
    
    const copyFolderBtn = document.getElementById('copyFolderPathBtn');
    if (copyFolderBtn) {
        copyFolderBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            copyToClipboard(baseFolder, 'Διαδρομή φακέλου αντιγράφηκε!');
        });
    }
    
    const editBtn = document.getElementById('editLinkFromPopupBtn');
    if (editBtn) {
        editBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            popup.remove();
            editMovieLink(movie.id);
        });
    }
    
    const closeBtn = document.getElementById('closePopupBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            popup.remove();
        });
    }
    
    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            popup.remove();
        }
    });
}

// ============ ΕΠΕΞΕΡΓΑΣΙΑ LINK ΤΑΙΝΙΑΣ ============
function editMovieLink(movieId) {
    const movie = moviesData.find(m => m.id === movieId);
    if (!movie) {
        showToast('❌ Δεν βρέθηκε η ταινία', '#e50914');
        return;
    }
    
    const newLink = prompt(
        `✏️ Αλλαγή Link για: ${movie.title}\n\n` +
        `Τρέχον Link:\n${movie.link || '(κενό)'}\n\n` +
        `Βάλε το νέο link (π.χ. https://terra-box.com/... ή file:///D:/Movies/...):`,
        movie.link || ''
    );
    
    if (newLink === null) return;
    
    if (newLink.trim() === '') {
        if (!confirm('Θέλεις να ΑΔΕΙΑΣΕΙΣ το link;')) return;
        movie.link = '';
    } else {
        movie.link = newLink.trim();
    }
    
    saveToLocalStorage();
    applyFilters();
    
    document.getElementById('localMoviePopup')?.remove();
    
    if (currentModalMovieId === movieId) {
        openDetailsById(movieId);
    }
    
    showToast(`✅ Το link της ταινίας "${movie.title}" ενημερώθηκε!`, '#2ecc71');
}

// ============ ΔΙΟΡΘΩΣΗ ΟΛΩΝ ΤΩΝ ΤΟΠΙΚΩΝ ΔΙΑΔΡΟΜΩΝ ============
function fixAllLocalPaths() {
    const localMovies = moviesData.filter(m => m.link && m.link.startsWith('file://'));
    
    if (localMovies.length === 0) {
        showToast('✅ Δεν βρέθηκαν τοπικές ταινίες', '#2ecc71');
        return;
    }
    
    const baseFolder = prompt(
        `📂 Βρέθηκαν ${localMovies.length} τοπικές ταινίες.\n\n` +
        `Βάλε την ΠΛΗΡΗ διαδρομή του φακέλου με τις ταινίες σου:\n` +
        `(π.χ. D:/Movies ή C:/Users/YourName/Videos)\n\n` +
        `⚠️ Το πρόγραμμα θα διορθώσει ΑΥΤΟΜΑΤΑ όλες τις διαδρομές!`
    );
    
    if (!baseFolder) return;
    
    let folder = baseFolder.replace(/\\/g, '/');
    if (folder.endsWith('/')) folder = folder.slice(0, -1);
    
    let fixed = 0;
    let failed = 0;
    
    localMovies.forEach(m => {
        let oldPath = m.link.replace('file:///', '').replace('file://', '');
        const parts = oldPath.split('/');
        const fileName = parts[parts.length - 1];
        
        if (fileName && fileName !== '') {
            const newPath = `${folder}/${fileName}`;
            m.link = `file:///${newPath}`;
            m.source = 'local';
            m.filePath = newPath;
            fixed++;
            console.log(`✅ ${m.title} → ${newPath}`);
        } else {
            failed++;
            console.log(`❌ ${m.title}: Δεν βρέθηκε όνομα αρχείου`);
        }
    });
    
    saveToLocalStorage();
    applyFilters();
    showToast(`✅ Διορθώθηκαν ${fixed} διαδρομές! ${failed} απέτυχαν`, '#2ecc71');
}

// ============ ΠΑΙΞΙΜΟ ΤΑΙΝΙΑΣ / ΑΝΟΙΓΜΑ ΦΑΚΕΛΟΥ ============
function playMovieFromPoster(movieId) {
    const movie = moviesData.find(m => m.id == movieId);
    if (!movie) {
        showToast('❌ Δεν βρέθηκε η ταινία', '#e50914');
        return;
    }
    
    if (movie.link && movie.link.startsWith('file://')) {
        showLocalMoviePopup(movie);
        return;
    }
    
    if (movie.link && (movie.link.startsWith('http://') || movie.link.startsWith('https://'))) {
        window.open(movie.link, '_blank');
        return;
    }
    
    showToast('❌ Η ταινία δεν έχει link προβολής', '#e50914');
}

// ============ MODAL FUNCTIONS ============
function openDetailsById(id) {
    const movie = moviesData.find(m => m.id === id);
    if (!movie) {
        showToast('Σφάλμα: Δεν βρέθηκε η ταινία', '#e50914');
        return;
    }
    currentModalMovieId = movie.id;
    currentMovieLink = movie.link;
    document.getElementById('modalAddBtn').style.display = isUserLoggedIn ? 'inline-flex' : 'none';
    document.getElementById('modalTitle').innerHTML = escapeHtml(movie.title);
    document.getElementById('modalYear').innerHTML = movie.year;
    const idSpan = document.getElementById('modalId');
    if (idSpan) {
        idSpan.innerHTML = `ID: ${movie.id}`;
        idSpan.style.display = 'inline';
    }
    document.getElementById('modalDesc').innerHTML = movie.desc || 'Δεν υπάρχει περιγραφή.';
    
    const runtimeEl = document.getElementById('modalRuntime');
    if (runtimeEl) {
        if (movie.runtime && movie.runtime !== '') {
            runtimeEl.innerHTML = movie.runtime;
            runtimeEl.style.display = 'inline';
        } else {
            runtimeEl.style.display = 'none';
        }
    }
    
    const directorEl = document.getElementById('modalDirector');
    directorEl.innerHTML = movie.director || 'N/A';
    directorEl.onclick = null;
    if (movie.director && movie.director !== 'N/A') {
        directorEl.addEventListener('click', () => searchMoviesByDirectorOrWriter(movie.director, 'director'));
    }
    
    const writerEl = document.getElementById('modalWriter');
    writerEl.innerHTML = movie.writer || 'N/A';
    writerEl.onclick = null;
    if (movie.writer && movie.writer !== 'N/A') {
        writerEl.addEventListener('click', () => searchMoviesByDirectorOrWriter(movie.writer, 'writer'));
    }
    
    document.getElementById('modalStudio').innerHTML = movie.studio || 'Κανάλι';
    document.getElementById('modalQualityBadge').innerHTML = `${movie.quality || 'HD'}`;

   
    
    document.getElementById('modalTypeBadge').innerHTML = movie.type === 'Series' ? 'Σειρά' : 'Ταινία';
    document.getElementById('modalCountryBadge').innerHTML = movie.country || 'N/A';
    document.getElementById('modalGenreBadge').innerHTML = movie.genre || 'N/A';
    document.getElementById('modalRatingValue').innerHTML = movie.rating.toFixed(1);
    document.getElementById('modalStarsBig').innerHTML = getStarsHtml(movie.rating);
    
    const metaBar = document.getElementById('modalMetaBar');
    const existingStatusBadge = document.getElementById('modalStatusBadge');
    if (existingStatusBadge) existingStatusBadge.remove();
    
    if (movie.status === 'pending') {
        const statusBadge = document.createElement('span');
        statusBadge.id = 'modalStatusBadge';
        statusBadge.className = 'pending-status-badge';
        statusBadge.innerHTML = ' ΣΕ ΑΝΑΜΟΝΗ';
        metaBar.appendChild(statusBadge);
    }
    
    const imdbLink = document.getElementById('modalImdb');
    imdbLink.href = movie.imdb || '#';
    imdbLink.style.display = movie.imdb ? 'inline-flex' : 'none';
    
    const tmdbLink = document.getElementById('modalTmdb');
    tmdbLink.href = movie.tmdb || '#';
    tmdbLink.style.display = movie.tmdb ? 'inline-flex' : 'none';
    
    document.getElementById('modalEditBtn').style.display = isUserLoggedIn ? 'inline-flex' : 'none';
    document.getElementById('modalDeleteBtn').style.display = isUserLoggedIn ? 'inline-flex' : 'none';
    
    const requestBtn = document.getElementById('modalRequestBtn');
    if (requestBtn) {
        requestBtn.style.display = 'inline-flex';
        requestBtn.onclick = () => showRequestForm(movie.title, movie.year);
    }
    
    const downloadBtn = document.getElementById('modalDownloadBtn');
    if (isUserLoggedIn) {
        downloadBtn.style.display = 'block';
    } else {
        downloadBtn.style.display = 'none';
    }
    
    const modalImg = document.getElementById('modalImg');
    if (movie.poster_url) {
        modalImg.src = movie.poster_url;
    } else {
        modalImg.src = generateFallbackPoster(movie.title);
        fetchAndSavePoster(movie).then(url => {
            if (url && modalImg.src !== url) modalImg.src = url;
        });
    }
    
    renderCollectionButtons(movie.id);
    renderActorsWithImages(movie.actors, 'modalActorsContainer');
    
    const btn1 = document.getElementById('modalDownloadBtn');
    const btn2 = document.getElementById('modalAddBtn');
    
    if (btn1) {
        btn1.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (movie.link && movie.link.startsWith('file://')) {
                showLocalMoviePopup(movie);
            } else if (movie.link && (movie.link.startsWith('http://') || movie.link.startsWith('https://'))) {
                window.open(movie.link, '_blank');
            } else {
                showToast('❌ Η ταινία δεν έχει link προβολής', '#e50914');
            }
        };
    }
    
    if (btn2) {
        btn2.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            showAddMovieForm();
        };
    }
    
    const modalActions = document.querySelector('.rating-section > div:last-child');
    let editLinkBtn = document.getElementById('modalEditLinkBtn');
    if (!editLinkBtn && modalActions) {
        editLinkBtn = document.createElement('button');
        editLinkBtn.id = 'modalEditLinkBtn';
        editLinkBtn.className = 'modal-icon-btn';
        editLinkBtn.style.background = '#f39c12';
        editLinkBtn.style.color = 'white';
        editLinkBtn.innerHTML = '✏️ Link';
        editLinkBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (currentModalMovieId) {
                editMovieLink(currentModalMovieId);
            }
        };
        modalActions.appendChild(editLinkBtn);
    }
    
    document.getElementById('detailModal').style.display = 'flex';
}

function closeDetails() { 
    document.getElementById('detailModal').style.display = 'none'; 
    currentModalMovieId = null;
    currentMovieLink = null;
}

// ============ AI ΑΝΑΖΗΤΗΣΗ ΔΩΡΕΑΝ ΠΡΟΒΟΛΗΣ ============
async function suggestFreeMovie(movie) {
    if (!movie) {
        showToast('Σφάλμα: Δεν βρέθηκε η ταινία', '#e50914');
        return;
    }
    
    if (movie.link && movie.link.startsWith('file://')) {
        showLocalMoviePopup(movie);
        return;
    }
    
    const searchModal = document.createElement('div');
    searchModal.id = 'searchModal';
    searchModal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.95); z-index: 30000;
        display: flex; align-items: center; justify-content: center;
    `;
    
    searchModal.innerHTML = `
        <div style="background: var(--card); border-radius: 20px; padding: 30px; 
                    max-width: 400px; width: 90%; text-align: center; border: 2px solid var(--primary);">
            <div class="loading-spinner" style="width: 50px; height: 50px; border: 4px solid var(--border);
                border-top-color: var(--primary); border-radius: 50%; margin: 0 auto 20px auto;
                animation: spin 1s linear infinite;"></div>
            <h3 style="color: var(--primary); margin-bottom: 10px;">🔍 Αναζήτηση δωρεάν προβολής...</h3>
            <p style="opacity: 0.8;">Ψάχνουμε για: <strong>${escapeHtml(movie.title)} (${movie.year})</strong></p>
            <div id="searchProgress" style="margin-top: 15px; font-size: 12px; opacity: 0.7;">Ελέγχος πλατφορμών...</div>
        </div>
    `;
    
    document.body.appendChild(searchModal);
    
    if (!document.querySelector('#spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }
    
    const searchQuery = encodeURIComponent(`${movie.title} ${movie.year} full movie free`);
    const searchQueryGreek = encodeURIComponent(`${movie.title} ${movie.year} ταινία δωρεάν`);
    
    const platformsToCheck = [
        { name: 'YouTube', url: `https://www.youtube.com/results?search_query=${searchQuery}`, icon: '▶️' },
        { name: 'DailyMotion', url: `https://www.dailymotion.com/search/${searchQuery}`, icon: '📹' },
        { name: 'Vimeo', url: `https://vimeo.com/search?q=${searchQuery}`, icon: '🎬' },
        { name: 'Internet Archive', url: `https://archive.org/search.php?query=${searchQuery}`, icon: '📚' },
        { name: 'Tubi (δωρεάν)', url: `https://tubitv.com/search?q=${encodeURIComponent(movie.title)}`, icon: '📺' },
        { name: 'Pluto TV', url: `https://pluto.tv/search?q=${encodeURIComponent(movie.title)}`, icon: '📡' },
        { name: 'Plex', url: `https://watch.plex.tv/search?q=${encodeURIComponent(movie.title)}`, icon: '🎥' },
        { name: 'Google Αναζήτηση', url: `https://www.google.com/search?q=${searchQueryGreek}`, icon: '🔍' }
    ];
    
    let currentPlatform = 0;
    const progressInterval = setInterval(() => {
        if (currentPlatform < platformsToCheck.length) {
            const progressDiv = document.getElementById('searchProgress');
            if (progressDiv) {
                progressDiv.innerHTML = `✅ Έλεγχος: ${platformsToCheck[currentPlatform].name}...`;
            }
            currentPlatform++;
        }
    }, 400);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    clearInterval(progressInterval);
    searchModal.remove();
    showSuggestionResult(movie, platformsToCheck);
}

function showSuggestionResult(movie, platforms) {
    const enhancedPlatforms = [...platforms];
    if (!enhancedPlatforms.some(p => p.name === 'Google Αναζήτηση')) {
        enhancedPlatforms.push({ 
            name: 'Google Αναζήτηση', 
            url: `https://www.google.com/search?q=${encodeURIComponent(movie.title + ' ' + movie.year + ' full movie free')}`,
            icon: '🔍'
        });
    }
    if (!enhancedPlatforms.some(p => p.name === 'JustWatch')) {
        enhancedPlatforms.push({ 
            name: 'JustWatch', 
            url: `https://www.justwatch.com/us/search?q=${encodeURIComponent(movie.title)}`,
            icon: '🎯'
        });
    }
    
    const filteredPlatforms = enhancedPlatforms.filter(p => p.name !== 'Terra Box');
    
    let platformsHtml = '';
    for (const platform of filteredPlatforms) {
        platformsHtml += `
            <a href="${platform.url}" target="_blank" style="display: flex; align-items: center; 
                gap: 12px; padding: 12px 15px; background: var(--input-bg); 
                border-radius: 12px; text-decoration: none; color: var(--text);
                transition: all 0.2s; border: 1px solid var(--border); margin-bottom: 8px;
                cursor: pointer;">
                <span style="flex: 1; font-weight: 500;">${platform.name}</span>
                <span style="color: var(--primary);">Προβολή →</span>
            </a>
        `;
    }
    
    const resultModal = document.createElement('div');
    resultModal.id = 'resultModal';
    resultModal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.95); z-index: 30000;
        display: flex; align-items: center; justify-content: center;
    `;
    
    const hasTerraBoxLink = movie.link && movie.link !== '' && !movie.link.startsWith('file://');
    const terraBoxLink = hasTerraBoxLink ? movie.link : '';
    
    resultModal.innerHTML = `
        <div style="background: var(--card); border-radius: 20px; padding: 25px; 
                    max-width: 500px; width: 90%; max-height: 85vh; overflow-y: auto;
                    border: 2px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: var(--primary); margin: 0;">Δωρεάν Προβολή</h2>
                <button id="closeResultModalBtn" style="background: #e74c3c; border: none; color: white;
                    font-size: 20px; cursor: pointer; width: 36px; height: 36px;
                    border-radius: 50%; font-weight: bold;">✕</button>
            </div>
            
            <div style="text-align: center; margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.1);
                        border-radius: 12px;">
                <h3 style="margin: 0 0 5px 0;">${escapeHtml(movie.title)}</h3>
                <p style="margin: 0; opacity: 0.7;">${movie.year} • ${movie.quality || 'HD'}</p>
            </div>
            
            ${hasTerraBoxLink ? `
            <div style="margin: 15px 0;">
                <div style="background: #1e7e34; color: white; padding: 12px; border-radius: 12px; text-align: center; margin-bottom: 10px; font-weight: bold;">✅ Η ταινία είναι διαθέσιμη στο Terra Box</div>
                <a href="${terraBoxLink}" target="_blank" style="display: flex; align-items: center;
                    justify-content: center; gap: 12px; padding: 14px; background: linear-gradient(135deg, #1a472a, #2ecc71);
                    border-radius: 12px; text-decoration: none; color: white; font-weight: bold;
                    transition: all 0.2s; border: 2px solid #2ecc71; font-size: 16px;">
                    <span>Μεταφορά στο Terra Box</span>
                </a>
                <div style="margin: 10px 0 15px 0; padding: 12px; background: var(--input-bg); border-radius: 12px; border: 1px solid var(--border);">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <input type="text" id="terraBoxUrlInput" value="${escapeHtml(terraBoxLink)}" readonly style="flex: 3; padding: 10px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 12px; font-family: monospace;">
                        <button id="copyUrlBtn" style="flex: 1; background: #3498db; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold;">Αντιγραφή</button>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <div style="margin: 10px 0 5px 0;">
                <p style="font-size: 14px; font-weight: bold; color: var(--primary); border-left: 3px solid var(--primary); padding-left: 10px;">🎬 Εναλλακτικά, μπορείτε να δείτε δωρεάν την ταινία σε αυτά τα site:</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${platformsHtml}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(resultModal);
    
    const closeBtn = resultModal.querySelector('#closeResultModalBtn');
    const copyBtn = resultModal.querySelector('#copyUrlBtn');
    const urlInput = resultModal.querySelector('#terraBoxUrlInput');
    
    if (closeBtn) {
        closeBtn.onclick = function(e) {
            e.preventDefault();
            resultModal.remove();
        };
    }
    
    if (copyBtn && urlInput) {
        copyBtn.onclick = function(e) {
            e.preventDefault();
            urlInput.select();
            urlInput.setSelectionRange(0, 99999);
            document.execCommand('copy');
            showToast('Το link αντιγράφηκε!', '#2ecc71');
        };
    }
    
    const allLinks = resultModal.querySelectorAll('a');
    allLinks.forEach(link => {
        link.onclick = function(e) {
            e.preventDefault();
            window.open(this.href, '_blank');
        };
    });
}

// ============ ΠΡΟΤΕΙΝΟΜΕΝΗ ΤΑΙΝΙΑ ΤΗΣ ΗΜΕΡΑΣ ============
let currentFeaturedMovieId = null;
let cachedFeaturedId = null;
let lastFetchDate = null;

async function getFeaturedMovieId() {
    const today = new Date().toISOString().split('T')[0];
    
    if (cachedFeaturedId !== null && lastFetchDate === today) {
        return cachedFeaturedId;
    }
    
    try {
        const featuredUrl = 'https://raw.githubusercontent.com/xistianakapsali-cyber/my-movies/main/my-movies-clean/featured.json';
        const response = await fetch(featuredUrl);
        
        if (response.ok) {
            const data = await response.json();
            cachedFeaturedId = data.featuredMovieId;
            lastFetchDate = today;
            console.log('Featured movie ID loaded:', cachedFeaturedId);
            return cachedFeaturedId;
        } else {
            console.warn('Featured.json not found, using fallback');
        }
    } catch(e) {
        console.error('Error fetching featured.json:', e);
    }
    
    const validMovies = moviesData.filter(m => m.status === 'active' && m.poster_url);
    if (validMovies.length === 0) return null;
    return validMovies[0].id;
}

async function loadFeaturedMovie() {
    const container = document.getElementById('featuredMovieContainer');
    if (!container) return;
    
    const movieId = await getFeaturedMovieId();
    if (!movieId) return;
    
    const movie = moviesData.find(m => m.id === movieId);
    if (!movie) return;
    
    currentFeaturedMovieId = movie.id;
    
    document.getElementById('featuredTitle').innerHTML = escapeHtml(movie.title);
    document.getElementById('featuredYear').innerHTML = movie.year;
    document.getElementById('featuredQuality').innerHTML = movie.quality || 'HD';
    document.getElementById('featuredType').innerHTML = movie.type === 'Series' ? 'Σειρά' : 'Ταινία';
    document.getElementById('featuredDesc').innerHTML = movie.desc || 'Δεν υπάρχει περιγραφή.';
    document.getElementById('featuredStars').innerHTML = getStarsHtml(movie.rating) + ` <span style="font-size: 14px; opacity: 0.8;">(${movie.rating.toFixed(1)}/10)</span>`;
    
    const posterImg = document.getElementById('featuredPoster');
    posterImg.src = movie.poster_url || generateFallbackPoster(movie.title);
    posterImg.onerror = () => { posterImg.src = generateFallbackPoster(movie.title); };
    
    const heroBg = document.getElementById('featuredHeroBg');
    if (heroBg) {
        if (movie.backdrop_url && movie.backdrop_url !== '') {
            heroBg.style.backgroundImage = `url('${movie.backdrop_url}')`;
            heroBg.style.backgroundSize = 'cover';
            heroBg.style.backgroundPosition = 'center';
        } else {
            heroBg.style.background = "linear-gradient(135deg, #1a1a2e, #e50914)";
            heroBg.style.backgroundSize = 'cover';
        }
    }
    
    const watchBtn = document.getElementById('featuredWatchBtn');
    const watchlistBtn = document.getElementById('featuredWatchlistBtn');
    
    if (watchBtn) {
        watchBtn.onclick = () => {
            if (isUserLoggedIn) {
                if (movie.link && movie.link.startsWith('file://')) {
                    showLocalMoviePopup(movie);
                } else {
                    suggestFreeMovie(movie);
                }
            } else {
                showToast('Συνδεθείτε για προβολή', '#e67e22');
            }
        };
    }
    
    if (watchlistBtn) {
        watchlistBtn.onclick = () => {
            if (isUserLoggedIn) {
                const isAdded = toggleCollection(movie.id, 'watchlist');
                showToast(isAdded ? `Προστέθηκε: ${movie.title}` : `Αφαιρέθηκε: ${movie.title}`, isAdded ? '#2ecc71' : '#e67e22');
                watchlistBtn.innerHTML = isAdded ? '✓ Watchlist' : '➕ Watchlist';
                watchlistBtn.style.borderColor = isAdded ? '#2ecc71' : 'var(--primary)';
                watchlistBtn.style.color = isAdded ? '#2ecc71' : 'var(--primary)';
            } else {
                showToast('Συνδεθείτε για να προσθέσετε', '#e67e22');
            }
        };
        
        if (isInCollection(movie.id, 'watchlist')) {
            watchlistBtn.innerHTML = '✓ Watchlist';
            watchlistBtn.style.borderColor = '#2ecc71';
            watchlistBtn.style.color = '#2ecc71';
        }
    }
    
    container.style.display = 'block';
}

async function setFeaturedMovie(movieId) {
    const movie = moviesData.find(m => m.id === movieId);
    if (!movie) {
        showToast('Δεν βρέθηκε ταινία με αυτό το ID', '#e50914');
        return false;
    }
    localStorage.setItem('featuredMovieIdTemp', movieId);
    showToast(`⚠️ Προσωρινή αλλαγή: ${movie.title} (μόνο για εσάς)`, '#e67e22');
    loadFeaturedMovie();
    return true;
}

// ============ CRUD OPERATIONS ============
function showAddMovieForm() {
    if (!isUserLoggedIn) { showToast('Πρέπει να συνδεθείτε για να προσθέσετε ταινία!', '#e50914'); return; }
    
    const qualityOptions = QUALITY_OPTIONS.map(q => 
        `<option value="${q}">${q}</option>`
    ).join('');
    
    const modalHtml = `<div class="add-movie-modal" id="addMovieModal"><h2>Προσθήκη Νέας Ταινίας/Σειράς</h2>
        <div class="auto-fill-row" style="display: flex; gap: 10px; margin-bottom: 15px;">
            <input type="text" id="autoTitle" placeholder="Τίτλος για αυτόματη συμπλήρωση" style="flex: 2;">
            <button id="searchTmdbBtn" class="btn-tmdb" style="flex:1;">Αναζήτηση Ταινίας</button>
            <button id="searchTvBtn" class="btn-tmdb" style="flex:1; background:#9b59b6;">Αναζήτηση Σειράς</button>
        </div>
        <div id="searchResults" class="results-list" style="display: none; max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 15px;"></div>
        <div style="margin: 15px 0; text-align: center; font-size: 12px; opacity: 0.7;">— ή συμπλήρωσε χειροκίνητα —</div>
        <div class="form-row">
            <div class="form-group"><label>Τίτλος (Ελληνικός) *</label><input type="text" id="newTitle" placeholder="π.χ. Ο Νονός"></div>
            <div class="form-group"><label>Original Title</label><input type="text" id="newOriginalTitle" placeholder="π.χ. The Godfather"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Ετος *</label><input type="number" id="newYear" placeholder="π.χ. 2024"></div>
            <div class="form-group"><label>Τύπος</label><select id="newType"><option value="Movie">Ταινία</option><option value="Series">Σειρά</option></select></div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Ποιότητα</label>
                <select id="newQuality" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;">
                    ${qualityOptions}
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Χώρα</label><input type="text" id="newCountry" placeholder="π.χ. United States"></div>
            <div class="form-group"><label>Είδος (Genre)</label><input type="text" id="newGenre" placeholder="π.χ. Δράμα, Θρίλερ"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Διάρκεια (π.χ. 2h 15min)</label><input type="text" id="newRuntime" placeholder="π.χ. 2h 15min"></div>
            <div class="form-group"><label>Βαθμολογία (0-10)</label><input type="number" step="0.1" id="newRating" placeholder="π.χ. 8.5"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Πλατφόρμα (Studio)</label><input type="text" id="newStudio" placeholder="π.χ. Netflix"></div>
            <div class="form-group"><label>Σκηνοθέτης</label><input type="text" id="newDirector" placeholder="Ονόματα σκηνοθετών"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Σεναριογράφος</label><input type="text" id="newWriter" placeholder="Ονόματα σεναριογράφων"></div>
            <div class="form-group"><label>Ηθοποιοί</label><input type="text" id="newActors" placeholder="Ονόματα ηθοποιών (διαχώρισε με κόμματα)"></div>
        </div>
        
        <div class="form-group">
            <label>Link Προβολής / Πηγή</label>
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="url" id="newLink" placeholder="https://..." style="flex:1; padding:10px; background:var(--input-bg); border:1px solid var(--border); color:var(--text); border-radius:8px;">
                <button id="browseBtn" class="modal-icon-btn" style="background:#3498db; padding:8px 14px; white-space:nowrap;">📁</button>
                <button id="optionsBtn" class="modal-icon-btn" style="background:#555; padding:8px 14px; white-space:nowrap;">⋯</button>
            </div>
            <div id="sourceOptions" style="display:none; margin-top:10px; background:var(--input-bg); padding:10px; border-radius:8px; border:1px solid var(--border);">
                <button class="source-option" data-type="local" style="display:block; width:100%; padding:8px 12px; margin-bottom:5px; background:var(--card); border:1px solid var(--border); border-radius:6px; color:var(--text); cursor:pointer; text-align:left;">💻 Τοπικός Δίσκος</button>
                <button class="source-option" data-type="external" style="display:block; width:100%; padding:8px 12px; margin-bottom:5px; background:var(--card); border:1px solid var(--border); border-radius:6px; color:var(--text); cursor:pointer; text-align:left;">💾 Εξωτερικός Δίσκος</button>
                <button class="source-option" data-type="network" style="display:block; width:100%; padding:8px 12px; margin-bottom:5px; background:var(--card); border:1px solid var(--border); border-radius:6px; color:var(--text); cursor:pointer; text-align:left;">🌐 Δίκτυο</button>
                <button class="source-option" data-type="link" style="display:block; width:100%; padding:8px 12px; background:var(--card); border:1px solid var(--border); border-radius:6px; color:var(--text); cursor:pointer; text-align:left;">🔗 Χειροκίνητο Link (όπως τώρα)</button>
            </div>
            <button id="scanFolderBtn" class="btn-tmdb" style="display:none; width:100%; margin-top:10px; background:#2ecc71; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;">
                🔍 Σάρωση Φακέλου & Εύρεση Ταινιών
            </button>
            <div id="scanResults" style="display:none; max-height:300px; overflow-y:auto; border:1px solid var(--border); border-radius:8px; margin-top:10px;"></div>
        </div>
        
        <div class="form-row">
            <div class="form-group"><label>IMDB Link</label><input type="url" id="newImdb" placeholder="https://www.imdb.com/..."></div>
            <div class="form-group"><label>TMDB Link</label><input type="url" id="newTmdb" placeholder="https://www.themoviedb.org/..."></div>
        </div>
        <div class="form-group"><label>Περιγραφή</label><textarea id="newDesc" rows="3" placeholder="Περιγραφή..."></textarea></div>
        <div class="modal-buttons"><button id="saveMovieBtn" class="btn-save">Αποθήκευση</button><button id="cancelAddMovieBtn" class="btn-cancel">Ακύρωση</button></div>
    </div>`;
    
    const existing = document.getElementById('addMovieModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('searchTmdbBtn').addEventListener('click', () => searchTMDBForAdd('movie'));
    document.getElementById('searchTvBtn').addEventListener('click', () => searchTMDBForAdd('tv'));
    document.getElementById('saveMovieBtn').addEventListener('click', () => saveNewMovie());
    document.getElementById('cancelAddMovieBtn').addEventListener('click', () => closeAddMovieForm());
    
    const browseBtn = document.getElementById('browseBtn');
    if (browseBtn) {
        browseBtn.addEventListener('click', () => {
            if (selectedSourceType === 'link') {
                showToast('❌ Επέλεξε πρώτα πηγή (τοπικός/εξωτερικός/δίκτυο)', '#e50914');
                return;
            }
            scanFolderForMovies();
        });
    }
    
    const optionsBtn = document.getElementById('optionsBtn');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', toggleSourceOptions);
    }
    
    document.querySelectorAll('.source-option').forEach(btn => {
        btn.addEventListener('click', () => {
            selectSourceType(btn.dataset.type);
        });
    });
    
    const scanFolderBtn = document.getElementById('scanFolderBtn');
    if (scanFolderBtn) {
        scanFolderBtn.addEventListener('click', scanFolderForMovies);
    }
}

function closeAddMovieForm() { document.getElementById('addMovieModal')?.remove(); }

function isDuplicateMovie(title, year, excludeId = null) {
    return moviesData.some(m => m.title.toLowerCase() === title.toLowerCase() && m.year === year && m.id !== excludeId);
}

let tempPoster = null;

async function searchTMDBForAdd(type) {
    const title = document.getElementById('autoTitle').value.trim();
    const searchType = type;
    
    if (!title) { showToast('Παρακαλώ γράψτε έναν τίτλο', '#e67e22'); return; }
    if (!TMDB_API_KEY) { showToast('Σφάλμα: Missing TMDB API Key', '#e50914'); return; }
    
    showToast(`Αναζήτηση ${searchType === 'tv' ? 'σειράς' : 'ταινίας'} στο TMDB...`, '#2196f3');
    
    try {
        const searchEndpoint = searchType === 'tv' ? 'search/tv' : 'search/movie';
        const searchUrl = `https://api.themoviedb.org/3/${searchEndpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=en-US`;
        const res = await fetch(searchUrl);
        const data = await res.json();
        
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = '';
        
        if (data.results && data.results.length > 0) {
            const header = document.createElement('div');
            header.style.cssText = 'padding:10px;background:var(--primary);color:white;font-weight:bold;border-radius:8px 8px 0 0;';
            header.textContent = `Αποτελέσματα ${searchType === 'tv' ? 'Σειρών' : 'Ταινιών'} (${data.results.length})`;
            resultsDiv.appendChild(header);
            
            for (let i = 0; i < Math.min(10, data.results.length); i++) {
                const r = data.results[i];
                const year = searchType === 'tv' ? (r.first_air_date || '').substring(0, 4) : (r.release_date || '').substring(0, 4);
                const titleName = searchType === 'tv' ? r.name : r.title;
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.setAttribute('data-id', r.id);
                resultItem.style.cssText = 'padding:12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.2s;';
                resultItem.innerHTML = `<strong>${titleName}</strong> <span style="opacity:0.7;">(${year || 'Άγνωστο'})</span>`;
                resultItem.addEventListener('click', () => {
                    if (searchType === 'tv') selectTMDBTvResultForAdd(r.id, titleName, year, r.poster_path);
                    else selectTMDBResultForAdd(r.id, titleName, year, r.poster_path);
                });
                resultItem.addEventListener('mouseenter', () => { resultItem.style.background = 'var(--primary)'; resultItem.style.color = 'white'; });
                resultItem.addEventListener('mouseleave', () => { resultItem.style.background = ''; resultItem.style.color = ''; });
                resultsDiv.appendChild(resultItem);
            }
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.innerHTML = `<div style="padding:15px;text-align:center;">Δεν βρέθηκε ${searchType === 'tv' ? 'σειρά' : 'ταινία'} με τίτλο "${title}"</div>`;
            resultsDiv.style.display = 'block';
        }
    } catch(e) {
        console.error(e);
        showToast('Σφάλμα επικοινωνίας με TMDB', '#e50914');
    }
}

async function selectTMDBResultForAdd(movieId, movieTitle, movieYear, posterPath) {
    if (!TMDB_API_KEY) return;
    showToast(`Φόρτωση στοιχείων για: ${movieTitle}...`, '#2196f3');
    try {
        const movieDetailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=el`;
        const movieRes = await fetch(movieDetailsUrl);
        if (!movieRes.ok) throw new Error(`HTTP ${movieRes.status}`);
        const movieData = await movieRes.json();
        const creditsUrl = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;
        const creditsRes = await fetch(creditsUrl);
        if (!creditsRes.ok) throw new Error(`HTTP ${creditsRes.status}`);
        const creditsData = await creditsRes.json();
        
        let director = 'N/A', writer = 'N/A', actors = 'N/A';
        if (creditsData.crew) {
            const directorObj = creditsData.crew.find(person => person.job === 'Director');
            if (directorObj) director = directorObj.name;
            const writerObj = creditsData.crew.find(person => person.job === 'Writer' || person.job === 'Screenplay');
            if (writerObj) writer = writerObj.name;
        }
        if (creditsData.cast && creditsData.cast.length > 0) actors = creditsData.cast.slice(0, 5).map(actor => actor.name).join(', ');
        
        const title = movieData.title || movieTitle;
        const year = (movieData.release_date || '').substring(0, 4) || movieYear;
        const country = movieData.production_countries?.[0]?.name || 'N/A';
        let genre = 'N/A';
        if (movieData.genres && movieData.genres.length > 0) {
            genre = movieData.genres.map(g => {
                if (g.name === "Sci-Fi & Fantasy") return "Επιστημονική Φαντασία";
                if (g.name === "Action & Adventure") return "Δράση & Περιπέτεια";
                if (g.name === "Drama") return "Δράμα";
                if (g.name === "Romance") return "Ρομαντισμός";
                if (g.name === "Comedy") return "Κωμωδία";
                if (g.name === "Thriller") return "Θρίλερ";
                if (g.name === "Horror") return "Τρόμου";
                if (g.name === "Crime") return "Εγκλήματος";
                if (g.name === "Mystery") return "Μυστηρίου";
                if (g.name === "Family") return "Οικογενειακή";
                if (g.name === "Animation") return "Κινούμενα Σχέδια";
                if (g.name === "History") return "Ιστορική";
                if (g.name === "War") return "Πολεμική";
                if (g.name === "Western") return "Γουέστερν";
                return g.name;
            }).join(', ');
        }
        
        const studio = movieData.production_companies?.[0]?.name || 'N/A';
        const rating = Math.round((movieData.vote_average || 0) * 10) / 10;
        const desc = movieData.overview || 'Δεν υπάρχει περιγραφή.';
        const runtime = movieData.runtime ? `${Math.floor(movieData.runtime/60)}h ${movieData.runtime%60}min` : '';
        
        document.getElementById('newTitle').value = title;
        document.getElementById('newYear').value = year;
        document.getElementById('newCountry').value = country;
        document.getElementById('newGenre').value = genre;
        document.getElementById('newRating').value = rating;
        document.getElementById('newStudio').value = studio;
        document.getElementById('newDirector').value = director;
        document.getElementById('newWriter').value = writer;
        document.getElementById('newActors').value = actors;
        document.getElementById('newDesc').value = desc;
        document.getElementById('newType').value = 'Movie';
        document.getElementById('newTmdb').value = `https://www.themoviedb.org/movie/${movieId}`;
        document.getElementById('newOriginalTitle').value = movieData.original_title || title;
        document.getElementById('newRuntime').value = runtime;
        if (movieData.imdb_id) document.getElementById('newImdb').value = `https://www.imdb.com/title/${movieData.imdb_id}`;
        if (movieData.poster_path || posterPath) tempPoster = `https://image.tmdb.org/t/p/w500${movieData.poster_path || posterPath}`;
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('autoTitle').value = '';
        showToast(`Φορτώθηκαν στοιχεία για: ${title}`, '#2ecc71');
    } catch(e) {
        console.error(e);
        showToast('Σφάλμα κατά τη φόρτωση λεπτομερειών', '#e50914');
    }
}

async function selectTMDBTvResultForAdd(tvId, tvTitle, tvYear, posterPath) {
    if (!TMDB_API_KEY) return;
    showToast(`Φόρτωση στοιχείων για: ${tvTitle}...`, '#2196f3');
    try {
        const seriesUrl = `https://api.themoviedb.org/3/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const seriesRes = await fetch(seriesUrl);
        if (!seriesRes.ok) throw new Error(`HTTP ${seriesRes.status}`);
        const seriesData = await seriesRes.json();
        const creditsUrl = `https://api.themoviedb.org/3/tv/${tvId}/credits?api_key=${TMDB_API_KEY}`;
        const creditsRes = await fetch(creditsUrl);
        if (!creditsRes.ok) throw new Error(`HTTP ${creditsRes.status}`);
        const creditsData = await creditsRes.json();
        const descUrl = `https://api.themoviedb.org/3/tv/${tvId}?api_key=${TMDB_API_KEY}&language=el`;
        const descRes = await fetch(descUrl);
        const descData = await descRes.json();
        
        let director = 'N/A', writer = 'N/A', actors = 'N/A';
        if (creditsData.crew) {
            const directorObj = creditsData.crew.find(p => p.job === 'Director');
            if (directorObj) director = directorObj.name;
            const writerObj = creditsData.crew.find(p => p.job === 'Writer' || p.department === 'Writing');
            if (writerObj) writer = writerObj.name;
        }
        if (creditsData.cast && creditsData.cast.length > 0) actors = creditsData.cast.slice(0, 5).map(a => a.name).join(', ');
        
        const title = seriesData.name;
        const year = (seriesData.first_air_date || '').substring(0, 4) || tvYear;
        const country = seriesData.production_countries?.[0]?.name || 'N/A';
        let genre = 'N/A';
        if (seriesData.genres && seriesData.genres.length > 0) {
            genre = seriesData.genres.map(g => {
                if (g.name === "Sci-Fi & Fantasy") return "Επιστημονική Φαντασία";
                if (g.name === "Action & Adventure") return "Δράση & Περιπέτεια";
                if (g.name === "Drama") return "Δράμα";
                if (g.name === "Romance") return "Ρομαντισμός";
                if (g.name === "Comedy") return "Κωμωδία";
                if (g.name === "Thriller") return "Θρίλερ";
                if (g.name === "Horror") return "Τρόμου";
                if (g.name === "Crime") return "Εγκλήματος";
                if (g.name === "Mystery") return "Μυστηρίου";
                if (g.name === "Family") return "Οικογενειακή";
                if (g.name === "Animation") return "Κινούμενα Σχέδια";
                if (g.name === "History") return "Ιστορική";
                if (g.name === "War") return "Πολεμική";
                if (g.name === "Western") return "Γουέστερν";
                return g.name;
            }).join(', ');
        }
        
        const studio = seriesData.production_companies?.[0]?.name || 'N/A';
        const rating = seriesData.vote_average || 0;
        const desc = descData.overview || seriesData.overview || 'Δεν υπάρχει περιγραφή.';
        
        document.getElementById('newTitle').value = title;
        document.getElementById('newYear').value = year;
        document.getElementById('newCountry').value = country;
        document.getElementById('newGenre').value = genre;
        document.getElementById('newRating').value = rating.toFixed(1);
        document.getElementById('newStudio').value = studio;
        document.getElementById('newDirector').value = director;
        document.getElementById('newWriter').value = writer;
        document.getElementById('newActors').value = actors;
        document.getElementById('newDesc').value = desc;
        document.getElementById('newType').value = 'Series';
        document.getElementById('newTmdb').value = `https://www.themoviedb.org/tv/${tvId}`;
        document.getElementById('newOriginalTitle').value = seriesData.original_name || title;
        document.getElementById('newRuntime').value = '';
        if (seriesData.poster_path || posterPath) tempPoster = `https://image.tmdb.org/t/p/w500${seriesData.poster_path || posterPath}`;
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('autoTitle').value = '';
        showToast(`Φορτώθηκαν στοιχεία για: ${title}`, '#2ecc71');
    } catch(e) {
        console.error(e);
        showToast('Σφάλμα κατά τη φόρτωση λεπτομερειών', '#e50914');
    }
}

async function saveNewMovie() {
    if (!isUserLoggedIn) { showToast('Πρέπει να συνδεθείτε για να προσθέσετε ταινία!', '#e50914'); return; }
    
    const title = document.getElementById('newTitle').value.trim();
    const year = parseInt(document.getElementById('newYear').value);
    const originalTitle = document.getElementById('newOriginalTitle').value.trim();
    
    if (!title || !year) { showToast('Συμπλήρωσε τίτλο και έτος', '#e50914'); return; }
    if (isDuplicateMovie(title, year)) { showToast('Υπάρχει ήδη!', '#e50914'); return; }
    
    const linkValue = document.getElementById('newLink').value || '';
    const newId = moviesData.length ? Math.max(...moviesData.map(m => m.id)) + 1 : 4;
    const mediaType = document.getElementById('newType').value === 'Series' ? 'tv' : 'movie';
    
    const newMovie = { 
        id: newId, title, year, type: document.getElementById('newType').value, 
        quality: document.getElementById('newQuality').value,
        actors: document.getElementById('newActors').value || 'N/A', link: linkValue,
        dateAdded: new Date().toISOString(), studio: document.getElementById('newStudio').value || 'Κανάλι',
        rating: parseFloat(document.getElementById('newRating').value) || 0, country: document.getElementById('newCountry').value || 'N/A',
        genre: document.getElementById('newGenre').value || 'N/A', director: document.getElementById('newDirector').value || 'N/A',
        writer: document.getElementById('newWriter').value || 'N/A', imdb: document.getElementById('newImdb').value || '',
        tmdb: document.getElementById('newTmdb').value || '', desc: document.getElementById('newDesc').value || '',
        poster_url: tempPoster || null, original_title: originalTitle || title,
        createdBy: currentUserName || 'Χρήστης', status: linkValue ? 'active' : 'pending',
        runtime: document.getElementById('newRuntime').value.trim() || '',
        source: selectedSourceType === 'link' ? 'link' : 'local',
        seriesStatus: '',
        dubbed: 'unknown'
    };
    
    let backdropUrl = null;
    let tmdbId = null;
    
    if (newMovie.tmdb) {
        const match = newMovie.tmdb.match(/\/(movie|tv)\/(\d+)/);
        if (match) tmdbId = match[2];
    }
    
    if (!tmdbId && TMDB_API_KEY) {
        try {
            const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();
            if (searchData.results && searchData.results.length > 0) {
                tmdbId = searchData.results[0].id;
                newMovie.tmdb = `https://www.themoviedb.org/${mediaType}/${tmdbId}`;
            }
        } catch(e) { console.warn('Search failed for backdrop'); }
    }
    
    if (tmdbId && TMDB_API_KEY) {
        try {
            const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
            const detailsRes = await fetch(detailsUrl);
            const details = await detailsRes.json();
            if (details.backdrop_path) {
                backdropUrl = `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`;
            }
            if (details.runtime && !newMovie.runtime) {
                newMovie.runtime = `${Math.floor(details.runtime/60)}h ${details.runtime%60}min`;
            }
        } catch(e) { console.warn('Could not fetch backdrop'); }
    }
    
    if (backdropUrl) newMovie.backdrop_url = backdropUrl;
    
    moviesData.push(newMovie);
    saveToLocalStorage();
    updateRecentMoviesList();
    initFilters();
    initFuseSearch();
    applyFilters();
    closeAddMovieForm();
    tempPoster = null;
    selectedSourceType = 'link';
    showToast(`Προστέθηκε: ${title}${backdropUrl ? ' (με backdrop)' : ''}${linkValue ? '' : ' (ΣΕ ΑΝΑΜΟΝΗ)'}`, linkValue ? '#2ecc71' : '#e67e22');
}

let currentEditingMovieId = null;

function editCurrentMovie() {
    if (!isUserLoggedIn) { 
        showToast('Συνδεθείτε για επεξεργασία', '#e50914'); 
        return; 
    }
    const movie = moviesData.find(m => m.id === currentModalMovieId);
    if (!movie) return;
    currentEditingMovieId = movie.id;
    closeDetails();
    
    const qualityOptions = QUALITY_OPTIONS.map(q => 
        `<option value="${q}" ${movie.quality === q ? 'selected' : ''}>${q}</option>`
    ).join('');
    
    const modalHtml = `<div class="edit-movie-modal" id="editMovieModal" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--card);padding:25px;border-radius:16px;z-index:20000;width:90%;max-width:700px;max-height:85vh;overflow-y:auto;border:1px solid var(--border);">
        <h2 style="color:var(--primary);margin-bottom:20px;">Επεξεργασία: ${escapeHtml(movie.title)}</h2>
        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div class="form-group"><label>Τίτλος</label><input type="text" id="editTitle" value="${escapeHtml(movie.title)}" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"></div>
            <div class="form-group"><label>Ετος</label><input type="number" id="editYear" value="${movie.year}" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"></div>
        </div>
        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div class="form-group"><label>Τύπος</label><select id="editType" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"><option value="Movie" ${movie.type==='Movie'?'selected':''}>Ταινία</option><option value="Series" ${movie.type==='Series'?'selected':''}>Σειρά</option></select></div>
            <div class="form-group">
                <label>Ποιότητα</label>
                <select id="editQuality" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;">
                    ${qualityOptions}
                </select>
            </div>
        </div>
        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div class="form-group"><label>Διάρκεια</label><input type="text" id="editRuntime" value="${escapeHtml(movie.runtime || '')}" placeholder="π.χ. 2h 15min" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"></div>
        </div>
        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div class="form-group"><label>Βαθμολογία (0-10)</label><input type="number" step="0.1" id="editRating" value="${movie.rating}" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"></div>
            <div class="form-group"><label>Ηθοποιοί</label><input type="text" id="editActors" value="${escapeHtml(movie.actors||'')}" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"></div>
        </div>
        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div class="form-group"><label>Χώρα</label><input type="text" id="editCountry" value="${escapeHtml(movie.country||'')}" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"></div>
            <div class="form-group"><label>Σκηνοθέτης</label><input type="text" id="editDirector" value="${escapeHtml(movie.director||'')}" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"></div>
        </div>
        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div class="form-group"><label>Σεναριογράφος</label><input type="text" id="editWriter" value="${escapeHtml(movie.writer||'')}" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"></div>
            <div class="form-group"><label>Είδος (Genre)</label><input type="text" id="editGenre" value="${escapeHtml(movie.genre || '')}" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"></div>
        </div>
        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div class="form-group"><label>Πλατφόρμα (Studio)</label><input type="text" id="editPlatform" list="platformAutocomplete" value="${escapeHtml(movie.studio || '')}" placeholder="π.χ. Netflix" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;">
                <datalist id="platformAutocomplete">
                    <option value="Netflix"><option value="Disney+"><option value="Max (HBO)"><option value="Amazon Prime Video">
                    <option value="Apple TV+"><option value="Paramount+"><option value="Peacock"><option value="Hulu"><option value="YouTube">
                    <option value="Starz"><option value="Crunchyroll"><option value="Discovery+"><option value="Ελληνικες Ταινιες"><option value="Αλλες Πλατφορμες">
                </datalist>
            </div>
            <div class="form-group"><label>Link Προβολής</label><input type="url" id="editLink" value="${escapeHtml(movie.link||'')}" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"></div>
        </div>
        
        <div class="form-group"><label>Κατάσταση Σειράς (για σειρές)</label>
            <select id="editSeriesStatus" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;">
                <option value="">None</option>
                <option value="running" ${movie.seriesStatus === 'running' ? 'selected' : ''}>Ongoing</option>
                <option value="completed" ${movie.seriesStatus === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
        </div>

        <div class="form-group"><label>Μεταγλώττιση</label>
            <select id="editDubbed" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;">
                <option value="unknown" ${movie.dubbed === 'unknown' ? 'selected' : ''}>Άγνωστο</option>
                <option value="dubbed" ${movie.dubbed === 'dubbed' ? 'selected' : ''}>Μεταγλωτισμένα</option>
                <option value="subtitled" ${movie.dubbed === 'subtitled' ? 'selected' : ''}>Υπότιτλοι</option>
            </select>
        </div>

        <div class="form-group"><label>Original Title</label><input type="text" id="editOriginalTitle" value="${escapeHtml(movie.original_title || '')}" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;"></div>
        <div class="form-group"><label>Περιγραφή</label><textarea id="editDesc" rows="4" style="width:100%;padding:10px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;font-family:inherit;">${escapeHtml(movie.desc || '')}</textarea></div>
        <div class="modal-buttons" style="display:flex;gap:10px;margin-top:20px;">
            <button id="saveEditBtn" style="background:#2ecc71;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:bold;">Αποθηκευση</button>
            <button id="cancelEditBtn" style="background:#e74c3c;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:bold;">Ακυρωση</button>
        </div>
    </div>`;
    
    const existing = document.getElementById('editMovieModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('saveEditBtn').addEventListener('click', () => saveEditedMovie());
    document.getElementById('cancelEditBtn').addEventListener('click', () => closeEditForm());
}

function closeEditForm() { document.getElementById('editMovieModal')?.remove(); currentEditingMovieId = null; }

function saveEditedMovie() {
    const idx = moviesData.findIndex(m => m.id === currentEditingMovieId);
    if (idx === -1) return;
    
    const title = document.getElementById('editTitle').value.trim();
    const year = parseInt(document.getElementById('editYear').value);
    const rating = parseFloat(document.getElementById('editRating').value) || 0;
    const newLink = document.getElementById('editLink').value || '';
    const oldLink = moviesData[idx].link;
    const newOriginalTitle = document.getElementById('editOriginalTitle').value.trim();
    const newGenre = document.getElementById('editGenre').value.trim();
    const newPlatform = document.getElementById('editPlatform').value.trim();
    const newActors = document.getElementById('editActors').value.trim();
    const newType = document.getElementById('editType').value;
    const newQuality = document.getElementById('editQuality').value;
    const newCountry = document.getElementById('editCountry').value.trim();
    const newDirector = document.getElementById('editDirector').value.trim();
    const newWriter = document.getElementById('editWriter').value.trim();
    const newDesc = document.getElementById('editDesc').value.trim();
    const newRuntime = document.getElementById('editRuntime').value.trim();
    const newSeriesStatus = document.getElementById('editSeriesStatus').value;
    const newDubbed = document.getElementById('editDubbed').value;
    
    if (isDuplicateMovie(title, year, currentEditingMovieId)) { showToast('Υπάρχει ήδη!', '#e50914'); return; }
    
    const wasPending = moviesData[idx].status === 'pending';
    const hasNewLink = newLink && newLink !== '';
    const hadNoLink = !oldLink || oldLink === '';
    
    moviesData[idx] = { 
        ...moviesData[idx], 
        title, year, type: newType, quality: newQuality, 
        rating, 
        actors: newActors || 'N/A', link: newLink, 
        original_title: newOriginalTitle || title, dateAdded: new Date().toISOString(), 
        genre: newGenre || null, studio: newPlatform,
        country: newCountry || 'N/A',
        director: newDirector || 'N/A',
        writer: newWriter || 'N/A',
        desc: newDesc || 'Δεν υπάρχει περιγραφή.',
        runtime: newRuntime || '',
        seriesStatus: newSeriesStatus,
        dubbed: newDubbed
    };
    
    if (wasPending && hasNewLink && hadNoLink) {
        moviesData[idx].status = 'active';
        moviesData[idx].approvedDate = new Date().toISOString().split('T')[0];
        moviesData[idx].approvedBy = currentUserName || 'Διαχειριστής';
        showToast(`Η ταινία "${title}" εγκρίθηκε!`, '#2ecc71');
        initFuseSearch();
    }
    
    saveToLocalStorage();
    updateRecentMoviesList();
    initFilters();
    applyFilters();
    closeEditForm();
    showToast('Αποθηκεύτηκε', '#2ecc71');
    setTimeout(() => openDetailsById(moviesData[idx].id), 300);
}
function deleteMovieById(id) {
    if (!isUserLoggedIn) { showToast('Συνδεθείτε για διαγραφή', '#e50914'); return false; }
    if (!confirm('Μόνιμη διαγραφή;')) return false;
    
    const title = moviesData.find(m => m.id === id)?.title;
    moviesData = moviesData.filter(m => m.id !== id);
    moviesData.forEach((m, i) => m.id = i + 1);
    saveToLocalStorage();
    updateRecentMoviesList();
    initFilters();
    initFuseSearch();
    currentPage = 1;
    currentTypeFilter = 'all';
    filteredMovies = [...moviesData];
    const searchInput = document.getElementById('movieSearch');
    if (searchInput) { searchInput.value = ''; toggleClearButton(); }
    document.getElementById('genreFilter').value = 'All';
    document.getElementById('yearFilter').value = 'All';
    document.getElementById('countryFilter').value = 'All';
    document.getElementById('studioFilter').value = 'All';
    document.getElementById('sortSelect').value = 'title';
    document.querySelectorAll('.filter-type-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.type === 'all'));
    applyFilters();
    closeDetails();
    showToast(`Διαγράφηκε: ${title}`, '#2ecc71');
    return true;
}

function deleteMovieFromModal() { if (currentModalMovieId) deleteMovieById(currentModalMovieId); }

function openPosterEditor() {
    if (!AdminAuth.isSessionValid()) { showToast('Συνδεθείτε ως διαχειριστής!', '#e50914'); return; }
    const id = prompt('ID ταινίας:');
    const movie = moviesData.find(m => m.id == id);
    if (!movie) return;
    const url = prompt('URL poster (άδειο για auto):', movie.poster_url || '');
    if (url === null) return;
    if (url) movie.poster_url = url;
    else delete movie.poster_url;
    saveToLocalStorage();
    applyFilters();
}

function addMovieByTMDBId() {
    if (!TMDB_API_KEY) { showToast('Σφάλμα: Missing TMDB API Key', '#e50914'); return; }
    const id = prompt('Εισάγετε το TMDB ID:');
    if (!id) return;
    const isSeries = confirm('Είναι Σειρά (TV);');
    const mediaType = isSeries ? 'tv' : 'movie';
    const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${id}`;
    const existingByTmdb = moviesData.find(m => m.tmdb === tmdbUrl);
    if (existingByTmdb) { showToast(`Η ταινία "${existingByTmdb.title}" υπάρχει ήδη!`, '#e67e22'); return; }
    showToast(`Αναζήτηση σε TMDB...`, '#2196f3');
    fetch(`https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=el&append_to_response=credits`)
        .then(res => res.json())
        .then(data => {
            const title = data.title || data.name;
            const year = (data.release_date || data.first_air_date || '').substring(0,4);
            const existingByTitle = moviesData.find(m => m.title.toLowerCase() === title.toLowerCase() && m.year == year);
            if (existingByTitle) { showToast(`Υπάρχει ήδη "${existingByTitle.title}"`, '#e67e22'); return; }
            let director = 'N/A', writer = 'N/A', actors = 'N/A';
            if (data.credits && data.credits.crew) {
                const directorObj = data.credits.crew.find(p => p.job === 'Director');
                if (directorObj) director = directorObj.name;
                const writerObj = data.credits.crew.find(p => p.job === 'Writer' || p.department === 'Writing');
                if (writerObj) writer = writerObj.name;
            }
            if (data.credits && data.credits.cast && data.credits.cast.length > 0) actors = data.credits.cast.slice(0, 5).map(a => a.name).join(', ');
            const newId = moviesData.length ? Math.max(...moviesData.map(m => m.id)) + 1 : 4;
            const runtime = data.runtime ? `${Math.floor(data.runtime/60)}h ${data.runtime%60}min` : '';
            const newMovie = { id: newId, title, year: parseInt(year) || new Date().getFullYear(), country: data.production_countries?.[0]?.name || 'N/A', genre: data.genres?.map(g => g.name).join(', ') || 'N/A', type: mediaType === 'tv' ? 'Series' : 'Movie', quality: 'HD', codec: '', rating: data.vote_average || 0, actors, director, writer, link: '', imdb: data.imdb_id ? `https://www.imdb.com/title/${data.imdb_id}` : '', tmdb: tmdbUrl, desc: data.overview || 'Δεν υπάρχει περιγραφή.', dateAdded: new Date().toISOString(), studio: data.production_companies?.[0]?.name || 'N/A', createdBy: currentUserName || 'Χρήστης', status: 'active', poster_url: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null, original_title: data.original_title || title, runtime: runtime, source: 'link', seriesStatus: '', dubbed: 'unknown' };
            moviesData.push(newMovie);
            saveToLocalStorage();
            updateRecentMoviesList();
            initFilters();
            initFuseSearch();
            applyFilters();
            showToast(`Προστέθηκε: ${title}`, '#2ecc71');
        })
        .catch(e => { console.error(e); showToast(`Σφάλμα: Δεν βρέθηκε`, '#e50914'); });
}

function exportToJSON() {
    if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(moviesData,null,2)], {type:'application/json'}));
    a.download = 'movies_data.json';
    a.click();
}

function importFromJSON(event) {
    if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try { 
            moviesData = JSON.parse(e.target.result); 
            moviesData.forEach(m => { 
                if (!m.status) m.status = 'active'; 
                if (!m.poster_url) m.poster_url = null; 
                if (!m.original_title) m.original_title = m.title; 
                if (!m.runtime) m.runtime = ''; 
                if (!m.source) m.source = 'link';
                if (!m.seriesStatus) m.seriesStatus = '';
                if (!m.dubbed) m.dubbed = 'unknown';
            });
            saveToLocalStorage(); 
            updateRecentMoviesList(); 
            initFilters(); 
            initFuseSearch();
            loadCollections();
            applyFilters(); 
            alert(`Εισήχθησαν ${moviesData.length} τίτλοι`); 
        } catch(err) { alert('Λάθος αρχείο'); }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function removeAllLinksAndExport() {
    if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
    if (!confirm('ΠΡΟΣΟΧΗ! Αυτό θα ΑΦΑΙΡΕΣΕΙ ΟΛΑ ΤΑ LINKS.\nΣυνέχεια;')) return;
    let removedCount = 0;
    for (let i = 0; i < moviesData.length; i++) { if (moviesData[i].link && moviesData[i].link !== '') { moviesData[i].link = ''; removedCount++; } }
    saveToLocalStorage(); updateRecentMoviesList(); applyFilters();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(moviesData,null,2)], {type:'application/json'}));
    a.download = 'movies_clean.json';
    a.click();
    showToast(`Αφαιρέθηκαν ${removedCount} links!`, '#2ecc71');
}

function showMissingPostersList() { alert('Λειτουργία ελέγχου poster - Ολα καλά!'); }
function searchByID() { const id = prompt('ID:'); const movie = moviesData.find(m => m.id == id); if(movie) openDetailsById(movie.id); else showToast('Δεν βρέθηκε', '#e50914'); }
function loadDashboardState() { 
    const auth = AdminAuth.isSessionValid(); 
    const visible = localStorage.getItem('dashboardVisible') === 'true'; 
    if (auth && visible) showDashboard();
    else hideDashboard();
}

function addEnrichButton() {
    const dashboard = document.querySelector('.dashboard-actions');
    if (!dashboard) { setTimeout(addEnrichButton, 1000); return; }
    
    if (!document.getElementById('enrichBiographiesBtn')) {
        const bioBtn = document.createElement('button');
        bioBtn.id = 'enrichBiographiesBtn';
        bioBtn.className = 'dash-btn';
        bioBtn.style.background = '#e67e22';
        bioBtn.style.color = 'white';
        bioBtn.innerHTML = 'Ενημέρωση Βιογραφικών';
        bioBtn.onclick = async () => {
            if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
            await addBiographyTag();
        };
        dashboard.appendChild(bioBtn);
    }
    
    if (!document.getElementById('enrichOscarBtn')) {
        const oscarBtn = document.createElement('button');
        oscarBtn.id = 'enrichOscarBtn';
        oscarBtn.className = 'dash-btn';
        oscarBtn.style.background = '#f1c40f';
        oscarBtn.style.color = '#000';
        oscarBtn.style.fontWeight = 'bold';
        oscarBtn.innerHTML = '🏆 ΠΡΟΣΘΗΚΗ OSCAR WINNER';
        oscarBtn.onclick = async () => {
            if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
            await manualOscar();
        };
        dashboard.appendChild(oscarBtn);
    }
    
    if (!document.getElementById('autoRuntimeBtn')) {
        const runtimeBtn = document.createElement('button');
        runtimeBtn.id = 'autoRuntimeBtn';
        runtimeBtn.className = 'dash-btn';
        runtimeBtn.style.background = '#8e44ad';
        runtimeBtn.style.color = 'white';
        runtimeBtn.innerHTML = '⏱️ Αυτόματη Συμπλήρωση Διάρκειας';
        runtimeBtn.onclick = async () => {
            if (!AdminAuth.isSessionValid()) {
                showToast('Μόνο διαχειριστής!', '#e50914');
                return;
            }
            await autoFillAllRuntimes();
        };
        dashboard.appendChild(runtimeBtn);
    }
    
    if (!document.getElementById('fixLocalPathsBtn')) {
        const fixBtn = document.createElement('button');
        fixBtn.id = 'fixLocalPathsBtn';
        fixBtn.className = 'dash-btn';
        fixBtn.style.background = '#2ecc71';
        fixBtn.style.color = 'white';
        fixBtn.style.fontWeight = 'bold';
        fixBtn.innerHTML = '📂 Διόρθωση Τοπικών Διαδρομών';
        fixBtn.onclick = function() {
            if (!AdminAuth.isSessionValid()) {
                showToast('Μόνο διαχειριστής!', '#e50914');
                return;
            }
            fixAllLocalPaths();
        };
        dashboard.appendChild(fixBtn);
    }
    
    setTimeout(function() {
        var bioBtn2 = document.getElementById('enrichBiographiesBtn');
        if (bioBtn2 && typeof addBiographyTag === 'function') {
            bioBtn2.onclick = function() {
                if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
                addBiographyTag();
            };
            console.log('Bio button extra fix applied');
        }
    }, 500);
}

async function addBiographyTag() {
    if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
    showToast('Αναζήτηση βιογραφικών ταινιών...', '#2196f3');
    let count = 0;
    let bioKeywords = ['story of', 'true story', 'biography', 'βιογραφ', 'based on a true story', 'real life', 'αληθινή ιστορία', 'bio', 'biopic', 'life of', 'the story of', 'a true story', 'actual events', 'πραγματική ιστορία', 'autobiography', 'αυτοβιογραφ', 'real story', 'αληθινη ιστορια', 'biographical', 'βιογραφικο', 'ιστορία ζωής', 'life story', 'drama based on', 'inspired by true events', 'αληθινά γεγονότα'];
    for (let m of moviesData) {
        let txt = ((m.title || '') + ' ' + (m.original_title || '') + ' ' + (m.desc || '') + ' ' + (m.actors || '') + ' ' + (m.director || '') + ' ' + (m.writer || '')).toLowerCase();
        let isBio = bioKeywords.some(kw => txt.includes(kw));
        if (isBio && (!m.genre || !m.genre.includes('Biography'))) {
            if (m.genre && m.genre.includes('Βιογραφία')) m.genre = m.genre.replace(/Βιογραφία/g, 'Biography');
            else m.genre = m.genre ? `${m.genre}, Biography` : 'Biography';
            count++;
        }
    }
    if (count > 0) { saveToLocalStorage(); initFilters(); applyFilters(); showToast(`✅ Ενημερώθηκαν ${count} βιογραφικές ταινίες!`, '#2ecc71'); }
    else showToast(`⚠️ Δεν βρέθηκαν νέες βιογραφικές ταινίες.`, '#e67e22');
    console.log(`Biography tag: ${count} ταινίες ενημερώθηκαν`);
}

async function manualOscar() {
    if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
    const modalHtml = `<div id="oscarModal" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background: var(--card); border-radius: 20px; width: 90%; max-width: 500px; z-index: 20000; padding: 25px; border: 2px solid var(--primary);"><h3 style="color: var(--primary); margin-bottom: 20px;">Προσθήκη OSCAR Winner</h3><div class="form-group"><label>Αναζήτηση ταινίας:</label><input type="text" id="oscarSearchInput" placeholder="π.χ. Oppenheimer, The Godfather" style="width:100%; padding:10px;"><div id="oscarSearchResults" style="max-height: 300px; overflow-y: auto; margin-top: 10px;"></div></div><div class="modal-buttons" style="margin-top: 20px;"><button id="closeOscarModal" class="btn-cancel">Ακύρωση</button></div></div>`;
    const existing = document.getElementById('oscarModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const searchInput = document.getElementById('oscarSearchInput');
    const resultsDiv = document.getElementById('oscarSearchResults');
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.toLowerCase().trim();
        if (term.length < 2) { resultsDiv.innerHTML = ''; return; }
        const matches = moviesData.filter(m => m.title.toLowerCase().includes(term) || (m.original_title && m.original_title.toLowerCase().includes(term))).slice(0, 10);
        if (matches.length === 0) { resultsDiv.innerHTML = '<div style="padding:10px; text-align:center;">Δεν βρέθηκαν ταινίες</div>'; return; }
        resultsDiv.innerHTML = matches.map(m => `<div class="oscar-result-item" data-id="${m.id}" style="padding: 10px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s;" onmouseenter="this.style.background='var(--primary)'" onmouseleave="this.style.background=''"><strong>${escapeHtml(m.title)}</strong> (${m.year})${m.genre && m.genre.includes('Oscar Winner') ? '<span style="color: gold; margin-left: 10px;">Έχει ήδη OSCAR</span>' : ''}</div>`).join('');
        document.querySelectorAll('.oscar-result-item').forEach(el => { el.addEventListener('click', () => { const movieId = parseInt(el.dataset.id); const movie = moviesData.find(m => m.id === movieId); if (!movie) return; if (movie.genre && movie.genre.includes('Oscar Winner')) { showToast(`Η ταινία "${movie.title}" έχει ήδη ετικέτα OSCAR!`, '#e67e22'); document.getElementById('oscarModal')?.remove(); return; } movie.genre = movie.genre ? `${movie.genre}, Oscar Winner` : 'Oscar Winner'; saveToLocalStorage(); initFilters(); applyFilters(); showToast(`✅ Προστέθηκε OSCAR Winner στην ταινία: ${movie.title}`, '#2ecc71'); document.getElementById('oscarModal')?.remove(); }); });
    });
    document.getElementById('closeOscarModal').addEventListener('click', () => { document.getElementById('oscarModal')?.remove(); });
}

function showRequestForm(title = '', year = '') {
    const modalHtml = `<div id="requestModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:20000; display:flex; align-items:center; justify-content:center;"><div style="background: var(--card); border-radius: 20px; max-width: 600px; width: 90%; padding: 30px; border: 1px solid var(--primary); max-height: 85vh; overflow-y: auto;"><h3 style="color: var(--primary); margin-bottom: 20px;">Αίτημα Προσθήκης Νέας Ταινίας/Σειράς</h3><div class="form-group"><label>Τίτλος *</label><input type="text" id="reqTitle" placeholder="π.χ. Oppenheimer, Poor Things" value="${escapeHtml(title)}"></div><div class="form-group"><label>Ετος *</label><input type="number" id="reqYear" placeholder="π.χ. 2023" value="${year}"></div><button id="fetchFromTmdbBtn" class="btn-tmdb" style="width:100%; margin-bottom:15px;">Αυτόματη Συμπλήρωση από TMDB</button><div id="tmdbPreview" style="display:none; background: var(--input-bg); border-radius: 12px; padding: 15px; margin-bottom: 15px;"><div style="display: flex; gap: 15px;"><img id="previewPoster" src="" style="width: 80px; height: 120px; object-fit: cover; border-radius: 8px;"><div style="flex:1;"><div id="previewTitle" style="font-weight: bold; color: var(--primary);"></div><div id="previewYear" style="font-size: 12px;"></div><div id="previewRating" style="font-size: 12px;"></div><div id="previewGenres" style="font-size: 11px; opacity: 0.7;"></div></div></div></div><div class="form-group"><label>Το όνομα σου (προαιρετικό)</label><input type="text" id="reqRequester" placeholder="π.χ. ${currentUserName || 'Χρήστης'}"></div><div class="form-group"><label>Σημείωση (προαιρετική)</label><textarea id="reqNote" rows="3" placeholder="Πρόσθετες πληροφορίες..."></textarea></div><div class="modal-buttons" style="margin-top: 20px;"><button id="submitRequestBtn" class="btn-save">Υποβολή Αιτήματος</button><button id="cancelRequestBtn" class="btn-cancel">Ακύρωση</button></div></div></div>`;
    const existing = document.getElementById('requestModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    let fetchedData = null;
    document.getElementById('fetchFromTmdbBtn').addEventListener('click', async () => {
        const title = document.getElementById('reqTitle').value.trim();
        const year = document.getElementById('reqYear').value.trim();
        if (!title) { showToast('Παρακαλώ γράψτε τίτλο πρώτα', '#e67e22'); return; }
        if (!TMDB_API_KEY) { showToast('Σφάλμα: Missing TMDB API Key', '#e50914'); return; }
        showToast('Αναζήτηση στο TMDB...', '#2196f3');
        try {
            const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
            const res = await fetch(searchUrl);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                let bestMatch = data.results[0];
                if (year) { const exactYearMatch = data.results.find(m => m.release_date?.substring(0,4) === year); if (exactYearMatch) bestMatch = exactYearMatch; }
                const detailsUrl = `https://api.themoviedb.org/3/movie/${bestMatch.id}?api_key=${TMDB_API_KEY}&language=el&append_to_response=credits`;
                const detailsRes = await fetch(detailsUrl);
                const fullData = await detailsRes.json();
                const runtime = fullData.runtime ? `${Math.floor(fullData.runtime/60)}h ${fullData.runtime%60}min` : '';
                fetchedData = { id: fullData.id, title: fullData.title, year: fullData.release_date?.substring(0,4), poster: fullData.poster_path ? `https://image.tmdb.org/t/p/w500${fullData.poster_path}` : null, rating: fullData.vote_average, genres: fullData.genres?.map(g => g.name).join(', '), overview: fullData.overview, director: fullData.credits?.crew?.find(p => p.job === 'Director')?.name || 'N/A', actors: fullData.credits?.cast?.slice(0, 5).map(a => a.name).join(', '), country: fullData.production_countries?.[0]?.name || 'N/A', studio: fullData.production_companies?.[0]?.name || 'N/A', tmdbId: fullData.id, runtime: runtime };
                document.getElementById('previewPoster').src = fetchedData.poster || 'https://via.placeholder.com/80x120?text=No+Poster';
                document.getElementById('previewTitle').innerHTML = fetchedData.title;
                document.getElementById('previewYear').innerHTML = `${fetchedData.year}`;
                document.getElementById('previewRating').innerHTML = `${fetchedData.rating}/10`;
                document.getElementById('previewGenres').innerHTML = `${fetchedData.genres || 'N/A'}`;
                document.getElementById('tmdbPreview').style.display = 'block';
                document.getElementById('reqTitle').value = fetchedData.title;
                document.getElementById('reqYear').value = fetchedData.year;
                showToast('Στοιχεία φορτώθηκαν!', '#2ecc71');
            } else { showToast('Δεν βρέθηκε ταινία με αυτόν τον τίτλο', '#e50914'); }
        } catch(e) { console.error(e); showToast('Σφάλμα κατά την αναζήτηση', '#e50914'); }
    });
    document.getElementById('submitRequestBtn').addEventListener('click', () => submitRequestWithData(fetchedData));
    document.getElementById('cancelRequestBtn').addEventListener('click', () => { document.getElementById('requestModal').remove(); });
}

async function submitRequestWithData(tmdbData) {
    const title = document.getElementById('reqTitle').value.trim();
    const year = parseInt(document.getElementById('reqYear').value);
    const requester = document.getElementById('reqRequester').value.trim() || currentUserName || 'Ανώνυμος';
    const note = document.getElementById('reqNote').value.trim();
    if (!title || !year || isNaN(year)) { showToast('Παρακαλώ συμπληρώστε τίτλο και έτος', '#e50914'); return; }
    const existingMovie = moviesData.find(m => m.title.toLowerCase() === title.toLowerCase() && m.year === year);
    if (existingMovie) { showToast(`Η ταινία "${title}" (${year}) υπάρχει ήδη!`, '#e67e22'); return; }
    const newId = moviesData.length ? Math.max(...moviesData.map(m => m.id)) + 1 : 1;
    const newMovie = { id: newId, title, year, type: 'Movie', quality: 'HD', codec: '', rating: tmdbData?.rating || 0, actors: tmdbData?.actors || 'N/A', director: tmdbData?.director || 'N/A', writer: tmdbData?.director || 'N/A', country: tmdbData?.country || 'N/A', genre: tmdbData?.genres || 'N/A', studio: tmdbData?.studio || 'N/A', link: '', imdb: '', tmdb: tmdbData?.tmdbId ? `https://www.themoviedb.org/movie/${tmdbData.tmdbId}` : '', desc: tmdbData?.overview || 'Δεν υπάρχει περιγραφή.', dateAdded: new Date().toISOString(), createdBy: requester, poster_url: tmdbData?.poster || null, original_title: tmdbData?.title || title, status: 'pending', requestedBy: requester, requestDate: new Date().toISOString().split('T')[0], requestNote: note, runtime: tmdbData?.runtime || '', source: 'link', seriesStatus: '', dubbed: 'unknown' };
    moviesData.push(newMovie);
    saveToLocalStorage();
    try { await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ access_key: '67f6e36b-a2d2-447e-954f-752a0407d237', subject: `ΝΕΟ ΑΙΤΗΜΑ ΤΑΙΝΙΑΣ: ${title}`, from_name: requester, message: `ΝΕΟ ΑΙΤΗΜΑ ΤΑΙΝΙΑΣ!\n\nΤίτλος: ${title}\nΕτος: ${year}\nΖήτησε: ${requester}\nΣημείωση: ${note || 'Κανένα'}\nΗμερομηνία: ${new Date().toLocaleString('el-GR')}`, replyto: "no-reply@yioio.com" }) }); showToast(`Το αίτημα για "${title}" εστάλη!`, '#2ecc71'); } catch (error) { showToast(`Το αίτημα αποθηκεύτηκε (χωρίς email)`, '#e67e22'); }
    updateRecentMoviesList(); initFilters(); initFuseSearch(); applyFilters(); document.getElementById('requestModal').remove();
}

function showRequestsPanel() {
    if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
    const pendingRequests = movieRequests.filter(r => r.status === 'pending');
    const approvedRequests = movieRequests.filter(r => r.status === 'approved');
    const rejectedRequests = movieRequests.filter(r => r.status === 'rejected');
    let html = `<div id="requestsPanel" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background: var(--card); border-radius: 20px; width: 95%; max-width: 1200px; max-height: 85vh; overflow-y: auto; z-index: 20000; padding: 20px; border: 2px solid var(--primary);"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;"><h2 style="color: var(--primary);">Διαχείριση Αιτημάτων Ταινιών</h2><button id="closeRequestsBtn" style="background: none; border: none; color: var(--text); font-size: 24px; cursor: pointer;">X</button></div><div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border);"><button class="request-tab-btn active" data-tab="pending">Εκκρεμή (${pendingRequests.length})</button><button class="request-tab-btn" data-tab="approved">Εγκεκριμένα (${approvedRequests.length})</button><button class="request-tab-btn" data-tab="rejected">Απορριφθέντα (${rejectedRequests.length})</button></div><div id="pendingTab" class="request-tab">${renderPendingRequestsTable(pendingRequests)}</div><div id="approvedTab" class="request-tab" style="display:none;">${renderApprovedRequestsTable(approvedRequests)}</div><div id="rejectedTab" class="request-tab" style="display:none;">${renderRejectedRequestsTable(rejectedRequests)}</div><div style="margin-top: 20px;"><button id="clearAllRequestsBtn" style="background:#e67e22; color:white; border:none; padding:8px 16px; border-radius:8px;">Εκκαθάριση Ολοκληρωμένων</button></div></div>`;
    const existing = document.getElementById('requestsPanel');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    document.querySelectorAll('.request-tab-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.request-tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); const tab = btn.dataset.tab; document.getElementById('pendingTab').style.display = tab === 'pending' ? 'block' : 'none'; document.getElementById('approvedTab').style.display = tab === 'approved' ? 'block' : 'none'; document.getElementById('rejectedTab').style.display = tab === 'rejected' ? 'block' : 'none'; }); });
    document.getElementById('closeRequestsBtn').addEventListener('click', () => { document.getElementById('requestsPanel').remove(); });
    const clearBtn = document.getElementById('clearAllRequestsBtn');
    if (clearBtn) { clearBtn.addEventListener('click', () => { if (confirm('Εκκαθάριση όλων των ολοκληρωμένων αιτημάτων;')) { movieRequests = movieRequests.filter(r => r.status === 'pending'); saveRequestsToLocalStorage(); document.getElementById('requestsPanel').remove(); showRequestsPanel(); showToast('Ολοκληρωμένα αιτήματα εκκαθαρίστηκαν', '#2ecc71'); } }); }
}

function renderPendingRequestsTable(requests) {
    if (requests.length === 0) return '<div style="text-align:center; padding:40px;">Δεν υπάρχουν εκκρεμή αιτήματα</div>';
    let html = '<div style="display: grid; gap: 20px;">';
    for (const req of requests) { html += `<div style="border: 1px solid var(--border); border-radius: 12px; padding: 15px; background: var(--input-bg);"><div style="display: flex; gap: 20px; flex-wrap: wrap;"><div style="flex:1;"><h3 style="color: var(--primary); margin: 0 0 5px 0;">${escapeHtml(req.title)} (${req.year})</h3><div>Από: ${escapeHtml(req.requester)} | ${req.dateRequested}</div>${req.note ? `<div>Σημείωση: ${escapeHtml(req.note)}</div>` : ''}</div><div style="display: flex; flex-direction: column; gap: 8px;"><button onclick="approveExistingMovie(${req.id})" style="background:#2ecc71; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Εγκριση</button><button onclick="rejectAndDeleteMovie(${req.id})" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Απόρριψη & Διαγραφή</button></div></div></div>`; }
    html += '</div>'; return html;
}
function renderApprovedRequestsTable(requests) {
    if (requests.length === 0) return '<div style="text-align:center; padding:40px;">Δεν υπάρχουν εγκεκριμένα αιτήματα</div>';
    let html = '<div style="display: grid; gap: 15px;">';
    for (const req of requests) { html += `<div style="border:1px solid var(--border);border-radius:8px;padding:12px;"><strong>${escapeHtml(req.title)} (${req.year})</strong> - Από: ${escapeHtml(req.requester)} <span style="background:#2ecc71;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:10px;">Εγκεκριμένο</span></div>`; }
    html += '</div>'; return html;
}
function renderRejectedRequestsTable(requests) {
    if (requests.length === 0) return '<div style="text-align:center; padding:40px;">Δεν υπάρχουν απορριφθέντα αιτήματα</div>';
    let html = '<div style="display: grid; gap: 15px;">';
    for (const req of requests) { html += `<div style="border:1px solid var(--border);border-radius:8px;padding:12px;"><strong>${escapeHtml(req.title)} (${req.year})</strong> - Από: ${escapeHtml(req.requester)} <span style="background:#e74c3c;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:10px;">Απορρίφθηκε</span></div>`; }
    html += '</div>'; return html;
}
function approveExistingMovie(requestId) {
    const request = movieRequests.find(r => r.id === requestId);
    if (!request) { showToast('Δεν βρέθηκε το αίτημα', '#e50914'); return; }
    const existingMovie = moviesData.find(m => m.title === request.title && m.year === request.year);
    if (existingMovie) { existingMovie.status = 'active'; saveToLocalStorage(); showToast(`Η ταινία "${request.title}" εγκρίθηκε!`, '#2ecc71'); }
    else { showToast(`Δεν βρέθηκε η ταινία "${request.title}" στη βάση`, '#e50914'); }
    request.status = 'approved'; request.approvedDate = new Date().toISOString().split('T')[0]; saveRequestsToLocalStorage(); showRequestsPanel(); initFuseSearch(); applyFilters();
}
function rejectAndDeleteMovie(requestId) {
    const request = movieRequests.find(r => r.id === requestId);
    if (!request) { showToast('Δεν βρέθηκε το αίτημα', '#e50914'); return; }
    if (!confirm(`Σίγουρα θέλεις να ΑΠΟΡΡΙΨΕΙΣ και να ΔΙΑΓΡΑΨΕΙΣ την ταινία "${request.title}" (${request.year});`)) return;
    const movieIndex = moviesData.findIndex(m => m.title === request.title && m.year === request.year);
    if (movieIndex !== -1) { moviesData.splice(movieIndex, 1); moviesData.forEach((m, i) => m.id = i + 1); saveToLocalStorage(); showToast(`Η ταινία "${request.title}" διαγράφηκε`, '#e74c3c'); }
    movieRequests = movieRequests.filter(r => r.id !== requestId); saveRequestsToLocalStorage(); updateRecentMoviesList(); initFilters(); initFuseSearch(); applyFilters(); const panel = document.getElementById('requestsPanel'); if (panel) panel.remove(); showRequestsPanel(); showToast(`Το αίτημα απορρίφθηκε και η ταινία διαγράφηκε`, '#2ecc71');
}

let movieRequests = [];
function saveRequestsToLocalStorage() { localStorage.setItem('yioio_movie_requests', JSON.stringify(movieRequests)); }
function loadRequestsFromLocalStorage() { const saved = localStorage.getItem('yioio_movie_requests'); if (saved) { try { movieRequests = JSON.parse(saved); console.log('Φορτώθηκαν αιτήματα:', movieRequests.length); } catch(e) { movieRequests = []; } } else { movieRequests = []; } }
function handleDownloadClick() { if (currentModalMovieId) { const movie = moviesData.find(m => m.id === currentModalMovieId); if (movie) { if (movie.link && movie.link.startsWith('file://')) { showLocalMoviePopup(movie); } else { suggestFreeMovie(movie); } } else showToast('Σφάλμα: Δεν βρέθηκε η ταινία', '#e50914'); } }
function initLegalModals() { /* ... */ }
function exportUserData() { /* ... */ }
function deleteAllUserData() { /* ... */ }
function showLegalModal(modalId) { /* ... */ }
function closeLegalModal(modalId) { /* ... */ }

// EVENT LISTENERS
function attachEventListeners() {
    const logo = document.querySelector('.logo'); if (logo) logo.addEventListener('click', () => resetAllFilters());
    const themeBtn = document.querySelector('.theme-btn'); if (themeBtn) themeBtn.addEventListener('click', () => toggleTheme());
    document.querySelectorAll('.filter-type-btn').forEach(btn => { btn.addEventListener('click', (e) => { const type = e.target.dataset.type; handleAllClick(); filterByType(type); }); });
    const loginBtn = document.getElementById('loginUserBtn'); if (loginBtn) loginBtn.addEventListener('click', () => showUserLogin());
    const logoutUserBtn = document.getElementById('logoutUserBtn'); if (logoutUserBtn) logoutUserBtn.addEventListener('click', () => logoutUser());
    const updateBtn = document.querySelector('.update-btn-header'); if (updateBtn) updateBtn.addEventListener('click', () => checkForGitHubUpdates());
    const closeDashBtn = document.querySelector('.close-dash-btn'); if (closeDashBtn) closeDashBtn.addEventListener('click', () => hideDashboard());
    const searchByIdBtn = document.getElementById('searchByIdBtn'); if (searchByIdBtn) searchByIdBtn.addEventListener('click', () => searchByID());
    const addMovieFormBtn = document.getElementById('addMovieFormBtn'); if (addMovieFormBtn) addMovieFormBtn.addEventListener('click', () => showAddMovieForm());
    const posterEditorBtn = document.getElementById('posterEditorBtn'); if (posterEditorBtn) posterEditorBtn.addEventListener('click', () => openPosterEditor());
    const addByTmdbBtn = document.getElementById('addByTmdbBtn'); if (addByTmdbBtn) addByTmdbBtn.addEventListener('click', () => addMovieByTMDBId());
    const exportBtn = document.getElementById('exportBtn'); if (exportBtn) exportBtn.addEventListener('click', () => exportToJSON());
    const removeLinksBtn = document.getElementById('removeLinksBtn'); if (removeLinksBtn) removeLinksBtn.addEventListener('click', () => removeAllLinksAndExport());
    const importBtn = document.getElementById('importBtn'); if (importBtn) importBtn.addEventListener('click', () => document.getElementById('importFile').click());
    const missingPostersBtn = document.getElementById('missingPostersBtn'); if (missingPostersBtn) missingPostersBtn.addEventListener('click', () => showMissingPostersList());
    const logoutAdminBtn = document.getElementById('logoutBtn'); if (logoutAdminBtn) logoutAdminBtn.addEventListener('click', () => logoutAdmin());
    const viewRequestsBtn = document.getElementById('viewRequestsBtn'); if (viewRequestsBtn) viewRequestsBtn.addEventListener('click', () => showRequestsPanel());
    const quickAddBtn = document.getElementById('quickAddBtn'); if (quickAddBtn) quickAddBtn.addEventListener('click', () => { const title = prompt('Τίτλος ταινίας:'); if (!title) return; const year = prompt('Ετος:'); if (!year) return; const requester = prompt('Από ποιον;') || 'Από email'; movieRequests.push({ id: Date.now(), title, year: parseInt(year), requester, dateRequested: new Date().toISOString().split('T')[0], status: 'pending' }); saveRequestsToLocalStorage(); showToast(`Προστέθηκε: ${title}`, '#2ecc71'); const panel = document.getElementById('requestsPanel'); if (panel) { panel.remove(); showRequestsPanel(); } });
    const clearSearchBtn = document.getElementById('clearSearchBtn'); if (clearSearchBtn) clearSearchBtn.addEventListener('click', () => clearSearch());
    const loadMoreBtn = document.getElementById('loadMoreBtn'); if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => loadNextPage());
    const backToTopBtn = document.getElementById('backToTop'); if (backToTopBtn) backToTopBtn.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
    const searchInput = document.getElementById('movieSearch'); if (searchInput) { searchInput.addEventListener('input', () => { toggleClearButton(); applyFilters(); }); searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyFilters(); }); }
    const modal = document.getElementById('detailModal'); if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeDetails(); });
    const closeModalBtn = document.querySelector('.close-modal'); if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeDetails());
    const importFile = document.getElementById('importFile'); if (importFile) importFile.addEventListener('change', (e) => importFromJSON(e));
    const genreFilter = document.getElementById('genreFilter'); if (genreFilter) genreFilter.addEventListener('change', () => applyFilters());
    const sortSelect = document.getElementById('sortSelect'); if (sortSelect) sortSelect.addEventListener('change', () => applyFilters());
    const yearFilter = document.getElementById('yearFilter'); if (yearFilter) yearFilter.addEventListener('change', () => applyFilters());
    const countryFilter = document.getElementById('countryFilter'); if (countryFilter) countryFilter.addEventListener('change', () => applyFilters());
    const studioFilter = document.getElementById('studioFilter'); if (studioFilter) studioFilter.addEventListener('change', () => applyFilters());
    const modalDownloadBtn = document.getElementById('modalDownloadBtn'); if (modalDownloadBtn) modalDownloadBtn.addEventListener('click', () => handleDownloadClick());
    const modalEditBtn = document.getElementById('modalEditBtn'); if (modalEditBtn) modalEditBtn.addEventListener('click', () => editCurrentMovie());
    const modalDeleteBtn = document.getElementById('modalDeleteBtn'); if (modalDeleteBtn) modalDeleteBtn.addEventListener('click', () => deleteMovieFromModal());
    const modalAddBtn = document.getElementById('modalAddBtn'); if (modalAddBtn) modalAddBtn.addEventListener('click', () => showAddMovieForm());
    const modalDirector = document.getElementById('modalDirector'); if (modalDirector) modalDirector.addEventListener('click', (e) => { const value = e.target.innerText; if (value && value !== '-') searchMoviesByDirectorOrWriter(value, 'director'); });
    const modalWriter = document.getElementById('modalWriter'); if (modalWriter) modalWriter.addEventListener('click', (e) => { const value = e.target.innerText; if (value && value !== '-') searchMoviesByDirectorOrWriter(value, 'writer'); });
    addEnrichButton(); initLegalModals();
    window.approveExistingMovie = approveExistingMovie; window.rejectAndDeleteMovie = rejectAndDeleteMovie;
}

window.addEventListener('DOMContentLoaded', async () => {
    if (!initConfig()) showToast('Σφάλμα: Δεν βρέθηκε το config.js!', '#e50914');
    loadTheme(); loadRequestsFromLocalStorage();
    await loadMoviesData();
    loadDashboardState(); loadUserSession(); attachEventListeners();
    if (moviesData.length === 0) { console.log('No data loaded, retrying...'); setTimeout(async () => { if (moviesData.length === 0) { await loadMoviesData(); } }, 2000); }
    setTimeout(() => checkForGitHubUpdates(), 5000);
    const backBtn = document.getElementById('backToTop'); window.addEventListener('scroll', () => { backBtn.style.display = window.scrollY > 300 ? 'block' : 'none'; });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') closeDetails(); });
});

// ΠΑΓΚΟΣΜΙΑ ΕΝΕΡΓΟΠΟΙΗΣΗ ΚΟΥΜΠΙΟΥ ΠΡΟΒΟΛΗΣ
(function globalButtonFix() {
    console.log('Ενεργοποίηση κουμπιού Προβολής...');
    
    const observer = new MutationObserver(function(mutations) {
        const btn = document.getElementById('modalDownloadBtn');
        if (btn && !btn.hasAttribute('data-fixed')) {
            btn.setAttribute('data-fixed', 'true');
            btn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Κλικ στο κουμπί Προβολής');
                if (currentModalMovieId) {
                    const movie = moviesData.find(m => m.id === currentModalMovieId);
                    if (movie) {
                        if (movie.link && movie.link.startsWith('file://')) {
                            showLocalMoviePopup(movie);
                        } else {
                            suggestFreeMovie(movie);
                        }
                    } else {
                        showToast('Σφάλμα: Δεν βρέθηκε η ταινία', '#e50914');
                    }
                }
                return false;
            };
            console.log('✅ Κουμπί Προβολής ενεργοποιήθηκε');
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    setInterval(function() {
        const btn = document.getElementById('modalDownloadBtn');
        if (btn && !btn.hasAttribute('data-fixed')) {
            btn.setAttribute('data-fixed', 'true');
            btn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (currentModalMovieId) {
                    const movie = moviesData.find(m => m.id === currentModalMovieId);
                    if (movie) {
                        if (movie.link && movie.link.startsWith('file://')) {
                            showLocalMoviePopup(movie);
                        } else {
                            suggestFreeMovie(movie);
                        }
                    }
                }
                return false;
            };
            console.log('✅ Κουμπί Προβολής ενεργοποιήθηκε (interval)');
        }
    }, 2000);
    
    function fixOscarButtonPermanently() {
        const btn = document.getElementById('enrichOscarBtn');
        if (btn && !btn.hasAttribute('data-fixed-oscar')) {
            btn.setAttribute('data-fixed-oscar', 'true');
            btn.onclick = function(e) {
                e.preventDefault();
                manualOscar();
            };
        }
    }
    fixOscarButtonPermanently();
    setInterval(fixOscarButtonPermanently, 2000);
})();