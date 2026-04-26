const app = document.querySelector(".app");
const menuToggle = document.querySelector(".menu-toggle");
const navPanel = document.querySelector(".nav-panel");
const profileButton = document.querySelector(".profile-button");
const bagButton = document.querySelector(".bag-button");
const bagCount = document.querySelector(".bag-button__count");
const bagDrawer = document.querySelector(".bag-drawer");
const bagBackdrop = document.querySelector(".bag-drawer__backdrop");
const bagClose = document.querySelector(".bag-drawer__close");
const bagItems = document.querySelector(".bag-drawer__items");
const bagSummaryCount = document.querySelector(".bag-summary-count");
const bagSummaryTotal = document.querySelector(".bag-summary-total");
const bagClear = document.querySelector(".bag-drawer__clear");
const motionToggle = document.querySelector(".motion-toggle");
const siteAudio = document.querySelector(".site-audio");
const navLinks = [...document.querySelectorAll(".nav-panel a")];
const accountModal = document.querySelector(".account-modal");
const accountBackdrop = document.querySelector(".account-modal__backdrop");
const accountClose = document.querySelector(".account-modal__close");
const accountShopButton = document.querySelector(".account-modal__shop");
const accountForm = document.querySelector(".account-form");
const accountStatus = document.querySelector(".account-form__status");
const signupLaunch = document.querySelector(".signup-launch");
const signupModal = document.querySelector(".signup-modal");
const signupBackdrop = document.querySelector(".signup-modal__backdrop");
const signupClose = document.querySelector(".signup-modal__close");
const newsletterForm = document.querySelector(".newsletter-form");
const newsletterStatus = document.querySelector(".newsletter-form__status");
const preorderLaunches = [...document.querySelectorAll(".preorder-launch")];
const preorderModal = document.querySelector(".preorder-modal");
const preorderBackdrop = document.querySelector(".preorder-modal__backdrop");
const preorderClose = document.querySelector(".preorder-modal__close");
const preorderForm = document.querySelector(".preorder-form");
const preorderStatus = document.querySelector(".preorder-form__status");
const preorderProductName = document.querySelector(".preorder-product-name");
const preorderProductPrice = document.querySelector(".preorder-product-price");
const preorderSubmitButton = preorderForm?.querySelector('button[type="submit"]');
const rootStyle = document.documentElement.style;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const preorderStorageKey = "fear-preorders";
const shopifyStoreUrl = "https://fearapparel0.myshopify.com";
const shopifyAccountUrl = "https://fearapparel0.myshopify.com/account/login";
const shopifyCartUrl = `${shopifyStoreUrl}/cart`;
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

const getStoredPreorders = () => {
  try {
    const storedOrders = window.localStorage.getItem(preorderStorageKey);
    const parsedOrders = storedOrders ? JSON.parse(storedOrders) : [];
    return Array.isArray(parsedOrders) ? parsedOrders : [];
  } catch (error) {
    return [];
  }
};

const storePreorders = (orders) => {
  try {
    window.localStorage.setItem(preorderStorageKey, JSON.stringify(orders));
  } catch (error) {
    return;
  }
};

const formatUsd = (value) => `$${value.toFixed(2)} USD`;

const parsePrice = (value) => {
  const match = String(value ?? "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getEasternTimestamps = () => {
  const now = new Date();
  const easternDisplay = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(now);
  const easternSubject = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(now);

  return {
    easternDisplay,
    easternSubject,
  };
};

const getPreorderEndpoint = () => {
  return preorderForm?.dataset.submitEndpoint?.trim() ?? "";
};

const submitPreorderEmail = async (form) => {
  const endpoint = getPreorderEndpoint();

  if (!endpoint) {
    return {
      ok: false,
      reason: "missing-endpoint",
      message: "EMAIL ENDPOINT IS MISSING.",
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      return {
        ok: true,
        message: "PRE-ORDER SENT",
      };
    }

    const data = await response.json().catch(() => null);
    const joinedErrors = Array.isArray(data?.errors)
      ? data.errors.map((error) => error.message).filter(Boolean).join(", ")
      : "";

    return {
      ok: false,
      reason: "submission-failed",
      message: joinedErrors
        ? joinedErrors.toUpperCase()
        : "EMAIL NOT SENT. CHECK THE FORM SUBMISSION SETUP.",
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network-error",
      message: "EMAIL NOT SENT. CHECK YOUR CONNECTION.",
    };
  }
};

const openShopifyAccount = () => {
  window.location.href = shopifyAccountUrl;
};

const openShopifyCart = () => {
  window.location.href = shopifyCartUrl;
};

const getShopifyCartCountUrl = () => {
  const shopifyRoot = window.Shopify?.routes?.root;

  if (typeof shopifyRoot === "string" && shopifyRoot.startsWith("/")) {
    return `${shopifyRoot}cart.js`;
  }

  if (window.location.hostname === new URL(shopifyStoreUrl).hostname) {
    return `${window.location.origin}/cart.js`;
  }

  return `${shopifyStoreUrl}/cart.js`;
};

const setBagCountState = (count = null) => {
  if (bagCount) {
    bagCount.textContent = Number.isInteger(count) && count >= 0 ? `(${count})` : "";
  }

  if (bagButton) {
    if (Number.isInteger(count) && count >= 0) {
      const itemLabel = count === 1 ? "item" : "items";
      bagButton.setAttribute("aria-label", `View shopping cart on Shopify with ${count} ${itemLabel}`);
      return;
    }

    bagButton.setAttribute("aria-label", "View shopping cart on Shopify");
  }
};

const updateBagCount = async () => {
  try {
    const response = await fetch(getShopifyCartCountUrl(), {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to load Shopify cart (${response.status})`);
    }

    const cart = await response.json();
    const itemCount = Number(cart?.item_count);
    setBagCountState(Number.isFinite(itemCount) && itemCount >= 0 ? itemCount : 0);
  } catch (error) {
    setBagCountState(null);
  }
};

const setPreorderProduct = (product, price) => {
  if (preorderProductName) {
    preorderProductName.textContent = product;
  }

  if (preorderProductPrice) {
    preorderProductPrice.textContent = price;
  }

  const productInput = preorderForm?.elements.namedItem("product");
  const priceInput = preorderForm?.elements.namedItem("price");
  const subjectInput = preorderForm?.elements.namedItem("_subject");
  const submittedAtInput = preorderForm?.elements.namedItem("submitted_at_eastern");

  if (productInput instanceof HTMLInputElement) {
    productInput.value = product;
  }

  if (priceInput instanceof HTMLInputElement) {
    priceInput.value = price;
  }

  if (subjectInput instanceof HTMLInputElement) {
    subjectInput.value = `New FEAR pre-order: ${product}`;
  }

  if (submittedAtInput instanceof HTMLInputElement) {
    submittedAtInput.value = getEasternTimestamps().easternDisplay;
  }
};

const renderBag = () => {
  if (!bagItems) {
    return;
  }

  const orders = getStoredPreorders();
  const totalItems = orders.reduce((total, order) => {
    const quantity = Number(order?.quantity);
    return total + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  }, 0);
  const totalPrice = orders.reduce((total, order) => {
    const quantity = Number(order?.quantity);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    return total + parsePrice(order?.price) * safeQuantity;
  }, 0);

  if (!orders.length) {
    bagItems.innerHTML = `
      <p class="bag-drawer__empty">
        Your bag is empty right now. Add a pre-order from the drop and it will show up here.
      </p>
    `;
  } else {
    bagItems.innerHTML = orders
      .map((order, index) => {
        const quantity = Number(order?.quantity);
        const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
        const lineTotal = formatUsd(parsePrice(order?.price) * safeQuantity);

        return `
          <article class="bag-item">
            <div class="bag-item__top">
              <strong>${escapeHtml(order?.product ?? "FEAR Piece")}</strong>
              <span class="bag-item__price">${lineTotal}</span>
            </div>
            <div class="bag-item__meta">
              <span>Size ${escapeHtml(order?.size ?? "N/A")}</span>
              <span>Qty ${safeQuantity}</span>
              <span>${escapeHtml(order?.price ?? "$0.00 USD")}</span>
            </div>
            <button class="bag-item__remove" type="button" data-index="${index}">
              Remove
            </button>
          </article>
        `;
      })
      .join("");
  }

  if (bagSummaryCount) {
    const itemLabel = totalItems === 1 ? "item" : "items";
    bagSummaryCount.textContent = `${totalItems} ${itemLabel}`;
  }

  if (bagSummaryTotal) {
    bagSummaryTotal.textContent = formatUsd(totalPrice);
  }
};

const updateProfileState = () => {
  if (!profileButton) {
    return;
  }

  profileButton.setAttribute("aria-label", "Profile");
};

const setAccountState = (open, options = {}) => {
  const { restoreFocus = true } = options;

  if (!accountModal) {
    return;
  }

  document.body.classList.toggle("account-open", open);
  accountModal.setAttribute("aria-hidden", String(!open));
  profileButton?.setAttribute("aria-expanded", String(open));

  if (open) {
    setBagState(false, { restoreFocus: false });
    setSignupState(false, { restoreFocus: false });
    setPreorderState(false, null, { restoreFocus: false });
    setNavigationState(false);
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (accountStatus) {
      accountStatus.textContent = "";
    }

    window.setTimeout(() => {
      const emailInput = accountForm?.elements.namedItem("email");

      if (emailInput instanceof HTMLInputElement) {
        emailInput.value = "";
        emailInput.focus();
      }
    }, 20);

    return;
  }

  if (restoreFocus) {
    lastFocusedElement?.focus();
  }
};

const setBagState = (open, options = {}) => {
  const { restoreFocus = true } = options;

  if (!bagDrawer) {
    return;
  }

  document.body.classList.toggle("bag-open", open);
  bagDrawer.setAttribute("aria-hidden", String(!open));
  bagButton?.setAttribute("aria-expanded", String(open));

  if (open) {
    setAccountState(false, { restoreFocus: false });
    setSignupState(false, { restoreFocus: false });
    setPreorderState(false, null, { restoreFocus: false });
    setNavigationState(false);
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    renderBag();

    window.setTimeout(() => {
      bagClose?.focus();
    }, 20);

    return;
  }

  if (restoreFocus) {
    lastFocusedElement?.focus();
  }
};

const resetTilt = () => {
  rootStyle.setProperty("--tilt-y", "-8deg");
  rootStyle.setProperty("--tilt-x", "6deg");
  rootStyle.setProperty("--glare-x", "0");
  rootStyle.setProperty("--glare-y", "0");
};

const setSignupState = (open, options = {}) => {
  const { restoreFocus = true } = options;

  if (!signupModal) {
    return;
  }

  document.body.classList.toggle("signup-open", open);
  signupModal.setAttribute("aria-hidden", String(!open));

  if (open) {
    setAccountState(false, { restoreFocus: false });
    setBagState(false, { restoreFocus: false });
    setPreorderState(false, null, { restoreFocus: false });
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

  if (restoreFocus) {
    lastFocusedElement?.focus();
  }
};

const setPreorderState = (open, productData = null, options = {}) => {
  const { restoreFocus = true } = options;

  if (!preorderModal) {
    return;
  }

  document.body.classList.toggle("preorder-open", open);
  preorderModal.setAttribute("aria-hidden", String(!open));

  if (open) {
    setAccountState(false, { restoreFocus: false });
    setBagState(false, { restoreFocus: false });
    setSignupState(false, { restoreFocus: false });
    setNavigationState(false);
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    preorderForm?.reset();

    if (preorderStatus) {
      preorderStatus.textContent = "";
    }

    if (productData) {
      setPreorderProduct(productData.product, productData.price);
    }

    window.setTimeout(() => {
      const sizeInput = preorderForm?.elements.namedItem("size");

      if (sizeInput instanceof HTMLSelectElement) {
        sizeInput.focus();
      }
    }, 20);

    return;
  }

  if (restoreFocus) {
    lastFocusedElement?.focus();
  }
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
updateProfileState();
updateBagCount();

menuToggle.addEventListener("click", () => {
  setNavigationState(app.dataset.navOpen !== "true");
});

profileButton?.addEventListener("click", () => {
  openShopifyAccount();
});

accountBackdrop?.addEventListener("click", () => {
  setAccountState(false);
});

accountClose?.addEventListener("click", () => {
  setAccountState(false);
});

accountShopButton?.addEventListener("click", () => {
  const shopUrl = accountShopButton.dataset.shopUrl?.trim() ?? "";

  if (!accountStatus) {
    window.location.href = shopUrl || shopifyAccountUrl;
    return;
  }

  if (!shopUrl) {
    accountStatus.textContent = "REDIRECTING TO SHOPIFY SIGN-IN";
    openShopifyAccount();
    return;
  }

  accountStatus.textContent = "REDIRECTING TO SHOPIFY SIGN-IN";
  window.location.href = shopUrl;
});

bagButton?.addEventListener("click", () => {
  openShopifyCart();
});

bagBackdrop?.addEventListener("click", () => {
  setBagState(false);
});

bagClose?.addEventListener("click", () => {
  setBagState(false);
});

bagItems?.addEventListener("click", (event) => {
  const removeButton = event.target instanceof Element ? event.target.closest(".bag-item__remove") : null;

  if (!(removeButton instanceof HTMLButtonElement)) {
    return;
  }

  const index = Number(removeButton.dataset.index);
  const orders = getStoredPreorders();

  if (!Number.isInteger(index) || index < 0 || index >= orders.length) {
    return;
  }

  orders.splice(index, 1);
  storePreorders(orders);
  void updateBagCount();
});

bagClear?.addEventListener("click", () => {
  storePreorders([]);
  void updateBagCount();
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

preorderLaunches.forEach((button) => {
  button.addEventListener("click", () => {
    const product = button.dataset.product ?? "FEAR Piece";
    const price = button.dataset.price ?? "$50.00 USD";
    setPreorderState(true, { product, price });
  });
});

preorderBackdrop?.addEventListener("click", () => {
  setPreorderState(false);
});

preorderClose?.addEventListener("click", () => {
  setPreorderState(false);
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
    if (accountModal?.getAttribute("aria-hidden") === "false") {
      setAccountState(false);
      return;
    }

    if (bagDrawer?.getAttribute("aria-hidden") === "false") {
      setBagState(false);
      return;
    }

    if (preorderModal?.getAttribute("aria-hidden") === "false") {
      setPreorderState(false);
      return;
    }

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
window.addEventListener("pageshow", () => {
  void updateBagCount();
});
window.addEventListener("focus", () => {
  void updateBagCount();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    queueAudioStart();
    void updateBagCount();
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

accountForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!accountStatus) {
    openShopifyAccount();
    return;
  }

  const emailInput = accountForm.elements.namedItem("email");

  if (!(emailInput instanceof HTMLInputElement) || !emailInput.value.trim()) {
    accountStatus.textContent = "ENTER A VALID EMAIL";
    emailInput?.focus();
    return;
  }

  accountStatus.textContent = "CONTINUING TO SHOPIFY SIGN-IN";
  openShopifyAccount();
});

accountForm?.addEventListener("input", () => {
  if (accountStatus) {
    accountStatus.textContent = "";
  }
});

preorderForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    if (!preorderStatus || !preorderForm) {
      return;
    }

    const productInput = preorderForm.elements.namedItem("product");
    const priceInput = preorderForm.elements.namedItem("price");
    const subjectInput = preorderForm.elements.namedItem("_subject");
    const submittedAtInput = preorderForm.elements.namedItem("submitted_at_eastern");
    const firstNameInput = preorderForm.elements.namedItem("first_name");
    const lastNameInput = preorderForm.elements.namedItem("last_name");
    const sizeInput = preorderForm.elements.namedItem("size");
    const quantityInput = preorderForm.elements.namedItem("quantity");
    const emailInput = preorderForm.elements.namedItem("email");
    const phoneInput = preorderForm.elements.namedItem("phone");

    if (!(firstNameInput instanceof HTMLInputElement) || !firstNameInput.value.trim()) {
      preorderStatus.textContent = "ENTER FIRST NAME";
      firstNameInput?.focus();
      return;
    }

    if (!(lastNameInput instanceof HTMLInputElement) || !lastNameInput.value.trim()) {
      preorderStatus.textContent = "ENTER LAST NAME";
      lastNameInput?.focus();
      return;
    }

    if (!(sizeInput instanceof HTMLSelectElement) || !sizeInput.value) {
      preorderStatus.textContent = "CHOOSE A SIZE";
      sizeInput?.focus();
      return;
    }

    if (!(emailInput instanceof HTMLInputElement) || !emailInput.value.trim()) {
      preorderStatus.textContent = "ENTER A VALID EMAIL";
      emailInput?.focus();
      return;
    }

    const currentProduct = productInput instanceof HTMLInputElement ? productInput.value : "FEAR Piece";
    const currentPrice = priceInput instanceof HTMLInputElement ? priceInput.value : "$50.00 USD";
    const reservedQuantity = quantityInput instanceof HTMLSelectElement ? quantityInput.value : "1";
    const firstNameValue = firstNameInput.value.trim();
    const lastNameValue = lastNameInput.value.trim();
    const emailValue = emailInput.value.trim();
    const phoneValue = phoneInput instanceof HTMLInputElement ? phoneInput.value.trim() : "";
    const { easternDisplay, easternSubject } = getEasternTimestamps();

    if (subjectInput instanceof HTMLInputElement) {
      subjectInput.value = `FEAR Pre-Order - ${firstNameValue} ${lastNameValue} - ${currentProduct} - ${easternSubject}`;
    }

    if (submittedAtInput instanceof HTMLInputElement) {
      submittedAtInput.value = easternDisplay;
    }

    preorderStatus.textContent = "SENDING...";

    if (preorderSubmitButton instanceof HTMLButtonElement) {
      preorderSubmitButton.disabled = true;
    }

    const submissionResult = await submitPreorderEmail(preorderForm);

    const savedOrders = getStoredPreorders();
    savedOrders.push({
      product: currentProduct,
      price: currentPrice,
      firstName: firstNameValue,
      lastName: lastNameValue,
      size: sizeInput.value,
      quantity: reservedQuantity,
      email: emailValue,
      phone: phoneValue,
      emailedToOwner: submissionResult.ok,
      createdAt: new Date().toISOString(),
    });

    storePreorders(savedOrders);
    void updateBagCount();

    preorderStatus.textContent = submissionResult.ok
      ? `${reservedQuantity} RESERVED`
      : submissionResult.message;

    if (preorderSubmitButton instanceof HTMLButtonElement) {
      preorderSubmitButton.disabled = false;
    }

    if (!submissionResult.ok) {
      return;
    }

    preorderForm.reset();
    setPreorderProduct(currentProduct, currentPrice);

    window.setTimeout(() => {
      setPreorderState(false);
    }, 900);
  })();
});

preorderForm?.addEventListener("input", () => {
  if (preorderStatus) {
    preorderStatus.textContent = "";
  }
});
