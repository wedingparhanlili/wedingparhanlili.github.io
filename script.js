(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const weddingDate = new Date("2026-10-25T11:00:00+08:00");
  const address = "Panjang Selatan, Desa Labbo, Kec. Tompobulu, Kab. Bantaeng";
  const body = document.body;
  let toastTimer;

  function toast(message) {
    const element = $("#toast");
    if (!element) return;
    clearTimeout(toastTimer);
    element.textContent = message;
    element.classList.add("is-visible");
    toastTimer = setTimeout(() => element.classList.remove("is-visible"), 4200);
  }

  // Guest names are treated exclusively as text, including names supplied in the URL.
  const query = new URLSearchParams(window.location.search);
  const guest = (query.get("to") || query.get("nama") || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "Tamu Istimewa";
  $$("[data-guest]").forEach((element) => { element.textContent = guest; });
  if (guest.length > 45) body.classList.add("has-long-guest");

  const cover = $("#cover");
  const invitation = $("#invitation");
  const openButton = $("#open-invitation");
  let opening = false;

  function openInvitation() {
    if (opening || body.classList.contains("is-open")) return;
    opening = true;
    // Start inside this user gesture, before the transition timer, for mobile browsers.
    startMusic();
    if (openButton) {
      openButton.disabled = true;
      openButton.setAttribute("aria-expanded", "true");
    }
    body.classList.add("is-opening");
    setTimeout(() => {
      if (cover) cover.hidden = true;
      if (invitation) {
        invitation.inert = false;
        invitation.removeAttribute("inert");
        invitation.removeAttribute("aria-hidden");
      }
      body.classList.remove("is-opening", "is-locked");
      body.classList.add("is-open");
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const title = $("#main-title");
      if (title) {
        if (!title.hasAttribute("tabindex")) title.setAttribute("tabindex", "-1");
        title.focus({ preventScroll: true });
      }
      opening = false;
      window.dispatchEvent(new Event("invitation:opened"));
    }, motionPreference.matches ? 100 : 2300);
  }
  if (openButton) openButton.addEventListener("click", openInvitation);

  function updateCountdown() {
    const difference = Math.max(0, weddingDate.getTime() - Date.now());
    const seconds = Math.floor(difference / 1000);
    const values = {
      days: Math.floor(seconds / 86400),
      hours: Math.floor(seconds / 3600) % 24,
      minutes: Math.floor(seconds / 60) % 60,
      seconds: seconds % 60,
    };
    Object.entries(values).forEach(([key, value]) => {
      $$(`[data-count="${key}"]`).forEach((element) => {
        const next = String(value).padStart(2, "0");
        if (element.textContent !== next) element.textContent = next;
      });
    });
    const label = $("#countdown-label");
    if (label && difference === 0) {
      label.textContent = Date.now() < weddingDate.getTime() + 86400000
        ? "Hari bahagia telah tiba"
        : "Terima kasih atas doa dan restunya";
    }
  }
  updateCountdown();
  const countdownTimer = setInterval(updateCountdown, 1000);

  $$("[data-map-link]").forEach((link) => {
    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (_) { /* Older browsers and local files use the selection fallback. */ }
    }
    const previousFocus = document.activeElement;
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.setAttribute("aria-label", "Teks untuk disalin");
    Object.assign(field.style, { position: "fixed", left: "-9999px", top: "0", opacity: "0" });
    document.body.append(field);
    field.focus({ preventScroll: true });
    field.select();
    field.setSelectionRange(0, field.value.length);
    let copied = false;
    try { copied = document.execCommand("copy"); } catch (_) { /* Report the outcome below. */ }
    field.remove();
    if (previousFocus && previousFocus.focus) previousFocus.focus({ preventScroll: true });
    return copied;
  }

  $("#copy-address")?.addEventListener("click", async () => {
    toast(await copyText(address)
      ? "Alamat berhasil disalin. Sampai bertemu!"
      : "Alamat belum tersalin. Silakan salin alamat pada bagian lokasi.");
  });

  $("#copy-account")?.addEventListener("click", async () => {
    toast(await copyText("901891764225")
      ? "Nomor rekening SeaBank berhasil disalin. Terima kasih atas tanda kasih Anda."
      : "Nomor rekening belum tersalin. Silakan salin 901891764225 secara manual.");
  });

  const galleryDialog = $("#gallery-dialog");
  const galleryImage = $("#gallery-full");
  const galleryCaption = $("#gallery-caption");
  const galleryItems = $$("[data-gallery-item]").filter((item) => {
    const image = $("img", item);
    return image && (image.currentSrc || image.getAttribute("src"));
  });
  let galleryIndex = 0;
  let galleryTrigger;

  function showGalleryImage(index) {
    if (!galleryImage || !galleryItems.length) return false;
    galleryIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[galleryIndex];
    const image = $("img", item);
    const source = image?.currentSrc || image?.src;
    if (!source) return false;
    // Read the rendered thumbnail source so embedded data URLs work in the single-file version.
    galleryImage.src = source;
    galleryImage.alt = image.alt || "Foto Parhan dan Lili";
    if (galleryCaption) galleryCaption.textContent = item.dataset.caption || galleryImage.alt;
    return true;
  }

  galleryItems.forEach((item, index) => {
    item.addEventListener("click", () => {
      if (!galleryDialog || invitation?.inert || body.classList.contains("is-locked") || opening) return;
      if (typeof galleryDialog.showModal !== "function") {
        toast("Browser ini belum mendukung tampilan foto penuh.");
        return;
      }
      if (!showGalleryImage(index)) return;
      galleryTrigger = item;
      if (!galleryDialog.open) galleryDialog.showModal();
      body.classList.add("is-gallery-open");
      $("#gallery-close")?.focus({ preventScroll: true });
    });
  });

  $("#gallery-close")?.addEventListener("click", () => galleryDialog?.close());
  $("#gallery-prev")?.addEventListener("click", () => showGalleryImage(galleryIndex - 1));
  $("#gallery-next")?.addEventListener("click", () => showGalleryImage(galleryIndex + 1));
  galleryDialog?.addEventListener("keydown", (event) => {
    if (!galleryDialog.open || !galleryItems.length) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showGalleryImage(galleryIndex + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  galleryDialog?.addEventListener("click", (event) => {
    if (event.target !== galleryDialog) return;
    const rectangle = galleryDialog.getBoundingClientRect();
    if (event.clientX < rectangle.left || event.clientX > rectangle.right ||
        event.clientY < rectangle.top || event.clientY > rectangle.bottom) {
      galleryDialog.close();
    }
  });
  galleryDialog?.addEventListener("close", () => {
    body.classList.remove("is-gallery-open");
    if (galleryTrigger?.isConnected && !invitation?.inert && !body.classList.contains("is-locked")) {
      galleryTrigger.focus({ preventScroll: true });
    }
  });

  $("#share-invitation")?.addEventListener("click", async () => {
    if (window.location.protocol === "file:") {
      toast("Bagikan tautannya setelah undangan diunggah ke hosting.");
      return;
    }
    const shareURL = new URL(window.location.href);
    shareURL.hash = "";
    const data = {
      title: "Undangan Pernikahan Parhan & Lili",
      text: "Dengan bahagia kami mengundang Anda ke pernikahan Parhan & Lili, Minggu, 25 Oktober 2026.",
      url: shareURL.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    toast(await copyText(shareURL.href)
      ? "Tautan undangan berhasil disalin."
      : "Tautan belum tersalin. Salin tautan dari bilah alamat browser.");
  });

  function calendarText(value) {
    return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
  }

  $("#save-date")?.addEventListener("click", () => {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Parhan dan Lili//Undangan Pernikahan//ID",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:lili-parhan-20261025@undangan.local",
      `DTSTAMP:${stamp}`,
      "DTSTART:20261025T030000Z",
      "SUMMARY:Akad Nikah Parhan & Lili",
      `LOCATION:${calendarText(address)}`,
      `DESCRIPTION:${calendarText("Akad nikah M. Parhan Pawis (Parhan) dan Sulis Saputri (Lili). Minggu, 25 Oktober 2026, pukul 11.00 WITA. Merupakan suatu kehormatan bagi kami atas kehadiran dan doa restu Anda.")}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    // RFC 5545 line folding; the calendar content here uses ASCII characters.
    const content = lines.map((line) => line.match(/.{1,73}/g).join("\r\n ")).join("\r\n") + "\r\n";
    const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "akad-parhan-lili-25-oktober-2026.ics";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast("Buka berkas kalender untuk menyimpan tanggal akad.");
  });

  const dockLinks = $$(".dock a[href^='#']");
  const sections = dockLinks.map((link) => document.getElementById(link.hash.slice(1))).filter(Boolean);
  dockLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: motionPreference.matches ? "instant" : "smooth", block: "start" });
      try { history.replaceState(null, "", link.hash); } catch (_) { /* File URLs may restrict history. */ }
    });
  });

  if ("IntersectionObserver" in window) {
    const ratios = new Map();
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0));
      const visible = [...ratios.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!visible || visible[1] <= 0) return;
      dockLinks.forEach((link) => {
        const active = link.hash === `#${visible[0]}`;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-15% 0px -40% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
    sections.forEach((section) => sectionObserver.observe(section));

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.09, rootMargin: "0px 0px -25px 0px" });
    const observeReveals = () => $$(".reveal").forEach((element) => revealObserver.observe(element));
    if (body.classList.contains("is-locked")) {
      window.addEventListener("invitation:opened", observeReveals, { once: true });
    } else {
      observeReveals();
    }
  } else {
    $$(".reveal").forEach((element) => element.classList.add("is-visible"));
  }

  // A single native player preserves the song position when paused and resumed.
  const musicButton = $("#music-toggle");
  const weddingAudio = $("#wedding-audio");
  let musicPlayPending = false;
  let musicAttempt = 0;

  function updateMusicUI() {
    if (!musicButton) return;
    const musicPlaying = Boolean(weddingAudio && !weddingAudio.paused && !weddingAudio.ended && !weddingAudio.error);
    const label = musicPlaying ? "Jeda lagu" : "Putar lagu";
    musicButton.setAttribute("aria-pressed", String(musicPlaying));
    musicButton.setAttribute("aria-label", label);
    musicButton.title = label;
    musicButton.classList.toggle("is-playing", musicPlaying);
    const status = $("#music-status");
    if (status) status.textContent = label;
  }

  function pauseMusic() {
    musicAttempt += 1;
    musicPlayPending = false;
    weddingAudio?.pause();
    updateMusicUI();
  }

  function startMusic() {
    if (!weddingAudio) {
      toast("Lagu belum tersedia. Undangan tetap dapat dibuka.");
      return;
    }
    if (musicPlayPending || !weddingAudio.paused) {
      updateMusicUI();
      return;
    }
    const attempt = ++musicAttempt;
    musicPlayPending = true;
    const playbackFailed = (error) => {
      if (attempt !== musicAttempt) return;
      musicPlayPending = false;
      updateMusicUI();
      // A quick pause cancels playback intentionally; the player remains ready to retry.
      if (error?.name !== "AbortError") {
        toast("Lagu belum dapat diputar. Sentuh tombol Putar lagu untuk mencoba lagi.");
      }
    };
    try {
      const playback = weddingAudio.play();
      updateMusicUI();
      Promise.resolve(playback).then(() => {
        if (attempt !== musicAttempt) return;
        musicPlayPending = false;
        updateMusicUI();
      }).catch(playbackFailed);
    } catch (error) {
      playbackFailed(error);
    }
  }

  function toggleMusic() {
    if (musicPlayPending || (weddingAudio && !weddingAudio.paused)) pauseMusic();
    else startMusic();
  }

  ["play", "playing", "pause", "ended", "emptied"].forEach((eventName) => {
    weddingAudio?.addEventListener(eventName, updateMusicUI);
  });
  weddingAudio?.addEventListener("error", () => {
    pauseMusic();
    if (opening || body.classList.contains("is-open")) {
      toast("Lagu belum dapat dimuat. Sentuh tombol Putar lagu untuk mencoba lagi.");
    }
  });
  musicButton?.addEventListener("click", toggleMusic);
  updateMusicUI();

  $("#replay-opening")?.addEventListener("click", () => {
    if (opening || !cover || !invitation) return;
    invitation.inert = true;
    invitation.setAttribute("inert", "");
    body.classList.remove("is-open", "is-opening");
    body.classList.add("is-locked");
    cover.hidden = false;
    if (openButton) {
      openButton.disabled = false;
      openButton.setAttribute("aria-expanded", "false");
      openButton.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });

  const canvas = $("#petals");
  let animationFrame;
  let particles = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  let lastFrame = 0;
  const context = canvas?.getContext("2d");

  function resizeParticles() {
    if (!canvas || !context) return;
    canvasWidth = Math.min(window.innerWidth, document.querySelector(".invitation-shell")?.clientWidth || window.innerWidth);
    canvasHeight = window.innerHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(canvasWidth * scale);
    canvas.height = Math.round(canvasHeight * scale);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    const count = Math.min(24, Math.max(10, Math.floor(canvasWidth / 45)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      size: 1 + Math.random() * 2.1,
      speed: 5 + Math.random() * 11,
      drift: Math.random() * Math.PI * 2,
      opacity: 0.12 + Math.random() * 0.3,
    }));
  }

  function renderParticles(time) {
    if (!context || motionPreference.matches || document.hidden) {
      animationFrame = undefined;
      return;
    }
    if (time - lastFrame < 32) {
      animationFrame = requestAnimationFrame(renderParticles);
      return;
    }
    const delta = Math.min((time - lastFrame) / 1000 || 0.033, 0.08);
    lastFrame = time;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    particles.forEach((particle) => {
      particle.y -= particle.speed * delta;
      particle.x += Math.sin(time / 4500 + particle.drift) * delta * 7;
      if (particle.y < -10) { particle.y = canvasHeight + 10; particle.x = Math.random() * canvasWidth; }
      context.beginPath();
      context.fillStyle = `rgba(239, 204, 142, ${particle.opacity})`;
      context.ellipse(particle.x, particle.y, particle.size, particle.size * 0.58, time / 4000 + particle.drift, 0, Math.PI * 2);
      context.fill();
    });
    animationFrame = requestAnimationFrame(renderParticles);
  }

  function syncParticles() {
    if (!context) return;
    if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
    if (motionPreference.matches || document.hidden) {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      return;
    }
    lastFrame = performance.now();
    animationFrame = requestAnimationFrame(renderParticles);
  }

  if (context) {
    resizeParticles();
    syncParticles();
    window.addEventListener("resize", resizeParticles, { passive: true });
  }
  if (motionPreference.addEventListener) motionPreference.addEventListener("change", syncParticles);
  else motionPreference.addListener(syncParticles);

  document.addEventListener("visibilitychange", () => {
    updateCountdown();
    syncParticles();
  });

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".scene").forEach((scene) => {
      scene.addEventListener("pointermove", (event) => {
        if (motionPreference.matches) return;
        const rectangle = scene.getBoundingClientRect();
        scene.style.setProperty("--pointer-x", `${((event.clientX - rectangle.left) / rectangle.width - 0.5) * 8}px`);
        scene.style.setProperty("--pointer-y", `${((event.clientY - rectangle.top) / rectangle.height - 0.5) * 6}px`);
      }, { passive: true });
      scene.addEventListener("pointerleave", () => {
        scene.style.setProperty("--pointer-x", "0px");
        scene.style.setProperty("--pointer-y", "0px");
      });
    });
  }

  window.addEventListener("pagehide", () => {
    clearInterval(countdownTimer);
    pauseMusic();
    if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) window.location.reload();
  });
})();


