import { defaultPack, defaultCategoryDecks, subscriptionTiers } from "./data.mjs";
import {
  makeId,
  shuffle,
  hashDevice,
  formatMoney,
  parseCSV,
  validateCSV,
  pickAudiencePoll,
  phoneFriendHint
} from "./utils.mjs";
import { audioManager } from "./audio.mjs";
import { ParticleSystem } from "./particles.mjs";
import { achievementDefinitions, updateAchievements, getAchievementProgress } from "./achievements.mjs";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const screens = {
  landing: document.querySelector("#screen-landing"),
  dashboard: document.querySelector("#screen-dashboard"),
  builder: document.querySelector("#screen-builder"),
  host: document.querySelector("#screen-host"),
  participant: document.querySelector("#screen-participant"),
  classic: document.querySelector("#screen-classic"),
  pricing: document.querySelector("#screen-pricing"),
  payment: document.querySelector("#screen-payment"),
  admin: document.querySelector("#screen-admin"),
  leaderboard: document.querySelector("#screen-leaderboard"),
  achievements: document.querySelector("#screen-achievements"),
  contact: document.querySelector("#screen-contact")
};

const state = {
  user: null,
  packs: [],
  sessions: {},
  activeSessionId: null,
  activeParticipantId: null,
  selectedDefaultCategoryId: null,
  timedMode: false,
  liveMode: false,
  timerSeconds: 10,
  editingPackId: null,
  paymentTier: null,
  adminUsers: [],
  language: "en"
};

const firebaseState = {
  app: null,
  auth: null,
  db: null,
  user: null,
  ready: false,
  initPromise: null,
  authListenerAttached: false,
  lastInitError: null
};

const liveListeners = {
  session: null,
  participants: null,
  submissions: null
};

const storageKeys = {
  user: "wwtbam_user",
  packs: "wwtbam_packs",
  sessions: "wwtbam_sessions",
  timedMode: "wwtbam_timed_mode",
  liveMode: "wwtbam_live_mode",
  timerSeconds: "wwtbam_timer_seconds",
  defaultCategory: "wwtbam_default_category",
  language: "wwtbam_language"
};

const dom = {
  loginDialog: document.querySelector("#login-dialog"),
  loginEmail: document.querySelector("#login-email"),
  loginName: document.querySelector("#login-name"),
  loginPassword: document.querySelector("#login-password"),
  loginPasswordConfirm: document.querySelector("#login-password-confirm"),
  loginConfirmWrap: document.querySelector("#login-confirm-wrap"),
  authTitle: document.querySelector("#auth-title"),
  authStatus: document.querySelector("#auth-status"),
  authLoginToggle: document.querySelector("#btn-auth-login"),
  authRegisterToggle: document.querySelector("#btn-auth-register"),
  authReset: document.querySelector("#btn-password-reset"),
  loginButton: document.querySelector("#btn-login"),
  languageSelect: document.querySelector("#language-select"),
  accountMenu: document.querySelector("#account-menu"),
  accountDropdown: document.querySelector("#account-dropdown"),
  accountButton: document.querySelector("#btn-account"),
  logoutButton: document.querySelector("#btn-logout"),
  accountDialog: document.querySelector("#account-dialog"),
  accountName: document.querySelector("#account-name"),
  accountEmail: document.querySelector("#account-email"),
  accountOrg: document.querySelector("#account-org"),
  accountPhone: document.querySelector("#account-phone"),
  accountCountry: document.querySelector("#account-country"),
  accountCity: document.querySelector("#account-city"),
  accountZip: document.querySelector("#account-zip"),
  accountBillingName: document.querySelector("#account-billing-name"),
  accountAddress: document.querySelector("#account-address"),
  accountPaymentMethod: document.querySelector("#account-payment-method"),
  accountTier: document.querySelector("#account-tier"),
  accountPayment: document.querySelector("#account-payment"),
  accountExpires: document.querySelector("#account-expires"),
  accountSave: document.querySelector("#btn-account-save"),
  accountClose: document.querySelector("#btn-account-close"),
  adminPanelButton: document.querySelector("#btn-admin-panel"),
  adminUserEmail: document.querySelector("#admin-user-email"),
  adminUserName: document.querySelector("#admin-user-name"),
  adminUserTier: document.querySelector("#admin-user-tier"),
  adminUserTable: document.querySelector("#admin-user-table"),
  adminAdd: document.querySelector("#btn-admin-add"),
  adminRefresh: document.querySelector("#btn-admin-refresh"),
  adminBack: document.querySelector("#btn-admin-back"),
  homeButton: document.querySelector("#btn-home"),
  loginCancel: document.querySelector("#btn-login-cancel"),
  saveLogin: document.querySelector("#btn-login-save"),
  leaderboardButton: document.querySelector("#btn-leaderboard"),
  achievementsButton: document.querySelector("#btn-achievements"),
  upgradeButton: document.querySelector("#btn-upgrade"),
  soundToggle: document.querySelector("#btn-sound"),
  timedToggle: document.querySelector("#btn-timed"),
  liveToggle: document.querySelector("#btn-live"),
  themeToggle: document.querySelector("#btn-theme"),
  timerDialog: document.querySelector("#timer-dialog"),
  timerDialogInput: document.querySelector("#timer-dialog-input"),
  timerDialogApply: document.querySelector("#timer-dialog-apply"),
  timerDialogCancel: document.querySelector("#timer-dialog-cancel"),
  landingLadder: document.querySelector("#landing-ladder"),
  packList: document.querySelector("#pack-list"),
  packSelect: document.querySelector("#host-pack-select"),
  modeSelect: document.querySelector("#host-mode-select"),
  defaultCategorySection: document.querySelector("#default-category-section"),
  defaultCategoryGrid: document.querySelector("#default-category-grid"),
  defaultCategoryDashboardStatus: document.querySelector("#default-category-dashboard-status"),
  defaultCategoryLoadDashboard: null,
  defaultCategoryStartDashboard: document.querySelector("#btn-category-start-dashboard"),
  defaultCategoryDialog: document.querySelector("#default-category-dialog"),
  defaultCategoryDialogGrid: document.querySelector("#default-category-dialog-grid"),
  defaultCategoryLoad: null,
  defaultCategoryStart: document.querySelector("#btn-category-start"),
  defaultCategoryStatus: document.querySelector("#default-category-status"),
  createSession: document.querySelector("#btn-host-session"),
  createPack: document.querySelector("#btn-create-pack"),
  savePack: document.querySelector("#btn-save-pack"),
  cancelBuilder: document.querySelector("#btn-cancel-builder"),
  playDefault: document.querySelector("#btn-play-default"),
  selectPack: document.querySelector("#btn-select-pack"),
  goDashboard: document.querySelector("#btn-go-dashboard"),
  builderTitle: document.querySelector("#builder-title"),
  builderDescription: document.querySelector("#builder-description"),
  builderCurrency: document.querySelector("#builder-currency"),
  builderWinTitle: document.querySelector("#builder-win-title"),
  builderWinMessage: document.querySelector("#builder-win-message"),
  builderLoseTitle: document.querySelector("#builder-lose-title"),
  builderLoseMessage: document.querySelector("#builder-lose-message"),
  builderWalkTitle: document.querySelector("#builder-walk-title"),
  builderWalkMessage: document.querySelector("#builder-walk-message"),
  builderLadder: document.querySelector("#builder-ladder"),
  builderCsv: document.querySelector("#builder-csv"),
  builderPreview: document.querySelector("#builder-preview"),
  lifelineFifty: document.querySelector("#lifeline-fifty"),
  lifelineAudience: document.querySelector("#lifeline-audience"),
  lifelinePhone: document.querySelector("#lifeline-phone"),
  hostSessionTitle: document.querySelector("#host-session-title"),
  hostSessionMeta: document.querySelector("#host-session-meta"),
  hostSessionCode: document.querySelector("#host-session-code"),
  hostControls: document.querySelector("#host-controls"),
  hostLive: document.querySelector("#host-live"),
  endSession: document.querySelector("#btn-end-session"),
  copyLink: document.querySelector("#btn-copy-link"),
  qrImage: document.querySelector("#qr-image"),
  toggleTimer: document.querySelector("#toggle-timer"),
  timerSeconds: document.querySelector("#timer-seconds"),
  participantCode: document.querySelector("#participant-code"),
  participantName: document.querySelector("#participant-name"),
  participantJoin: document.querySelector("#btn-participant-join"),
  participantStatus: document.querySelector("#participant-status"),
  participantFFF: document.querySelector("#participant-fff"),
  participantMeta: document.querySelector("#participant-session-meta"),
  classicPackTitle: document.querySelector("#classic-pack-title"),
  classicMeta: document.querySelector("#classic-meta"),
  classicQuestion: document.querySelector("#classic-question"),
  classicQuestionImage: document.querySelector("#classic-question-image"),
  classicOptions: document.querySelector("#classic-options"),
  classicFeedback: document.querySelector("#classic-feedback"),
  classicLifelines: document.querySelector("#classic-lifelines"),
  classicLadder: document.querySelector("#classic-ladder"),
  classicTimer: document.querySelector("#classic-timer"),
  classicLayout: document.querySelector("#classic-layout"),
  fullscreenButton: document.querySelector("#btn-fullscreen"),
  fullscreenSound: document.querySelector("#btn-fullscreen-sound"),
  fullscreenLights: document.querySelector("#btn-fullscreen-lights"),
  fullscreenTimer: document.querySelector("#fullscreen-timer"),
  fullscreenExit: document.querySelector("#btn-fullscreen-exit"),
  classicLights: document.querySelector("#btn-lights"),
  quitGame: document.querySelector("#btn-quit-game"),
  walkAway: document.querySelector("#btn-walk-away"),
  gameoverDialog: document.querySelector("#gameover-dialog"),
  gameoverIcon: document.querySelector("#gameover-icon"),
  gameoverTitle: document.querySelector("#gameover-title"),
  gameoverMessage: document.querySelector("#gameover-message"),
  gameoverPrize: document.querySelector("#gameover-prize"),
  backFromPricing: document.querySelector("#btn-back-from-pricing"),
  paymentTierName: document.querySelector("#payment-tier-name"),
  paymentTierDesc: document.querySelector("#payment-tier-desc"),
  paymentTierPrice: document.querySelector("#payment-tier-price"),
  paymentConfirm: document.querySelector("#btn-payment-confirm"),
  paymentBack: document.querySelector("#btn-payment-back"),
  subscriptionRequestDialog: document.querySelector("#subscription-request-dialog"),
  subscriptionRequestMessage: document.querySelector("#subscription-request-message"),
  subscriptionRequestClose: document.querySelector("#btn-subscription-request-close"),
  leaderboardBody: document.querySelector("#leaderboard-body"),
  backFromLeaderboard: document.querySelector("#btn-back-from-leaderboard"),
  achievementsGrid: document.querySelector("#achievements-grid"),
  achievementsProgress: document.querySelector("#achievements-progress"),
  statGamesPlayed: document.querySelector("#stat-games-played"),
  statGamesWon: document.querySelector("#stat-games-won"),
  statTotalWinnings: document.querySelector("#stat-total-winnings"),
  statHighestLevel: document.querySelector("#stat-highest-level"),
  backFromAchievements: document.querySelector("#btn-back-from-achievements"),
  dashboardHome: document.querySelector("#btn-dashboard-home")
};

const supportedLanguages = [
  { code: "en", label: "English (US)", icon: "🇺🇸", dir: "ltr" },
  { code: "ar", label: "Arabic", icon: "🇸🇦", dir: "rtl" },
  { code: "zh", label: "Chinese", icon: "🇨🇳", dir: "ltr" },
  { code: "fr", label: "French", icon: "🇫🇷", dir: "ltr" },
  { code: "de", label: "German", icon: "🇩🇪", dir: "ltr" },
  { code: "es", label: "Spanish", icon: "🇪🇸", dir: "ltr" },
  { code: "tr", label: "Turkish", icon: "🇹🇷", dir: "ltr" }
];

const i18nState = {
  code: "en",
  ui: {},
  questions: {},
  fallbackUi: {},
  fallbackQuestions: {}
};

const uiTextBindings = [
  ["#btn-leaderboard", "nav.leaderboard"],
  ["#btn-achievements", "nav.achievements"],
  ["#btn-upgrade", "nav.upgrade"],
  ["#btn-account", "nav.account"],
  ["#btn-logout", "nav.logout"],
  ["#hero-eyebrow", "hero.eyebrow"],
  ["#hero-title", "hero.title"],
  ["#hero-subtext", "hero.subtitle"],
  ["#btn-play-default", "hero.cta.hot_seat"],
  ["#btn-select-pack", "hero.cta.select_pack"],
  ["#btn-go-dashboard", "hero.cta.creator_dashboard"],
  ["#landing-prize-title", "hero.prize_title"],
  ["#landing-prize-footnote", "hero.prize_footnote"],
  ["#dashboard-title", "dashboard.title"],
  ["#dashboard-subtitle", "dashboard.subtitle"],
  ["#dashboard-packs-title", "dashboard.packs_title"],
  ["#dashboard-host-title", "dashboard.host_title"],
  ["#btn-dashboard-home", "dashboard.back_home"],
  ["#btn-create-pack", "dashboard.create_pack"],
  ["#btn-category-start-dashboard", "dashboard.start_game"],
  ["#btn-category-start", "category.start"],
  ["#btn-host-session", "dashboard.create_session"],
  ["#builder-title-text", "builder.title"],
  ["#builder-subtitle", "builder.subtitle"],
  [".template-link", "builder.download_template"],
  ["#btn-save-pack", "builder.save_pack"],
  ["#btn-cancel-builder", "builder.back"],
  ["#host-join-title", "host.join_title"],
  ["#host-live-title", "host.live_title"],
  ["#btn-end-session", "host.end_session"],
  ["#btn-copy-link", "host.copy_link"],
  ["#participant-title", "participant.title"],
  ["#participant-fff-title", "participant.fastest_finger"],
  ["#btn-participant-join", "participant.join"],
  ["#btn-fullscreen", "classic.fullscreen"],
  ["#btn-lights", "classic.day_mode"],
  ["#btn-quit-game", "classic.quit_game"],
  ["#btn-fullscreen-exit", "classic.exit_fullscreen"],
  ["#btn-walk-away", "classic.walk_away"],
  ["#classic-ladder-title", "classic.ladder_title"],
  ["#pricing-title", "pricing.title"],
  ["#pricing-subtitle", "pricing.subtitle"],
  ["#btn-back-from-pricing", "pricing.back_home"],
  ["#pricing-guest-note", "pricing.guest_note"],
  ["#payment-title", "payment.title"],
  ["#payment-subtitle", "payment.subtitle"],
  ["#payment-selected-label", "payment.selected_plan"],
  ["#payment-review-note", "payment.review_note"],
  ["#payment-method-title", "payment.method_title"],
  ["#btn-payment-back", "payment.cancel"],
  ["#btn-payment-confirm", "payment.request"],
  ["#btn-subscription-request-close", "dialog.close"],
  ["#admin-title", "admin.title"],
  ["#admin-subtitle", "admin.subtitle"],
  ["#admin-add-title", "admin.add_title"],
  ["#admin-users-title", "admin.users_title"],
  ["#btn-admin-add", "admin.save_user"],
  ["#btn-admin-refresh", "admin.refresh"],
  ["#btn-admin-back", "admin.back_home"],
  ["#leaderboard-title", "leaderboard.title"],
  ["#leaderboard-subtitle", "leaderboard.subtitle"],
  ["#btn-back-from-leaderboard", "leaderboard.back"],
  ["#contact-title", "contact.title"],
  ["#contact-subtitle", "contact.subtitle"],
  ["#contact-support-title", "contact.support_title"],
  ["#contact-custom-title", "contact.custom_title"],
  ["#contact-partnership-title", "contact.partnership_title"],
  ["#contact-request-title", "contact.request_title"],
  ["#btn-back-from-contact", "contact.back"],
  ["#achievements-title", "achievements.title"],
  ["#achievements-progress", "achievements.progress"],
  ["#btn-back-from-achievements", "achievements.back"],
  ["#timer-dialog-apply", "timer.apply"],
  ["#timer-dialog-cancel", "timer.cancel"],
  ["#footer-about-title", "footer.about_title"],
  ["#footer-about-text", "footer.about_text"],
  ["#footer-links-title", "footer.links_title"],
  ["#footer-others-title", "footer.others_title"],
  ["#footer-newsletter-title", "footer.newsletter_title"],
  ["#footer-newsletter-text", "footer.newsletter_text"],
  ["#footer-copyright", "footer.copyright"],
  ["#btn-auth-login", "auth.toggle_login"],
  ["#btn-auth-register", "auth.toggle_register"],
  ["#btn-login-cancel", "auth.cancel"],
  ["#btn-password-reset", "auth.forgot"]
];

const filterLabelBindings = [
  ["totalWinnings", "leaderboard.filter.total"],
  ["gamesWon", "leaderboard.filter.wins"],
  ["fastestWin", "leaderboard.filter.fastest"],
  ["highestLevel", "leaderboard.filter.level"]
];

let activeTimer = null;
let particleSystem = null;
let pendingTimerToggle = false;
let authMode = "login";
let lastRenderedLevel = null;
let inactivityTimer = null;

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
let adminUsersUnsubscribe = null;

function safeParse(json, fallback) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch (err) {
    console.warn("Failed to parse saved state, resetting.", err);
    return fallback;
  }
}

function formatTemplate(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] ?? ""));
}

function t(key, vars) {
  const raw = i18nState.ui[key] ?? i18nState.fallbackUi[key];
  if (!raw) return key;
  return vars ? formatTemplate(raw, vars) : raw;
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

async function loadLanguageAssets(code) {
  const [ui, questions] = await Promise.all([
    fetchJson(`./i18n/ui/${code}.json`).catch(() => ({})),
    fetchJson(`./i18n/questions/${code}.json`).catch(() => ({}))
  ]);
  return { ui, questions };
}

function applyTranslations() {
  uiTextBindings.forEach(([selector, key]) => {
    const el = document.querySelector(selector);
    if (el) {
      el.textContent = t(key);
    }
  });

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      el.textContent = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) {
      el.innerHTML = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key && "placeholder" in el) {
      el.placeholder = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) {
      el.setAttribute("title", t(key));
    }
  });

  filterLabelBindings.forEach(([filter, key]) => {
    const el = document.querySelector(`.filter-button[data-filter=\"${filter}\"]`);
    if (el) {
      el.textContent = t(key);
    }
  });

  document.title = t("meta.title");
}

function renderLanguageOptions() {
  if (!dom.languageSelect) return;
  dom.languageSelect.innerHTML = "";
  supportedLanguages.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang.code;
    option.textContent = `${lang.icon} ${lang.label}`;
    dom.languageSelect.append(option);
  });
}

async function setLanguage(code) {
  const next = supportedLanguages.find((lang) => lang.code === code) || supportedLanguages[0];
  i18nState.code = next.code;
  state.language = next.code;
  localStorage.setItem(storageKeys.language, next.code);
  if (dom.languageSelect) {
    dom.languageSelect.value = next.code;
  }
  const { ui, questions } = await loadLanguageAssets(next.code);
  i18nState.ui = ui;
  i18nState.questions = questions;
  document.documentElement.lang = next.code;
  document.documentElement.dir = next.dir;
  applyTranslations();
  setAuthMode(authMode);
  updateLoginButton();
  updateTimedButton();
  updateLiveButton();
  updateSoundButtons();
  updateLightsButton();
  updateFullscreenTimer();
  updateClassicLightsButton();
  renderLanding();
  renderPackList();
  renderHost();
  renderClassic();
  renderPricing();
  renderLeaderboard();
  renderAchievements();
  if (getActiveScreenName() === "participant" && state.activeSessionId && state.activeParticipantId) {
    renderParticipant(state.activeSessionId, state.activeParticipantId);
  }
  if (getActiveScreenName() === "admin") {
    renderAdminPanel();
  }
}

async function initI18n() {
  i18nState.fallbackUi = await fetchJson("./i18n/ui/en.json").catch(() => ({}));
  i18nState.fallbackQuestions = await fetchJson("./i18n/questions/en.json").catch(() => ({}));
  renderLanguageOptions();
  const savedLanguage = localStorage.getItem(storageKeys.language) || state.language || "en";
  await setLanguage(savedLanguage);
}

function getTranslatedQuestion(question) {
  const overrides = i18nState.questions.questions || {};
  const fallback = i18nState.fallbackQuestions.questions || {};
  const lookupId = question.sourceQuestionId || question.id;
  const translated = overrides[lookupId] || fallback[lookupId];
  if (!translated) return question;
  return {
    ...question,
    promptText: translated.promptText ?? question.promptText,
    options: translated.options ? { ...question.options, ...translated.options } : question.options,
    explanation: translated.explanation ?? question.explanation
  };
}

function getTranslatedCategory(category) {
  const overrides = i18nState.questions.categories || {};
  const fallback = i18nState.fallbackQuestions.categories || {};
  const translated = overrides[category.id] || fallback[category.id];
  if (!translated) return category;
  return {
    ...category,
    title: translated.title ?? category.title,
    subtitle: translated.subtitle ?? category.subtitle
  };
}

function getTranslatedPack(pack) {
  const overrides = i18nState.questions.packs || {};
  const fallback = i18nState.fallbackQuestions.packs || {};
  const translated = overrides[pack.id] || fallback[pack.id];
  const basePackOverride = overrides[defaultPack.id] || fallback[defaultPack.id];
  const category = pack.sourceCategoryId ? getDefaultCategoryById(pack.sourceCategoryId) : null;
  const translatedCategory = category ? getTranslatedCategory(category) : null;
  const baseTitle = basePackOverride?.title ?? defaultPack.title;
  const packTitle = translated?.title
    ?? (translatedCategory ? `${baseTitle} • ${translatedCategory.title}` : pack.title);
  const packDescription = translated?.description
    ?? (translatedCategory ? translatedCategory.subtitle : pack.description);
  const lifelineOverrides = {
    ...(basePackOverride?.lifelines || {}),
    ...(translated?.lifelines || {})
  };
  const baseMessages = pack.id.startsWith(defaultPack.id) && basePackOverride?.messages
    ? basePackOverride.messages
    : {};
  return {
    ...pack,
    title: packTitle,
    description: packDescription,
    config: {
      ...pack.config,
      messages: { ...pack.config.messages, ...baseMessages, ...(translated?.messages || {}) },
      lifelines: pack.config.lifelines.map((life) => ({
        ...life,
        displayName: lifelineOverrides[life.key] ?? life.displayName
      }))
    }
  };
}

function getFirebaseConfig() {
  const config = window.firebaseConfig;
  if (!config || !config.apiKey) {
    return null;
  }
  return config;
}

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return value;
}

async function ensureFirebaseReady(options = {}) {
  const { allowAnonymous = true } = options;
  if (firebaseState.ready) return true;
  if (firebaseState.initPromise) return firebaseState.initPromise;
  const config = getFirebaseConfig();
  if (!config) {
    console.warn("Firebase config missing; live mode disabled.");
    firebaseState.lastInitError = "config";
    return false;
  }

  firebaseState.initPromise = (async () => {
    firebaseState.app = initializeApp(config);
    firebaseState.auth = getAuth(firebaseState.app);
    firebaseState.db = getFirestore(firebaseState.app);
    if (!firebaseState.authListenerAttached) {
      onAuthStateChanged(firebaseState.auth, (user) => {
        firebaseState.user = user || null;
        if (user && user.isAnonymous) {
          return;
        }
        updateAuthUser(user);
      });
      firebaseState.authListenerAttached = true;
    }
    if (!firebaseState.auth.currentUser && allowAnonymous) {
      try {
        await signInAnonymously(firebaseState.auth);
      } catch (err) {
        console.warn("Anonymous auth failed:", err);
        firebaseState.lastInitError = "anonymous";
        return false;
      }
    }
    firebaseState.user = firebaseState.auth.currentUser;
    firebaseState.ready = true;
    firebaseState.lastInitError = null;
    return true;
  })().catch((err) => {
    console.error("Firebase init failed:", err);
    firebaseState.initPromise = null;
    firebaseState.lastInitError = err;
    return false;
  });

  return firebaseState.initPromise;
}

function stopLiveListeners() {
  if (liveListeners.session) liveListeners.session();
  if (liveListeners.participants) liveListeners.participants();
  if (liveListeners.submissions) liveListeners.submissions();
  liveListeners.session = null;
  liveListeners.participants = null;
  liveListeners.submissions = null;
}

function ensureSessionShell(sessionId, packId) {
  if (!state.sessions[sessionId]) {
    state.sessions[sessionId] = {
      id: sessionId,
      packId: packId || null,
      mode: "FFF",
      status: "waiting",
      createdAt: Date.now(),
      configSnapshot: {},
      currentState: {
        level: 1,
        questionOrder: [],
        usedLifelines: [],
        disabledOptions: []
      },
      participants: {},
      fffSubmissions: {},
      winnerParticipantId: null,
      fffRoundId: null,
      fffQuestion: null
    };
  }
  if (packId && !state.sessions[sessionId].packId) {
    state.sessions[sessionId].packId = packId;
  }
  return state.sessions[sessionId];
}

function applyRemoteSessionData(sessionId, data) {
  const session = ensureSessionShell(sessionId, data.packId);
  session.mode = data.mode || session.mode;
  session.status = data.status || session.status;
  session.packId = data.packId || session.packId;
  session.winnerParticipantId = data.winnerParticipantId || null;
  session.fffRoundId = data.fffRoundId || session.fffRoundId;
  session.fffQuestion = data.fffQuestion || session.fffQuestion;
  session.fffStartTime = toMillis(data.fffStartTime) || session.fffStartTime || null;
  session.fffTimerSeconds = data.fffTimerSeconds ?? session.fffTimerSeconds ?? null;
  session.createdAt = toMillis(data.createdAt) || session.createdAt;
  if (data.classicState) {
    session.currentState = { ...session.currentState, ...data.classicState };
  }
  return session;
}

function renderLiveSessionIfNeeded() {
  const screen = getActiveScreenName();
  if (screen === "host") {
    renderHost();
  } else if (screen === "participant" && state.activeParticipantId) {
    renderParticipant(state.activeSessionId, state.activeParticipantId);
  }
}

function subscribeToLiveSession(sessionId) {
  stopLiveListeners();
  const sessionRef = doc(firebaseState.db, "sessions", sessionId);
  liveListeners.session = onSnapshot(sessionRef, (snapshot) => {
    if (!snapshot.exists()) {
      dom.participantStatus.textContent = t("participant.session_not_found");
      return;
    }
    applyRemoteSessionData(sessionId, snapshot.data());
    state.activeSessionId = sessionId;
    saveState();
    renderLiveSessionIfNeeded();
  });

  liveListeners.participants = onSnapshot(
    collection(firebaseState.db, "sessions", sessionId, "participants"),
    (snapshot) => {
      const session = ensureSessionShell(sessionId);
      session.participants = {};
      snapshot.forEach((docSnap) => {
        session.participants[docSnap.id] = docSnap.data();
      });
      saveState();
      renderLiveSessionIfNeeded();
    }
  );

  liveListeners.submissions = onSnapshot(
    collection(firebaseState.db, "sessions", sessionId, "submissions"),
    (snapshot) => {
      const session = ensureSessionShell(sessionId);
      session.fffSubmissions = {};
      snapshot.forEach((docSnap) => {
        session.fffSubmissions[docSnap.id] = docSnap.data();
      });
      saveState();
      if (session.mode === "FFF" && session.status === "live" && !session.winnerParticipantId) {
        if (firebaseState.user?.uid && session.hostUid === firebaseState.user.uid) {
          computeLiveFFFWinner(sessionId);
        }
      }
      renderLiveSessionIfNeeded();
    }
  );
}

async function createLiveSession(pack, mode) {
  if (!pack) {
    alert(t("alerts.no_pack_selected"));
    return null;
  }
  const ready = await ensureFirebaseReady();
  if (!ready) {
    alert(t("alerts.firebase_config_missing"));
    return null;
  }

  const fffQuestion = getRandomDefaultFFFQuestion();
  if (!fffQuestion) {
    alert(t("alerts.no_valid_fff"));
    return null;
  }

  const sessionId = makeId("S");
  const sessionPayload = {
    id: sessionId,
    packId: defaultPack.id,
    mode,
    status: "waiting",
    createdAt: Date.now(),
    hostUid: firebaseState.user?.uid || null,
    fffQuestion: {
      id: fffQuestion.id,
      type: fffQuestion.type,
      promptText: fffQuestion.promptText,
      options: fffQuestion.options || null,
      orderItems: fffQuestion.orderItems || null,
      correctOption: fffQuestion.correctOption || null
    },
    fffRoundId: makeId("R"),
    winnerParticipantId: null
  };

  await setDoc(doc(firebaseState.db, "sessions", sessionId), sessionPayload);
  applyRemoteSessionData(sessionId, sessionPayload);
  state.activeSessionId = sessionId;
  subscribeToLiveSession(sessionId);
  return state.sessions[sessionId];
}

async function startLiveClassic(sessionId) {
  const session = state.sessions[sessionId];
  if (!session) return;
  const pack = defaultPack;
  const classicState = {
    level: 1,
    questionOrder: buildQuestionOrder(pack),
    usedLifelines: [],
    lifelinesUsed: [],
    disabledOptions: [],
    feedback: "",
    feedbackTone: "",
    locked: false
  };
  if (state.timedMode || (dom.toggleTimer && dom.toggleTimer.checked)) {
    classicState.timerSeconds = state.timerSeconds;
  }
  await updateDoc(doc(firebaseState.db, "sessions", sessionId), {
    mode: "CLASSIC",
    status: "live",
    classicState
  });
}

async function submitLiveClassicAnswer(sessionId, selected) {
  const session = state.sessions[sessionId];
  if (!session) return;
  const pack = defaultPack;
  const question = getCurrentQuestion(pack, session);
  if (!question || session.currentState.locked) return;

  const shuffled = getShuffledQuestion(session, question);
  const correct = selected === shuffled.correctOption;
  const nextState = { ...session.currentState };
  nextState.locked = true;
  nextState.feedback = correct ? "Correct!" : "Incorrect.";
  nextState.feedbackTone = correct ? "good" : "bad";

  if (correct) {
    if (nextState.level >= 15) {
      nextState.feedback = "You are a millionaire!";
      nextState.feedbackTone = "good";
      await updateDoc(doc(firebaseState.db, "sessions", sessionId), {
        status: "ended",
        classicState: nextState
      });
      return;
    }
    nextState.level += 1;
    nextState.disabledOptions = [];
    nextState.feedback = "";
    if (nextState.timerSeconds !== undefined) {
      nextState.timerSeconds = state.timerSeconds;
    }
  } else {
    nextState.locked = true;
    await updateDoc(doc(firebaseState.db, "sessions", sessionId), {
      status: "ended",
      classicState: nextState
    });
    return;
  }

  await updateDoc(doc(firebaseState.db, "sessions", sessionId), {
    classicState: nextState
  });
}

async function useLiveClassicLifeline(sessionId, lifelineKey) {
  const session = state.sessions[sessionId];
  if (!session) return;
  const pack = defaultPack;
  const question = getCurrentQuestion(pack, session);
  if (!question || session.currentState.usedLifelines.includes(lifelineKey)) {
    return;
  }

  const shuffled = getShuffledQuestion(session, question);
  const nextState = { ...session.currentState };
  nextState.usedLifelines = [...(nextState.usedLifelines || []), lifelineKey];
  nextState.lifelinesUsed = [...(nextState.lifelinesUsed || []), lifelineKey];

  if (lifelineKey === "fifty_fifty") {
    const incorrect = Object.keys(shuffled.options).filter((key) => key !== shuffled.correctOption);
    nextState.disabledOptions = shuffle(incorrect).slice(0, 2);
  }

  await updateDoc(doc(firebaseState.db, "sessions", sessionId), {
    classicState: nextState
  });
}

async function joinLiveSession(sessionId, name) {
  const ready = await ensureFirebaseReady();
  if (!ready) {
    return { ok: false, message: "Firebase is not configured." };
  }

  const sessionRef = doc(firebaseState.db, "sessions", sessionId);
  const snapshot = await getDoc(sessionRef);
  if (!snapshot.exists()) {
    return { ok: false, message: "Session not found." };
  }

  applyRemoteSessionData(sessionId, snapshot.data());
  state.activeSessionId = sessionId;
  state.activeParticipantId = firebaseState.user?.uid || makeId("P");

  const deviceHash = hashDevice(`${navigator.userAgent}-${name}`);
  await setDoc(
    doc(firebaseState.db, "sessions", sessionId, "participants", state.activeParticipantId),
    {
      id: state.activeParticipantId,
      name,
      deviceIdHash: deviceHash,
      joinedAt: Date.now()
    },
    { merge: true }
  );

  subscribeToLiveSession(sessionId);
  return { ok: true, participantId: state.activeParticipantId, session: state.sessions[sessionId] };
}

async function submitLiveFFF(sessionId, participantId, order) {
  const session = state.sessions[sessionId];
  if (!session || !participantId) return;
  if (session.fffSubmissions[participantId]) return;

  const pack = getPackForSession(session);
  const question = getActiveFFFQuestion(session, pack);
  let isCorrect = null;
  if (question && question.correctOption) {
    isCorrect = order === question.correctOption;
  } else if (question && question.correctOrder) {
    isCorrect = JSON.stringify(order) === JSON.stringify(question.correctOrder);
  }

  const submittedAt = Date.now();
  const startTime = session.fffStartTime || submittedAt;
  await setDoc(doc(firebaseState.db, "sessions", sessionId, "submissions", participantId), {
    id: makeId("S"),
    participantId,
    isCorrect,
    submittedAt,
    latencyMs: submittedAt - startTime,
    answerPayload: order,
    roundId: session.fffRoundId || null
  });
}

async function startLiveFFF(sessionId) {
  const session = state.sessions[sessionId];
  if (!session) return;
  const roundId = makeId("R");
  await updateDoc(doc(firebaseState.db, "sessions", sessionId), {
    status: "live",
    fffStartTime: Date.now(),
    fffTimerSeconds: Number(dom.timerSeconds.value) || 20,
    fffRoundId: roundId,
    winnerParticipantId: null
  });
}

async function computeLiveFFFWinner(sessionId) {
  const session = state.sessions[sessionId];
  if (!session) return;
  const pack = getPackForSession(session);
  const question = getActiveFFFQuestion(session, pack);
  const submissions = Object.values(session.fffSubmissions || {}).filter((submission) => {
    if (!session.fffRoundId) return true;
    return submission.roundId === session.fffRoundId;
  });
  if (submissions.length === 0) return;
  if (!question) return;

  const scored = submissions.map((submission) => {
    let isCorrect = submission.isCorrect;
    if (isCorrect === null || isCorrect === undefined) {
      if (question.correctOption) {
        isCorrect = submission.answerPayload === question.correctOption;
      } else if (question.correctOrder) {
        isCorrect = JSON.stringify(submission.answerPayload) === JSON.stringify(question.correctOrder);
      } else {
        isCorrect = false;
      }
    }
    return { ...submission, isCorrect };
  });

  scored.sort((a, b) => {
    if (a.isCorrect !== b.isCorrect) {
      return a.isCorrect ? -1 : 1;
    }
    return a.latencyMs - b.latencyMs;
  });
  const winner = scored[0];
  await updateDoc(doc(firebaseState.db, "sessions", sessionId), {
    winnerParticipantId: winner.participantId
  });
}

function ensureDefaultPack() {
  if (!Array.isArray(state.packs)) {
    state.packs = [defaultPack];
    return;
  }
  const hasDefault = state.packs.some((pack) => pack.id === defaultPack.id);
  if (!hasDefault) {
    state.packs.unshift(defaultPack);
  } else {
    state.packs = state.packs.map((pack) => {
      if (pack.id !== defaultPack.id) return pack;
      const guaranteed = new Set(pack.config?.guaranteedLevels || []);
      guaranteed.add(5);
      guaranteed.add(10);
      guaranteed.add(15);
      return {
        ...pack,
        title: "Millionaire Questions",
        config: {
          ...pack.config,
          guaranteedLevels: Array.from(guaranteed).sort((a, b) => a - b),
          messages: {
            winTitle: pack.config?.messages?.winTitle || "Congratulations!",
            winMessage: pack.config?.messages?.winMessage || "You are a millionaire!",
            loseTitle: pack.config?.messages?.loseTitle || "Game Over",
            loseMessage: pack.config?.messages?.loseMessage || "Better luck next time!",
            walkAwayTitle: pack.config?.messages?.walkAwayTitle || "Well Played!",
            walkAwayMessage: pack.config?.messages?.walkAwayMessage || "You walked away with:"
          }
        }
      };
    });
  }
}

function setAuthStatus(message, ok = false) {
  if (!dom.authStatus) return;
  dom.authStatus.textContent = message;
  dom.authStatus.classList.toggle("status-success", ok);
}

function setAuthMode(nextMode) {
  authMode = nextMode;
  if (dom.authTitle) {
    dom.authTitle.textContent = nextMode === "register" ? t("auth.title_register") : t("auth.title_login");
  }
  if (dom.loginConfirmWrap) {
    dom.loginConfirmWrap.style.display = nextMode === "register" ? "block" : "none";
  }
  if (dom.saveLogin) {
    dom.saveLogin.textContent = nextMode === "register" ? t("auth.save_register") : t("auth.save_login");
  }
  if (dom.authLoginToggle && dom.authRegisterToggle) {
    dom.authLoginToggle.classList.toggle("secondary", nextMode === "login");
    dom.authRegisterToggle.classList.toggle("secondary", nextMode === "register");
  }
  setAuthStatus("");
}

function updateAuthUser(user) {
  if (!user || user.isAnonymous) {
    state.user = null;
  } else {
    state.user = migrateUserState({
      email: user.email || "",
      displayName: user.displayName || "Player",
      createdAt: Date.now()
    });
    applySuperAdminOverrides(state.user);
    syncUserProfileToFirestore();
  }
  saveState();
  updateLoginButton();
  resetInactivityTimer();
}

function getActiveScreenName() {
  const active = document.querySelector(".screen.active");
  if (!active) return "landing";
  return active.id.replace("screen-", "");
}

function getSessionStatusLabel(status) {
  const key = `session.status.${status || "unknown"}`;
  const label = t(key);
  return label === key ? status : label;
}

function resumeAudioForScreen() {
  if (audioManager.isMuted) return;
  const screenName = getActiveScreenName();
  if (screenName === "classic") {
    const session = getSession();
    if (session) {
      const levelMusic = audioManager.getMusicForLevel(session.currentState.level);
      audioManager.playBackground(levelMusic, false);
      return;
    }
  }
  audioManager.playBackground("mainTheme");
}

function setClassicLight(isLightOn) {
  document.body.classList.toggle("classic-light", isLightOn);
  updateLightsButton();
  updateClassicLightsButton();
}

function initParticles() {
  const userPrefs = state.user?.preferences || {
    particlesEnabled: true,
    particleDensity: "medium"
  };

  particleSystem = new ParticleSystem("particle-canvas", {
    density: userPrefs.particleDensity,
    enabled: userPrefs.particlesEnabled
  });

  particleSystem.start();
}

function migrateUserState(user) {
  if (!user) return null;

  // Add subscription if missing
  if (!user.subscription) {
    user.subscription = {
      tier: "FREE",
      startDate: Date.now(),
      expiresAt: null,
      features: subscriptionTiers.FREE.limits,
      paid: false
    };
  } else if (user.subscription.paid === undefined) {
    user.subscription.paid = false;
  }

  // Add stats if missing
  if (!user.stats) {
    user.stats = {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      walkedAway: 0,
      totalWinnings: 0,
      highestLevel: 0,
      fastestWin: null,
      averageAnswerTime: 0,
      lifelinesUsed: {
        fifty_fifty: 0,
        ask_audience: 0,
        phone_friend: 0
      }
    };
  }

  // Add achievements if missing
  if (!user.achievements) {
    user.achievements = [];
  }

  // Add preferences if missing
  if (!user.preferences) {
    user.preferences = {
      particlesEnabled: true,
      particleDensity: "medium",
      animationSpeed: 1.0
    };
  }

  if (!user.profile) {
    user.profile = {
      organization: "",
      phone: "",
      country: "",
      city: "",
      zip: "",
      billingName: "",
      address: ""
    };
  }

  applySuperAdminOverrides(user);
  return user;
}

function applySuperAdminOverrides(user) {
  if (!user?.email) return;
  const email = user.email.toLowerCase();
  if (email !== "echoscholarly@gmail.com") return;
  user.displayName = "SuperAdmin";
  user.subscription = {
    tier: "ENTERPRISE",
    startDate: Date.now(),
    expiresAt: null,
    features: subscriptionTiers.ENTERPRISE.limits,
    paid: true
  };
}

function isSuperAdmin() {
  const email = state.user?.email || "";
  return email.toLowerCase() === "echoscholarly@gmail.com";
}

function loadState() {
  const savedUser = localStorage.getItem(storageKeys.user);
  const savedPacks = localStorage.getItem(storageKeys.packs);
  const savedSessions = localStorage.getItem(storageKeys.sessions);
  const savedTimed = localStorage.getItem(storageKeys.timedMode);
  const savedLive = localStorage.getItem(storageKeys.liveMode);
  const savedTimer = localStorage.getItem(storageKeys.timerSeconds);
  const savedCategory = localStorage.getItem(storageKeys.defaultCategory);
  const savedLanguage = localStorage.getItem(storageKeys.language);

  state.user = savedUser ? migrateUserState(safeParse(savedUser, null)) : null;
  state.packs = safeParse(savedPacks, [defaultPack]);
  state.sessions = safeParse(savedSessions, {});
  state.timedMode = savedTimed === "true";
  state.liveMode = savedLive === "true";
  state.timerSeconds = savedTimer ? Number(savedTimer) || 10 : 10;
  state.selectedDefaultCategoryId = savedCategory || defaultCategoryDecks[0]?.id || null;
  state.language = savedLanguage || "en";

  if (state.liveMode && !getFirebaseConfig()) {
    state.liveMode = false;
  }

  ensureDefaultPack();

  // Save migrated state
  if (state.user && savedUser) {
    saveState();
  }
}

function saveState() {
  localStorage.setItem(storageKeys.user, JSON.stringify(state.user));
  localStorage.setItem(storageKeys.packs, JSON.stringify(state.packs));
  localStorage.setItem(storageKeys.sessions, JSON.stringify(state.sessions));
}

function setSelectedDefaultCategory(categoryId) {
  state.selectedDefaultCategoryId = categoryId;
  if (categoryId) {
    localStorage.setItem(storageKeys.defaultCategory, categoryId);
  } else {
    localStorage.removeItem(storageKeys.defaultCategory);
  }
}

function ensureDefaultCategorySelection() {
  if (state.selectedDefaultCategoryId) {
    const current = getDefaultCategoryById(state.selectedDefaultCategoryId);
    if (current && isCategoryAllowed(current)) {
      return;
    }
  }
  const allowed = getAllowedCategoryIds();
  const fallback = allowed[0];
  if (fallback) {
    setSelectedDefaultCategory(fallback);
  }
}

function getAllowedCategoryIds() {
  const visible = getPackVisibilityLimit();
  if (visible === 1) {
    return defaultCategoryDecks.filter((category) => category.title === "Animals").map((category) => category.id);
  }
  if (visible === 2) {
    return defaultCategoryDecks
      .filter((category) => ["Animals", "Science & Nature"].includes(category.title))
      .map((category) => category.id);
  }
  return defaultCategoryDecks.map((category) => category.id);
}

function isCategoryAllowed(category) {
  if (!category) return false;
  return getAllowedCategoryIds().includes(category.id);
}

function getDefaultCategoryById(categoryId) {
  return defaultCategoryDecks.find((category) => category.id === categoryId) || null;
}

function buildCategoryPack(category) {
  if (!isCategoryAllowed(category)) {
    alert(state.user ? t("alerts.upgrade_more_access") : t("alerts.login_use_feature"));
    return defaultPack;
  }
  const selected = shuffle(category.questions).slice(0, 15).map((question, index) => ({
    ...question,
    id: `${category.id}_${index + 1}_${makeId("Q")}`,
    sourceQuestionId: question.id,
    level: index + 1
  }));
  const fffQuestion = defaultPack.questions.find((q) => q.type === "FFF");
  const questions = fffQuestion ? [...selected, fffQuestion] : selected;
  return {
    ...defaultPack,
    id: `${defaultPack.id}_${category.id}`,
    sourceCategoryId: category.id,
    title: `${defaultPack.title} • ${category.title}`,
    description: category.subtitle,
    questions
  };
}

function getRandomDefaultFFFQuestion() {
  const pool = defaultPack.questions.filter((q) => q.type === "MCQ" && q.options);
  if (!pool.length) return null;
  return shuffle(pool)[0];
}

function startDefaultCategoryGame() {
  ensureDefaultCategorySelection();
  const category = getDefaultCategoryById(state.selectedDefaultCategoryId);
  if (!category) {
    alert(t("alerts.choose_category_first"));
    return;
  }
  const session = createSession(defaultPack, "CLASSIC");
  if (!session) return;
  renderHost();
  setScreen("host");
  startClassic(session.id);
}

function renderCategoryCards(target, { onSelect, selectedId } = {}) {
  if (!target) return;
  target.innerHTML = "";
  const visible = getPackVisibilityLimit();
  const allowedTitles = visible === 1
    ? ["Animals"]
    : visible === 2
      ? ["Animals", "Science & Nature"]
      : defaultCategoryDecks.map((category) => category.title);
  defaultCategoryDecks.forEach((category) => {
    const translatedCategory = getTranslatedCategory(category);
    const card = document.createElement("button");
    card.type = "button";
    const locked = !allowedTitles.includes(category.title);
    card.className = locked ? "category-card locked" : "category-card";
    if (selectedId === category.id) {
      card.classList.add("selected");
    }
    card.innerHTML = `
      <strong>${translatedCategory.title}</strong>
      <span class="subtext">${translatedCategory.subtitle}</span>
      <span class="meta">${t("category.meta")}</span>
    `;
    card.addEventListener("click", () => {
      if (locked) {
        alert(state.user ? t("alerts.upgrade_more_access") : t("alerts.login_use_feature"));
        setScreen(state.user ? "pricing" : "landing");
        return;
      }
      setSelectedDefaultCategory(category.id);
      if (onSelect) {
        onSelect(category);
        return;
      }
      renderDefaultCategoryPicker();
    });
    target.appendChild(card);
  });
}

function renderDefaultCategoryPicker() {
  if (!dom.defaultCategorySection || !dom.defaultCategoryGrid || !dom.packSelect) return;
  const isDefault = dom.packSelect.value === defaultPack.id;
  dom.defaultCategorySection.style.display = isDefault ? "block" : "none";
  if (!isDefault) return;
  if (dom.defaultCategoryDashboardStatus) {
    dom.defaultCategoryDashboardStatus.textContent = "";
    dom.defaultCategoryDashboardStatus.classList.remove("status-success");
  }
  ensureDefaultCategorySelection();
  renderCategoryCards(dom.defaultCategoryGrid, { selectedId: state.selectedDefaultCategoryId });
}

// Subscription & Feature Gating Functions
function getUserTier() {
  if (!state.user) return "GUEST";
  return state.user.subscription?.tier || "FREE";
}

function getUserLimits() {
  const tier = getUserTier();
  const tierData = subscriptionTiers[tier];
  return tierData?.limits || subscriptionTiers.FREE.limits;
}

function getPackVisibilityLimit() {
  if (!state.user) return 1;
  const tier = getUserTier();
  if (tier === "FREE") return 2;
  return Infinity;
}

function getOrderedPacks() {
  const ordered = [];
  const others = [];
  state.packs.forEach((pack) => {
    if (pack.id === defaultPack.id) {
      ordered.push(pack);
    } else {
      others.push(pack);
    }
  });
  return ordered.concat(others);
}

function isPackAllowed(packId) {
  const packs = getOrderedPacks();
  const limit = getPackVisibilityLimit();
  const index = packs.findIndex((pack) => pack.id === packId);
  if (index === -1) return false;
  return index < limit;
}

function canCreatePack() {
  if (!state.user) return false;
  const limits = getUserLimits();
  const userPacks = state.packs.filter(pack => pack.ownerId === state.user?.email);
  return userPacks.length < limits.maxPacks;
}

function canAddParticipant(sessionId) {
  const session = state.sessions[sessionId];
  if (!session) return false;

  const limits = getUserLimits();
  const participantCount = Object.keys(session.participants).length;
  return participantCount < limits.maxParticipants;
}

function showUpgradePrompt(feature) {
  const messages = {
    maxPacks: t("alerts.upgrade_max_packs"),
    maxParticipants: t("alerts.upgrade_max_participants"),
    customBranding: t("alerts.upgrade_custom_branding"),
    analytics: t("alerts.upgrade_analytics")
  };

  alert(messages[feature] || t("alerts.upgrade_unlock_feature"));
  setScreen("pricing");
}

function setScreen(name) {
  Object.entries(screens).forEach(([key, node]) => {
    if (!node) return;
    node.classList.toggle("active", key === name);
  });

  if (name !== "admin" && adminUsersUnsubscribe) {
    adminUsersUnsubscribe();
    adminUsersUnsubscribe = null;
  }

  if (name === "landing") {
    state.timedMode = false;
    localStorage.setItem(storageKeys.timedMode, String(state.timedMode));
    updateTimedButton();
    stopTimer();
  }

  updateTimedAvailability();
  updateLiveAvailability();
  updateClassicLayoutForSession();
  if (name === "classic") {
    setClassicLight(true);
  }

  // Play appropriate background music based on screen
  if (!audioManager.isMuted) {
    if (name === "classic") {
      // Will be set based on level when rendering classic
      resumeAudioForScreen();
    } else {
      audioManager.playBackground("mainTheme");
    }
  }
}

function updateClassicLayoutForSession() {
  const session = getSession();
  if (screens.classic) {
    screens.classic.classList.toggle("fff-session", session?.mode === "FFF");
  }
}

function updateLoginButton() {
  if (state.user) {
    dom.loginButton.textContent = state.user.displayName ? `👤 ${state.user.displayName}` : t("nav.account");
  } else {
    dom.loginButton.textContent = t("nav.account");
  }
  closeAccountDropdown();
  updateModeAvailability();
}

function clearLocalUser() {
  state.user = null;
  localStorage.removeItem(storageKeys.user);
  updateLoginButton();
}

function resetInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  if (!state.user) return;
  inactivityTimer = setTimeout(() => {
    handleLogout();
  }, INACTIVITY_LIMIT_MS);
}

function startInactivityTracking() {
  const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
  events.forEach((eventName) => {
    window.addEventListener(eventName, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();
}

function formatDateLabel(timestamp) {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleDateString();
  } catch (err) {
    return "—";
  }
}

function closeAccountDropdown() {
  if (dom.accountDropdown) {
    dom.accountDropdown.classList.remove("active");
  }
}

function toggleAccountDropdown() {
  if (!dom.accountDropdown) return;
  dom.accountDropdown.classList.toggle("active");
}

function openAccountDialog() {
  if (!dom.accountDialog || !state.user) return;
  const subscription = state.user.subscription || { tier: "FREE", paid: false };
  if (dom.accountName) dom.accountName.value = state.user.displayName || "Player";
  if (dom.accountEmail) dom.accountEmail.value = state.user.email || "";
  const profile = state.user.profile || {};
  if (dom.accountOrg) dom.accountOrg.value = profile.organization || "";
  if (dom.accountPhone) dom.accountPhone.value = profile.phone || "";
  if (dom.accountCountry) dom.accountCountry.value = profile.country || "";
  if (dom.accountCity) dom.accountCity.value = profile.city || "";
  if (dom.accountZip) dom.accountZip.value = profile.zip || "";
  if (dom.accountBillingName) dom.accountBillingName.value = profile.billingName || "";
  if (dom.accountAddress) dom.accountAddress.value = profile.address || "";
  if (dom.accountPaymentMethod) {
    dom.accountPaymentMethod.value = subscription.tier === "FREE"
      ? "Not required"
      : subscription.paid
        ? "External billing"
        : "Payment required";
  }
  if (dom.accountTier) dom.accountTier.textContent = subscription.tier || "FREE";
  if (dom.accountPayment) {
    dom.accountPayment.textContent = subscription.tier === "FREE"
      ? "Free"
      : subscription.paid
        ? "Paid"
        : "Payment Required";
  }
  if (dom.accountExpires) {
    dom.accountExpires.textContent = subscription.expiresAt
      ? formatDateLabel(subscription.expiresAt)
      : "—";
  }
  if (dom.adminPanelButton) {
    dom.adminPanelButton.style.display = isSuperAdmin() ? "inline-flex" : "none";
  }
  dom.accountDialog.showModal();
}

async function handleLogout() {
  closeAccountDropdown();
  if (firebaseState.auth?.currentUser) {
    try {
      await signOut(firebaseState.auth);
    } catch (err) {
      console.warn("Sign out failed", err);
    }
  } else {
    const ready = await ensureFirebaseReady({ allowAnonymous: false });
    if (ready && firebaseState.auth?.currentUser) {
      try {
        await signOut(firebaseState.auth);
      } catch (err) {
        console.warn("Sign out failed", err);
      }
    }
  }
  firebaseState.user = null;
  clearLocalUser();
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  state.liveMode = false;
  localStorage.setItem(storageKeys.liveMode, String(state.liveMode));
  updateLiveButton();
  setScreen("landing");
}

async function syncUserProfileToFirestore() {
  if (!state.user || !state.user.email) return;
  const ready = await ensureFirebaseReady({ allowAnonymous: false });
  if (!ready || !firebaseState.db) return;
  if (!firebaseState.auth?.currentUser || firebaseState.auth.currentUser.isAnonymous) return;
  const email = state.user.email.toLowerCase();
  const userDoc = doc(firebaseState.db, "users", email);
  const tier = state.user.subscription?.tier || "FREE";
  await setDoc(userDoc, {
    email,
    name: state.user.displayName || "",
    tier,
    updatedAt: Date.now()
  }, { merge: true });
}

function updateTimedButton() {
  if (!dom.timedToggle) return;
  dom.timedToggle.textContent = state.timedMode ? t("nav.timer_on") : t("nav.timer_off");
}

function updateLiveButton() {
  if (!dom.liveToggle) return;
  dom.liveToggle.textContent = state.liveMode ? t("nav.live_on") : t("nav.live_off");
}


function updateTimerSecondsField() {
  if (dom.timerSeconds) {
    dom.timerSeconds.value = String(state.timerSeconds);
  }
}

function updateSoundButtons() {
  const label = audioManager.isMuted ? t("nav.sound_off") : t("nav.sound_on");
  if (dom.soundToggle) {
    dom.soundToggle.textContent = label;
  }
  if (dom.fullscreenSound) {
    dom.fullscreenSound.textContent = label;
  }
}

function updateLightsButton() {
  if (!dom.fullscreenLights) return;
  const lightsOn = document.body.classList.contains("classic-light");
  dom.fullscreenLights.textContent = lightsOn ? t("classic.light_on") : t("classic.light_off");
}

function updateClassicLightsButton() {
  if (!dom.classicLights) return;
  const lightsOn = document.body.classList.contains("classic-light");
  dom.classicLights.textContent = lightsOn ? t("classic.light_on") : t("classic.light_off");
}

function updateFullscreenTimer() {
  if (!dom.fullscreenTimer) return;
  const session = getSession();
  const seconds = session?.currentState?.timerSeconds;
  if (typeof seconds === "number") {
    dom.fullscreenTimer.textContent = t("classic.timer_label", { seconds: Math.max(0, seconds) });
    dom.fullscreenTimer.style.display = "inline-flex";
  } else {
    dom.fullscreenTimer.textContent = "";
    dom.fullscreenTimer.style.display = "none";
  }
}

function updateTimedAvailability() {
  if (!dom.timedToggle) return;
  const session = getSession();
  const inActiveGame = session && session.mode === "CLASSIC" && session.status === "live";
  const onLanding = document.querySelector("#screen-landing")?.classList.contains("active");
  dom.timedToggle.disabled = !onLanding || inActiveGame;
}

function updateLiveAvailability() {
  if (!dom.liveToggle) return;
  const session = getSession();
  const inActiveGame = session && session.mode === "CLASSIC" && session.status === "live";
  const onLanding = document.querySelector("#screen-landing")?.classList.contains("active");
  const isLocked = !state.user || (state.user && !state.user.subscription?.paid);
  dom.liveToggle.disabled = !onLanding || inActiveGame;
  dom.liveToggle.classList.toggle("locked-action", isLocked);
  dom.liveToggle.setAttribute("aria-disabled", String(isLocked));
}

function populatePaymentScreen(tierId) {
  const tier = subscriptionTiers[tierId];
  if (!tier) return;
  if (dom.paymentTierName) dom.paymentTierName.textContent = tier.name;
  if (dom.paymentTierDesc) dom.paymentTierDesc.textContent = tier.description || "";
  if (dom.paymentTierPrice) dom.paymentTierPrice.textContent = tier.priceLabel || "$0";
  document.querySelectorAll(".payment-option").forEach((option) => {
    option.classList.remove("selected");
  });
}

function updateModeAvailability() {
  if (!dom.modeSelect) return;
  const tier = getUserTier();
  const isFreeTier = tier === "FREE" || tier === "GUEST";
  const fffOption = dom.modeSelect.querySelector("option[value=\"FFF\"]");
  if (!fffOption) return;
  fffOption.disabled = isFreeTier;
  if (fffOption.disabled && dom.modeSelect.value === "FFF") {
    dom.modeSelect.value = "CLASSIC";
  }
}

function renderLanding() {
  if (!dom.landingLadder) return;
  dom.landingLadder.innerHTML = "";
  defaultPack.config.amounts.slice().reverse().forEach((amount, index) => {
    const li = document.createElement("li");
    const level = 15 - index;
    li.classList.toggle("safe", defaultPack.config.guaranteedLevels.includes(level));
    li.innerHTML = `<span>${t("landing.level_label", { level })}</span><span>${formatMoney(defaultPack.config.currencySymbol, amount)}</span>`;
    dom.landingLadder.appendChild(li);
  });
}

function renderPackList() {
  if (!dom.packList || !dom.packSelect) return;
  dom.packList.innerHTML = "";
  const packs = getOrderedPacks();
  const limit = getPackVisibilityLimit();
  const lockMessage = state.user ? t("alerts.upgrade_more_access") : t("alerts.login_use_feature");
  packs.forEach((pack, index) => {
    const displayPack = getTranslatedPack(pack);
    const locked = index >= limit;
    const card = document.createElement("div");
    card.className = locked ? "card locked" : "card";
    card.innerHTML = `
      <strong>${displayPack.title}</strong>
      <p class="subtext">${displayPack.description || t("pack.no_description")}</p>
      <button class="secondary pack-edit" data-pack-id="${pack.id}" ${locked ? "disabled" : ""}>${t("pack.edit")}</button>
      ${locked ? `<p class="lock-note">${lockMessage}</p>` : ""}
    `;
    dom.packList.appendChild(card);
  });
  dom.packSelect.innerHTML = "";
  packs.forEach((pack, index) => {
    const displayPack = getTranslatedPack(pack);
    const locked = index >= limit;
    const option = document.createElement("option");
    option.value = pack.id;
    option.textContent = locked ? `${displayPack.title} (${t("pack.upgrade_suffix")})` : displayPack.title;
    option.disabled = locked;
    dom.packSelect.appendChild(option);
  });
  if (!isPackAllowed(dom.packSelect.value)) {
    const firstAllowed = packs.find((pack, index) => index < limit);
    if (firstAllowed) {
      dom.packSelect.value = firstAllowed.id;
    }
  }
  renderDefaultCategoryPicker();
  updateModeAvailability();
}

function renderAdminPanel() {
  if (!dom.adminUserTable) return;
  if (!isSuperAdmin()) {
    alert(t("alerts.admin_access_only"));
    setScreen("landing");
    return;
  }
  dom.adminUserTable.innerHTML = "";
  if (!Array.isArray(state.adminUsers) || state.adminUsers.length === 0) {
    const empty = document.createElement("div");
    empty.className = "subtext";
    empty.textContent = t("admin.no_users");
    dom.adminUserTable.appendChild(empty);
    return;
  }
  state.adminUsers.forEach((user, index) => {
    const docId = user.id || user.email;
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <span>${user.email || ""}</span>
      <span><input type="text" value="${user.name || ""}" data-index="${index}" /></span>
      <span>
        <select data-index="${index}">
          <option value="GUEST">${t("tier.guest")}</option>
          <option value="FREE">${t("tier.free")}</option>
          <option value="PRO">${t("tier.pro")}</option>
          <option value="ENTERPRISE">${t("tier.enterprise")}</option>
        </select>
      </span>
      <span class="admin-actions">
        <button class="ghost" data-action="save" data-index="${index}">${t("admin.action_save")}</button>
        <button class="ghost" data-action="remove" data-index="${index}">${t("admin.action_remove")}</button>
      </span>
    `;
    const select = row.querySelector("select");
    if (select) {
      select.value = user.tier || "FREE";
    }
    const removeButton = row.querySelector("[data-action=\"remove\"]");
    if (removeButton) {
      removeButton.addEventListener("click", async () => {
        await removeAdminUser(docId);
      });
    }
    const saveButton = row.querySelector("[data-action=\"save\"]");
    if (saveButton) {
      saveButton.addEventListener("click", async () => {
        const nameInput = row.querySelector("input");
        const nextName = nameInput ? nameInput.value.trim() : "";
        const nextTier = select ? select.value : user.tier || "FREE";
        await updateAdminUser(docId, {
          email: user.email,
          name: nextName,
          tier: nextTier
        });
      });
    }
    dom.adminUserTable.appendChild(row);
  });
}

async function startAdminUsersListener() {
  if (!isSuperAdmin()) {
    alert(t("alerts.admin_access_only"));
    return;
  }
  const ready = await ensureFirebaseReady({ allowAnonymous: false });
  if (!ready || !firebaseState.db) {
    alert(t("alerts.firebase_config_missing"));
    return;
  }
  if (!firebaseState.auth?.currentUser || firebaseState.auth.currentUser.isAnonymous) {
    alert(t("alerts.super_admin_required"));
    dom.loginDialog?.showModal();
    return;
  }
  if (adminUsersUnsubscribe) {
    adminUsersUnsubscribe();
  }
  adminUsersUnsubscribe = onSnapshot(
    collection(firebaseState.db, "users"),
    (snapshot) => {
      state.adminUsers = [];
      snapshot.forEach((docSnap) => {
        state.adminUsers.push({ id: docSnap.id, ...docSnap.data() });
      });
      renderAdminPanel();
    },
    (error) => {
      console.warn("Admin users listener failed", error);
      if (dom.adminUserTable) {
        dom.adminUserTable.innerHTML = `<div class="subtext">${t("admin.load_error", { code: error.code || "error" })}</div>`;
      }
    }
  );
}

async function upsertAdminUser(payload) {
  const ready = await ensureFirebaseReady({ allowAnonymous: false });
  if (!ready || !firebaseState.db) {
    alert(t("alerts.firebase_config_missing"));
    return;
  }
  const email = payload.email.toLowerCase();
  const userDoc = doc(firebaseState.db, "users", email);
  await setDoc(userDoc, {
    email,
    name: payload.name || "",
    tier: payload.tier || "FREE",
    updatedAt: Date.now()
  }, { merge: true });
}

async function updateAdminUser(docId, payload) {
  if (!docId) return;
  const ready = await ensureFirebaseReady({ allowAnonymous: false });
  if (!ready || !firebaseState.db) return;
  const userDoc = doc(firebaseState.db, "users", docId.toLowerCase());
  await updateDoc(userDoc, {
    email: payload.email?.toLowerCase() || docId.toLowerCase(),
    name: payload.name || "",
    tier: payload.tier || "FREE",
    updatedAt: Date.now()
  });
}

async function removeAdminUser(docId) {
  if (!docId) return;
  const ready = await ensureFirebaseReady({ allowAnonymous: false });
  if (!ready || !firebaseState.db) return;
  const userDoc = doc(firebaseState.db, "users", docId.toLowerCase());
  await deleteDoc(userDoc);
}

function renderPricing() {
  const currentTier = getUserTier();

  // Update all pricing buttons based on current tier
  document.querySelectorAll(".pricing-button[data-tier]").forEach(button => {
    const tier = button.dataset.tier;
    const tierKey = tier ? `tier.${tier.toLowerCase()}` : "tier.free";
    const tierName = t(tierKey);

    if (currentTier === "GUEST") {
      if (tier === "FREE") {
        button.textContent = t("pricing.login_select");
        button.className = "pricing-button ghost";
      } else {
        button.textContent = t("pricing.login_upgrade", { tier: tierName });
        button.className = "pricing-button primary";
      }
      return;
    }

    if (tier === currentTier) {
      button.textContent = t("pricing.current_plan");
      button.className = "pricing-button secondary";
    } else if (tier === "FREE") {
      button.textContent = t("pricing.downgrade_free");
      button.className = "pricing-button ghost";
    } else {
      button.textContent = t("pricing.upgrade_to", { tier: tierName });
      button.className = "pricing-button primary";
      if (!state.user?.subscription?.paid) {
        button.textContent = t("pricing.upgrade_payment_required", { tier: tierName });
      }
    }
  });
  updateModeAvailability();
}

function renderLeaderboard(filterBy = "totalWinnings") {
  // Get all users from localStorage (for now, we only have the current user)
  // In a real app, this would fetch from a backend
  const users = [];

  // Add current user if logged in
  if (state.user && state.user.stats) {
    users.push({
      email: state.user.email,
      displayName: state.user.displayName,
      stats: state.user.stats,
      achievements: state.user.achievements || []
    });
  }

  // Sort users based on filter
  users.sort((a, b) => {
    if (filterBy === "fastestWin") {
      // Handle null values (users who haven't won yet)
      if (a.stats.fastestWin === null) return 1;
      if (b.stats.fastestWin === null) return -1;
      return a.stats.fastestWin - b.stats.fastestWin;
    }
    return (b.stats[filterBy] || 0) - (a.stats[filterBy] || 0);
  });

  // Render table
  dom.leaderboardBody.innerHTML = "";

  if (users.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" style="text-align: center; padding: 40px; color: var(--muted);">${t("leaderboard.empty")}</td>`;
    dom.leaderboardBody.appendChild(row);
    return;
  }

  users.forEach((user, index) => {
    const row = document.createElement("tr");
    const isCurrentUser = state.user && user.email === state.user.email;

    if (isCurrentUser) {
      row.className = "current-user";
    }

    const rank = index + 1;
    const rankClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "";

    // Format score value based on filter
    let scoreValue;
    if (filterBy === "totalWinnings") {
      scoreValue = formatMoney("$", user.stats.totalWinnings || 0);
    } else if (filterBy === "fastestWin") {
      if (user.stats.fastestWin === null) {
        scoreValue = t("leaderboard.na");
      } else {
        const minutes = Math.floor(user.stats.fastestWin / 60000);
        const seconds = Math.floor((user.stats.fastestWin % 60000) / 1000);
        scoreValue = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }
    } else {
      scoreValue = user.stats[filterBy] || 0;
    }

    // Achievement badges (show first 3)
    const achievementBadges = user.achievements.slice(0, 3).map(achId => {
      const ach = achievementDefinitions[achId];
      return ach ? ach.icon : "";
    }).join("");

    row.innerHTML = `
      <td class="rank ${rankClass}">${rank}</td>
      <td class="player-name">${user.displayName}</td>
      <td class="score-value">${scoreValue}</td>
      <td>${user.stats.gamesPlayed || 0}</td>
      <td class="achievement-badges">${achievementBadges}${user.achievements.length > 3 ? t("leaderboard.more_badges") : ""}</td>
    `;

    dom.leaderboardBody.appendChild(row);
  });

  // Update filter button states
  document.querySelectorAll(".filter-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filterBy);
  });
}

function renderAchievements() {
  if (!state.user) {
    dom.achievementsGrid.innerHTML = `<p style='text-align: center; color: var(--muted);'>${t("achievements.login_prompt")}</p>`;
    return;
  }

  const userAchievements = state.user.achievements || [];
  const progress = getAchievementProgress(state.user);

  // Update progress text
  dom.achievementsProgress.textContent = t("achievements.progress_summary", {
    unlocked: progress.unlocked,
    total: progress.total,
    percentage: progress.percentage
  });

  // Update stats
  const stats = state.user.stats || {
    gamesPlayed: 0,
    gamesWon: 0,
    totalWinnings: 0,
    highestLevel: 0
  };

  dom.statGamesPlayed.textContent = stats.gamesPlayed;
  dom.statGamesWon.textContent = stats.gamesWon;
  dom.statTotalWinnings.textContent = formatMoney("$", stats.totalWinnings);
  dom.statHighestLevel.textContent = stats.highestLevel;

  // Render achievement cards
  dom.achievementsGrid.innerHTML = "";

  Object.values(achievementDefinitions).forEach(achievement => {
    const isUnlocked = userAchievements.includes(achievement.id);

    const card = document.createElement("div");
    card.className = `achievement-card ${isUnlocked ? "unlocked" : "locked"}`;

    card.innerHTML = `
      <span class="achievement-icon">${achievement.icon}</span>
      <div class="achievement-name">${t(`achievement.${achievement.id}.name`)}</div>
      <div class="achievement-description">${t(`achievement.${achievement.id}.desc`)}</div>
    `;

    dom.achievementsGrid.appendChild(card);
  });
}

function updateGameStats(type, sessionId) {
  // Only track stats for logged-in users
  if (!state.user || !state.user.stats) return;

  const session = state.sessions[sessionId];
  if (!session) return;

  const pack = getPackForSession(session);
  if (!pack) return;

  const stats = state.user.stats;
  const level = session.currentState.level;

  // Track games played
  stats.gamesPlayed += 1;

  // Calculate prize based on outcome type
  let prize = 0;
  if (type === "win") {
    stats.gamesWon += 1;
    prize = pack.config.amounts[14]; // Level 15 prize
  } else if (type === "lose") {
    stats.gamesLost += 1;
    const safe = pack.config.guaranteedLevels.filter((l) => l <= level).pop() || 0;
    prize = safe ? pack.config.amounts[safe - 1] : 0;
  } else if (type === "walkaway") {
    stats.walkedAway += 1;
    const levelIndex = Math.max(0, level - 2);
    prize = levelIndex >= 0 ? pack.config.amounts[levelIndex] : 0;
  }

  // Update total winnings
  stats.totalWinnings += prize;

  // Track highest level
  if (level > stats.highestLevel) {
    stats.highestLevel = level;
  }

  // Track fastest win (for wins only)
  if (type === "win" && session.startedAt) {
    const gameTime = Date.now() - session.startedAt;
    if (stats.fastestWin === null || gameTime < stats.fastestWin) {
      stats.fastestWin = gameTime;
    }
  }

  // Track lifeline usage
  session.currentState.lifelinesUsed.forEach(lifelineKey => {
    if (stats.lifelinesUsed[lifelineKey] !== undefined) {
      stats.lifelinesUsed[lifelineKey] += 1;
    }
  });

  // Update achievements
  const newAchievements = updateAchievements(state.user);

  // Save state
  saveState();

  // Show achievement notifications if any unlocked
  if (newAchievements.length > 0) {
    setTimeout(() => {
      newAchievements.forEach((achievement, index) => {
        setTimeout(() => {
          alert(t("alerts.achievement_unlocked", {
            icon: achievement.icon,
            name: t(`achievement.${achievement.id}.name`),
            description: t(`achievement.${achievement.id}.desc`)
          }));
        }, index * 500);
      });
    }, 2000);
  }
}

function renderBuilderLadder(amounts) {
  dom.builderLadder.innerHTML = "";
  amounts.forEach((amount, index) => {
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.value = amount;
    input.dataset.level = String(index + 1);
    dom.builderLadder.appendChild(input);
  });
}

function resetBuilder() {
  dom.builderTitle.value = "";
  dom.builderDescription.value = "";
  dom.builderCurrency.value = "$";
  dom.lifelineFifty.value = "50:50";
  dom.lifelineAudience.value = "Ask the Audience";
  dom.lifelinePhone.value = "Phone a Friend";
  dom.builderWinTitle.value = "Congratulations!";
  dom.builderWinMessage.value = "You are a millionaire!";
  dom.builderLoseTitle.value = "Game Over";
  dom.builderLoseMessage.value = "Better luck next time!";
  dom.builderWalkTitle.value = "Well Played!";
  dom.builderWalkMessage.value = "You walked away with:";
  dom.builderPreview.textContent = t("builder.preview_placeholder");
  renderBuilderLadder(defaultPack.config.amounts);
  delete dom.builderPreview.dataset.questions;
  state.editingPackId = null;
}

function createSession(pack, mode) {
  if (!pack) {
    alert(t("alerts.no_pack_selected"));
    return null;
  }
  let resolvedPack = pack;
  if (pack.id === defaultPack.id && mode === "CLASSIC") {
    const category = getDefaultCategoryById(state.selectedDefaultCategoryId);
    if (!category) {
      alert(t("alerts.choose_default_category"));
      return null;
    }
    resolvedPack = buildCategoryPack(category);
  }
  const sessionId = makeId("S");
  const configSnapshot = JSON.parse(JSON.stringify(resolvedPack.config));
  const session = {
    id: sessionId,
    packId: resolvedPack.id,
    mode,
    status: "waiting",
    createdAt: Date.now(),
    configSnapshot,
    packSnapshot: resolvedPack,
    currentState: {
      level: 1,
      questionOrder: buildQuestionOrder(resolvedPack),
      usedLifelines: [],
      disabledOptions: []
    },
    participants: {},
    fffSubmissions: {},
    winnerParticipantId: null,
    fffRoundId: null,
    fffQuestion: null
  };
  state.sessions[sessionId] = session;
  state.activeSessionId = sessionId;
  saveState();
  return session;
}

function buildQuestionOrder(pack) {
  const levels = {};
  pack.questions.filter((q) => q.type === "MCQ").forEach((q) => {
    if (!levels[q.level]) {
      levels[q.level] = [];
    }
    levels[q.level].push(q);
  });
  const order = [];
  for (let level = 1; level <= 15; level += 1) {
    const choices = levels[level] || [];
    const pick = choices.length ? shuffle(choices)[0] : null;
    if (pick) {
      order.push({ level, questionId: pick.id });
    }
  }
  return order;
}

function getPackById(packId) {
  return state.packs.find((pack) => pack.id === packId);
}

function getPackForSession(session) {
  if (!session) return null;
  return getPackById(session.packId) || session.packSnapshot || defaultPack;
}

function getSession() {
  return state.sessions[state.activeSessionId];
}

function renderHost() {
  const session = getSession();
  if (!session) {
    return;
  }
  const pack = getPackForSession(session);
  const displayPack = pack ? getTranslatedPack(pack) : null;
  dom.hostSessionTitle.textContent = displayPack ? displayPack.title : t("live.classic_title");
  dom.hostSessionMeta.textContent = t("host.session_meta", {
    mode: t(`session.mode.${session.mode}`),
    status: getSessionStatusLabel(session.status)
  });
  dom.hostSessionCode.textContent = session.id;
  const joinUrl = `${window.location.origin}${window.location.pathname}?view=participant&session=${session.id}`;
  if (dom.qrImage) {
    dom.qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`;
  }
  dom.copyLink.onclick = () => {
    navigator.clipboard.writeText(joinUrl);
    dom.copyLink.textContent = t("host.copied");
    setTimeout(() => (dom.copyLink.textContent = t("host.copy_link")), 1500);
  };

  dom.hostControls.innerHTML = "";
  dom.hostLive.innerHTML = "";

  if (session.mode === "FFF") {
    renderHostFFF(session, pack, joinUrl);
  } else {
    renderHostClassicStatus(session, pack);
  }
}

function renderHostFFF(session, pack, joinUrl) {
  const fffQuestion = getActiveFFFQuestion(session, pack);
  if (!fffQuestion) {
    dom.hostLive.textContent = t("live.fff_missing");
    return;
  }
  const startBtn = document.createElement("button");
  startBtn.className = "primary";
  startBtn.textContent = session.status === "live" ? t("live.restart_fff") : t("live.start_fff");
  startBtn.onclick = () => startFFF(session.id);

  const winnerBtn = document.createElement("button");
  winnerBtn.className = "secondary";
  winnerBtn.textContent = t("live.compute_winner");
  winnerBtn.onclick = () => computeFFFWinner(session.id);

  const classicBtn = document.createElement("button");
  classicBtn.className = "ghost";
  classicBtn.textContent = t("live.start_classic");
  classicBtn.onclick = () => startClassic(session.id);

  dom.hostControls.append(startBtn, winnerBtn, classicBtn);

  const participantCount = Object.keys(session.participants).length;
  const translatedQuestion = getTranslatedQuestion(fffQuestion);
  const tally = getFFFTally(session, translatedQuestion);
  const results = Object.entries(translatedQuestion.options || {}).map(([key]) => {
    const count = tally[key] || 0;
    const pct = tally.total ? Math.round((count / tally.total) * 100) : 0;
    return `
      <div class="fff-row">
        <strong>${key}</strong>
        <div class="fff-bar"><span style="width:${pct}%"></span></div>
        <span>${count}</span>
      </div>
    `;
  }).join("");

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(joinUrl)}`;
  const winnerName = session.winnerParticipantId && session.participants?.[session.winnerParticipantId]
    ? session.participants[session.winnerParticipantId].name
    : t("host.winner_pending");
  dom.hostLive.innerHTML = `
    <div class="fff-layout">
      <div>
        <div class="question"><strong>${t("host.fff_label")}:</strong> ${translatedQuestion.promptText}</div>
        <div>${t("host.participants_label", { count: participantCount })}</div>
        <div>${t("host.submissions_label", { count: Object.keys(session.fffSubmissions).length })}</div>
        <div class="status">${t("host.winner_label", { name: winnerName })}</div>
      </div>
      <div class="fff-qr">
        <img src="${qrUrl}" alt="Join QR code" />
        <div class="status">${t("host.scan_join_fff")}</div>
        <div class="code">${session.id}</div>
      </div>
    </div>
    <div class="fff-results">${results || ""}</div>
  `;
}

function renderHostClassicStatus(session, pack) {
  const status = document.createElement("div");
  status.className = "stack";
  const openClassicBtn = document.createElement("button");
  openClassicBtn.className = "primary";
  openClassicBtn.textContent = t("live.open_classic");
  openClassicBtn.onclick = () => setScreen("classic");

  const startBtn = document.createElement("button");
  startBtn.className = "secondary";
  startBtn.textContent = session.status === "live" ? t("live.restart_classic") : t("live.start_classic");
  startBtn.onclick = () => startClassic(session.id);

  status.append(openClassicBtn, startBtn);
  dom.hostControls.append(status);

  const currentLevel = session.currentState.level;
  dom.hostLive.innerHTML = `
    <div class="question">${t("host.classic_ready", { level: currentLevel })}</div>
    <div class="status">${t("host.lifelines_used", { count: session.currentState.usedLifelines.length })}</div>
  `;
}

function renderClassic() {
  const session = getSession();
  if (!session) {
    return;
  }
  updateClassicLayoutForSession();
  const pack = getPackForSession(session);
  if (!pack) {
    dom.classicQuestion.textContent = t("classic.pack_missing");
    return;
  }
  const displayPack = getTranslatedPack(pack);
  dom.classicPackTitle.textContent = displayPack ? displayPack.title : t("classic.round_title");
  dom.classicMeta.textContent = t("classic.level_meta", { level: session.currentState.level, total: 15 });

  // Play level-appropriate background music
  const levelMusic = audioManager.getMusicForLevel(session.currentState.level);
  audioManager.playBackground(levelMusic, false);

  const ladder = displayPack.config.amounts;
  if (!state.timedMode || lastRenderedLevel !== session.currentState.level || !dom.classicLadder.children.length) {
    dom.classicLadder.innerHTML = "";
    ladder.slice().reverse().forEach((amount, index) => {
      const level = 15 - index;
      const li = document.createElement("li");
      li.classList.toggle("active", level === session.currentState.level);
      li.classList.toggle("safe", displayPack.config.guaranteedLevels.includes(level));
      if (level < session.currentState.level) {
        li.classList.add("completed");
      }
      li.innerHTML = `<span>${level}</span><span>${formatMoney(displayPack.config.currencySymbol, amount)}</span>`;
      dom.classicLadder.appendChild(li);
    });
    lastRenderedLevel = session.currentState.level;
  }

  const question = getCurrentQuestion(pack, session);
  if (!question) {
    dom.classicQuestion.textContent = t("classic.no_question");
    return;
  }
  const translatedQuestion = getTranslatedQuestion(question);
  const shuffled = getShuffledQuestion(session, translatedQuestion);
  dom.classicQuestion.textContent = translatedQuestion.promptText;
  if (dom.classicQuestionImage) {
    if (translatedQuestion.image || question.image) {
      dom.classicQuestionImage.src = question.image;
      dom.classicQuestionImage.alt = question.imageAlt || translatedQuestion.promptText || "Question image";
      dom.classicQuestionImage.style.display = "block";
    } else {
      dom.classicQuestionImage.removeAttribute("src");
      dom.classicQuestionImage.style.display = "none";
    }
  }
  dom.classicOptions.innerHTML = "";
  const disabled = new Set(session.currentState.disabledOptions || []);
  const isLiveClassic = state.liveMode && session.mode === "CLASSIC";
  const isWinner = state.activeParticipantId && session.winnerParticipantId === state.activeParticipantId;
  const isHost = firebaseState.user?.uid && session.hostUid === firebaseState.user.uid;
  const lockInputs = isLiveClassic && (!isWinner || isHost);
  Object.entries(shuffled.options).forEach(([key, value]) => {
    const btn = document.createElement("button");
    btn.className = "secondary";
    const isEliminated = disabled.has(key);
    btn.disabled = isEliminated || session.currentState.locked || lockInputs;
    btn.textContent = `${key}: ${value}`;
    if (isEliminated) {
      btn.classList.add("eliminated");
    } else if (lockInputs) {
      btn.classList.add("readonly");
    }
    btn.onclick = () => submitAnswerClassic(session.id, key);
    dom.classicOptions.appendChild(btn);
  });

  dom.classicFeedback.textContent = "";
  dom.classicFeedback.className = "feedback";
  if (session.currentState.feedback) {
    dom.classicFeedback.textContent = session.currentState.feedback;
    dom.classicFeedback.className = `feedback ${session.currentState.feedbackTone || ""}`.trim();
  }

  dom.classicLifelines.innerHTML = "";
  const lifelineIcons = {
    fifty_fifty: "✂️",
    ask_audience: "📊",
    phone_friend: "📞"
  };
  displayPack.config.lifelines.forEach((life) => {
    const btn = document.createElement("button");
    btn.className = "ghost";
    const icon = lifelineIcons[life.key] || "⭐";
    btn.textContent = `${icon} ${life.displayName}`;
    btn.disabled = session.currentState.usedLifelines.includes(life.key) || session.currentState.locked || lockInputs;
    btn.onclick = () => useLifeline(session.id, life.key);
    dom.classicLifelines.appendChild(btn);
  });
  const walkButton = dom.walkAway;
  if (walkButton) {
    walkButton.textContent = t("classic.walk_away");
    dom.classicLifelines.appendChild(walkButton);
  }

  const showTimer = state.timedMode || (dom.toggleTimer && dom.toggleTimer.checked);
  if (showTimer && session.currentState.timerSeconds !== undefined) {
    dom.classicTimer.textContent = t("classic.timer_label_compact", { seconds: Math.max(0, session.currentState.timerSeconds) });
  } else {
    dom.classicTimer.textContent = "";
  }
  updateFullscreenTimer();
}

function getCurrentQuestion(pack, session) {
  const entry = session.currentState.questionOrder.find((q) => q.level === session.currentState.level);
  if (!entry) {
    return null;
  }
  return pack.questions.find((q) => q.id === entry.questionId) || null;
}

function getShuffledQuestion(session, question) {
  if (state.liveMode && session?.mode === "CLASSIC") {
    return { options: question.options, correctOption: question.correctOption };
  }
  if (!session.currentState.optionShuffle) {
    session.currentState.optionShuffle = {};
  }
  const seed = session.currentState.shuffleSeed || "base";
  const cacheKey = `${question.id}_${seed}`;
  const cached = session.currentState.optionShuffle[cacheKey];
  if (cached) {
    return cached;
  }
  const labels = ["A", "B", "C", "D"];
  const values = labels.map((key) => question.options[key]);
  const shuffledValues = shuffle(values);
  const options = {};
  labels.forEach((key, index) => {
    options[key] = shuffledValues[index];
  });
  const correctValue = question.options[question.correctOption];
  const correctOption = labels.find((key) => options[key] === correctValue) || question.correctOption;
  const payload = { options, correctOption };
  session.currentState.optionShuffle[cacheKey] = payload;
  saveState();
  return payload;
}

function startClassic(sessionId) {
  const session = state.sessions[sessionId];
  if (!session) return;
  if (state.liveMode && session.mode === "FFF") {
    startLiveClassic(sessionId);
    return;
  }
  session.mode = "CLASSIC";
  session.status = "live";
  session.currentState.level = 1;
  session.currentState.usedLifelines = [];
  session.currentState.lifelinesUsed = []; // Track lifelines used for stats
  session.currentState.disabledOptions = [];
  session.currentState.feedback = "";
  session.currentState.feedbackTone = "";
  session.currentState.locked = false;
  session.currentState.optionShuffle = {};
  session.currentState.shuffleSeed = Math.random().toString(36).slice(2);
  session.currentState.questionOrder = buildQuestionOrder(getPackForSession(session));
  session.startedAt = Date.now(); // Track game start time for stats
  if (state.timedMode) {
    session.currentState.timerSeconds = state.timerSeconds;
  } else if (dom.toggleTimer.checked) {
    session.currentState.timerSeconds = state.timerSeconds;
  } else {
    delete session.currentState.timerSeconds;
  }

  audioManager.play("letsPlay");

  saveState();
  setScreen("classic");
  renderClassic();
  startTimer();
}

function startTimer() {
  stopTimer();
  const session = getSession();
  if (!session || !session.currentState.timerSeconds) {
    return;
  }
  activeTimer = setInterval(() => {
    if (state.liveMode && session.mode === "CLASSIC") {
      if (!firebaseState.user?.uid || session.hostUid !== firebaseState.user.uid) {
        return;
      }
    }
    session.currentState.timerSeconds -= 1;
    if (session.currentState.timerSeconds <= 0) {
      session.currentState.timerSeconds = 0;
      saveState();
      stopTimer();
      submitAnswerClassic(session.id, "TIMEOUT");
      if (state.liveMode && session.mode === "CLASSIC") {
        updateDoc(doc(firebaseState.db, "sessions", session.id), {
          classicState: { ...session.currentState }
        });
      }
      return;
    }
    saveState();
    renderClassic();
    if (state.liveMode && session.mode === "CLASSIC") {
      updateDoc(doc(firebaseState.db, "sessions", session.id), {
        classicState: { ...session.currentState }
      });
    }
  }, 1000);
}

function stopTimer() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
}

function quitGame() {
  const session = getSession();
  if (!session) return;
  stopTimer();
  session.status = "ended";
  session.currentState.feedback = "Game ended. No prize awarded.";
  session.currentState.feedbackTone = "bad";
  session.currentState.locked = true;
  saveState();
  if (state.liveMode && session.id && firebaseState.db) {
    updateDoc(doc(firebaseState.db, "sessions", session.id), {
      status: "ended",
      classicState: { ...session.currentState }
    }).catch((err) => console.warn("Failed to end live session", err));
  }
  setScreen("landing");
}

function submitAnswerClassic(sessionId, selected) {
  const session = state.sessions[sessionId];
  if (state.liveMode && session?.mode === "CLASSIC") {
    submitLiveClassicAnswer(sessionId, selected);
    return;
  }
  const pack = getPackForSession(session);
  const question = getCurrentQuestion(pack, session);
  if (!question || session.currentState.locked) return;
  stopTimer();

  const shuffled = getShuffledQuestion(session, question);
  const correct = selected === shuffled.correctOption;

  // Add visual feedback to options
  const optionButtons = dom.classicOptions.querySelectorAll("button");
  optionButtons.forEach(btn => {
    const optionLetter = btn.textContent.charAt(0);
    if (optionLetter === selected) {
      btn.classList.add(correct ? "correct" : "wrong");
    }
    if (optionLetter === shuffled.correctOption && !correct) {
      btn.classList.add("correct");
    }
    btn.disabled = true;
  });

  // Play sound and lightning effect
  if (correct) {
    audioManager.play("correctAnswer");
    triggerLightningFlash();
  } else {
    audioManager.play("wrongAnswer");
  }

  // Wait for animation/sound before proceeding
  setTimeout(() => {
    session.currentState.feedback = correct ? "Correct!" : "Incorrect.";
    session.currentState.feedbackTone = correct ? "good" : "bad";

    if (correct) {
      if (session.currentState.level >= 15) {
        session.currentState.feedback = "You are a millionaire!";
        session.currentState.feedbackTone = "good";
        session.status = "ended";
        audioManager.stopBackground();
        audioManager.play("letsPlay");

        // Track stats for win
        updateGameStats("win", sessionId);

        // Show celebration dialog after a brief delay
        setTimeout(() => {
          const finalPrize = pack.config.amounts[14]; // Level 15 prize
          showGameOverDialog("win", finalPrize, pack.config.currencySymbol);
        }, 1500);
      } else {
        session.currentState.level += 1;
        session.currentState.disabledOptions = [];
        session.currentState.feedback = "";
        if (state.timedMode) {
          session.currentState.timerSeconds = state.timerSeconds;
        }
        if (pack.config.guaranteedLevels.includes(session.currentState.level)) {
          audioManager.play("letsPlay");
        }
        if (!state.timedMode && session.currentState.timerSeconds) {
          session.currentState.timerSeconds = state.timerSeconds;
        }
      }
    } else {
      const safe = pack.config.guaranteedLevels.filter((level) => level <= session.currentState.level).pop() || 0;
      const prize = safe ? pack.config.amounts[safe - 1] : 0;
      session.currentState.feedback = `Game over. Safe haven prize: ${formatMoney(pack.config.currencySymbol, prize)}`;
      session.currentState.feedbackTone = "bad";
      session.status = "ended";
      audioManager.stopBackground();

      // Track stats for loss
      updateGameStats("lose", sessionId);

      // Show game over dialog after a brief delay
      setTimeout(() => {
        showGameOverDialog("lose", prize, pack.config.currencySymbol);
      }, 1500);
    }

    saveState();
    renderClassic();

    if (session.status === "live") {
      startTimer();
    }
  }, 2000);
}

function useLifeline(sessionId, lifelineKey) {
  const session = state.sessions[sessionId];
  if (state.liveMode && session?.mode === "CLASSIC") {
    useLiveClassicLifeline(sessionId, lifelineKey);
    return;
  }
  const pack = getPackForSession(session);
  const question = getCurrentQuestion(pack, session);
  if (!question || session.currentState.usedLifelines.includes(lifelineKey)) {
    return;
  }

  const shuffled = getShuffledQuestion(session, question);
  session.currentState.usedLifelines.push(lifelineKey);

  // Track lifeline usage for stats
  if (!session.currentState.lifelinesUsed) {
    session.currentState.lifelinesUsed = [];
  }
  session.currentState.lifelinesUsed.push(lifelineKey);

  if (lifelineKey === "fifty_fifty") {
    const incorrect = Object.keys(shuffled.options).filter((key) => key !== shuffled.correctOption);
    session.currentState.disabledOptions = shuffle(incorrect).slice(0, 2);
    audioManager.play("finalAnswer");

    saveState();
    renderClassic();
  }

  if (lifelineKey === "ask_audience") {
    audioManager.play("finalAnswer");
    saveState();
    renderClassic();
    showAskAudienceDialog(question, session.currentState.level, shuffled.correctOption);
  }

  if (lifelineKey === "phone_friend") {
    saveState();
    renderClassic();
    showPhoneAFriendDialog(question, session.currentState.level, shuffled.correctOption);
  }
}

function showAskAudienceDialog(question, level, correctOption = question.correctOption) {
  const dialog = document.querySelector("#audience-dialog");
  const resultsDiv = document.querySelector("#audience-results");
  const manualWrap = document.querySelector("#audience-manual");
  const applyButton = document.querySelector("#audience-apply");
  const inputs = manualWrap ? manualWrap.querySelectorAll("input[data-option]") : [];

  const options = Object.keys(question.options);
  let percentages = {};

  if (!state.liveMode) {
    const poll = pickAudiencePoll(level);
    const correctPercentage = poll.correct;
    const remaining = 100 - correctPercentage;
    const otherOptions = options.filter(opt => opt !== correctOption);
    percentages[correctOption] = correctPercentage;
    let remainingToDistribute = remaining;
    otherOptions.forEach((opt, index) => {
      if (index === otherOptions.length - 1) {
        percentages[opt] = remainingToDistribute;
      } else {
        const amount = Math.floor(Math.random() * remainingToDistribute);
        percentages[opt] = amount;
        remainingToDistribute -= amount;
      }
    });
  }

  // Render bars
  resultsDiv.innerHTML = "";
  options.forEach(opt => {
    const optionDiv = document.createElement("div");
    optionDiv.className = "audience-option";
    optionDiv.innerHTML = `
      <div class="audience-label">${opt}</div>
      <div class="audience-bar-container">
        <div class="audience-bar" style="width: 0%">${percentages[opt]}%</div>
      </div>
    `;
    resultsDiv.appendChild(optionDiv);
  });

  dialog.showModal();

  const renderBars = () => {
    resultsDiv.querySelectorAll(".audience-bar").forEach((bar, index) => {
      bar.style.width = percentages[options[index]] + "%";
    });
  };

  if (manualWrap) {
    manualWrap.style.display = state.liveMode ? "grid" : "none";
  }

  if (state.liveMode && applyButton) {
    applyButton.onclick = () => {
      percentages = {};
      let total = 0;
      inputs.forEach((input) => {
        const opt = input.dataset.option;
        const val = Math.max(0, Math.min(100, Number(input.value) || 0));
        percentages[opt] = val;
        total += val;
      });
      if (total === 0) {
        percentages = { A: 0, B: 0, C: 0, D: 0 };
      } else {
        Object.keys(percentages).forEach((key) => {
          percentages[key] = Math.round((percentages[key] / total) * 100);
        });
      }
      renderBars();
    };
  } else {
    setTimeout(renderBars, 100);
  }
}

function showPhoneAFriendDialog(question, level, correctOption = question.correctOption) {
  const dialog = document.querySelector("#phone-dialog");
  const timerDiv = document.querySelector("#phone-timer");
  const messageDiv = document.querySelector("#phone-message");
  const manualWrap = document.querySelector("#phone-manual");
  const manualInput = document.querySelector("#phone-manual-input");
  const manualApply = document.querySelector("#phone-apply");

  // Start phone a friend sound
  audioManager.play("phoneAFriend");

  dialog.showModal();

  let countdown = 60;
  timerDiv.textContent = countdown;
  messageDiv.textContent = t("status.phone_thinking");

  if (!state.liveMode) {
    setTimeout(() => {
      const hint = phoneFriendHint(level, correctOption);
      messageDiv.textContent = t("status.phone_hint", {
        confidence: hint.reliability,
        answer: hint.hint
      });
    }, 5000);
  }

  // Countdown timer
  const countdownInterval = setInterval(() => {
    countdown--;
    timerDiv.textContent = countdown;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      timerDiv.textContent = t("status.phone_time_up");
    }
  }, 1000);

  // Store interval so it can be cleared if dialog is closed early
  dialog.countdownInterval = countdownInterval;

  // Clear interval when dialog closes
  dialog.addEventListener("close", () => {
    if (dialog.countdownInterval) {
      clearInterval(dialog.countdownInterval);
    }
  }, { once: true });
}

async function startFFF(sessionId) {
  const session = state.sessions[sessionId];
  if (!session) return;

  if (state.liveMode) {
    await startLiveFFF(sessionId);
    audioManager.play("fastestFinger");
    return;
  }

  session.status = "live";
  session.fffSubmissions = {};
  session.winnerParticipantId = null;
  session.fffRoundId = makeId("R");
  session.fffStartTime = Date.now();
  session.fffTimerSeconds = Number(dom.timerSeconds.value) || 20;

  audioManager.play("fastestFinger");

  saveState();
  renderHost();
}

async function computeFFFWinner(sessionId) {
  const session = state.sessions[sessionId];
  const pack = getPackForSession(session);
  const question = getFFFQuestion(pack) || session.fffQuestion;
  const submissions = Object.values(session.fffSubmissions).filter((submission) => {
    if (!session.fffRoundId) return true;
    return submission.roundId === session.fffRoundId;
  });
  if (!question || submissions.length === 0) {
    return;
  }

  if (state.liveMode) {
    await computeLiveFFFWinner(sessionId);
    return;
  }

  submissions.sort((a, b) => {
    if (a.isCorrect !== b.isCorrect) {
      return a.isCorrect ? -1 : 1;
    }
    return a.latencyMs - b.latencyMs;
  });
  const winner = submissions[0];
  session.winnerParticipantId = winner.participantId;
  saveState();
  renderHost();
}

async function joinSession(sessionId, name) {
  if (!state.liveMode && !state.sessions[sessionId]) {
    const ready = await ensureFirebaseReady();
    if (ready) {
      state.liveMode = true;
      localStorage.setItem(storageKeys.liveMode, String(state.liveMode));
      updateLiveButton();
      return joinLiveSession(sessionId, name);
    }
  } else if (state.liveMode) {
    return joinLiveSession(sessionId, name);
  }

  const session = state.sessions[sessionId];
  if (!session) return { ok: false, message: "Session not found." };

  // Feature gating: Check if session can accept more participants
  if (!canAddParticipant(sessionId)) {
    const limits = getUserLimits();
    const participantCount = Object.keys(session.participants).length;
    return {
      ok: false,
      message: `Session full! (${participantCount}/${limits.maxParticipants} participants).\n\nHost needs to upgrade for more participants.`,
      limitReached: true
    };
  }

  const deviceHash = hashDevice(`${navigator.userAgent}-${name}`);
  const participantId = makeId("P");
  session.participants[participantId] = {
    id: participantId,
    name,
    deviceIdHash: deviceHash,
    joinedAt: Date.now(),
    isWinner: false
  };
  state.activeSessionId = sessionId;
  state.activeParticipantId = participantId;
  saveState();
  return { ok: true, participantId, session };
}

async function submitFFF(sessionId, participantId, order) {
  const session = state.sessions[sessionId];
  if (!session || session.fffSubmissions[participantId]) return;

  if (state.liveMode) {
    await submitLiveFFF(sessionId, participantId, order);
    return;
  }

  const pack = getPackForSession(session);
  const question = getFFFQuestion(pack);
  let isCorrect = false;
  if (question && question.correctOption) {
    isCorrect = order === question.correctOption;
  } else if (question && question.correctOrder) {
    isCorrect = JSON.stringify(order) === JSON.stringify(question.correctOrder);
  }
  const submittedAt = Date.now();
  session.fffSubmissions[participantId] = {
    id: makeId("S"),
    participantId,
    isCorrect,
    submittedAt,
    latencyMs: submittedAt - session.fffStartTime,
    answerPayload: order,
    roundId: session.fffRoundId || null
  };
  saveState();
}

function renderParticipant(sessionId, participantId) {
  const session = state.sessions[sessionId];
  if (!session) {
    dom.participantStatus.textContent = t("participant.session_not_found");
    return;
  }
  if (session.mode === "CLASSIC") {
    setScreen("classic");
    renderClassic();
    return;
  }
  const pack = getPackForSession(session);
  dom.participantMeta.textContent = t("participant.session_meta", {
    id: session.id,
    status: getSessionStatusLabel(session.status)
  });
  const question = getActiveFFFQuestion(session, pack);
  if (!question) {
    dom.participantFFF.textContent = t("live.fff_missing");
    return;
  }
  const translatedQuestion = getTranslatedQuestion(question);

  dom.participantFFF.innerHTML = "";
  if (session.status !== "live") {
    dom.participantStatus.textContent = t("participant.waiting");
  }
  const prompt = document.createElement("div");
  prompt.className = "question";
  prompt.textContent = translatedQuestion.promptText;

  const list = document.createElement("div");
  list.className = "stack";

  if (translatedQuestion.options) {
    Object.entries(translatedQuestion.options).forEach(([key, value]) => {
      const btn = document.createElement("button");
      btn.className = "secondary";
      btn.textContent = `${key}: ${value}`;
      btn.onclick = async () => {
        await submitFFF(sessionId, participantId, key);
        dom.participantStatus.textContent = t("participant.voted", { option: key });
        list.querySelectorAll("button").forEach((b) => (b.disabled = true));
      };
      list.appendChild(btn);
    });
  } else if (question.orderItems) {
    const order = shuffle(question.orderItems);
    const selections = [];
    order.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "secondary";
      btn.textContent = item;
      btn.onclick = async () => {
        selections.push(item);
        btn.disabled = true;
        if (selections.length === 4) {
          await submitFFF(sessionId, participantId, selections);
          dom.participantStatus.textContent = t("participant.submitted");
        }
      };
      list.appendChild(btn);
    });
  }

  dom.participantFFF.append(prompt, list);

  if (session.status !== "live") {
    list.querySelectorAll("button").forEach((b) => (b.disabled = true));
  }

  if (session.fffSubmissions?.[participantId]) {
    dom.participantStatus.textContent = t("participant.submitted");
    list.querySelectorAll("button").forEach((b) => (b.disabled = true));
  }
}

function getFFFQuestion(pack) {
  return pack?.questions?.find((q) => q.type === "FFF") || null;
}

function getActiveFFFQuestion(session, pack) {
  if (state.liveMode && session?.fffQuestion) {
    return session.fffQuestion;
  }
  return getFFFQuestion(pack) || session?.fffQuestion || null;
}

function getFFFTally(session, question) {
  const tally = { A: 0, B: 0, C: 0, D: 0, total: 0 };
  if (!question || !question.options) {
    return tally;
  }
  Object.values(session.fffSubmissions || {}).forEach((submission) => {
    if (session.fffRoundId && submission.roundId !== session.fffRoundId) {
      return;
    }
    if (submission.answerPayload && tally[submission.answerPayload] !== undefined) {
      tally[submission.answerPayload] += 1;
      tally.total += 1;
    }
  });
  return tally;
}

function handleWalkAway() {
  const session = getSession();
  if (!session) return;
  const pack = getPackForSession(session);
  const levelIndex = session.currentState.level - 2;
  const prize = levelIndex >= 0 ? pack.config.amounts[levelIndex] : 0;
  session.currentState.feedback = `Walked away with ${formatMoney(pack.config.currencySymbol, prize)}.`;
  session.currentState.feedbackTone = "good";
  session.status = "ended";
  session.currentState.locked = true;

  audioManager.stopBackground();
  audioManager.play("commercialBreak");

  // Track stats for walk away
  updateGameStats("walkaway", state.activeSessionId);

  saveState();
  renderClassic();

  // Show walk away dialog after a brief delay
  setTimeout(() => {
    showGameOverDialog("walkaway", prize, pack.config.currencySymbol);
  }, 1000);
}

function triggerLightningFlash() {
  const lightningEl = document.querySelector(".lightning-effects");
  if (lightningEl) {
    lightningEl.classList.add("flash");
    setTimeout(() => {
      lightningEl.classList.remove("flash");
    }, 500);
  }
}

function showGameOverDialog(type, prize, currencySymbol) {
  // type can be: "win", "lose", "walkaway"
  const dialog = dom.gameoverDialog;
  const icon = dom.gameoverIcon;
  const title = dom.gameoverTitle;
  const message = dom.gameoverMessage;
  const prizeDiv = dom.gameoverPrize;
  const session = getSession();
  const pack = session ? getPackForSession(session) : null;
  const displayPack = pack ? getTranslatedPack(pack) : null;
  const messages = displayPack?.config?.messages || {};

  // Clear previous classes
  icon.className = "gameover-icon";
  prizeDiv.className = "gameover-prize";
  dialog.classList.toggle("win", type === "win");
  dialog.classList.toggle("celebrate", prize > 100);

  // Set content based on type
  if (type === "win") {
    icon.textContent = "🎉";
    icon.classList.add("celebration");
    title.textContent = messages.winTitle || "Congratulations!";
    message.textContent = messages.winMessage || "You are a millionaire!";
    prizeDiv.textContent = formatMoney(currencySymbol, prize);
    prizeDiv.classList.add("big-win");

    // Trigger extra celebration effects
    triggerLightningFlash();
  } else if (type === "walkaway") {
    if (prize > 0) {
      icon.textContent = "✨";
      icon.classList.add("celebration");
      title.textContent = messages.walkAwayTitle || "Well Played!";
      message.textContent = messages.walkAwayMessage || "You walked away with:";
      prizeDiv.textContent = formatMoney(currencySymbol, prize);
    } else {
      icon.textContent = "👋";
      title.textContent = messages.walkAwayTitle || "Thanks for Playing!";
      message.textContent = messages.walkAwayMessage || "You walked away before winning any money.";
      prizeDiv.textContent = "";
    }
  } else if (type === "lose") {
    icon.textContent = "😔";
    title.textContent = messages.loseTitle || "Game Over";
    message.textContent = messages.loseMessage || "Better luck next time!";
    if (prize > 0) {
      prizeDiv.textContent = `Safe prize: ${formatMoney(currencySymbol, prize)}`;
    } else {
      prizeDiv.textContent = t("gameover.no_prize");
    }
  }

  // Show the dialog
  dialog.showModal();

  if (manualWrap) {
    manualWrap.style.display = state.liveMode ? "flex" : "none";
  }
  if (state.liveMode && manualApply && manualInput) {
    manualApply.onclick = () => {
      const val = (manualInput.value || "").trim().toUpperCase();
      if (!["A", "B", "C", "D"].includes(val)) {
        messageDiv.textContent = t("status.invalid_letter");
        return;
      }
      messageDiv.textContent = t("status.phone_hint_short", { answer: val });
    };
  }
}

function handleCSVUpload(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    const validated = validateCSV(rows);
    if (!validated.ok) {
    dom.builderPreview.textContent = validated.error;
      return;
    }
    dom.builderPreview.textContent = t("builder.preview_loaded", { count: validated.questions.length });
    dom.builderPreview.dataset.questions = JSON.stringify(validated.questions);
  };
  reader.readAsText(file);
}

function savePack() {
  // Feature gating: Check if user can create more packs
  if (!state.editingPackId && !canCreatePack()) {
    const limits = getUserLimits();
    const userPacks = state.packs.filter(pack => pack.ownerId === state.user?.email);
    alert(t("alerts.pack_limit_reached", {
      current: userPacks.length,
      max: limits.maxPacks
    }));
    setScreen("pricing");
    renderPricing();
    return;
  }

  const questionsRaw = dom.builderPreview.dataset.questions;
  if (!questionsRaw) {
  dom.builderPreview.textContent = t("builder.preview_invalid");
    return;
  }
  const questions = JSON.parse(questionsRaw).map((q) => ({ ...q, id: makeId("Q") }));
  const ladderInputs = Array.from(dom.builderLadder.querySelectorAll("input"));
  const amounts = ladderInputs.map((input) => Number(input.value) || 0);
  const messages = {
    winTitle: dom.builderWinTitle.value || "Congratulations!",
    winMessage: dom.builderWinMessage.value || "You are a millionaire!",
    loseTitle: dom.builderLoseTitle.value || "Game Over",
    loseMessage: dom.builderLoseMessage.value || "Better luck next time!",
    walkAwayTitle: dom.builderWalkTitle.value || "Well Played!",
    walkAwayMessage: dom.builderWalkMessage.value || "You walked away with:"
  };
  const pack = {
    id: state.editingPackId || makeId("PACK"),
    ownerId: state.user ? state.user.email : "guest",
    title: dom.builderTitle.value || "Untitled Pack",
    description: dom.builderDescription.value,
    config: {
      currencySymbol: dom.builderCurrency.value || "$",
      amounts,
      guaranteedLevels: [5, 10, 15],
      lifelines: [
        { key: "fifty_fifty", displayName: dom.lifelineFifty.value, enabled: true },
        { key: "ask_audience", displayName: dom.lifelineAudience.value, enabled: true },
        { key: "phone_friend", displayName: dom.lifelinePhone.value, enabled: true }
      ],
      messages
    },
    questions
  };
  if (state.editingPackId) {
    state.packs = state.packs.map((existing) => (existing.id === pack.id ? pack : existing));
  } else {
    state.packs.push(pack);
  }
  saveState();
  renderPackList();
  setScreen("dashboard");
}

function initEvents() {
  startInactivityTracking();
  if (dom.languageSelect) {
    dom.languageSelect.addEventListener("change", (event) => {
      setLanguage(event.target.value);
    });
  }
  dom.loginButton.addEventListener("click", () => {
    if (state.user) {
      toggleAccountDropdown();
      return;
    }
    dom.loginDialog.showModal();
  });

  if (dom.accountButton) {
    dom.accountButton.addEventListener("click", () => {
      closeAccountDropdown();
      openAccountDialog();
    });
  }

  if (dom.adminPanelButton) {
    dom.adminPanelButton.addEventListener("click", () => {
      dom.accountDialog?.close();
      if (!isSuperAdmin()) {
        alert(t("alerts.admin_access_only"));
        return;
      }
      setScreen("admin");
      startAdminUsersListener();
    });
  }

  if (dom.logoutButton) {
    dom.logoutButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleLogout();
    });
    dom.logoutButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleLogout();
    });
    dom.logoutButton.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleLogout();
    };
  }

  if (dom.accountDropdown) {
    dom.accountDropdown.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const logoutButton = target.closest("#btn-logout");
      if (logoutButton) {
        event.preventDefault();
        event.stopPropagation();
        handleLogout();
      }
    });
  }

  if (dom.accountSave) {
    dom.accountSave.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!state.user) return;
      const nextName = dom.accountName?.value.trim();
      if (nextName) {
        state.user.displayName = nextName;
      }
      state.user.profile = {
        ...(state.user.profile || {}),
        organization: dom.accountOrg?.value.trim() || "",
        phone: dom.accountPhone?.value.trim() || "",
        country: dom.accountCountry?.value.trim() || "",
        city: dom.accountCity?.value.trim() || "",
        zip: dom.accountZip?.value.trim() || "",
        billingName: dom.accountBillingName?.value.trim() || "",
        address: dom.accountAddress?.value.trim() || ""
      };
      saveState();
      updateLoginButton();
      const ready = await ensureFirebaseReady({ allowAnonymous: false });
      if (ready && firebaseState.auth?.currentUser && nextName) {
        updateProfile(firebaseState.auth.currentUser, { displayName: nextName })
          .catch((err) => console.warn("Profile update failed", err));
      }
      dom.accountDialog?.close();
    });
  }

  if (dom.adminAdd) {
    dom.adminAdd.addEventListener("click", async () => {
      if (!isSuperAdmin()) {
        alert(t("alerts.admin_access_only"));
        return;
      }
      const email = dom.adminUserEmail?.value.trim().toLowerCase();
      const name = dom.adminUserName?.value.trim();
      const tier = dom.adminUserTier?.value || "FREE";
      if (!email) {
        alert(t("alerts.email_required"));
        return;
      }
      await upsertAdminUser({ email, name: name || "", tier });
      if (dom.adminUserEmail) dom.adminUserEmail.value = "";
      if (dom.adminUserName) dom.adminUserName.value = "";
    });
  }

  if (dom.adminRefresh) {
    dom.adminRefresh.addEventListener("click", () => {
      startAdminUsersListener();
    });
  }

  if (dom.adminBack) {
    dom.adminBack.addEventListener("click", () => {
      setScreen("landing");
    });
  }

  if (dom.subscriptionRequestClose) {
    dom.subscriptionRequestClose.addEventListener("click", () => {
      dom.subscriptionRequestDialog?.close();
    });
  }

  if (dom.accountClose) {
    dom.accountClose.addEventListener("click", () => {
      dom.accountDialog?.close();
    });
  }

  document.addEventListener("click", (event) => {
    if (!dom.accountMenu || !dom.accountDropdown) return;
    if (!dom.accountMenu.contains(event.target)) {
      closeAccountDropdown();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const logoutButton = target.closest("#btn-logout");
    if (logoutButton) {
      event.preventDefault();
      event.stopPropagation();
      handleLogout();
    }
  }, true);


  if (dom.loginCancel) {
    dom.loginCancel.addEventListener("click", () => {
      dom.loginDialog?.close();
      setScreen("landing");
    });
  }

  if (dom.authLoginToggle) {
    dom.authLoginToggle.addEventListener("click", () => setAuthMode("login"));
  }

  if (dom.authRegisterToggle) {
    dom.authRegisterToggle.addEventListener("click", () => setAuthMode("register"));
  }

  dom.saveLogin.addEventListener("click", async (event) => {
    event.preventDefault();
    const ready = await ensureFirebaseReady({ allowAnonymous: false });
    if (!ready || !firebaseState.auth) {
      if (firebaseState.lastInitError === "config") {
        setAuthStatus(t("auth.status.firebase_missing"));
      } else if (firebaseState.lastInitError === "anonymous") {
        setAuthStatus(t("auth.status.anonymous_disabled"));
      } else {
        setAuthStatus(t("auth.status.firebase_failed"));
      }
      return;
    }

    const email = dom.loginEmail.value.trim();
    const password = dom.loginPassword?.value || "";
    const displayName = dom.loginName.value.trim();
    const confirm = dom.loginPasswordConfirm?.value || "";

    if (!email || !password) {
      setAuthStatus(t("auth.status.email_password_required"));
      return;
    }

    try {
      if (authMode === "register") {
        if (password.length < 6) {
          setAuthStatus(t("auth.status.password_short"));
          return;
        }
        if (password !== confirm) {
          setAuthStatus(t("auth.status.password_mismatch"));
          return;
        }
        const result = await createUserWithEmailAndPassword(firebaseState.auth, email, password);
        if (displayName) {
          await updateProfile(result.user, { displayName });
        }
        updateAuthUser(result.user);
      } else {
        const result = await signInWithEmailAndPassword(firebaseState.auth, email, password);
        updateAuthUser(result.user);
      }
      setAuthStatus("", true);
      dom.loginDialog.close();
    } catch (err) {
      console.warn("Auth error", err);
      setAuthStatus(t("auth.status.auth_failed"));
    }
  });

  if (dom.authReset) {
    dom.authReset.addEventListener("click", async () => {
      const ready = await ensureFirebaseReady({ allowAnonymous: false });
      if (!ready || !firebaseState.auth) {
        if (firebaseState.lastInitError === "config") {
          setAuthStatus(t("auth.status.firebase_missing"));
        } else if (firebaseState.lastInitError === "anonymous") {
          setAuthStatus(t("auth.status.anonymous_disabled"));
        } else {
          setAuthStatus(t("auth.status.firebase_failed"));
        }
        return;
      }
      const email = dom.loginEmail.value.trim();
      if (!email) {
        setAuthStatus(t("auth.status.enter_email_first"));
        return;
      }
      try {
        await sendPasswordResetEmail(firebaseState.auth, email);
        setAuthStatus(t("auth.status.reset_sent"), true);
      } catch (err) {
        console.warn("Password reset error", err);
        setAuthStatus(t("auth.status.reset_failed"));
      }
    });
  }


  dom.soundToggle.addEventListener("click", () => {
    const isMuted = audioManager.toggleMute();
    updateSoundButtons();

    // Try to initialize audio on first interaction
    if (!isMuted) {
      console.log("Sound enabled - initializing audio system");
      // Play a brief silent sound to initialize audio context
      const testSound = audioManager.sounds.mainTheme;
      if (testSound) {
        testSound.volume = 0.01;
        testSound.play().then(() => {
          console.log("Audio system initialized successfully");
          testSound.pause();
          testSound.currentTime = 0;
          // Now play the actual main theme if on landing page
          resumeAudioForScreen();
        }).catch(err => {
          console.error("Failed to initialize audio:", err);
        });
      }
    } else {
      audioManager.stopBackground(false);
    }
  });

  if (dom.timedToggle) {
    dom.timedToggle.addEventListener("click", () => {
      if (dom.timedToggle.disabled) return;
      const nextMode = !state.timedMode;
      if (nextMode) {
        if (!dom.timerDialog || !dom.timerDialogInput) return;
        dom.timerDialogInput.value = String(state.timerSeconds);
        pendingTimerToggle = true;
        dom.timerDialog.showModal();
        return;
      }
      state.timedMode = false;
      localStorage.setItem(storageKeys.timedMode, String(state.timedMode));
      updateTimedButton();

      const session = getSession();
      if (session && session.mode === "CLASSIC" && session.status === "live") {
        if (dom.toggleTimer && dom.toggleTimer.checked) {
          session.currentState.timerSeconds = state.timerSeconds;
        } else {
          delete session.currentState.timerSeconds;
          stopTimer();
        }
        saveState();
        renderClassic();
        startTimer();
      }
    });
  }

  if (dom.timerDialogApply && dom.timerDialogCancel && dom.timerDialogInput && dom.timerDialog) {
    dom.timerDialogApply.addEventListener("click", (event) => {
      event.preventDefault();
      const nextValue = Math.max(5, Math.min(90, Number(dom.timerDialogInput.value) || state.timerSeconds));
      state.timerSeconds = nextValue;
      localStorage.setItem(storageKeys.timerSeconds, String(state.timerSeconds));
      if (pendingTimerToggle) {
        state.timedMode = true;
        localStorage.setItem(storageKeys.timedMode, String(state.timedMode));
      }
      pendingTimerToggle = false;
      updateTimedButton();
      const session = getSession();
      if (session && session.mode === "CLASSIC" && session.status === "live") {
        session.currentState.timerSeconds = state.timerSeconds;
        saveState();
        renderClassic();
        startTimer();
      }
      dom.timerDialog.close();
    });
    dom.timerDialogCancel.addEventListener("click", (event) => {
      event.preventDefault();
      pendingTimerToggle = false;
      dom.timerDialog.close();
    });
  }

  if (dom.liveToggle) {
    dom.liveToggle.addEventListener("click", async () => {
      if (!state.user || !state.user.subscription?.paid) {
        alert(t("alerts.upgrade_use_feature"));
        setScreen("pricing");
        return;
      }
      const nextMode = !state.liveMode;
      if (nextMode) {
        const ready = await ensureFirebaseReady();
        if (!ready) {
          alert(t("alerts.firebase_config_missing"));
          return;
        }
      }
      state.liveMode = nextMode;
      localStorage.setItem(storageKeys.liveMode, String(state.liveMode));
      updateLiveButton();
    });
  }

  if (dom.quitGame) {
    dom.quitGame.addEventListener("click", () => {
      const confirmed = window.confirm("Quit the game? No prize will be won.");
      if (!confirmed) return;
      quitGame();
    });
  }


  if (dom.themeToggle) {
    dom.themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("high-contrast");
    });
  }

  dom.leaderboardButton.addEventListener("click", () => {
    setScreen("leaderboard");
    renderLeaderboard();
  });

  if (dom.homeButton) {
    dom.homeButton.addEventListener("click", () => {
      setScreen("landing");
    });
  }

  dom.achievementsButton.addEventListener("click", () => {
    setScreen("achievements");
    renderAchievements();
  });

  if (dom.dashboardHome) {
    dom.dashboardHome.addEventListener("click", () => {
      setScreen("landing");
    });
  }

  dom.upgradeButton.addEventListener("click", () => {
    setScreen("pricing");
    renderPricing();
  });

  dom.playDefault.addEventListener("click", () => {
    ensureDefaultPack();
    const animals = defaultCategoryDecks.find((category) => category.title === "Animals");
    if (animals) {
      setSelectedDefaultCategory(animals.id);
    }
    startDefaultCategoryGame();
  });

  if (dom.selectPack) {
    dom.selectPack.addEventListener("click", () => {
      ensureDefaultPack();
      if (dom.defaultCategoryDialog && dom.defaultCategoryDialogGrid) {
        if (dom.defaultCategoryStatus) {
          dom.defaultCategoryStatus.textContent = "";
          dom.defaultCategoryStatus.classList.remove("status-success");
        }
        ensureDefaultCategorySelection();
        const renderDialogCards = () => {
          renderCategoryCards(dom.defaultCategoryDialogGrid, {
            selectedId: state.selectedDefaultCategoryId,
            onSelect: () => renderDialogCards()
          });
        };
        renderDialogCards();
        dom.defaultCategoryDialog.showModal();
      }
    });
  }

  if (dom.defaultCategoryStart && dom.defaultCategoryDialog) {
    dom.defaultCategoryStart.addEventListener("click", (event) => {
      event.preventDefault();
      dom.defaultCategoryDialog.close();
      startDefaultCategoryGame();
    });
  }

  if (dom.defaultCategoryStartDashboard) {
    dom.defaultCategoryStartDashboard.addEventListener("click", (event) => {
      event.preventDefault();
      startDefaultCategoryGame();
    });
  }

  dom.goDashboard.addEventListener("click", () => {
    setScreen("dashboard");
    renderPackList();
  });

  dom.createPack.addEventListener("click", () => {
    if (!state.user) {
      dom.builderPreview.textContent = t("builder.preview_login_required");
    }
    resetBuilder();
    setScreen("builder");
  });

  dom.cancelBuilder.addEventListener("click", () => {
    setScreen("dashboard");
  });

  dom.builderCsv.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      handleCSVUpload(file);
    }
  });

  dom.savePack.addEventListener("click", () => {
    if (!state.user) {
      dom.builderPreview.textContent = t("builder.preview_login_required");
      return;
    }
    savePack();
  });

  dom.createSession.addEventListener("click", async () => {
    const packId = dom.packSelect.value;
    const mode = dom.modeSelect.value;
    if (!isPackAllowed(packId)) {
      alert(state.user ? t("alerts.upgrade_more_packs") : t("alerts.login_use_feature"));
      setScreen(state.user ? "pricing" : "landing");
      return;
    }
    if (mode === "FFF" && getUserTier() !== "PRO" && getUserTier() !== "ENTERPRISE") {
      alert(t("alerts.fff_free_tier_unavailable"));
      setScreen("pricing");
      return;
    }
    const pack = getPackById(packId);
    const session = state.liveMode && mode === "FFF"
      ? await createLiveSession(pack, mode)
      : createSession(pack, mode);
    if (!session) return;
    renderHost();
    setScreen("host");
  });

  dom.packSelect.addEventListener("change", () => {
    renderDefaultCategoryPicker();
  });

  dom.packList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("pack-edit")) return;
    const packId = target.dataset.packId;
    const pack = getPackById(packId);
    if (!pack) return;
    state.editingPackId = pack.id;
    dom.builderTitle.value = pack.title || "";
    dom.builderDescription.value = pack.description || "";
    dom.builderCurrency.value = pack.config?.currencySymbol || "$";
    dom.lifelineFifty.value = pack.config?.lifelines?.find((l) => l.key === "fifty_fifty")?.displayName || "50:50";
    dom.lifelineAudience.value = pack.config?.lifelines?.find((l) => l.key === "ask_audience")?.displayName || "Ask the Audience";
    dom.lifelinePhone.value = pack.config?.lifelines?.find((l) => l.key === "phone_friend")?.displayName || "Phone a Friend";
    dom.builderWinTitle.value = pack.config?.messages?.winTitle || "Congratulations!";
    dom.builderWinMessage.value = pack.config?.messages?.winMessage || "You are a millionaire!";
    dom.builderLoseTitle.value = pack.config?.messages?.loseTitle || "Game Over";
    dom.builderLoseMessage.value = pack.config?.messages?.loseMessage || "Better luck next time!";
    dom.builderWalkTitle.value = pack.config?.messages?.walkAwayTitle || "Well Played!";
    dom.builderWalkMessage.value = pack.config?.messages?.walkAwayMessage || "You walked away with:";
    renderBuilderLadder(pack.config?.amounts || defaultPack.config.amounts);
  dom.builderPreview.textContent = t("builder.preview_loaded_pack", { count: pack.questions.length });
    dom.builderPreview.dataset.questions = JSON.stringify(pack.questions.filter((q) => q.type === "MCQ"));
    setScreen("builder");
  });

  dom.endSession.addEventListener("click", async () => {
    const session = getSession();
    if (!session) return;
    if (state.liveMode) {
      await updateDoc(doc(firebaseState.db, "sessions", session.id), {
        status: "ended"
      });
    } else {
      session.status = "ended";
      saveState();
    }
    setScreen("dashboard");
  });

  dom.participantJoin.addEventListener("click", async () => {
    const code = dom.participantCode.value.trim().toUpperCase();
    const name = dom.participantName.value.trim();
    if (!code || !name) {
      dom.participantStatus.textContent = t("participant.enter_code");
      return;
    }
    const result = await joinSession(code, name);
    if (!result.ok) {
      dom.participantStatus.textContent = result.message;
      return;
    }
    dom.participantStatus.textContent = t("participant.joined", { code });
    renderParticipant(code, result.participantId);
  });

  dom.walkAway.addEventListener("click", handleWalkAway);

  // Pricing screen navigation
  dom.backFromPricing.addEventListener("click", () => {
    setScreen("landing");
  });

  // Handle pricing button clicks (upgrade tier simulation)
  document.querySelectorAll(".pricing-button[data-tier]").forEach(button => {
    button.addEventListener("click", () => {
      const tier = button.dataset.tier;
      if (!state.user) {
        alert(t("alerts.login_manage_subscription"));
        dom.loginDialog.showModal();
        return;
      }

      // If clicking on current tier, do nothing
      if (state.user.subscription.tier === tier) {
        return;
      }

      if (tier === "FREE") {
        state.user.subscription = {
          tier: tier,
          startDate: Date.now(),
          expiresAt: null,
          features: subscriptionTiers[tier].limits,
          paid: false
        };
        saveState();
        updateLoginButton();
        alert(t("alerts.plan_updated_free"));
        setScreen("dashboard");
        return;
      }

      state.paymentTier = tier;
      populatePaymentScreen(tier);
      setScreen("payment");
    });
  });

  // Leaderboard screen navigation
  dom.backFromLeaderboard.addEventListener("click", () => {
    setScreen("landing");
  });

  if (dom.paymentBack) {
    dom.paymentBack.addEventListener("click", () => {
      state.paymentTier = null;
      setScreen("pricing");
    });
  }

  if (dom.paymentConfirm) {
    dom.paymentConfirm.addEventListener("click", async () => {
      if (!state.user || !state.paymentTier) {
        alert(t("alerts.select_plan_first"));
        setScreen("pricing");
        return;
      }
      const method = document.querySelector(".payment-option.selected");
      if (!method) {
        alert(t("alerts.select_payment_method"));
        return;
      }
      const tier = state.paymentTier;
      const ready = await ensureFirebaseReady({ allowAnonymous: false });
      if (!ready || !firebaseState.db) {
        alert(t("alerts.firebase_config_missing"));
        return;
      }
      const payload = {
        email: state.user.email || "",
        name: state.user.displayName || "",
        tier,
        method: method.dataset.method || "",
        status: "pending",
        createdAt: Date.now()
      };
      await setDoc(doc(collection(firebaseState.db, "subscription_requests")), payload);
      state.paymentTier = null;
      if (dom.subscriptionRequestMessage) {
        dom.subscriptionRequestMessage.textContent = t("subscription.request_notice", {
          email: "ismailukman@gmail.com"
        });
      }
      dom.subscriptionRequestDialog?.showModal();
      setScreen("pricing");
    });
  }

  document.querySelectorAll(".payment-option").forEach((option) => {
    option.addEventListener("click", () => {
      document.querySelectorAll(".payment-option").forEach((btn) => btn.classList.remove("selected"));
      option.classList.add("selected");
    });
  });

  // Leaderboard filter buttons
  document.querySelectorAll(".filter-button[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      renderLeaderboard(filter);
    });
  });

  // Achievements screen navigation
  dom.backFromAchievements.addEventListener("click", () => {
    setScreen("landing");
  });

  // Footer quick links navigation
  const footerHome = document.querySelector("#footer-home");
  const footerDashboard = document.querySelector("#footer-dashboard");
  const footerLeaderboard = document.querySelector("#footer-leaderboard");
  const footerPricing = document.querySelector("#footer-pricing");
  const footerContrast = document.querySelector("#footer-contrast");
  const backFromContact = document.querySelector("#btn-back-from-contact");
  const footerTerms = document.querySelector("#footer-terms");
  const footerPrivacy = document.querySelector("#footer-privacy");
  const footerContact = document.querySelector("#footer-contact");

  const termsDialog = document.querySelector("#terms-dialog");
  const privacyDialog = document.querySelector("#privacy-dialog");

  if (footerHome) {
    footerHome.addEventListener("click", (e) => {
      e.preventDefault();
      setScreen("landing");
    });
  }

  if (footerDashboard) {
    footerDashboard.addEventListener("click", (e) => {
      e.preventDefault();
      setScreen("dashboard");
    });
  }

  if (footerLeaderboard) {
    footerLeaderboard.addEventListener("click", (e) => {
      e.preventDefault();
      setScreen("leaderboard");
      renderLeaderboard();
    });
  }

  if (footerPricing) {
    footerPricing.addEventListener("click", (e) => {
      e.preventDefault();
      setScreen("pricing");
      renderPricing();
    });
  }

  if (footerContrast) {
    footerContrast.addEventListener("click", (e) => {
      e.preventDefault();
      document.body.classList.toggle("high-contrast");
    });
  }

  if (dom.fullscreenButton && dom.classicLayout) {
    const updateFullscreenLabel = () => {
      dom.fullscreenButton.textContent = document.fullscreenElement ? t("classic.exit_fullscreen") : t("classic.fullscreen");
    };
    dom.fullscreenButton.addEventListener("click", () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        dom.classicLayout.requestFullscreen().catch(() => {});
      }
    });
    document.addEventListener("fullscreenchange", updateFullscreenLabel);
    updateFullscreenLabel();
  }

  if (dom.fullscreenExit) {
    dom.fullscreenExit.addEventListener("click", () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  if (dom.fullscreenSound) {
    dom.fullscreenSound.addEventListener("click", () => {
      const isMuted = audioManager.toggleMute();
      updateSoundButtons();
      if (!isMuted) {
        resumeAudioForScreen();
      }
    });
  }

  if (dom.fullscreenLights) {
    dom.fullscreenLights.addEventListener("click", () => {
      document.body.classList.toggle("classic-light");
      updateLightsButton();
    });
  }

  if (dom.classicLights) {
    dom.classicLights.addEventListener("click", () => {
      document.body.classList.toggle("classic-light");
      updateLightsButton();
      updateClassicLightsButton();
    });
  }

  if (footerTerms && termsDialog) {
    footerTerms.addEventListener("click", (e) => {
      e.preventDefault();
      termsDialog.showModal();
    });
  }

  if (footerPrivacy && privacyDialog) {
    footerPrivacy.addEventListener("click", (e) => {
      e.preventDefault();
      privacyDialog.showModal();
    });
  }

  if (footerContact) {
    footerContact.addEventListener("click", (e) => {
      e.preventDefault();
      setScreen("contact");
    });
  }

  if (backFromContact) {
    backFromContact.addEventListener("click", () => {
      setScreen("landing");
    });
  }

  // Newsletter form
  const newsletterForm = document.querySelector("#newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = newsletterForm.querySelector("input[type='email']").value;
      alert(t("alerts.subscribe_thanks", { email }));
      newsletterForm.reset();
    });
  }

  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert(t("alerts.contact_thanks"));
      contactForm.reset();
    });
  }

  window.addEventListener("storage", () => {
    loadState();
    updateLoginButton();
    renderPackList();
    renderHost();
    renderClassic();
  });
}

function initFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const sessionId = params.get("session");
  if (view === "participant") {
    if (sessionId) {
      dom.participantCode.value = sessionId;
    }
    setScreen("participant");
    return;
  }
  setScreen("landing");
}

async function bootstrap() {
  loadState();
  await initI18n();
  if (state.liveMode) {
    ensureFirebaseReady();
  }
  updateLoginButton();
  setAuthMode("login");
  updateTimedButton();
  updateLiveButton();
  updateSoundButtons();
  updateLightsButton();
  updateFullscreenTimer();
  updateClassicLightsButton();
  renderLanding();
  renderPackList();
  resetBuilder();
  initEvents();
  initFromUrl();
  initParticles();
  renderHost();
  renderClassic();
  updateTimedAvailability();
  updateLiveAvailability();
}

bootstrap();

window.restartClassic = () => {
  const session = getSession();
  if (dom.gameoverDialog && dom.gameoverDialog.open) {
    dom.gameoverDialog.close();
  }
  if (session) {
    startClassic(session.id);
    return;
  }
  const newSession = createSession(defaultPack, "CLASSIC");
  if (newSession) {
    startClassic(newSession.id);
  }
};
