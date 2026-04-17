const app = document.querySelector(".app");
const menuToggle = document.querySelector(".menu-toggle");
const navPanel = document.querySelector(".nav-panel");
const motionToggle = document.querySelector(".motion-toggle");
const siteAudio = document.querySelector(".site-audio");
const navLinks = [...document.querySelectorAll(".nav-panel a")];
const signupLaunch = document.querySelector(".signup-launch");
const signupModal = document.querySelector(".signup-modal");
const signupBackdrop = document.querySelector(".signup-modal__backdrop");
const signupClose = document.querySelector(".signup-modal__close");
const newsletterForm = document.querySelector(".newsletter-form");
const newsletterStatus = document.querySelector(".newsletter-form__status");
const rootStyle = document.documentElement.style;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let lastFocusedElement = null;
let audioContext = null;
let audioSource = null;
let audioUnlockBound = false;
let audioEnhancerReady = false;

const setNavigationState = (open) => {
  app.dataset.navOpen = String(open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
};

const setAnimationState = (animated) => {
  app.dataset.animated = String(animated);
};

const setMusicState = (state) => {
  if (!motionToggle) {
    return;
  }

  motionToggle.dataset.state = state;

  if (state === "playing") {
    motionToggle.setAttribute("aria-pressed", "true");
    motionToggle.setAttribute("aria-label", "Pause background music");
    return;
  }

  if (state === "error") {
    motionToggle.setAttribute("aria-pressed", "false");
    motionToggle.setAttribute("aria-label", "Background music unavailable");
    return;
  }

  motionToggle.setAttribute("aria-pressed", "false");
  motionToggle.setAttribute("aria-label", "Play background music");
};

const resetTilt = () => {
  rootStyle.setProperty("--tilt-y", "-8deg");
  rootStyle.setProperty("--tilt-x", "6deg");
  rootStyle.setProperty("--glare-x", "0");
  rootStyle.setProperty("--glare-y", "0");
};

const setSignupState = (open) => {
  if (!signupModal) {
    return;
  }

  document.body.classList.toggle("signup-open", open);
  signupModal.setAttribute("aria-hidden", String(!open));

  if (open) {
    setNavigationState(false);
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    newsletterForm?.reset();

    if (newsletterStatus) {
      newsletterStatus.textContent = "";
    }

    window.setTimeout(() => {
      const emailInput = newsletterForm?.elements.namedItem("email");

      if (emailInput instanceof HTMLInputElement) {
        emailInput.focus();
      }
    }, 20);

    return;
  }

  lastFocusedElement?.focus();
};

setNavigationState(false);
setAnimationState(!reducedMotionQuery.matches);
setMusicState("stopped");

if (siteAudio) {
  siteAudio.autoplay = true;
  siteAudio.loop = true;
  siteAudio.preload = "auto";
  siteAudio.volume = 0.3;
}

const initializeAudioEnhancer = async () => {
  if (!siteAudio || audioEnhancerReady) {
    return audioEnhancerReady;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return false;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state !== "running") {
    try {
      await audioContext.resume();
    } catch (error) {
      return false;
    }
  }

  if (audioContext.state !== "running") {
    return false;
  }

  if (!audioSource) {
    const rumbleCut = audioContext.createBiquadFilter();
    rumbleCut.type = "highpass";
    rumbleCut.frequency.value = 34;
    rumbleCut.Q.value = 0.7;

    const warmth = audioContext.createBiquadFilter();
    warmth.type = "lowshelf";
    warmth.frequency.value = 118;
    warmth.gain.value = 1.6;

    const presence = audioContext.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = 2400;
    presence.Q.value = 0.9;
    presence.gain.value = 1.4;

    const air = audioContext.createBiquadFilter();
    air.type = "highshelf";
    air.frequency.value = 7200;
    air.gain.value = 1.9;

    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 10;
    compressor.ratio.value = 2.2;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.22;

    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.94;

    audioSource = audioContext.createMediaElementSource(siteAudio);
    audioSource.connect(rumbleCut);
    rumbleCut.connect(warmth);
    warmth.connect(presence);
    presence.connect(air);
    air.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(audioContext.destination);
  }

  audioEnhancerReady = true;
  return true;
};

const bindAudioUnlock = () => {
  if (audioUnlockBound) {
    return;
  }

  audioUnlockBound = true;

  const unlockAudio = async () => {
    document.removeEventListener("pointerdown", unlockAudio);
    document.removeEventListener("keydown", unlockAudio);
    await initializeAudioEnhancer();

    if (siteAudio?.paused) {
      await tryStartAudio();
    }
  };

  document.addEventListener("pointerdown", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });
};

const tryStartAudio = async () => {
  if (!siteAudio) {
    setMusicState("error");
    return;
  }

  await initializeAudioEnhancer();

  try {
    await siteAudio.play();
    setMusicState("playing");
  } catch (error) {
    setMusicState("stopped");
  }
};

const queueAudioStart = () => {
  if (!siteAudio || document.visibilityState === "hidden" || !siteAudio.paused) {
    return;
  }

  void tryStartAudio();
};

bindAudioUnlock();

menuToggle.addEventListener("click", () => {
  setNavigationState(app.dataset.navOpen !== "true");
});

motionToggle.addEventListener("click", async () => {
  if (!siteAudio) {
    setMusicState("error");
    return;
  }

  if (!siteAudio.paused) {
    siteAudio.pause();
    return;
  }

  await tryStartAudio();
});

signupLaunch?.addEventListener("click", () => {
  setSignupState(true);
});

signupBackdrop?.addEventListener("click", () => {
  setSignupState(false);
});

signupClose?.addEventListener("click", () => {
  setSignupState(false);
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setNavigationState(false);
  });
});

document.addEventListener("click", (event) => {
  if (app.dataset.navOpen !== "true") {
    return;
  }

  const clickedInsideMenu = navPanel.contains(event.target);
  const clickedMenuButton = menuToggle.contains(event.target);

  if (!clickedInsideMenu && !clickedMenuButton) {
    setNavigationState(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (signupModal?.getAttribute("aria-hidden") === "false") {
      setSignupState(false);
      return;
    }

    setNavigationState(false);
  }
});

const updateTilt = (event) => {
  if (app.dataset.animated !== "true") {
    return;
  }

  const normalizedX = event.clientX / window.innerWidth - 0.5;
  const normalizedY = event.clientY / window.innerHeight - 0.5;

  rootStyle.setProperty("--tilt-y", `${normalizedX * 18}deg`);
  rootStyle.setProperty("--tilt-x", `${6 - normalizedY * 14}deg`);
  rootStyle.setProperty("--glare-x", normalizedX.toFixed(3));
  rootStyle.setProperty("--glare-y", normalizedY.toFixed(3));
};

window.addEventListener("pointermove", updateTilt, { passive: true });
document.documentElement.addEventListener("pointerleave", resetTilt);
window.addEventListener("blur", resetTilt);

reducedMotionQuery.addEventListener("change", (event) => {
  setAnimationState(!event.matches);
});

siteAudio?.addEventListener("play", () => {
  setMusicState("playing");
});

siteAudio?.addEventListener("pause", () => {
  if (siteAudio.ended) {
    return;
  }

  setMusicState("stopped");
});

siteAudio?.addEventListener("canplay", queueAudioStart, { once: true });
window.addEventListener("load", queueAudioStart, { once: true });
window.addEventListener("pageshow", queueAudioStart);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    queueAudioStart();
  }
});

queueAudioStart();

newsletterForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!newsletterStatus) {
    return;
  }

  const emailInput = newsletterForm.elements.namedItem("email");

  if (!(emailInput instanceof HTMLInputElement) || !emailInput.value.trim()) {
    newsletterStatus.textContent = "ENTER A VALID EMAIL";

    if (emailInput instanceof HTMLInputElement) {
      emailInput.focus();
    }

    return;
  }

  newsletterStatus.textContent = "YOU'RE ON THE LIST";
  newsletterForm.reset();
});

newsletterForm?.addEventListener("input", () => {
  if (newsletterStatus) {
    newsletterStatus.textContent = "";
  }
});
