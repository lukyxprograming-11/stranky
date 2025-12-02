/* script.js — final: services autoplay s max 2 posuny před resetem + banners + safe init */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- helper: počkej na obrázky v containeru (fallback timeout) ---------- */
  function waitForImagesIn(container, timeoutMs = 2000) {
    if (!container) return Promise.resolve();
    const imgs = Array.from(container.querySelectorAll('img'));
    if (imgs.length === 0) return Promise.resolve();

    let resolved = false;
    return new Promise(resolve => {
      const done = () => { if (!resolved) { resolved = true; resolve(); } };
      const promises = imgs.map(img => {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
        return new Promise(res => {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        });
      });
      Promise.all(promises).then(done).catch(done);
      setTimeout(done, timeoutMs);
    });
  }

  /* ---------- generická interaktivita (hover / active) ---------- */
  function setupListInteractivity(listSelector, itemSelector) {
    const lists = document.querySelectorAll(listSelector);
    lists.forEach(list => {
      const items = list.querySelectorAll(itemSelector);
      if (items.length === 0) return;
      items.forEach(item => {
        item.addEventListener('mouseenter', () => {
          list.classList.add('list-active');
          items.forEach(i => i.classList.remove('is-active'));
          item.classList.add('is-active');
        });
        item.addEventListener('mouseleave', () => { item.classList.remove('is-active'); });
      });
      list.addEventListener('mouseleave', () => {
        list.classList.remove('list-active');
        items.forEach(i => i.classList.remove('is-active'));
      });
      list.addEventListener('mouseover', () => list.classList.add('list-active'));
    });
  }
  setupListInteractivity('.services-list', '.service-item');
  setupListInteractivity('.packages-list, .packages-list-scrollable', '.package-wrapper');


  /***************************
   *  SERVICES (carousel)
   ***************************/
  const servicesList = document.querySelector('.services-list');
  const scrollLeftBtn = document.getElementById('scroll-left');
  const scrollRightBtn = document.getElementById('scroll-right');

  function getServiceCardWidth() {
    const first = servicesList ? servicesList.querySelector('.service-item') : null;
    if (!first) return Math.round(window.innerWidth * 0.8);
    const rect = first.getBoundingClientRect();
    const style = getComputedStyle(first);
    const marginRight = parseFloat(style.marginRight || 0);
    return Math.round(rect.width + marginRight);
  }

  function updateServiceArrows() {
    if (!servicesList || !scrollLeftBtn || !scrollRightBtn) return;
    const tol = 5;
    scrollLeftBtn.style.visibility = servicesList.scrollLeft > tol ? 'visible' : 'hidden';
    scrollRightBtn.style.visibility = (servicesList.scrollLeft + servicesList.clientWidth >= servicesList.scrollWidth - tol) ? 'hidden' : 'visible';
  }

  if (scrollLeftBtn) scrollLeftBtn.addEventListener('click', e => {
    e.preventDefault();
    servicesList.scrollBy({ left: -getServiceCardWidth(), behavior: 'smooth' });
    setTimeout(updateServiceArrows, 600);
    pauseAutoplayTemporarilyServices();
  });
  if (scrollRightBtn) scrollRightBtn.addEventListener('click', e => {
    e.preventDefault();
    servicesList.scrollBy({ left: getServiceCardWidth(), behavior: 'smooth' });
    setTimeout(updateServiceArrows, 600);
    pauseAutoplayTemporarilyServices();
  });

  let autoplayTimerServices = null;
  let autoplayPausedServices = false;
  let isDraggingServices = false;
  let dragStartX = 0;
  let scrollStartX = 0;
  const autoplayIntervalServices = 3500;
  const pauseAfterInteractionMsServices = 2000;
  let resumeTimeoutServices = null;

  /**
   * Nová logika autoplay: posuneme maximálně 2× (indexy 0→1, 1→2), 
   * pak uděláme reset na začátek. Tím předejdeme "konec->skok" chování.
   */
  function startAutoplayServices() {
    stopAutoplayServices();
    autoplayTimerServices = setInterval(() => {
      if (autoplayPausedServices || isDraggingServices || !servicesList) return;

      const step = getServiceCardWidth();
      // spočítáme aktuální index (0-based) podle scrollLeft/step
      const currentIndex = Math.round(servicesList.scrollLeft / step);
      // povolíme pouze indexy 0 a 1 k posunu dál; pokud jsme na indexu >=2, resetneme
      // (tolerance malého zaokrouhlení)
      if (currentIndex >= 2) {
        // reset na začátek (místo posunu o další krok)
        servicesList.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        servicesList.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, autoplayIntervalServices);
  }
  function stopAutoplayServices() { if (autoplayTimerServices) { clearInterval(autoplayTimerServices); autoplayTimerServices = null; } }
  function pauseAutoplayServices() { autoplayPausedServices = true; stopAutoplayServices(); }
  function resumeAutoplayServices() { autoplayPausedServices = false; startAutoplayServices(); }
  function pauseAutoplayTemporarilyServices(ms = pauseAfterInteractionMsServices) {
    pauseAutoplayServices();
    if (resumeTimeoutServices) clearTimeout(resumeTimeoutServices);
    resumeTimeoutServices = setTimeout(() => resumeAutoplayServices(), ms);
  }

  if (servicesList) {
    servicesList.addEventListener('mouseenter', () => pauseAutoplayServices());
    servicesList.addEventListener('mouseleave', () => resumeAutoplayServices());

    servicesList.addEventListener('touchstart', (e) => {
      isDraggingServices = true; pauseAutoplayServices();
      dragStartX = e.touches[0].clientX; scrollStartX = servicesList.scrollLeft;
    }, { passive: true });

    servicesList.addEventListener('touchmove', (e) => {
      const dx = dragStartX - e.touches[0].clientX; servicesList.scrollLeft = scrollStartX + dx;
    }, { passive: true });

    servicesList.addEventListener('touchend', () => {
      isDraggingServices = false; setTimeout(updateServiceArrows, 120); pauseAutoplayTemporarilyServices(1600);
    });

    servicesList.addEventListener('mousedown', (e) => {
      isDraggingServices = true; pauseAutoplayServices();
      servicesList.classList.add('dragging'); dragStartX = e.clientX; scrollStartX = servicesList.scrollLeft; e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => { if (!isDraggingServices) return; const dx = dragStartX - e.clientX; servicesList.scrollLeft = scrollStartX + dx; });
    document.addEventListener('mouseup', () => { if (!isDraggingServices) return; isDraggingServices = false; servicesList.classList.remove('dragging'); setTimeout(updateServiceArrows,120); pauseAutoplayTemporarilyServices(); });

    servicesList.addEventListener('scroll', () => updateServiceArrows(), { passive: true });
  }


  /***************************
   *  BANNERS (carousel)
   ***************************/
  const bannersContainer = document.querySelector('.banners-container');
  const bannerLeftBtn = document.getElementById('scroll-left-banner');
  const bannerRightBtn = document.getElementById('scroll-right-banner');

  function getBannerSlideWidth() {
    const first = bannersContainer ? bannersContainer.querySelector('.banner-slide') : null;
    if (!first) return bannersContainer ? bannersContainer.clientWidth : 0;
    const rect = first.getBoundingClientRect();
    const style = getComputedStyle(first);
    const marginRight = parseFloat(style.marginRight || 0);
    return Math.round(rect.width + marginRight);
  }

  function updateBannerArrows() {
    if (!bannersContainer || !bannerLeftBtn || !bannerRightBtn) return;
    const tol = 5;
    bannerLeftBtn.style.visibility = bannersContainer.scrollLeft > tol ? 'visible' : 'hidden';
    bannerRightBtn.style.visibility = (bannersContainer.scrollLeft + bannersContainer.clientWidth >= bannersContainer.scrollWidth - tol) ? 'hidden' : 'visible';
  }

  if (bannerLeftBtn) bannerLeftBtn.addEventListener('click', e => {
    e.preventDefault();
    const w = getBannerSlideWidth();
    bannersContainer.scrollBy({ left: -w, behavior: 'smooth' });
    setTimeout(updateBannerArrows, 350);
    pauseAutoplayTemporarilyBanners();
  });
  if (bannerRightBtn) bannerRightBtn.addEventListener('click', e => {
    e.preventDefault();
    const w = getBannerSlideWidth();
    bannersContainer.scrollBy({ left: w, behavior: 'smooth' });
    setTimeout(updateBannerArrows, 350);
    pauseAutoplayTemporarilyBanners();
  });

  let bannerTimer = null;
  let bannerPaused = false;
  let isDraggingBanners = false;
  let bannerDragStartX = 0;
  let bannerScrollStartX = 0;
  const bannerInterval = 4000;
  const bannerPauseAfterInteraction = 2200;
  let bannerResumeTimeout = null;

  function startBannerAutoplay() {
    stopBannerAutoplay();
    bannerTimer = setInterval(() => {
      if (bannerPaused || isDraggingBanners || !bannersContainer) return;
      const w = getBannerSlideWidth();
      const max = bannersContainer.scrollWidth - bannersContainer.clientWidth;
      if (bannersContainer.scrollLeft >= max - 10) bannersContainer.scrollTo({ left: 0, behavior: 'smooth' });
      else bannersContainer.scrollBy({ left: w, behavior: 'smooth' });
    }, bannerInterval);
  }
  function stopBannerAutoplay() { if (bannerTimer) { clearInterval(bannerTimer); bannerTimer = null; } }
  function pauseBannerAutoplay() { bannerPaused = true; stopBannerAutoplay(); }
  function resumeBannerAutoplay() { bannerPaused = false; startBannerAutoplay(); }
  function pauseAutoplayTemporarilyBanners(ms = bannerPauseAfterInteraction) {
    pauseBannerAutoplay();
    if (bannerResumeTimeout) clearTimeout(bannerResumeTimeout);
    bannerResumeTimeout = setTimeout(() => resumeBannerAutoplay(), ms);
  }

  if (bannersContainer) {
    bannersContainer.addEventListener('mouseenter', () => pauseBannerAutoplay());
    bannersContainer.addEventListener('mouseleave', () => resumeBannerAutoplay());
    bannersContainer.addEventListener('touchstart', e => {
      isDraggingBanners = true; pauseBannerAutoplay();
      bannerDragStartX = e.touches[0].clientX; bannerScrollStartX = bannersContainer.scrollLeft;
    }, { passive: true });
    bannersContainer.addEventListener('touchmove', e => { const dx = bannerDragStartX - e.touches[0].clientX; bannersContainer.scrollLeft = bannerScrollStartX + dx; }, { passive: true });
    bannersContainer.addEventListener('touchend', () => { isDraggingBanners = false; setTimeout(updateBannerArrows,120); pauseAutoplayTemporarilyBanners(1600); });

    bannersContainer.addEventListener('mousedown', e => { isDraggingBanners = true; pauseBannerAutoplay(); bannersContainer.classList.add('dragging'); bannerDragStartX = e.clientX; bannerScrollStartX = bannersContainer.scrollLeft; e.preventDefault(); });
    document.addEventListener('mousemove', e => { if (!isDraggingBanners) return; const dx = bannerDragStartX - e.clientX; bannersContainer.scrollLeft = bannerScrollStartX + dx; });
    document.addEventListener('mouseup', () => { if (!isDraggingBanners) return; isDraggingBanners = false; bannersContainer.classList.remove('dragging'); setTimeout(updateBannerArrows,120); pauseAutoplayTemporarilyBanners(); });

    bannersContainer.addEventListener('scroll', () => updateBannerArrows(), { passive: true });
    setTimeout(updateBannerArrows, 50);
  }

  /* ---------- SAFE INIT: počkej na obrázky a nastav scrollLeft=0 bez smooth (žádný počáteční poskok) ---------- */
  (async function initSafely() {
    // services
    if (servicesList) {
      const prev = servicesList.style.scrollBehavior;
      servicesList.style.scrollBehavior = 'auto';
      servicesList.scrollLeft = 0;
      await waitForImagesIn(servicesList, 2000);
      requestAnimationFrame(() => {
        servicesList.style.scrollBehavior = prev || 'smooth';
        setTimeout(() => { updateServiceArrows(); startAutoplayServices(); }, 80);
      });
    }

    // banners
    if (bannersContainer) {
      const prevB = bannersContainer.style.scrollBehavior;
      bannersContainer.style.scrollBehavior = 'auto';
      bannersContainer.scrollLeft = 0;
      await waitForImagesIn(bannersContainer, 2000);
      requestAnimationFrame(() => {
        bannersContainer.style.scrollBehavior = prevB || 'smooth';
        setTimeout(() => { updateBannerArrows(); startBannerAutoplay(); }, 80);
      });
    }
  })();

  // resize recalc
  window.addEventListener('resize', () => { setTimeout(() => { updateServiceArrows(); updateBannerArrows(); }, 120); });

}); // DOMContentLoaded
