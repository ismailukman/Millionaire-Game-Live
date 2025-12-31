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
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
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
  editingPackId: null
};

const firebaseState = {
  app: null,
  auth: null,
  db: null,
  user: null,
  ready: false,
  initPromise: null
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
  defaultCategory: "wwtbam_default_category"
};

const dom = {
  loginDialog: document.querySelector("#login-dialog"),
  loginEmail: document.querySelector("#login-email"),
  loginName: document.querySelector("#login-name"),
  loginButton: document.querySelector("#btn-login"),
  homeButton: document.querySelector("#btn-home"),
  demoLogin: document.querySelector("#btn-demo-login"),
  saveLogin: document.querySelector("#btn-login-save"),
  demoPasskeyDialog: document.querySelector("#demo-passkey-dialog"),
  demoPasskeyInput: document.querySelector("#demo-passkey-input"),
  demoPasskeyStatus: document.querySelector("#demo-passkey-status"),
  demoPasskeySubmit: document.querySelector("#btn-demo-passkey-submit"),
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
  defaultCategoryLoadDashboard: document.querySelector("#btn-category-load-dashboard"),
  defaultCategoryStartDashboard: document.querySelector("#btn-category-start-dashboard"),
  defaultCategoryDialog: document.querySelector("#default-category-dialog"),
  defaultCategoryDialogGrid: document.querySelector("#default-category-dialog-grid"),
  defaultCategoryLoad: document.querySelector("#btn-category-load"),
  defaultCategoryStart: document.querySelector("#btn-category-start"),
  defaultCategoryStatus: document.querySelector("#default-category-status"),
  createSession: document.querySelector("#btn-host-session"),
  createPack: document.querySelector("#btn-create-pack"),
  savePack: document.querySelector("#btn-save-pack"),
  cancelBuilder: document.querySelector("#btn-cancel-builder"),
  playDefault: document.querySelector("#btn-play-default"),
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
  classicOptions: document.querySelector("#classic-options"),
  classicFeedback: document.querySelector("#classic-feedback"),
  classicLifelines: document.querySelector("#classic-lifelines"),
  classicLadder: document.querySelector("#classic-ladder"),
  classicTimer: document.querySelector("#classic-timer"),
  walkAway: document.querySelector("#btn-walk-away"),
  gameoverDialog: document.querySelector("#gameover-dialog"),
  gameoverIcon: document.querySelector("#gameover-icon"),
  gameoverTitle: document.querySelector("#gameover-title"),
  gameoverMessage: document.querySelector("#gameover-message"),
  gameoverPrize: document.querySelector("#gameover-prize"),
  backFromPricing: document.querySelector("#btn-back-from-pricing"),
  leaderboardBody: document.querySelector("#leaderboard-body"),
  backFromLeaderboard: document.querySelector("#btn-back-from-leaderboard"),
  achievementsGrid: document.querySelector("#achievements-grid"),
  achievementsProgress: document.querySelector("#achievements-progress"),
  statGamesPlayed: document.querySelector("#stat-games-played"),
  statGamesWon: document.querySelector("#stat-games-won"),
  statTotalWinnings: document.querySelector("#stat-total-winnings"),
  statHighestLevel: document.querySelector("#stat-highest-level"),
  backFromAchievements: document.querySelector("#btn-back-from-achievements")
};

let activeTimer = null;
let particleSystem = null;
let pendingTimerToggle = false;

function safeParse(json, fallback) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch (err) {
    console.warn("Failed to parse saved state, resetting.", err);
    return fallback;
  }
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

async function ensureFirebaseReady() {
  if (firebaseState.ready) return true;
  if (firebaseState.initPromise) return firebaseState.initPromise;
  const config = getFirebaseConfig();
  if (!config) {
    console.warn("Firebase config missing; live mode disabled.");
    return false;
  }

  firebaseState.initPromise = (async () => {
    firebaseState.app = initializeApp(config);
    firebaseState.auth = getAuth(firebaseState.app);
    firebaseState.db = getFirestore(firebaseState.app);
    if (!firebaseState.auth.currentUser) {
      await signInAnonymously(firebaseState.auth);
    }
    firebaseState.user = firebaseState.auth.currentUser;
    firebaseState.ready = true;
    return true;
  })().catch((err) => {
    console.error("Firebase init failed:", err);
    firebaseState.initPromise = null;
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
      dom.participantStatus.textContent = "Session not found.";
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
      renderLiveSessionIfNeeded();
    }
  );
}

async function createLiveSession(pack, mode) {
  if (!pack) {
    alert("No pack selected. Please choose a pack from the dashboard.");
    return null;
  }
  const ready = await ensureFirebaseReady();
  if (!ready) {
    alert("Firebase is not configured. Add firebaseConfig in index.html.");
    return null;
  }

  const fffQuestion = getFFFQuestion(pack);
  if (!fffQuestion) {
    alert("No FFF question available in this pack.");
    return null;
  }

  const sessionId = makeId("S");
  const sessionPayload = {
    id: sessionId,
    packId: pack.id,
    mode,
    status: "waiting",
    createdAt: Date.now(),
    hostUid: firebaseState.user?.uid || null,
    fffQuestion: {
      promptText: fffQuestion.promptText,
      options: fffQuestion.options || null,
      orderItems: fffQuestion.orderItems || null
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
  const question = getFFFQuestion(pack);
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
  const question = getFFFQuestion(pack);
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

function getActiveScreenName() {
  const active = document.querySelector(".screen.active");
  if (!active) return "landing";
  return active.id.replace("screen-", "");
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
      features: subscriptionTiers.FREE.limits
    };
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

  return user;
}

function loadState() {
  const savedUser = localStorage.getItem(storageKeys.user);
  const savedPacks = localStorage.getItem(storageKeys.packs);
  const savedSessions = localStorage.getItem(storageKeys.sessions);
  const savedTimed = localStorage.getItem(storageKeys.timedMode);
  const savedLive = localStorage.getItem(storageKeys.liveMode);
  const savedTimer = localStorage.getItem(storageKeys.timerSeconds);
  const savedCategory = localStorage.getItem(storageKeys.defaultCategory);

  state.user = savedUser ? migrateUserState(safeParse(savedUser, null)) : null;
  state.packs = safeParse(savedPacks, [defaultPack]);
  state.sessions = safeParse(savedSessions, {});
  state.timedMode = savedTimed === "true";
  state.liveMode = savedLive === "true";
  state.timerSeconds = savedTimer ? Number(savedTimer) || 10 : 10;
  state.selectedDefaultCategoryId = savedCategory || defaultCategoryDecks[0]?.id || null;

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
  if (state.selectedDefaultCategoryId) return;
  const fallback = defaultCategoryDecks[0]?.id;
  if (fallback) {
    setSelectedDefaultCategory(fallback);
  }
}

function getDefaultCategoryById(categoryId) {
  return defaultCategoryDecks.find((category) => category.id === categoryId) || null;
}

function buildCategoryPack(category) {
  const selected = shuffle(category.questions).slice(0, 15).map((question, index) => ({
    ...question,
    id: `${category.id}_${index + 1}_${makeId("Q")}`,
    level: index + 1
  }));
  const fffQuestion = defaultPack.questions.find((q) => q.type === "FFF");
  const questions = fffQuestion ? [...selected, fffQuestion] : selected;
  return {
    ...defaultPack,
    id: `${defaultPack.id}_${category.id}`,
    title: `${defaultPack.title} • ${category.title}`,
    description: category.subtitle,
    questions
  };
}

function startDefaultCategoryGame() {
  ensureDefaultCategorySelection();
  const category = getDefaultCategoryById(state.selectedDefaultCategoryId);
  if (!category) {
    alert("Choose a category first.");
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
  defaultCategoryDecks.forEach((category) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "category-card";
    if (selectedId === category.id) {
      card.classList.add("selected");
    }
    card.innerHTML = `
      <strong>${category.title}</strong>
      <span class="subtext">${category.subtitle}</span>
      <span class="meta">45 questions • 15 random per game</span>
    `;
    card.addEventListener("click", () => {
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
  return state.user?.subscription?.tier || "FREE";
}

function getUserLimits() {
  const tier = getUserTier();
  const tierData = subscriptionTiers[tier];
  return tierData?.limits || subscriptionTiers.FREE.limits;
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
    maxPacks: "You've reached your pack limit. Upgrade to Pro for 50 packs!",
    maxParticipants: "Session full! Upgrade to Pro for 100 participants.",
    customBranding: "Custom branding is a Pro feature. Upgrade now!",
    analytics: "Advanced analytics available in Pro. Upgrade to unlock!"
  };

  alert(messages[feature] || "Upgrade to unlock this feature!");
  setScreen("pricing");
}

function setScreen(name) {
  Object.entries(screens).forEach(([key, node]) => {
    if (!node) return;
    node.classList.toggle("active", key === name);
  });

  updateTimedAvailability();
  updateLiveAvailability();

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

function updateLoginButton() {
  if (state.user) {
    const tier = state.user.subscription?.tier || "FREE";
    const badge = tier === "FREE" ? "" : ` [${tier}]`;
    dom.loginButton.textContent = `Hi, ${state.user.displayName}${badge}`;
  } else {
    dom.loginButton.textContent = "Login";
  }
}

function updateTimedButton() {
  if (!dom.timedToggle) return;
  dom.timedToggle.textContent = state.timedMode ? "⏱ Timer On" : "⏱ Timer Off";
}

function updateLiveButton() {
  if (!dom.liveToggle) return;
  dom.liveToggle.textContent = state.liveMode ? "📡 Live On" : "📡 Live Off";
}


function updateTimerSecondsField() {
  if (dom.timerSeconds) {
    dom.timerSeconds.value = String(state.timerSeconds);
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
  dom.liveToggle.disabled = !onLanding || inActiveGame;
}

function renderLanding() {
  if (!dom.landingLadder) return;
  dom.landingLadder.innerHTML = "";
  defaultPack.config.amounts.slice().reverse().forEach((amount, index) => {
    const li = document.createElement("li");
    const level = 15 - index;
    li.classList.toggle("safe", defaultPack.config.guaranteedLevels.includes(level));
    li.innerHTML = `<span>Level ${level}</span><span>${formatMoney(defaultPack.config.currencySymbol, amount)}</span>`;
    dom.landingLadder.appendChild(li);
  });
}

function renderPackList() {
  if (!dom.packList || !dom.packSelect) return;
  dom.packList.innerHTML = "";
  state.packs.forEach((pack) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <strong>${pack.title}</strong>
      <p class="subtext">${pack.description || "No description"}</p>
      <button class="secondary pack-edit" data-pack-id="${pack.id}">Edit Pack</button>
    `;
    dom.packList.appendChild(card);
  });
  dom.packSelect.innerHTML = "";
  state.packs.forEach((pack) => {
    const option = document.createElement("option");
    option.value = pack.id;
    option.textContent = pack.title;
    dom.packSelect.appendChild(option);
  });
  renderDefaultCategoryPicker();
}

function renderPricing() {
  const currentTier = state.user?.subscription?.tier || "FREE";

  // Update all pricing buttons based on current tier
  document.querySelectorAll(".pricing-button[data-tier]").forEach(button => {
    const tier = button.dataset.tier;

    if (tier === currentTier) {
      button.textContent = "Current Plan";
      button.className = "pricing-button secondary";
    } else if (tier === "FREE") {
      button.textContent = "Downgrade to Free";
      button.className = "pricing-button ghost";
    } else {
      const tierName = subscriptionTiers[tier].name;
      button.textContent = `Upgrade to ${tierName}`;
      button.className = "pricing-button primary";
    }
  });
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
    row.innerHTML = `<td colspan="5" style="text-align: center; padding: 40px; color: var(--muted);">No players yet. Play a game to appear on the leaderboard!</td>`;
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
        scoreValue = "N/A";
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
      <td class="achievement-badges">${achievementBadges}${user.achievements.length > 3 ? "..." : ""}</td>
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
    dom.achievementsGrid.innerHTML = "<p style='text-align: center; color: var(--muted);'>Login to track your achievements</p>";
    return;
  }

  const userAchievements = state.user.achievements || [];
  const progress = getAchievementProgress(state.user);

  // Update progress text
  dom.achievementsProgress.textContent = `${progress.unlocked} of ${progress.total} unlocked (${progress.percentage}%)`;

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
      <div class="achievement-name">${achievement.name}</div>
      <div class="achievement-description">${achievement.description}</div>
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
          alert(`🎉 Achievement Unlocked!\n\n${achievement.icon} ${achievement.name}\n${achievement.description}`);
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
  dom.builderPreview.textContent = "Upload a CSV with 15 rows to preview questions.";
  renderBuilderLadder(defaultPack.config.amounts);
  delete dom.builderPreview.dataset.questions;
  state.editingPackId = null;
}

function createSession(pack, mode) {
  if (!pack) {
    alert("No pack selected. Please choose a pack from the dashboard.");
    return null;
  }
  let resolvedPack = pack;
  if (pack.id === defaultPack.id && mode === "CLASSIC") {
    const category = getDefaultCategoryById(state.selectedDefaultCategoryId);
    if (!category) {
      alert("Choose a category for the default pack.");
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
  dom.hostSessionTitle.textContent = pack ? pack.title : "Live Session";
  dom.hostSessionMeta.textContent = `${session.mode} • ${session.status}`;
  dom.hostSessionCode.textContent = session.id;
  const joinUrl = `${window.location.origin}${window.location.pathname}?view=participant&session=${session.id}`;
  if (dom.qrImage) {
    dom.qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`;
  }
  dom.copyLink.onclick = () => {
    navigator.clipboard.writeText(joinUrl);
    dom.copyLink.textContent = "Copied";
    setTimeout(() => (dom.copyLink.textContent = "Copy Join Link"), 1500);
  };

  dom.hostControls.innerHTML = "";
  dom.hostLive.innerHTML = "";

  if (session.mode === "FFF") {
    renderHostFFF(session, pack);
  } else {
    renderHostClassicStatus(session, pack);
  }
}

function renderHostFFF(session, pack) {
  const fffQuestion = getFFFQuestion(pack) || session.fffQuestion;
  if (!fffQuestion) {
    dom.hostLive.textContent = "No FFF question available in this pack.";
    return;
  }
  const startBtn = document.createElement("button");
  startBtn.className = "primary";
  startBtn.textContent = session.status === "live" ? "Restart FFF" : "Start FFF";
  startBtn.onclick = () => startFFF(session.id);

  const winnerBtn = document.createElement("button");
  winnerBtn.className = "secondary";
  winnerBtn.textContent = "Compute Winner";
  winnerBtn.onclick = () => computeFFFWinner(session.id);

  const classicBtn = document.createElement("button");
  classicBtn.className = "ghost";
  classicBtn.textContent = "Start Classic";
  classicBtn.onclick = () => startClassic(session.id);

  dom.hostControls.append(startBtn, winnerBtn, classicBtn);

  const participantCount = Object.keys(session.participants).length;
  const tally = getFFFTally(session, fffQuestion);
  const results = Object.entries(fffQuestion.options || {}).map(([key]) => {
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

  dom.hostLive.innerHTML = `
    <div class="question"><strong>FFF:</strong> ${fffQuestion.promptText}</div>
    <div>Participants: ${participantCount}</div>
    <div>Submissions: ${Object.keys(session.fffSubmissions).length}</div>
    <div class="status">Winner: ${session.winnerParticipantId ? session.participants[session.winnerParticipantId].name : "Pending"}</div>
    <div class="fff-results">${results || ""}</div>
  `;
}

function renderHostClassicStatus(session, pack) {
  const status = document.createElement("div");
  status.className = "stack";
  const openClassicBtn = document.createElement("button");
  openClassicBtn.className = "primary";
  openClassicBtn.textContent = "Open Classic Board";
  openClassicBtn.onclick = () => setScreen("classic");

  const startBtn = document.createElement("button");
  startBtn.className = "secondary";
  startBtn.textContent = session.status === "live" ? "Restart Classic" : "Start Classic";
  startBtn.onclick = () => startClassic(session.id);

  status.append(openClassicBtn, startBtn);
  dom.hostControls.append(status);

  const currentLevel = session.currentState.level;
  dom.hostLive.innerHTML = `
    <div class="question">Classic ready. Current level: ${currentLevel}</div>
    <div class="status">Lifelines used: ${session.currentState.usedLifelines.length}</div>
  `;
}

function renderClassic() {
  const session = getSession();
  if (!session) {
    return;
  }
  const pack = getPackForSession(session);
  if (!pack) {
    dom.classicQuestion.textContent = "Pack data missing. Reload the page to restore the default pack.";
    return;
  }
  dom.classicPackTitle.textContent = pack ? pack.title : "Classic Round";
  dom.classicMeta.textContent = `Level ${session.currentState.level} of 15`;

  // Play level-appropriate background music
  const levelMusic = audioManager.getMusicForLevel(session.currentState.level);
  audioManager.playBackground(levelMusic, false);

  const ladder = pack.config.amounts;
  dom.classicLadder.innerHTML = "";
  ladder.slice().reverse().forEach((amount, index) => {
    const level = 15 - index;
    const li = document.createElement("li");
    li.classList.toggle("active", level === session.currentState.level);
    li.classList.toggle("safe", pack.config.guaranteedLevels.includes(level));
    if (level < session.currentState.level) {
      li.classList.add("completed");
    }
    li.innerHTML = `<span>${level}</span><span>${formatMoney(pack.config.currencySymbol, amount)}</span>`;
    dom.classicLadder.appendChild(li);
  });

  const question = getCurrentQuestion(pack, session);
  if (!question) {
    dom.classicQuestion.textContent = "No question loaded.";
    return;
  }
  const shuffled = getShuffledQuestion(session, question);
  dom.classicQuestion.textContent = question.promptText;
  dom.classicOptions.innerHTML = "";
  const disabled = new Set(session.currentState.disabledOptions || []);
  Object.entries(shuffled.options).forEach(([key, value]) => {
    const btn = document.createElement("button");
    btn.className = "secondary";
    btn.disabled = disabled.has(key) || session.currentState.locked;
    btn.textContent = `${key}: ${value}`;
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
  pack.config.lifelines.forEach((life) => {
    const btn = document.createElement("button");
    btn.className = "ghost";
    const icon = lifelineIcons[life.key] || "⭐";
    btn.textContent = `${icon} ${life.displayName}`;
    btn.disabled = session.currentState.usedLifelines.includes(life.key) || session.currentState.locked;
    btn.onclick = () => useLifeline(session.id, life.key);
    dom.classicLifelines.appendChild(btn);
  });
  const walkButton = dom.walkAway;
  if (walkButton) {
    walkButton.textContent = "🚪 Walk Away";
    dom.classicLifelines.appendChild(walkButton);
  }

  const showTimer = state.timedMode || (dom.toggleTimer && dom.toggleTimer.checked);
  if (showTimer && session.currentState.timerSeconds !== undefined) {
    dom.classicTimer.textContent = `Timer : ${Math.max(0, session.currentState.timerSeconds)}s`;
  } else {
    dom.classicTimer.textContent = "";
  }
}

function getCurrentQuestion(pack, session) {
  const entry = session.currentState.questionOrder.find((q) => q.level === session.currentState.level);
  if (!entry) {
    return null;
  }
  return pack.questions.find((q) => q.id === entry.questionId) || null;
}

function getShuffledQuestion(session, question) {
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
    session.currentState.timerSeconds -= 1;
    if (session.currentState.timerSeconds <= 0) {
      session.currentState.timerSeconds = 0;
      saveState();
      stopTimer();
      submitAnswerClassic(session.id, "TIMEOUT");
      return;
    }
    saveState();
    renderClassic();
  }, 1000);
}

function stopTimer() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
}

function submitAnswerClassic(sessionId, selected) {
  const session = state.sessions[sessionId];
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
  messageDiv.textContent = "Your friend is thinking...";

  if (!state.liveMode) {
    setTimeout(() => {
      const hint = phoneFriendHint(level, correctOption);
      messageDiv.textContent = `"I'm ${hint.reliability}% sure the answer is ${hint.hint}. Good luck!"`;
    }, 5000);
  }

  // Countdown timer
  const countdownInterval = setInterval(() => {
    countdown--;
    timerDiv.textContent = countdown;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      timerDiv.textContent = "Time's up!";
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
    dom.participantStatus.textContent = "Session not found.";
    return;
  }
  const pack = getPackForSession(session);
  dom.participantMeta.textContent = `Session ${session.id} • ${session.status}`;
  const question = getFFFQuestion(pack) || session.fffQuestion;
  if (!question) {
    dom.participantFFF.textContent = "No FFF question in this pack.";
    return;
  }

  dom.participantFFF.innerHTML = "";
  if (session.status !== "live") {
    dom.participantStatus.textContent = "Waiting for host to start...";
  }
  const prompt = document.createElement("div");
  prompt.className = "question";
  prompt.textContent = question.promptText;

  const list = document.createElement("div");
  list.className = "stack";

  if (question.options) {
    Object.entries(question.options).forEach(([key, value]) => {
      const btn = document.createElement("button");
      btn.className = "secondary";
      btn.textContent = `${key}: ${value}`;
      btn.onclick = async () => {
        await submitFFF(sessionId, participantId, key);
        dom.participantStatus.textContent = `Voted ${key}.`;
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
          dom.participantStatus.textContent = "Submitted!";
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
    dom.participantStatus.textContent = "Submitted!";
    list.querySelectorAll("button").forEach((b) => (b.disabled = true));
  }
}

function getFFFQuestion(pack) {
  return pack?.questions?.find((q) => q.type === "FFF") || null;
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
  const levelIndex = Math.max(0, session.currentState.level - 2);
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
  const messages = pack?.config?.messages || {};

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
      prizeDiv.textContent = "No prize won";
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
        messageDiv.textContent = "Enter A, B, C, or D.";
        return;
      }
      messageDiv.textContent = `"I'm leaning toward ${val}. Good luck!"`;
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
    dom.builderPreview.textContent = `Loaded ${validated.questions.length} questions.`;
    dom.builderPreview.dataset.questions = JSON.stringify(validated.questions);
  };
  reader.readAsText(file);
}

function savePack() {
  // Feature gating: Check if user can create more packs
  if (!state.editingPackId && !canCreatePack()) {
    const limits = getUserLimits();
    const userPacks = state.packs.filter(pack => pack.ownerId === state.user?.email);
    alert(`Pack limit reached! You have ${userPacks.length}/${limits.maxPacks} packs.\n\nUpgrade to create more packs.`);
    setScreen("pricing");
    renderPricing();
    return;
  }

  const questionsRaw = dom.builderPreview.dataset.questions;
  if (!questionsRaw) {
    dom.builderPreview.textContent = "Upload a valid CSV first.";
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
  dom.loginButton.addEventListener("click", () => {
    if (state.user) {
      state.user = null;
      saveState();
      updateLoginButton();
      return;
    }
    dom.loginDialog.showModal();
  });

  dom.saveLogin.addEventListener("click", () => {
    state.user = migrateUserState({
      email: dom.loginEmail.value,
      displayName: dom.loginName.value,
      createdAt: Date.now()
    });
    saveState();
    updateLoginButton();
  });

  function applyDemoLogin() {
    dom.loginEmail.value = "demo@wwtbam.local";
    dom.loginName.value = "Demo Host";
    state.user = migrateUserState({
      email: dom.loginEmail.value,
      displayName: dom.loginName.value,
      createdAt: Date.now()
    });
    state.user.subscription = {
      tier: "PRO",
      startDate: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
      features: subscriptionTiers.PRO.limits
    };
    saveState();
    updateLoginButton();
    dom.loginDialog.close();
  }

  if (dom.demoLogin) {
    dom.demoLogin.addEventListener("click", (event) => {
      event.preventDefault();
      if (dom.demoPasskeyStatus) {
        dom.demoPasskeyStatus.textContent = "";
        dom.demoPasskeyStatus.classList.remove("status-success");
      }
      if (dom.demoPasskeyInput) {
        dom.demoPasskeyInput.value = "";
      }
      dom.demoPasskeyDialog?.showModal();
    });
  }

  if (dom.demoPasskeySubmit && dom.demoPasskeyDialog) {
    dom.demoPasskeySubmit.addEventListener("click", (event) => {
      event.preventDefault();
      const passkey = dom.demoPasskeyInput?.value || "";
      if (passkey !== "Lukman") {
        if (dom.demoPasskeyStatus) {
          dom.demoPasskeyStatus.textContent = "Incorrect passkey.";
          dom.demoPasskeyStatus.classList.remove("status-success");
        }
        return;
      }
      if (dom.demoPasskeyStatus) {
        dom.demoPasskeyStatus.textContent = "Passkey accepted.";
        dom.demoPasskeyStatus.classList.add("status-success");
      }
      dom.demoPasskeyDialog.close();
      applyDemoLogin();
    });
  }

  dom.soundToggle.addEventListener("click", () => {
    const isMuted = audioManager.toggleMute();
    dom.soundToggle.textContent = isMuted ? "🔇 Sound Off" : "🔊 Sound On";

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
      const nextMode = !state.liveMode;
      if (nextMode) {
        const ready = await ensureFirebaseReady();
        if (!ready) {
          alert("Firebase is not configured. Add firebaseConfig in index.html.");
          return;
        }
      }
      state.liveMode = nextMode;
      localStorage.setItem(storageKeys.liveMode, String(state.liveMode));
      updateLiveButton();
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

  dom.upgradeButton.addEventListener("click", () => {
    setScreen("pricing");
    renderPricing();
  });

  dom.playDefault.addEventListener("click", () => {
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
      return;
    }
    const session = createSession(defaultPack, "CLASSIC");
    if (!session) return;
    renderHost();
    setScreen("host");
    startClassic(session.id);
  });

  if (dom.defaultCategoryLoad && dom.defaultCategoryDialog) {
    dom.defaultCategoryLoad.addEventListener("click", (event) => {
      event.preventDefault();
      if (!state.selectedDefaultCategoryId) {
        alert("Choose a category first.");
        return;
      }
      if (dom.defaultCategoryStatus) {
        dom.defaultCategoryStatus.textContent = "Load successful.";
        dom.defaultCategoryStatus.classList.add("status-success");
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

  if (dom.defaultCategoryLoadDashboard) {
    dom.defaultCategoryLoadDashboard.addEventListener("click", (event) => {
      event.preventDefault();
      ensureDefaultCategorySelection();
      if (dom.defaultCategoryDashboardStatus) {
        dom.defaultCategoryDashboardStatus.textContent = "Load successful.";
        dom.defaultCategoryDashboardStatus.classList.add("status-success");
      }
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
      dom.builderPreview.textContent = "Login required to save custom packs.";
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
      dom.builderPreview.textContent = "Login required to save custom packs.";
      return;
    }
    savePack();
  });

  dom.createSession.addEventListener("click", async () => {
    const packId = dom.packSelect.value;
    const mode = dom.modeSelect.value;
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
    dom.builderPreview.textContent = `Loaded ${pack.questions.length} questions from this pack.`;
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
      dom.participantStatus.textContent = "Enter a session code and name.";
      return;
    }
    const result = await joinSession(code, name);
    if (!result.ok) {
      dom.participantStatus.textContent = result.message;
      return;
    }
    dom.participantStatus.textContent = `Joined ${code}.`;
    renderParticipant(code, result.participantId);
  });

  dom.walkAway.addEventListener("click", handleWalkAway);

  // Pricing screen navigation
  dom.backFromPricing.addEventListener("click", () => {
    setScreen("dashboard");
  });

  // Handle pricing button clicks (upgrade tier simulation)
  document.querySelectorAll(".pricing-button[data-tier]").forEach(button => {
    button.addEventListener("click", () => {
      const tier = button.dataset.tier;
      if (!state.user) {
        alert("Please login to manage your subscription.");
        dom.loginDialog.showModal();
        return;
      }

      // If clicking on current tier, do nothing
      if (state.user.subscription.tier === tier) {
        return;
      }

      // Simulate subscription upgrade
      state.user.subscription = {
        tier: tier,
        startDate: Date.now(),
        expiresAt: tier === "FREE" ? null : Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days for paid tiers
        features: subscriptionTiers[tier].limits
      };
      saveState();
      updateLoginButton();

      alert(`Successfully upgraded to ${subscriptionTiers[tier].name}!\n\n${subscriptionTiers[tier].features.join('\n')}`);
      setScreen("dashboard");
    });
  });

  // Leaderboard screen navigation
  dom.backFromLeaderboard.addEventListener("click", () => {
    setScreen("dashboard");
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
    setScreen("dashboard");
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
      alert(`Thanks for subscribing with ${email}!\n\nYou'll receive updates about new features and game packs.`);
      newsletterForm.reset();
    });
  }

  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Thanks for reaching out! We'll get back to you soon.");
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

loadState();
if (state.liveMode) {
  ensureFirebaseReady();
}
updateLoginButton();
updateTimedButton();
updateLiveButton();
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
