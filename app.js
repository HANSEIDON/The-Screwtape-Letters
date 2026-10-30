/**
 * C.S. 루이스 「스크루테이프의 편지」 캠퍼스 나눔 웹 애플리케이션
 */

(function () {
  'use strict';

  const STORAGE_KEY_MEMO_PREFIX = 'screwtape_memo_';
  const STORAGE_KEY_THEME = 'screwtape_theme';
  const STORAGE_KEY_UNLOCKED = 'screwtape_unlocked';
  const SITE_PASSWORD = 'pku1234';

  const state = {
    currentView: 'home', // 'home' | 'workspace'
    currentLetterId: 1,
    searchQuery: '',
    theme: 'light', // 'light' | 'sepia' | 'dark'
    mobileTab: 'reading' // 'reading' | 'note'
  };

  const els = {
    // Views
    viewHome: document.getElementById('viewHome'),
    viewWorkspace: document.getElementById('viewWorkspace'),

    // Nav
    brandHomeBtn: document.getElementById('brandHomeBtn'),
    navHomeBtn: document.getElementById('navHomeBtn'),
    backToListBtn: document.getElementById('backToListBtn'),

    // Theme
    themeLightBtn: document.getElementById('themeLightBtn'),
    themeSepiaBtn: document.getElementById('themeSepiaBtn'),
    themeDarkBtn: document.getElementById('themeDarkBtn'),

    // Home
    topicSearchInput: document.getElementById('topicSearchInput'),
    lettersGrid: document.getElementById('lettersGrid'),

    // Workspace Reading
    paneReading: document.getElementById('paneReading'),
    readingScrollArea: document.getElementById('readingScrollArea'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    letterSelectDropdown: document.getElementById('letterSelectDropdown'),

    chapBadge: document.getElementById('chapBadge'),
    chapTitle: document.getElementById('chapTitle'),
    chapSub: document.getElementById('chapSub'),

    bookGreeting: document.getElementById('bookGreeting'),
    bookBody: document.getElementById('bookBody'),
    bookSignature: document.getElementById('bookSignature'),
    bookFootnotes: document.getElementById('bookFootnotes'),
    guideContent: document.getElementById('guideContent'),

    // Workspace Note
    paneNote: document.getElementById('paneNote'),
    noteChapLabel: document.getElementById('noteChapLabel'),
    noteTextarea: document.getElementById('noteTextarea'),
    copyNoteBtn: document.getElementById('copyNoteBtn'),

    // Mobile Tabs
    splitContainer: document.getElementById('splitContainer'),
    tabBtnReading: document.getElementById('tabBtnReading'),
    tabBtnNote: document.getElementById('tabBtnNote')
  };

  function bindGate() {
    const form = document.getElementById('gateForm');
    const input = document.getElementById('gateInput');
    const error = document.getElementById('gateError');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value === SITE_PASSWORD) {
        try {
          localStorage.setItem(STORAGE_KEY_UNLOCKED, '1');
        } catch (err) {}
        document.documentElement.classList.add('unlocked');
      } else {
        error.hidden = false;
        input.value = '';
        input.focus();
      }
    });
  }

  function init() {
    bindGate();
    loadSettings();
    applyTheme(state.theme);
    populateDropdown();
    renderLettersGrid();
    bindEvents();
    handleRouting();
  }

  function loadSettings() {
    state.theme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.body.className = `theme-${theme}`;
    localStorage.setItem(STORAGE_KEY_THEME, theme);

    els.themeLightBtn.classList.toggle('active', theme === 'light');
    els.themeSepiaBtn.classList.toggle('active', theme === 'sepia');
    els.themeDarkBtn.classList.toggle('active', theme === 'dark');
  }

  function handleRouting() {
    const hash = window.location.hash;
    if (hash.startsWith('#letter-')) {
      const num = parseInt(hash.replace('#letter-', ''), 10);
      if (num >= 1 && num <= 31) {
        showWorkspace(num, false);
        return;
      }
    }
    showHome(false);
  }

  function showHome(updateHash = true) {
    state.currentView = 'home';
    els.viewHome.classList.add('active');
    els.viewWorkspace.classList.remove('active');
    els.navHomeBtn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (updateHash) {
      window.location.hash = '';
    }
  }

  function showWorkspace(letterId, updateHash = true) {
    state.currentView = 'workspace';
    state.currentLetterId = letterId;

    els.viewHome.classList.remove('active');
    els.viewWorkspace.classList.add('active');
    els.navHomeBtn.classList.remove('active');

    if (updateHash) {
      window.location.hash = `#letter-${letterId}`;
    }

    renderWorkspaceLetter(letterId);
    loadNoteText(letterId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function populateDropdown() {
    els.letterSelectDropdown.innerHTML = '';
    const letters = window.SCREWTAPE_DATA.letters || [];

    letters.forEach(letter => {
      const opt = document.createElement('option');
      opt.value = letter.id;
      opt.textContent = `${letter.title}: ${letter.summary.slice(0, 18)}...`;
      els.letterSelectDropdown.appendChild(opt);
    });

    els.letterSelectDropdown.addEventListener('change', (e) => {
      showWorkspace(parseInt(e.target.value, 10));
    });
  }

  function renderLettersGrid() {
    const letters = window.SCREWTAPE_DATA.letters || [];
    const query = state.searchQuery.trim().toLowerCase();

    const filtered = letters.filter(letter => {
      if (!query) return true;
      const combined = `${letter.title} ${letter.summary} ${letter.sub_summary}`.toLowerCase();
      return combined.includes(query);
    });

    els.lettersGrid.innerHTML = '';

    if (filtered.length === 0) {
      els.lettersGrid.innerHTML = '<div class="letters-empty">검색된 편지가 없습니다.</div>';
      return;
    }

    filtered.forEach(letter => {
      const card = document.createElement('div');
      card.className = 'letter-item-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${letter.title}: ${letter.summary}`);
      card.innerHTML = `
        <span class="item-num">${letter.id}</span>
        <div>
          <h3 class="item-summary">${escapeHtml(letter.summary)}</h3>
          <p class="item-sub">${escapeHtml(letter.sub_summary)}</p>
        </div>
      `;

      card.addEventListener('click', () => {
        showWorkspace(letter.id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showWorkspace(letter.id);
        }
      });

      els.lettersGrid.appendChild(card);
    });
  }

  function renderWorkspaceLetter(letterId) {
    const letters = window.SCREWTAPE_DATA.letters || [];
    const letter = letters.find(l => l.id === letterId);
    if (!letter) return;

    // Dropdown and buttons
    els.letterSelectDropdown.value = letterId;
    els.prevBtn.disabled = (letterId <= 1);
    els.nextBtn.disabled = (letterId >= 31);

    // Banner
    els.chapBadge.textContent = letter.title;
    els.chapTitle.textContent = `「${letter.summary}」`;
    els.chapSub.textContent = letter.sub_summary;

    // Book Greeting & Signature
    els.bookGreeting.textContent = letter.greeting || '사랑하는 웜우드에게';
    els.bookSignature.innerHTML = nl2br(letter.signature || '너를 아끼는 삼촌,\nScrewtape');

    // Book Body Paragraphs
    const paras = letter.book_paragraphs || [];
    els.bookBody.innerHTML = paras.map(p => `<p>${escapeHtml(p)}</p>`).join('');

    // Book Footnotes (if any)
    const fns = letter.book_footnotes || [];
    if (fns.length > 0) {
      els.bookFootnotes.classList.remove('hidden');
      els.bookFootnotes.innerHTML = fns.map(fn => `<div class="footnote-item">${escapeHtml(fn)}</div>`).join('');
    } else {
      els.bookFootnotes.classList.add('hidden');
      els.bookFootnotes.innerHTML = '';
    }

    // Guide Full Content (verbatim from study guide)
    els.guideContent.textContent = letter.guide_full || '';

    // Right Notepad Header Label
    els.noteChapLabel.textContent = letter.title;
  }

  // --- Notepad Management ---
  function loadNoteText(letterId) {
    const key = STORAGE_KEY_MEMO_PREFIX + letterId;
    const saved = localStorage.getItem(key) || '';
    els.noteTextarea.value = saved;
  }

  function saveNoteText() {
    const key = STORAGE_KEY_MEMO_PREFIX + state.currentLetterId;
    const val = els.noteTextarea.value;
    localStorage.setItem(key, val);
  }

  function copyNote() {
    saveNoteText();
    const letters = window.SCREWTAPE_DATA.letters || [];
    const letter = letters.find(l => l.id === state.currentLetterId) || { title: `제${state.currentLetterId}편`, summary: '' };
    const content = els.noteTextarea.value.trim();

    const formatted = `[${letter.title} 나눔 메모]
주제: 「${letter.summary}」

${content ? content : '(작성된 메모가 없습니다.)'}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(formatted).then(() => {
        setCopySuccess();
      }).catch(() => {
        fallbackCopy(formatted);
      });
    } else {
      fallbackCopy(formatted);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      setCopySuccess();
    } catch (e) {
      alert('복사에 실패했습니다. 직접 복사해주세요.');
    }
    document.body.removeChild(ta);
  }

  let copyTimer = null;
  function setCopySuccess() {
    els.copyNoteBtn.textContent = '복사됨';
    els.copyNoteBtn.classList.add('copied');
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      els.copyNoteBtn.textContent = '복사';
      els.copyNoteBtn.classList.remove('copied');
    }, 1800);
  }

  // --- Mobile Tabs ---
  function setMobileTab(tab) {
    state.mobileTab = tab;
    els.tabBtnReading.classList.toggle('active', tab === 'reading');
    els.tabBtnNote.classList.toggle('active', tab === 'note');

    els.splitContainer.classList.remove('tab-mode-reading', 'tab-mode-note');
    els.splitContainer.classList.add(`tab-mode-${tab}`);
  }

  // --- Helpers ---
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function nl2br(text) {
    if (!text) return '';
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  // --- Event Bindings ---
  function bindEvents() {
    els.brandHomeBtn.addEventListener('click', () => showHome());
    els.navHomeBtn.addEventListener('click', () => showHome());
    els.backToListBtn.addEventListener('click', () => showHome());

    // Theme
    els.themeLightBtn.addEventListener('click', () => applyTheme('light'));
    els.themeSepiaBtn.addEventListener('click', () => applyTheme('sepia'));
    els.themeDarkBtn.addEventListener('click', () => applyTheme('dark'));

    // Chapter nav prev/next
    els.prevBtn.addEventListener('click', () => {
      if (state.currentLetterId > 1) {
        showWorkspace(state.currentLetterId - 1);
      }
    });
    els.nextBtn.addEventListener('click', () => {
      if (state.currentLetterId < 31) {
        showWorkspace(state.currentLetterId + 1);
      }
    });

    // Search
    els.topicSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderLettersGrid();
    });

    // Notepad typing
    els.noteTextarea.addEventListener('input', saveNoteText);

    // Copy
    els.copyNoteBtn.addEventListener('click', copyNote);

    // Mobile tabs
    els.tabBtnReading.addEventListener('click', () => setMobileTab('reading'));
    els.tabBtnNote.addEventListener('click', () => setMobileTab('note'));

    // Hash navigation
    window.addEventListener('hashchange', handleRouting);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
