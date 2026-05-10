/* ============================================
   Today in History — Timeline App
   Wikipedia "On This Day" API + Wikimedia images
   ============================================ */

(function () {
    'use strict';

    // ---- State ----
    const state = {
        month: null,
        day: null,
        category: 'events',
        data: null,
        loading: false,
    };

    // ---- Cache ----
    const cache = {};
    const STORAGE_KEY = 'todayInHistory_prefs';

    function savePrefs() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                month: state.month,
                day: state.day,
                category: state.category,
            }));
        } catch (e) { /* quota exceeded or private mode */ }
    }

    function loadPrefs() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* corrupt data */ }
        return null;
    }

    function getCacheKey(month, day) {
        return month + '/' + day;
    }

    // ---- Constants ----
    const MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    const API_BASE = 'https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday';

    const CATEGORY_MAP = {
        events: 'selected',
        births: 'births',
        deaths: 'deaths',
    };

    const CATEGORY_TITLES = {
        events: 'Notable Events',
        births: 'Notable Births',
        deaths: 'Notable Deaths',
    };

    // ---- DOM References ----
    const dom = {
        headerSub: document.getElementById('header-sub'),
        heroDate: document.getElementById('hero-date'),
        monthSelect: document.getElementById('month-select'),
        daySelect: document.getElementById('day-select'),
        btnPrev: document.getElementById('btn-prev'),
        btnNext: document.getElementById('btn-next'),
        btnToday: document.getElementById('btn-today'),
        navEvents: document.getElementById('nav-events'),
        navBirths: document.getElementById('nav-births'),
        navDeaths: document.getElementById('nav-deaths'),
        timelineContainer: document.getElementById('timeline-container'),
        sectionTitle: document.getElementById('section-title'),
        heroEventContainer: document.getElementById('hero-event-container'),
    };

    // ---- Initialization ----
    function init() {
        const saved = loadPrefs();
        if (saved && saved.month && saved.day) {
            state.month = saved.month;
            state.day = saved.day;
            state.category = saved.category || 'events';
        } else {
            const now = new Date();
            state.month = now.getMonth() + 1;
            state.day = now.getDate();
        }

        // Sync category nav button
        const catMap = { events: dom.navEvents, births: dom.navBirths, deaths: dom.navDeaths };
        [dom.navEvents, dom.navBirths, dom.navDeaths].forEach(btn => btn.classList.remove('active'));
        catMap[state.category].classList.add('active');
        dom.sectionTitle.textContent = CATEGORY_TITLES[state.category];

        buildSelectors();
        bindEvents();
        syncSelectorsToState();

        // Initialize map panel (Phase 2)
        if (typeof TodayMap !== 'undefined') {
            TodayMap.init();
        }

        fetchEvents();
    }

    // ---- Build month/day selectors ----
    function buildSelectors() {
        MONTHS.forEach((name, i) => {
            const opt = document.createElement('option');
            opt.value = i + 1;
            opt.textContent = name;
            dom.monthSelect.appendChild(opt);
        });
        rebuildDayOptions(31);
    }

    function rebuildDayOptions(maxDay) {
        const current = parseInt(dom.daySelect.value) || state.day;
        dom.daySelect.innerHTML = '';
        for (let d = 1; d <= maxDay; d++) {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            dom.daySelect.appendChild(opt);
        }
        dom.daySelect.value = Math.min(current, maxDay);
    }

    function syncSelectorsToState() {
        dom.monthSelect.value = state.month;
        rebuildDayOptions(DAYS_IN_MONTH[state.month - 1]);
        dom.daySelect.value = state.day;
    }

    // ---- Event Binding ----
    function bindEvents() {
        dom.monthSelect.addEventListener('change', () => {
            state.month = parseInt(dom.monthSelect.value);
            rebuildDayOptions(DAYS_IN_MONTH[state.month - 1]);
            state.day = parseInt(dom.daySelect.value);
            fetchEvents();
        });

        dom.daySelect.addEventListener('change', () => {
            state.day = parseInt(dom.daySelect.value);
            fetchEvents();
        });

        dom.btnPrev.addEventListener('click', () => navigateDay(-1));
        dom.btnNext.addEventListener('click', () => navigateDay(1));
        dom.btnToday.addEventListener('click', goToToday);

        dom.navEvents.addEventListener('click', () => setCategory('events'));
        dom.navBirths.addEventListener('click', () => setCategory('births'));
        dom.navDeaths.addEventListener('click', () => setCategory('deaths'));

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'SELECT') return;
            if (e.key === 'ArrowLeft') navigateDay(-1);
            if (e.key === 'ArrowRight') navigateDay(1);
        });
    }

    function navigateDay(delta) {
        let d = new Date(2024, state.month - 1, state.day);
        d.setDate(d.getDate() + delta);
        state.month = d.getMonth() + 1;
        state.day = d.getDate();
        syncSelectorsToState();
        fetchEvents();
    }

    function goToToday() {
        const now = new Date();
        state.month = now.getMonth() + 1;
        state.day = now.getDate();
        syncSelectorsToState();
        fetchEvents();
    }

    function setCategory(cat) {
        state.category = cat;
        [dom.navEvents, dom.navBirths, dom.navDeaths].forEach(btn => btn.classList.remove('active'));
        const map = { events: dom.navEvents, births: dom.navBirths, deaths: dom.navDeaths };
        map[cat].classList.add('active');
        dom.sectionTitle.textContent = CATEGORY_TITLES[cat];
        savePrefs();

        if (state.data) {
            renderTimeline(state.data);
        } else {
            fetchEvents();
        }
    }

    // ---- Fetch from Wikipedia API (with cache) ----
    async function fetchEvents() {
        state.loading = true;
        showLoading();
        updateHeroDisplay();
        savePrefs();

        const key = getCacheKey(state.month, state.day);

        // Check cache first
        if (cache[key]) {
            state.data = cache[key];
            state.loading = false;
            renderTimeline(cache[key]);
            if (typeof TodayMap !== 'undefined') {
                TodayMap.update(cache[key]);
            }
            return;
        }

        const mm = String(state.month).padStart(2, '0');
        const dd = String(state.day).padStart(2, '0');
        const endpoint = `${API_BASE}/all/${mm}/${dd}`;

        try {
            const response = await fetch(endpoint, {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) throw new Error(`API returned ${response.status}`);

            const data = await response.json();
            cache[key] = data;
            state.data = data;
            state.loading = false;
            renderTimeline(data);
            if (typeof TodayMap !== 'undefined') {
                TodayMap.update(data);
            }
        } catch (error) {
            console.error('Failed to fetch events:', error);
            state.loading = false;
            showError(error.message);
        }
    }

    // ---- Hero Display ----
    function updateHeroDisplay() {
        const monthName = MONTHS[state.month - 1];
        const dateStr = `${monthName} ${state.day}`;
        dom.heroDate.textContent = dateStr;
        dom.headerSub.textContent = dateStr;
    }

    // ---- Loading / Error States ----
    function showLoading() {
        dom.timelineContainer.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Discovering historical events...</p>
            </div>
        `;
        dom.heroEventContainer.innerHTML = '';
    }

    function showError(msg) {
        dom.timelineContainer.innerHTML = `
            <div class="error-state">
                <h3>Unable to Load Events</h3>
                <p>${msg || 'Something went wrong. Please try again.'}</p>
                <button class="retry-btn" id="retry-btn">Retry</button>
            </div>
        `;
        dom.heroEventContainer.innerHTML = '';
        
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', fetchEvents);
        }
    }

    // ---- Render Timeline ----
    function renderTimeline(data) {
        const categoryKey = CATEGORY_MAP[state.category];
        let items = data[categoryKey] || [];

        if (items.length === 0) {
            dom.timelineContainer.innerHTML = `
                <div class="error-state">
                    <h3>No ${CATEGORY_TITLES[state.category]} Found</h3>
                    <p>Wikipedia doesn't have highlighted ${state.category} for this date.</p>
                </div>
            `;
            dom.heroEventContainer.innerHTML = '';
            return;
        }

        // Sort by year
        items.sort((a, b) => (a.year || 0) - (b.year || 0));

        // Find Hero Event (event with image and most pages)
        let heroEvent = null;
        const itemsWithImages = items.filter(e => findBestImage(e.pages));
        if (itemsWithImages.length > 0) {
            itemsWithImages.sort((a, b) => (b.pages?.length || 0) - (a.pages?.length || 0));
            heroEvent = itemsWithImages[0];
        } else if (items.length > 0) {
            const sortedByPages = [...items].sort((a, b) => (b.pages?.length || 0) - (a.pages?.length || 0));
            heroEvent = sortedByPages[0];
        }

        dom.heroEventContainer.innerHTML = '';
        if (heroEvent) {
            dom.heroEventContainer.appendChild(createHeroCard(heroEvent));
            items = items.filter(e => e !== heroEvent);
        }

        // Pick 5 spread across the timeline
        const selected = selectNotable(items, 5);

        // Build timeline
        dom.timelineContainer.innerHTML = '';
        selected.forEach((event, index) => {
            const eventEl = createTimelineEvent(event, index);
            eventEl.style.animationDelay = `${0.1 + index * 0.1}s`;
            dom.timelineContainer.appendChild(eventEl);
        });
    }

    function createHeroCard(event) {
        const card = document.createElement('div');
        card.className = 'tl-card hero-card';
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', 'Featured historical event: ' + (event.text || '').substring(0, 80));

        const year = event.year;
        const currentYear = new Date().getFullYear();
        const yearsAgo = year != null ? currentYear - year : null;

        const imgData = findBestImage(event.pages);

        // Image section
        const imgWrap = document.createElement('div');
        imgWrap.className = 'tl-card-img-wrap hero-img-wrap';

        if (imgData) {
            const img = document.createElement('img');
            img.className = 'tl-card-img';
            img.src = imgData.url;
            img.alt = imgData.title || 'Historical image';
            img.loading = 'lazy';
            img.onerror = function () {
                this.parentElement.innerHTML = buildNoImageHTML();
            };
            imgWrap.appendChild(img);
        } else {
            imgWrap.innerHTML = buildNoImageHTML();
        }
        card.appendChild(imgWrap);

        // Card body
        const body = document.createElement('div');
        body.className = 'tl-card-body';
        
        // Add Year info to hero body
        const yearWrap = document.createElement('div');
        yearWrap.className = 'hero-year-wrap';

        const yearNum = document.createElement('span');
        yearNum.className = 'hero-year-num';
        yearNum.textContent = year != null ? Math.abs(year) : '?';
        yearWrap.appendChild(yearNum);

        if (year != null) {
            const era = document.createElement('span');
            era.className = 'hero-year-era';
            era.textContent = year < 0 ? 'BCE' : 'CE';
            yearWrap.appendChild(era);
        }

        if (yearsAgo != null && yearsAgo > 0) {
            const ago = document.createElement('span');
            ago.className = 'hero-years-ago';
            ago.innerHTML = '&bull; ' + yearsAgo + ' yrs ago';
            yearWrap.appendChild(ago);
        }

        body.appendChild(yearWrap);

        const text = document.createElement('div');
        text.className = 'tl-card-text hero-text';
        text.textContent = event.text || 'No description available.';
        body.appendChild(text);

        // Links
        if (event.pages && event.pages.length > 0) {
            const links = document.createElement('div');
            links.className = 'tl-card-links';
            event.pages.slice(0, 4).forEach(page => {
                const a = document.createElement('a');
                a.className = 'tl-link';
                a.href = page.content_urls?.desktop?.page || '#';
                a.target = '_blank';
                a.rel = 'noopener';
                a.innerHTML = `
                    ${page.titles?.normalized || page.title}
                    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                `;
                links.appendChild(a);
            });
            body.appendChild(links);
        }

        card.appendChild(body);
        return card;
    }

    function selectNotable(items, count) {
        if (items.length <= count) return items;
        const result = [];
        const step = items.length / count;
        for (let i = 0; i < count; i++) {
            const idx = Math.min(Math.floor(i * step), items.length - 1);
            result.push(items[idx]);
        }
        return result;
    }

    // ---- Create Timeline Event ----
    function createTimelineEvent(event, index) {
        const el = document.createElement('div');
        el.className = 'timeline-event' + (state.category !== 'events' ? ' bio-event' : '');
        el.setAttribute('role', 'article');
        el.setAttribute('aria-label', (event.year || '') + ': ' + (event.text || '').substring(0, 80));

        const year = event.year;
        const currentYear = new Date().getFullYear();
        const yearsAgo = year != null ? currentYear - year : null;

        // Find the best thumbnail from pages
        const imgData = findBestImage(event.pages);

        // Year column
        const yearCol = document.createElement('div');
        yearCol.className = 'tl-year';

        const yearNumDiv = document.createElement('div');
        yearNumDiv.className = 'tl-year-num';
        yearNumDiv.textContent = year != null ? Math.abs(year) : '?';
        yearCol.appendChild(yearNumDiv);

        if (year != null) {
            const eraDiv = document.createElement('div');
            eraDiv.className = 'tl-year-era';
            eraDiv.textContent = year < 0 ? 'BCE' : 'CE';
            yearCol.appendChild(eraDiv);
        }

        if (yearsAgo != null && yearsAgo > 0) {
            const agoDiv = document.createElement('div');
            agoDiv.className = 'tl-years-ago';
            agoDiv.textContent = yearsAgo + ' yrs ago';
            yearCol.appendChild(agoDiv);
        }

        // Card wrap (includes the dot)
        const cardWrap = document.createElement('div');
        cardWrap.className = 'tl-card-wrap';

        const card = document.createElement('div');
        card.className = 'tl-card';

        // Image section
        const imgWrap = document.createElement('div');
        imgWrap.className = 'tl-card-img-wrap';

        if (imgData) {
            const img = document.createElement('img');
            img.className = 'tl-card-img';
            img.src = imgData.url;
            img.alt = imgData.title || 'Historical image';
            img.loading = 'lazy';
            // Fallback if image fails
            img.onerror = function () {
                this.parentElement.innerHTML = buildNoImageHTML();
            };

            imgWrap.appendChild(img);

            // Caption overlay
            if (imgData.title) {
                const caption = document.createElement('div');
                caption.className = 'tl-img-caption';
                caption.textContent = imgData.title;
                imgWrap.appendChild(caption);
            }
        } else {
            imgWrap.innerHTML = buildNoImageHTML();
        }
        card.appendChild(imgWrap);

        // Card body
        const body = document.createElement('div');
        body.className = 'tl-card-body';

        const text = document.createElement('div');
        text.className = 'tl-card-text';
        text.textContent = event.text || 'No description available.';
        body.appendChild(text);

        // Links
        if (event.pages && event.pages.length > 0) {
            const links = document.createElement('div');
            links.className = 'tl-card-links';
            const maxLinks = Math.min(event.pages.length, 3);
            for (let i = 0; i < maxLinks; i++) {
                const page = event.pages[i];
                const url = page.content_urls?.desktop?.page;
                if (url) {
                    const a = document.createElement('a');
                    a.className = 'tl-link';
                    a.href = url;
                    a.target = '_blank';
                    a.rel = 'noopener';
                    a.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        ${truncate(page.titles?.normalized || page.title, 32)}
                    `;
                    links.appendChild(a);
                }
            }
            body.appendChild(links);
        }

        card.appendChild(body);
        cardWrap.appendChild(card);

        el.appendChild(yearCol);
        el.appendChild(cardWrap);

        return el;
    }

    // ---- Image Extraction ----
    function findBestImage(pages) {
        if (!pages || pages.length === 0) return null;

        // The Wikipedia API returns `thumbnail` and `originalimage` on page objects
        // Try to find the best quality image from any page
        for (const page of pages) {
            // Prefer originalimage for higher quality, fall back to thumbnail
            const orig = page.originalimage;
            const thumb = page.thumbnail;

            if (orig && orig.source) {
                return {
                    url: orig.source,
                    title: page.titles?.normalized || page.title,
                    width: orig.width,
                    height: orig.height,
                };
            }
            if (thumb && thumb.source) {
                // Request a wider version from Wikimedia thumbor
                // Replace width in the URL for a larger image
                let url = thumb.source;
                url = url.replace(/\/\d+px-/, '/640px-');
                return {
                    url: url,
                    title: page.titles?.normalized || page.title,
                    width: thumb.width,
                    height: thumb.height,
                };
            }
        }

        return null;
    }

    function buildNoImageHTML() {
        return `
            <div class="tl-card-noimg">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
            </div>
        `;
    }

    // ---- Utility ----
    function truncate(text, maxLen) {
        if (!text) return '';
        return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    }

    // ---- Bootstrap ----
    document.addEventListener('DOMContentLoaded', () => {
        init();

        // Scroll features
        const header = document.getElementById('app-header');
        const scrollBtn = document.getElementById('scroll-to-top');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
                scrollBtn.classList.add('visible');
            } else {
                header.classList.remove('scrolled');
                scrollBtn.classList.remove('visible');
            }
        });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Mobile nav
    const nav = document.getElementById('header-nav');
    if (nav) {
        const updateNav = () => {
            if (window.innerWidth <= 900) {
                nav.classList.add('mobile-visible');
            } else {
                nav.classList.remove('mobile-visible');
            }
        };
        updateNav();
        window.addEventListener('resize', updateNav);
    }
})();
