// Solisp Book - Reading Progress Tracker
(function() {
    'use strict';

    const STORAGE_KEY = 'solisp-book-progress';

    function init() {
        createProgressBar();
        loadProgress();
        setupScrollTracking();
        setupBookmarks();
    }

    function createProgressBar() {
        if (document.getElementById('reading-progress-bar')) return;
        const bar = document.createElement('div');
        bar.id = 'reading-progress-bar';
        document.body.prepend(bar);
    }

    function loadProgress() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const progress = JSON.parse(saved);
                restoreScrollPosition(progress);
            }
        } catch (e) {
            console.warn('Could not load reading progress:', e);
        }
    }

    function saveProgress(data) {
        try {
            const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            const merged = { ...existing, ...data };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {
            console.warn('Could not save reading progress:', e);
        }
    }

    function getCurrentChapterPath() {
        const path = window.location.pathname;
        const match = path.match(/([^\/]+\.html)$/);
        return match ? match[1] : path;
    }

    function restoreScrollPosition(progress) {
        const currentPath = getCurrentChapterPath();
        if (progress.scrollPositions && progress.scrollPositions[currentPath]) {
            setTimeout(() => {
                window.scrollTo(0, progress.scrollPositions[currentPath]);
            }, 100);
        }
    }

    function setupScrollTracking() {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    updateProgressBar();
                    saveScrollPosition();
                    checkReadCompletion();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    function updateProgressBar() {
        const bar = document.getElementById('reading-progress-bar');
        if (!bar) return;
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = Math.min(progress, 100) + '%';
    }

    function saveScrollPosition() {
        const currentPath = getCurrentChapterPath();
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const scrollPositions = saved.scrollPositions || {};
        scrollPositions[currentPath] = window.scrollY;
        saveProgress({ scrollPositions });
    }

    function checkReadCompletion() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? scrollTop / docHeight : 0;
        if (progress > 0.9) {
            markCurrentChapterRead();
        }
    }

    function markCurrentChapterRead() {
        const currentPath = getCurrentChapterPath();
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const readChapters = saved.readChapters || [];
        if (!readChapters.includes(currentPath)) {
            readChapters.push(currentPath);
            saveProgress({ readChapters });
        }
    }

    function setupBookmarks() {
        const toast = document.createElement('div');
        toast.className = 'bookmark-toast';
        toast.textContent = 'Bookmark saved';
        document.body.appendChild(toast);

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                saveBookmark();
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            }
        });
    }

    function saveBookmark() {
        const bookmark = {
            path: getCurrentChapterPath(),
            scroll: window.scrollY,
            timestamp: Date.now(),
            title: document.title
        };
        saveProgress({ bookmark });
    }

    window.clearReadingProgress = function() {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
