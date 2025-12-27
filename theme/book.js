// Solisp Book - Reading Progress Tracker
// Saves reading progress to localStorage and displays visual indicators

(function() {
    'use strict';

    const STORAGE_KEY = 'solisp-book-progress';

    // Initialize reading progress system
    function init() {
        createProgressBar();
        createChapterDots();
        loadProgress();
        setupScrollTracking();
        setupBookmarks();
        markCurrentChapterRead();
    }

    // Create the top progress bar
    function createProgressBar() {
        const bar = document.createElement('div');
        bar.id = 'reading-progress';
        document.body.prepend(bar);
    }

    // Create chapter progress dots on the side
    function createChapterDots() {
        const chapters = getChapterList();
        if (chapters.length === 0) return;

        const container = document.createElement('div');
        container.className = 'chapter-progress';
        container.title = 'Chapter progress';

        chapters.forEach((chapter, index) => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.dataset.chapter = chapter.href;
            dot.title = chapter.title;
            dot.addEventListener('click', () => {
                window.location.href = chapter.href;
            });
            container.appendChild(dot);
        });

        document.body.appendChild(container);
    }

    // Get list of chapters from sidebar
    function getChapterList() {
        const chapters = [];
        const links = document.querySelectorAll('.sidebar a[href]');
        links.forEach(link => {
            if (link.href && !link.closest('.part-title')) {
                chapters.push({
                    href: link.getAttribute('href'),
                    title: link.textContent.trim()
                });
            }
        });
        return chapters;
    }

    // Load saved progress from localStorage
    function loadProgress() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const progress = JSON.parse(saved);
                updateDotsFromProgress(progress);
                restoreScrollPosition(progress);
            }
        } catch (e) {
            console.warn('Could not load reading progress:', e);
        }
    }

    // Save progress to localStorage
    function saveProgress(data) {
        try {
            const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            const merged = { ...existing, ...data };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {
            console.warn('Could not save reading progress:', e);
        }
    }

    // Update chapter dots based on saved progress
    function updateDotsFromProgress(progress) {
        const dots = document.querySelectorAll('.chapter-progress .dot');
        const currentPath = getCurrentChapterPath();

        dots.forEach(dot => {
            const chapterPath = dot.dataset.chapter;
            if (progress.readChapters && progress.readChapters.includes(chapterPath)) {
                dot.classList.add('read');
            }
            if (chapterPath === currentPath) {
                dot.classList.add('current');
            }
        });
    }

    // Get current chapter path
    function getCurrentChapterPath() {
        const path = window.location.pathname;
        const match = path.match(/([^\/]+\.html)$/);
        return match ? match[1] : path;
    }

    // Restore scroll position for current chapter
    function restoreScrollPosition(progress) {
        const currentPath = getCurrentChapterPath();
        if (progress.scrollPositions && progress.scrollPositions[currentPath]) {
            const savedScroll = progress.scrollPositions[currentPath];
            // Delay to ensure content is loaded
            setTimeout(() => {
                window.scrollTo(0, savedScroll);
            }, 100);
        }
    }

    // Setup scroll tracking
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

    // Update the top progress bar
    function updateProgressBar() {
        const bar = document.getElementById('reading-progress');
        if (!bar) return;

        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = Math.min(progress, 100) + '%';
    }

    // Save current scroll position
    function saveScrollPosition() {
        const currentPath = getCurrentChapterPath();
        const scrollPositions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').scrollPositions || {};
        scrollPositions[currentPath] = window.scrollY;
        saveProgress({ scrollPositions });
    }

    // Check if chapter is fully read (scrolled to bottom)
    function checkReadCompletion() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? scrollTop / docHeight : 0;

        // Mark as read if scrolled past 90%
        if (progress > 0.9) {
            markCurrentChapterRead();
        }
    }

    // Mark current chapter as read
    function markCurrentChapterRead() {
        const currentPath = getCurrentChapterPath();
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const readChapters = saved.readChapters || [];

        if (!readChapters.includes(currentPath)) {
            readChapters.push(currentPath);
            saveProgress({ readChapters });

            // Update dot
            const dot = document.querySelector(`.chapter-progress .dot[data-chapter="${currentPath}"]`);
            if (dot) {
                dot.classList.add('read');
            }
        }
    }

    // Setup bookmark functionality
    function setupBookmarks() {
        // Create bookmark indicator
        const indicator = document.createElement('div');
        indicator.className = 'bookmark-indicator';
        indicator.innerHTML = 'Bookmark saved';
        document.body.appendChild(indicator);

        // Keyboard shortcut: Ctrl+B to bookmark
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                saveBookmark();
                showBookmarkIndicator(indicator);
            }
        });

        // Check for bookmark on load
        checkAndShowBookmark();
    }

    // Save bookmark at current position
    function saveBookmark() {
        const currentPath = getCurrentChapterPath();
        const bookmark = {
            path: currentPath,
            scroll: window.scrollY,
            timestamp: Date.now(),
            title: document.title
        };
        saveProgress({ bookmark });
    }

    // Show bookmark saved indicator
    function showBookmarkIndicator(indicator) {
        indicator.classList.add('visible');
        setTimeout(() => {
            indicator.classList.remove('visible');
        }, 2000);
    }

    // Check for existing bookmark and offer to restore
    function checkAndShowBookmark() {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (saved.bookmark && saved.bookmark.path !== getCurrentChapterPath()) {
            // Could show a "Continue reading?" prompt here
            console.log('Bookmark available:', saved.bookmark.title);
        }
    }

    // Get reading statistics
    function getReadingStats() {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const readChapters = saved.readChapters || [];
        const totalChapters = getChapterList().length;

        return {
            read: readChapters.length,
            total: totalChapters,
            percentage: totalChapters > 0 ? Math.round((readChapters.length / totalChapters) * 100) : 0
        };
    }

    // Clear all reading progress (for testing)
    window.clearReadingProgress = function() {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    };

    // Export stats function
    window.getReadingStats = getReadingStats;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
