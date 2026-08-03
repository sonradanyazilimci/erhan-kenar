/**
 * ui.js
 * -----------------------------------------------------------------------
 * Genel arayüz yardımcıları: toast bildirimleri, modal, ripple efekti,
 * tema anahtarı, mobil menü, accordion ve form doğrulama yardımcıları.
 * Hem index.html hem admin.html tarafından paylaşılır.
 */
(function (global) {
  'use strict';

  /* ------------------------------- Tema ------------------------------- */
  const THEME_KEY = 'app_theme_mode';

  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', mode);
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'auto';
    applyTheme(saved);

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
      });
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if ((localStorage.getItem(THEME_KEY) || 'auto') === 'auto') applyTheme('auto');
    });
  }

  /* ------------------------------- Toast ------------------------------- */
  function toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.style.animation = 'toast-in 0.35s ease-out';
    const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };
    el.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'toast-out 0.3s ease-in forwards';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  /* ------------------------------- Ripple ------------------------------- */
  function attachRipple(selector = '.btn') {
    document.addEventListener('click', (e) => {
      const target = e.target.closest(selector);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      target.style.position = target.style.position || 'relative';
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  }

  /* --------------------------- Mobil Menü --------------------------- */
  function initMobileMenu() {
    const navbar = document.getElementById('navbar');
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', () => {
      menu.classList.toggle('is-open');
      navbar.classList.toggle('menu-open');
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('.navbar__link')) {
        menu.classList.remove('is-open');
        navbar.classList.remove('menu-open');
      }
    });
  }

  /* ----------------------------- Accordion ----------------------------- */
  function initAccordion(container) {
    if (!container) return;
    container.addEventListener('click', (e) => {
      const head = e.target.closest('.accordion-item__head');
      if (!head) return;
      const item = head.closest('.accordion-item');
      const body = item.querySelector('.accordion-item__body');
      const isOpen = item.classList.contains('is-open');

      container.querySelectorAll('.accordion-item.is-open').forEach((openItem) => {
        openItem.classList.remove('is-open');
        openItem.querySelector('.accordion-item__body').style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add('is-open');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  }

  /* --------------------------- Form Doğrulama --------------------------- */
  function validateField(input, rules = {}) {
    const field = input.closest('.field');
    const errorEl = field ? field.querySelector('.field__error') : null;
    let message = '';

    if (rules.required && !input.value.trim()) {
      message = 'Bu alan zorunludur.';
    } else if (rules.email && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      message = 'Geçerli bir e-posta adresi girin.';
    } else if (rules.minLength && input.value.length < rules.minLength) {
      message = `En az ${rules.minLength} karakter girmelisiniz.`;
    }

    if (field) field.classList.toggle('has-error', !!message);
    if (errorEl) errorEl.textContent = message;
    return !message;
  }

  /* ------------------------------- Modal ------------------------------- */
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('is-open');
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('is-open');
  }
  function initModalCloseHandlers() {
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('is-open');
      });
    });
  }

  /* --------------------------- Password Toggle --------------------------- */
  function initPasswordToggles() {
    document.querySelectorAll('.field__password-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = btn.closest('.field').querySelector('input');
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? '🙈' : '👁️';
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }

  global.UI = {
    initTheme,
    applyTheme,
    toast,
    attachRipple,
    initMobileMenu,
    initAccordion,
    validateField,
    openModal,
    closeModal,
    initModalCloseHandlers,
    initPasswordToggles,
    escapeHtml,
    formatDate
  };
})(window);
