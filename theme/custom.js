// Solisp Book - Premium Reading Experience
(function() {
    'use strict';
    const STORAGE_KEY = 'solisp-book-progress';
    const WORDS_PER_MINUTE = 200;

    function init() {
        createProgressBar();
        createBackToTop();
        createChapterInfo();
        addSkipToContent();
        loadProgress();
        setupScrollTracking();
        setupKeyboardNav();
        setupBookmarks();
        checkContinueReading();
    }

    function createProgressBar() {
        if (document.getElementById('reading-progress-bar')) return;
        var bar = document.createElement('div');
        bar.id = 'reading-progress-bar';
        document.body.prepend(bar);
    }

    function createBackToTop() {
        var btn = document.createElement('button');
        btn.className = 'back-to-top';
        btn.innerHTML = '\u2191';
        btn.setAttribute('aria-label', 'Back to top');
        btn.onclick = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };
        document.body.appendChild(btn);
    }

    function createMiniTOC() {
        var headings = document.querySelectorAll('.content main h2, .content main h3');
        if (headings.length < 3) return;

        var toc = document.createElement('nav');
        toc.className = 'mini-toc';
        toc.setAttribute('aria-label', 'Table of contents');

        var title = document.createElement('div');
        title.className = 'mini-toc-title';
        title.textContent = 'On this page';
        toc.appendChild(title);

        var ul = document.createElement('ul');
        headings.forEach(function(h, i) {
            if (!h.id) h.id = 'heading-' + i;
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = '#' + h.id;
            a.textContent = h.textContent;
            a.style.paddingLeft = h.tagName === 'H3' ? '16px' : '8px';
            li.appendChild(a);
            ul.appendChild(li);
        });
        toc.appendChild(ul);
        document.body.appendChild(toc);
    }

    function createChapterInfo() {
        var content = document.querySelector('.content main');
        if (!content) return;

        var text = content.textContent || '';
        var words = text.trim().split(/\s+/).length;
        var minutes = Math.ceil(words / WORDS_PER_MINUTE);

        var info = document.createElement('div');
        info.className = 'chapter-info';
        info.innerHTML = '<div class="reading-time">' + minutes + ' min read</div><div>' + words.toLocaleString() + ' words</div>';

        var firstHeading = content.querySelector('h1');
        if (firstHeading && firstHeading.nextSibling) {
            firstHeading.parentNode.insertBefore(info, firstHeading.nextSibling);
        }
    }

    function addSkipToContent() {
        var skip = document.createElement('a');
        skip.className = 'skip-to-content';
        skip.href = '#main-content';
        skip.textContent = 'Skip to content';
        document.body.prepend(skip);

        var main = document.querySelector('.content main');
        if (main) main.id = 'main-content';
    }

    function loadProgress() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                var progress = JSON.parse(saved);
                if (progress.fontSize) {
                    document.documentElement.style.fontSize = progress.fontSize;
                }
                restoreScrollPosition(progress);
            }
        } catch (e) {}
    }

    function saveProgress(data) {
        try {
            var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            for (var key in data) existing[key] = data[key];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
        } catch (e) {}
    }

    function getCurrentPath() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }

    function restoreScrollPosition(progress) {
        var path = getCurrentPath();
        if (progress.scrollPositions && progress.scrollPositions[path]) {
            setTimeout(function() { window.scrollTo(0, progress.scrollPositions[path]); }, 100);
        }
    }

    function setupScrollTracking() {
        var ticking = false;
        window.addEventListener('scroll', function() {
            if (!ticking) {
                requestAnimationFrame(function() {
                    updateProgressBar();
                    updateBackToTop();
                    updateMiniTOC();
                    saveScrollPosition();
                    if (getScrollPercent() > 0.9) markChapterRead();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    function getScrollPercent() {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        return h > 0 ? window.scrollY / h : 0;
    }

    function updateProgressBar() {
        var bar = document.getElementById('reading-progress-bar');
        if (bar) bar.style.width = Math.min(getScrollPercent() * 100, 100) + '%';
    }

    function updateBackToTop() {
        var btn = document.querySelector('.back-to-top');
        if (btn) btn.classList.toggle('visible', window.scrollY > 300);
    }

    function updateMiniTOC() {
        var toc = document.querySelector('.mini-toc');
        if (!toc) return;

        var headings = document.querySelectorAll('.content main h2, .content main h3');
        var links = toc.querySelectorAll('a');
        var current = null;

        headings.forEach(function(h, i) {
            if (h.getBoundingClientRect().top < 100) current = i;
        });

        links.forEach(function(a, i) { a.classList.toggle('active', i === current); });
    }

    function saveScrollPosition() {
        var path = getCurrentPath();
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        var scrollPositions = saved.scrollPositions || {};
        scrollPositions[path] = window.scrollY;
        saveProgress({ scrollPositions: scrollPositions, lastPage: path, lastVisit: Date.now() });
    }

    function markChapterRead() {
        var path = getCurrentPath();
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        var readChapters = saved.readChapters || [];
        if (readChapters.indexOf(path) === -1) {
            readChapters.push(path);
            saveProgress({ readChapters: readChapters });
        }
    }

    function setupKeyboardNav() {
        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch(e.key) {
                case 'j': window.scrollBy(0, 100); break;
                case 'k': window.scrollBy(0, -100); break;
                case 'Home': window.scrollTo(0, 0); break;
                case 'End': window.scrollTo(0, document.body.scrollHeight); break;
                case 'ArrowLeft': navigateChapter(-1); break;
                case 'ArrowRight': navigateChapter(1); break;
                case '?': toggleKeyboardHints(); break;
                case '+': case '=': adjustFontSize(1); break;
                case '-': adjustFontSize(-1); break;
                case 'b': if (e.ctrlKey) { e.preventDefault(); saveBookmark(); } break;
            }
        });

        createKeyboardHints();
    }

    function navigateChapter(dir) {
        var nav = document.querySelector(dir > 0 ? '.nav-chapters.next' : '.nav-chapters.previous');
        if (nav) nav.click();
    }

    function adjustFontSize(delta) {
        var current = parseFloat(getComputedStyle(document.documentElement).fontSize);
        var newSize = Math.max(14, Math.min(24, current + delta)) + 'px';
        document.documentElement.style.fontSize = newSize;
        saveProgress({ fontSize: newSize });
        showToast('Font size: ' + newSize);
    }

    function createKeyboardHints() {
        var hints = document.createElement('div');
        hints.className = 'keyboard-hints';
        hints.innerHTML = '<div><kbd>j</kbd>/<kbd>k</kbd> Scroll</div>' +
            '<div><kbd>\u2190</kbd>/<kbd>\u2192</kbd> Prev/Next</div>' +
            '<div><kbd>+</kbd>/<kbd>-</kbd> Font size</div>' +
            '<div><kbd>Ctrl+B</kbd> Bookmark</div>' +
            '<div><kbd>?</kbd> Toggle hints</div>';
        document.body.appendChild(hints);
    }

    function toggleKeyboardHints() {
        var hints = document.querySelector('.keyboard-hints');
        if (hints) hints.classList.toggle('visible');
    }

    function setupBookmarks() {
        var toast = document.createElement('div');
        toast.className = 'bookmark-toast';
        toast.textContent = 'Bookmark saved';
        document.body.appendChild(toast);
    }

    function saveBookmark() {
        saveProgress({
            bookmark: { path: getCurrentPath(), scroll: window.scrollY, time: Date.now() }
        });
        showToast('Bookmark saved');
    }

    function showToast(msg) {
        var toast = document.querySelector('.bookmark-toast');
        if (toast) {
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(function() { toast.classList.remove('show'); }, 2000);
        }
    }

    function checkContinueReading() {
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        var current = getCurrentPath();

        if (saved.bookmark && saved.bookmark.path !== current && current.indexOf('index') !== -1) {
            showContinueBanner(saved.bookmark);
        }
    }

    function showContinueBanner(bookmark) {
        var banner = document.createElement('div');
        banner.className = 'continue-banner';
        banner.innerHTML = '<div class="continue-banner-text">Continue where you left off?</div>' +
            '<div class="continue-banner-actions">' +
            '<button onclick="this.parentElement.parentElement.remove()">Dismiss</button>' +
            '<button class="primary" onclick="window.location.href=\'' + bookmark.path + '\'">Continue</button>' +
            '</div>';
        document.body.appendChild(banner);
        setTimeout(function() { banner.classList.add('visible'); }, 100);
    }

    window.clearReadingProgress = function() { localStorage.removeItem(STORAGE_KEY); location.reload(); };
    window.getReadingStats = function() { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
