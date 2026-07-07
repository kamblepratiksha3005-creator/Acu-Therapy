// ==========================================================================
// ACU-THERAPY WEAR - CLIENT CORE ENGINE & STATE MANAGEMENT
// ==========================================================================
// Global configuration details for therapy programs
const PROGRAM_CONFIGS = {
    stress: {
        name: "Stress Relief",
        zone: "Shoulders & Upper Back",
        duration: 15, // default duration in minutes
        nodes: ["node-l1", "node-r1", "node-l2", "node-r2"],
        themeClass: "stress-theme",
        iconHtml: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
    },
    back: {
        name: "Backpain Relief",
        zone: "Lower Lumbar Grid",
        duration: 12,
        nodes: ["node-l3", "node-r3", "node-l4", "node-r4"],
        themeClass: "backpain-theme",
        iconHtml: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`
    },
    neck: {
        name: "Neck Therapy",
        zone: "Upper Collar",
        duration: 10,
        nodes: ["node-l1", "node-r1"],
        themeClass: "neck-theme",
        iconHtml: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
    },
    relax: {
        name: "Deep Relax",
        zone: "Complete Torso Grid",
        duration: 15,
        nodes: ["node-l1", "node-r1", "node-l2", "node-r2", "node-l3", "node-r3"],
        themeClass: "relax-theme",
        iconHtml: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`
    },
    sleep: {
        name: "Sleep Induction",
        zone: "Upper Collar & Lumbar Grid",
        duration: 20,
        nodes: ["node-l1", "node-r1", "node-l2", "node-r2", "node-l3", "node-r3", "node-l4", "node-r4"],
        themeClass: "sleep-theme",
        iconHtml: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
    }
};
// Global App State
let state = {
    currentUser: null,
    activeTab: "view-home",
    activeSession: {
        modeKey: null,         // stress, back, etc.
        isRunning: false,
        isPaused: false,
        totalTime: 0,          // total seconds
        remainingTime: 0,      // remaining seconds
        intensity: "Medium",
        durationMinutes: 15
    },
    settings: {
        lightMode: false,
        soundEnabled: true,
        notificationsEnabled: true,
        animationsEnabled: true
    },
    history: [],
    timerId: null
};
// ==========================================================================
// AUDIO SYNTHESIZER ENGINE (Web Audio API)
// ==========================================================================
class SoundSynth {
    constructor() {
        this.ctx = null;
    }
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    playTone(freq, duration, type = "sine", gainVal = 0.08) {
        if (!state.settings.soundEnabled) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.error("Synthesizer error", e);
        }
    }
    click() {
        this.playTone(800, 0.08, "sine", 0.05);
    }
    success() {
        this.init();
        setTimeout(() => this.playTone(523.25, 0.1, "sine"), 0); // C5
        setTimeout(() => this.playTone(659.25, 0.15, "sine"), 100); // E5
        setTimeout(() => this.playTone(783.99, 0.25, "sine"), 200); // G5
    }
    error() {
        this.init();
        setTimeout(() => this.playTone(300, 0.15, "sawtooth", 0.06), 0);
        setTimeout(() => this.playTone(180, 0.25, "sawtooth", 0.06), 150);
    }
    alert() {
        this.playTone(440, 0.3, "triangle", 0.08);
    }
}
const synth = new SoundSynth();
// ==========================================================================
// TOAST NOTIFICATIONS MODULE
// ==========================================================================
function showNotification(title, desc, type = "info") {
    if (!state.settings.notificationsEnabled) return;
    
    const container = document.getElementById("notification-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "⚙️";
    if (type === "success") icon = "🟢";
    if (type === "warning") icon = "⚠️";
    if (type === "error") icon = "🚨";
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-desc">${desc}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;
    container.appendChild(toast);
    // Auto-remove toast after 4s
    const timer = setTimeout(() => {
        removeToast(toast);
    }, 4000);
    toast.querySelector(".toast-close").addEventListener("click", () => {
        clearTimeout(timer);
        removeToast(toast);
    });
}
function removeToast(toast) {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => {
        toast.remove();
    });
}
// ==========================================================================
// CORE DOM LOAD & INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Hide loader screen
    setTimeout(() => {
        const loader = document.getElementById("loader-overlay");
        if (loader) loader.classList.add("fade-out");
    }, 850);
    // 2. Load LocalStorage details
    loadSavedData();
    // 3. Initialize Event Listeners
    initEventListeners();
    // 4. Start clock tick
    startClock();
    // 5. Check persistence login session
    const activeSessionUser = localStorage.getItem("acu_current_user");
    if (activeSessionUser) {
        state.currentUser = activeSessionUser;
        document.getElementById("avatar-letters").textContent = activeSessionUser.substring(0, 2).toUpperCase();
        transitionToDashboard();
        showNotification("Session Restored", `Welcome back, ${state.currentUser}.`, "success");
    }
});
// Load variables from localStorage
function loadSavedData() {
    // History
    const savedHistory = localStorage.getItem("acu_history_db");
    if (savedHistory) {
        state.history = JSON.parse(savedHistory);
    }
    // Settings
    const savedSettings = localStorage.getItem("acu_settings");
    if (savedSettings) {
        state.settings = { ...state.settings, ...JSON.parse(savedSettings) };
    }
    // Apply active theme variables
    if (state.settings.lightMode) {
        document.body.classList.add("light-theme");
        const btnText = document.getElementById("theme-toggle-text");
        if (btnText) btnText.textContent = "Light Theme";
    }
    // Check Settings Toggles visual states
    document.getElementById("toggle-settings-sound").checked = state.settings.soundEnabled;
    document.getElementById("toggle-settings-notifications").checked = state.settings.notificationsEnabled;
    document.getElementById("toggle-settings-animations").checked = state.settings.animationsEnabled;
}
// Save variables to localStorage
function saveSettings() {
    localStorage.setItem("acu_settings", JSON.stringify(state.settings));
}
// Clock tick updates
function startClock() {
    const clockEl = document.getElementById("live-clock");
    const dateEl = document.getElementById("live-date");
    
    function tick() {
        const now = new Date();
        if (clockEl) {
            clockEl.textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
        }
    }
    tick();
    setInterval(tick, 1000);
}
// ==========================================================================
// EVENT LISTENERS REGISTER
// ==========================================================================
function initEventListeners() {
    // A. Login Screen Form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handleLoginSubmit();
        });
    }
    // Enter Key on Password Field
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
        passwordInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleLoginSubmit();
            }
        });
    }
    // B. Navigation tabs & collapse
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const sidebar = document.getElementById("app-sidebar");
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener("click", () => {
            synth.click();
            sidebar.classList.toggle("collapsed");
        });
    }
    const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            const targetView = link.getAttribute("data-target");
            if (targetView) {
                switchView(targetView);
            }
        });
    });
    const logoutBtn = document.getElementById("sidebar-logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            handleLogout();
        });
    }
    // C. Mode selectors
    const modeCards = document.querySelectorAll(".mode-card");
    modeCards.forEach(card => {
        // Entire card click opens modal console
        card.addEventListener("click", () => {
            const mode = card.getAttribute("data-mode");
            openTherapyConsole(mode);
        });
        // Prevention click propagation on inner Start button
        const cardBtn = card.querySelector(".btn-card-start");
        if (cardBtn) {
            cardBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const mode = card.getAttribute("data-mode");
                openTherapyConsole(mode);
            });
        }
    });
    // Node SVG group triggers
    const nodeGroups = document.querySelectorAll(".jacket-svg-el .node-group");
    nodeGroups.forEach(node => {
        node.addEventListener("click", (e) => {
            e.stopPropagation();
            const mode = node.getAttribute("data-mode");
            if (mode) {
                openTherapyConsole(mode);
            }
        });
    });
    // D. Modal session controls
    const modalCloseBtn = document.getElementById("modal-close-btn");
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener("click", () => {
            synth.click();
            closeTherapyConsole();
        });
    }
    // Backdrop click
    const modalOverlay = document.getElementById("therapy-modal");
    if (modalOverlay) {
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) {
                synth.click();
                closeTherapyConsole();
            }
        });
    }
    // Modal Session controls
    const btnStart = document.getElementById("btn-modal-start");
    if (btnStart) btnStart.addEventListener("click", () => startActiveSession());
    const btnPause = document.getElementById("btn-modal-pause");
    if (btnPause) btnPause.addEventListener("click", () => pauseActiveSession());
    const btnResume = document.getElementById("btn-modal-resume");
    if (btnResume) btnResume.addEventListener("click", () => resumeActiveSession());
    const btnStop = document.getElementById("btn-modal-stop");
    if (btnStop) btnStop.addEventListener("click", () => stopActiveSession());
    const btnRestart = document.getElementById("btn-modal-restart");
    if (btnRestart) btnRestart.addEventListener("click", () => restartActiveSession());
    // Duration slider
    const durSlider = document.getElementById("input-session-duration");
    const durLabel = document.getElementById("label-slider-duration");
    if (durSlider && durLabel) {
        durSlider.addEventListener("input", () => {
            const minutes = durSlider.value;
            durLabel.textContent = minutes;
            
            // Adjust current state minutes & screen countdown clock
            if (!state.activeSession.isRunning) {
                state.activeSession.durationMinutes = parseInt(minutes);
                state.activeSession.totalTime = minutes * 60;
                state.activeSession.remainingTime = minutes * 60;
                updateCountdownDisplay();
            }
        });
    }
    // Intensity pill click listeners
    const intensityPills = document.querySelectorAll(".intensity-pill");
    const intensityLabel = document.getElementById("label-intensity-level");
    intensityPills.forEach(pill => {
        pill.addEventListener("click", () => {
            synth.click();
            intensityPills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            
            const selectedLevel = pill.getAttribute("data-level");
            if (intensityLabel) intensityLabel.textContent = selectedLevel;
            
            state.activeSession.intensity = selectedLevel;
            showNotification("Intensity Calibrated", `Jacket power scaled to ${selectedLevel} power.`, "info");
        });
    });
    // E. Manual Checklist toggles
    const manualToggles = document.querySelectorAll(".node-trigger-toggle input");
    manualToggles.forEach(toggle => {
        toggle.addEventListener("change", () => {
            synth.click();
            const nodeId = toggle.getAttribute("data-node");
            const nodeEl = document.getElementById(nodeId);
            if (nodeEl) {
                if (toggle.checked) {
                    nodeEl.classList.add("active");
                    showNotification("Manual Stimulation", `Stimulating ${nodeId.replace("node-", "").replace("-", " ")} manually.`, "success");
                } else {
                    nodeEl.classList.remove("active");
                }
            }
        });
    });
    // F. Session History View filters & CSV Actions
    const historySearchInput = document.getElementById("history-search");
    if (historySearchInput) {
        historySearchInput.addEventListener("input", () => renderHistoryTable());
    }
    const filterModeSelect = document.getElementById("filter-mode");
    if (filterModeSelect) {
        filterModeSelect.addEventListener("change", () => {
            synth.click();
            renderHistoryTable();
        });
    }
    const filterIntensitySelect = document.getElementById("filter-intensity");
    if (filterIntensitySelect) {
        filterIntensitySelect.addEventListener("change", () => {
            synth.click();
            renderHistoryTable();
        });
    }
    const btnExport = document.getElementById("btn-export-csv");
    if (btnExport) {
        btnExport.addEventListener("click", () => exportHistoryCSV());
    }
    const btnClearAll = document.getElementById("btn-clear-history");
    if (btnClearAll) {
        btnClearAll.addEventListener("click", () => clearAllHistory());
    }
    // G. Settings adjustments
    const btnToggleTheme = document.getElementById("btn-toggle-theme");
    const themeLabel = document.getElementById("theme-toggle-text");
    if (btnToggleTheme) {
        btnToggleTheme.addEventListener("click", () => {
            synth.click();
            document.body.classList.toggle("light-theme");
            state.settings.lightMode = document.body.classList.contains("light-theme");
            
            if (themeLabel) {
                themeLabel.textContent = state.settings.lightMode ? "Light Theme" : "Dark Theme";
            }
            saveSettings();
            showNotification("Theme Mode Swapped", `Switched layout to ${state.settings.lightMode ? "Light" : "Dark"} configuration.`, "info");
        });
    }
    const toggleSound = document.getElementById("toggle-settings-sound");
    if (toggleSound) {
        toggleSound.addEventListener("change", () => {
            state.settings.soundEnabled = toggleSound.checked;
            saveSettings();
            synth.click();
            showNotification("Audio Configured", `Sound effects are now ${state.settings.soundEnabled ? "enabled" : "disabled"}.`, "info");
        });
    }
    const toggleNotif = document.getElementById("toggle-settings-notifications");
    if (toggleNotif) {
        toggleNotif.addEventListener("change", () => {
            state.settings.notificationsEnabled = toggleNotif.checked;
            saveSettings();
            synth.click();
            alert(`Real-time Toast notifications ${state.settings.notificationsEnabled ? "Enabled" : "Disabled"}`);
        });
    }
    const toggleAnim = document.getElementById("toggle-settings-animations");
    if (toggleAnim) {
        toggleAnim.addEventListener("change", () => {
            state.settings.animationsEnabled = toggleAnim.checked;
            saveSettings();
            synth.click();
            
            // Apply or remove visual animation overrides
            if (!state.settings.animationsEnabled) {
                document.querySelectorAll(".glowing-path").forEach(p => p.classList.remove("active"));
                document.querySelectorAll(".node-group").forEach(n => n.classList.remove("active"));
            } else if (state.activeSession.isRunning && !state.activeSession.isPaused) {
                // Re-apply animations if a session is currently running
                activateJacketAnimations(state.activeSession.modeKey, true);
            }
            showNotification("Animations Calibrated", `Jacket graphic animations are ${state.settings.animationsEnabled ? "active" : "deactivated"}.`, "info");
        });
    }
    const btnReset = document.getElementById("btn-factory-reset");
    if (btnReset) {
        btnReset.addEventListener("click", () => {
            handleFactoryReset();
        });
    }
}
// ==========================================================================
// SYSTEM AUTHENTICATION LOGIC
// ==========================================================================
function handleLoginSubmit() {
    const userField = document.getElementById("username");
    const passField = document.getElementById("password");
    const errorBox = document.getElementById("login-error");
    const loginCard = document.querySelector(".login-card");
    const username = userField.value.trim();
    const password = passField.value;
    // Strict requirements: Username: Acu-Therapy, Password: 1234
    if (username.toLowerCase() === "acu-therapy" && password === "1234") {
        synth.success();
        
        state.currentUser = username;
        localStorage.setItem("acu_current_user", username);
        
        document.getElementById("avatar-letters").textContent = "AT";
        errorBox.classList.add("hide");
        
        transitionToDashboard();
        
        // Notification toast
        showNotification("Access Authorized", `Connected to smart vest biosensors. Welcome, Operator.`, "success");
    } else {
        synth.error();
        errorBox.classList.remove("hide");
        
        // Add shaking animated trigger
        if (loginCard) {
            loginCard.classList.add("shake");
            setTimeout(() => {
                loginCard.classList.remove("shake");
            }, 40000 / 100); // 400ms
        }
        showNotification("Authentication Failed", "Security passcode incorrect. Access Denied.", "error");
    }
}
function transitionToDashboard() {
    const loginScreen = document.getElementById("login-screen");
    const dashboardScreen = document.getElementById("dashboard-screen");
    
    // Smooth transition logic
    loginScreen.style.opacity = 0;
    setTimeout(() => {
        loginScreen.classList.remove("active");
        dashboardScreen.classList.add("active");
        dashboardScreen.style.opacity = 1;
        
        // Pre-render history table log grid
        renderHistoryTable();
    }, 400);
}
function handleLogout() {
    synth.click();
    if (confirm("Disconnect Acu-Jacket smart link and close user session?")) {
        // Halt running session
        if (state.activeSession.isRunning) {
            stopActiveSession(true); // Terminate and log immediately
        }
        // Clear session info
        state.currentUser = null;
        localStorage.removeItem("acu_current_user");
        // UI transitions
        const loginScreen = document.getElementById("login-screen");
        const dashboardScreen = document.getElementById("dashboard-screen");
        // Clear password box
        document.getElementById("password").value = "";
        dashboardScreen.style.opacity = 0;
        setTimeout(() => {
            dashboardScreen.classList.remove("active");
            loginScreen.classList.add("active");
            loginScreen.style.opacity = 1;
            
            // Switch navigation view default
            switchView("view-home");
            showNotification("Link Disconnected", "Operator session closed. Smart vest link offline.", "info");
        }, 400);
    }
}
// ==========================================================================
// NAVIGATION TAB CONTROLLER
// ==========================================================================
function switchView(viewId) {
    if (state.activeTab === viewId) return;
    synth.click();
    // 1. Remove active view class
    const activeView = document.querySelector(".app-view.active-view");
    if (activeView) activeView.classList.remove("active-view");
    // 2. Add active to new view
    const newView = document.getElementById(viewId);
    if (newView) newView.classList.add("active-view");
    // 3. Mark active state in sidebar nav items
    const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
    navLinks.forEach(link => {
        if (link.getAttribute("data-target") === viewId) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
    // 4. Update Header Title
    const titleEl = document.getElementById("current-view-title");
    if (titleEl) {
        if (viewId === "view-home") titleEl.textContent = "Home Dashboard";
        if (viewId === "view-modes") titleEl.textContent = "Therapy Modes Panel";
        if (viewId === "view-history") titleEl.textContent = "Session History Database";
        if (viewId === "view-settings") titleEl.textContent = "System Parameters Settings";
    }
    state.activeTab = viewId;
}
// ==========================================================================
// THERAPY CONTROL MODAL / SESSION SYSTEM
// ==========================================================================
function openTherapyConsole(modeKey) {
    synth.click();
    const config = PROGRAM_CONFIGS[modeKey];
    if (!config) return;
    // Check if another mode is already running
    if (state.activeSession.isRunning && state.activeSession.modeKey !== modeKey) {
        synth.alert();
        showNotification("Session Conflict", `Cannot open console. A session for "${PROGRAM_CONFIGS[state.activeSession.modeKey].name}" is currently active. Stop it first!`, "warning");
        return;
    }
    // Modal variables mapping
    const modal = document.getElementById("therapy-modal");
    const mTitle = document.getElementById("modal-title");
    const mSubtitle = document.getElementById("modal-subtitle");
    const mIcon = document.getElementById("modal-title-icon");
    const mDurSlider = document.getElementById("input-session-duration");
    const mDurLabel = document.getElementById("label-slider-duration");
    const mIntLabel = document.getElementById("label-intensity-level");
    modal.className = `modal-overlay active ${config.themeClass}`;
    mTitle.textContent = config.name;
    mSubtitle.textContent = `Target Zone: ${config.zone}`;
    mIcon.innerHTML = config.iconHtml;
    // Check running sync state
    if (state.activeSession.isRunning && state.activeSession.modeKey === modeKey) {
        // Sync sliders & fields
        mDurSlider.value = state.activeSession.durationMinutes;
        mDurSlider.disabled = true;
        mDurLabel.textContent = state.activeSession.durationMinutes;
        
        mIntLabel.textContent = state.activeSession.intensity;
        
        // Intensity pills disabled during session
        document.querySelectorAll(".intensity-pill").forEach(pill => {
            pill.disabled = true;
            if (pill.getAttribute("data-level") === state.activeSession.intensity) {
                pill.classList.add("active");
            } else {
                pill.classList.remove("active");
            }
        });
        // Button Visibility
        document.getElementById("btn-modal-start").classList.add("hide");
        if (state.activeSession.isPaused) {
            document.getElementById("btn-modal-pause").classList.add("hide");
            document.getElementById("btn-modal-resume").classList.remove("hide");
        } else {
            document.getElementById("btn-modal-pause").classList.remove("hide");
            document.getElementById("btn-modal-resume").classList.add("hide");
        }
        document.getElementById("btn-modal-stop").removeAttribute("disabled");
        document.getElementById("btn-modal-restart").removeAttribute("disabled");
        document.getElementById("modal-timer-status").textContent = state.activeSession.isPaused ? "Paused" : "Stimulating";
    } else {
        // Clean modal default layout setup
        state.activeSession.modeKey = modeKey;
        state.activeSession.durationMinutes = config.duration;
        state.activeSession.totalTime = config.duration * 60;
        state.activeSession.remainingTime = config.duration * 60;
        state.activeSession.intensity = "Medium";
        mDurSlider.value = config.duration;
        mDurSlider.disabled = false;
        mDurLabel.textContent = config.duration;
        mIntLabel.textContent = "Medium";
        // Intensity pills setup
        document.querySelectorAll(".intensity-pill").forEach(pill => {
            pill.disabled = false;
            if (pill.getAttribute("data-level") === "Medium") {
                pill.classList.add("active");
            } else {
                pill.classList.remove("active");
            }
        });
        // Button default resets
        document.getElementById("btn-modal-start").classList.remove("hide");
        document.getElementById("btn-modal-pause").classList.add("hide");
        document.getElementById("btn-modal-resume").classList.add("hide");
        document.getElementById("btn-modal-stop").setAttribute("disabled", "true");
        document.getElementById("btn-modal-restart").setAttribute("disabled", "true");
        document.getElementById("modal-timer-status").textContent = "Ready";
    }
    updateHomeCardIndicators();
    updateCountdownDisplay();
}
function closeTherapyConsole() {
    const modal = document.getElementById("therapy-modal");
    if (modal) modal.classList.remove("active");
    
    // Clear temporary mode state if session is not active
    if (!state.activeSession.isRunning) {
        state.activeSession.modeKey = null;
    }
    updateHomeCardIndicators();
}
// Countdown layout numbers & circular stroke calculations
function updateCountdownDisplay() {
    const clockDisplay = document.getElementById("modal-timer-countdown");
    const progressCircle = document.getElementById("timer-progress-circle");
    const totalSeconds = state.activeSession.totalTime;
    const remaining = state.activeSession.remainingTime;
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    if (clockDisplay) {
        clockDisplay.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    // Circular Stroke calculations
    if (progressCircle && totalSeconds > 0) {
        const radius = 90;
        const circumference = 2 * Math.PI * radius; // 565.48
        
        // Progress ratio
        const progress = remaining / totalSeconds;
        const offset = circumference * (1 - progress);
        
        progressCircle.style.strokeDasharray = circumference;
        progressCircle.style.strokeDashoffset = offset;
    }
}
// Start Session action
function startActiveSession() {
    if (state.activeSession.isRunning) return;
    if (!state.activeSession.modeKey) return;
    
    const totalSeconds = Math.max(1, Number(state.activeSession.durationMinutes || 1) * 60);
    state.activeSession.totalTime = totalSeconds;
    state.activeSession.remainingTime = totalSeconds;
    
    synth.success();
    
    state.activeSession.isRunning = true;
    state.activeSession.isPaused = false;
    
    // Locked modal fields
    document.getElementById("input-session-duration").disabled = true;
    document.querySelectorAll(".intensity-pill").forEach(pill => pill.disabled = true);
    // Modal buttons swap
    document.getElementById("btn-modal-start").classList.add("hide");
    document.getElementById("btn-modal-pause").classList.remove("hide");
    document.getElementById("btn-modal-stop").removeAttribute("disabled");
    document.getElementById("btn-modal-restart").removeAttribute("disabled");
    document.getElementById("modal-timer-status").textContent = "Stimulating";
    // Set Card indicator running in Dashboard
    updateHomeCardIndicators();
    // Trigger SVG animations
    activateJacketAnimations(state.activeSession.modeKey, true);
    updateCountdownDisplay();
    // Trigger interval countdown ticks
    startSessionTimer();
    showNotification("Stimulation Initiated", `Program "${PROGRAM_CONFIGS[state.activeSession.modeKey].name}" has started successfully.`, "success");
}
function startSessionTimer() {
    if (state.timerId) clearInterval(state.timerId);
    // Setup micro-sensor simulated display values
    const freqEl = document.getElementById("biometric-freq");
    const tempEl = document.getElementById("biometric-temp");
    updateCountdownDisplay();
    state.timerId = setInterval(() => {
        if (!state.activeSession.isRunning || state.activeSession.isPaused) {
            return;
        }
        if (state.activeSession.remainingTime > 0) {
            state.activeSession.remainingTime = Math.max(0, state.activeSession.remainingTime - 1);
            updateCountdownDisplay();
            // Simulate sensor fluctuation in manual sub-pages
            if (freqEl && Math.random() > 0.7) {
                const randomFreq = Math.floor(Math.random() * (45 - 15 + 1) + 15);
                freqEl.textContent = `Dynamic sweep: ${randomFreq}Hz (calibrated)`;
            }
            if (tempEl && Math.random() > 0.8) {
                const randomTemp = (Math.random() * (39.5 - 37.5) + 37.5).toFixed(1);
                tempEl.textContent = `Grid temperature: ${randomTemp}°C (steady state)`;
            }
        } else {
            // Completed countdown program
            completeActiveSession();
        }
    }, 1000);
}
// Pause session action
function pauseActiveSession() {
    if (!state.activeSession.isRunning || state.activeSession.isPaused) return;
    synth.click();
    state.activeSession.isPaused = true;
    clearInterval(state.timerId);
    document.getElementById("btn-modal-pause").classList.add("hide");
    document.getElementById("btn-modal-resume").classList.remove("hide");
    document.getElementById("modal-timer-status").textContent = "Paused";
    // Update Card indicators
    updateHomeCardIndicators();
    // Pause Animations in SVG
    activateJacketAnimations(state.activeSession.modeKey, false);
    showNotification("Session Paused", "Jacket stimulation micro-current suspended.", "warning");
}
// Resume session action
function resumeActiveSession() {
    if (!state.activeSession.isRunning || !state.activeSession.isPaused) return;
    synth.click();
    state.activeSession.isPaused = false;
    document.getElementById("btn-modal-resume").classList.add("hide");
    document.getElementById("btn-modal-pause").classList.remove("hide");
    document.getElementById("modal-timer-status").textContent = "Stimulating";
    // Update Card indicators
    updateHomeCardIndicators();
    // Restart Animations
    activateJacketAnimations(state.activeSession.modeKey, true);
    // Restart countdown ticks
    startSessionTimer();
    showNotification("Session Resumed", "Jacket stimulation micro-current active.", "success");
}
// Stop Session Action
function stopActiveSession(forceHalt = false) {
    if (!state.activeSession.isRunning) return;
    if (!forceHalt) {
        synth.click();
        if (!confirm("Are you sure you want to stop the current acupuncture stimulation?")) {
            return;
        }
    }
    clearInterval(state.timerId);
    state.timerId = null;
    // Log detail to History Database
    const elapsedSeconds = state.activeSession.totalTime - state.activeSession.remainingTime;
    if (elapsedSeconds > 0) {
        logSessionToHistory(state.activeSession.modeKey, elapsedSeconds, "Stopped");
    }
    // Clear Active Session State
    state.activeSession.isRunning = false;
    state.activeSession.isPaused = false;
    
    // Unlock modal parameters
    document.getElementById("input-session-duration").disabled = false;
    document.querySelectorAll(".intensity-pill").forEach(pill => pill.disabled = false);
    // Swap buttons
    document.getElementById("btn-modal-start").classList.remove("hide");
    document.getElementById("btn-modal-pause").classList.add("hide");
    document.getElementById("btn-modal-resume").classList.add("hide");
    document.getElementById("btn-modal-stop").setAttribute("disabled", "true");
    document.getElementById("btn-modal-restart").setAttribute("disabled", "true");
    document.getElementById("modal-timer-status").textContent = "Ready";
    // Set Card indicator
    updateHomeCardIndicators();
    // Stop Animations
    activateJacketAnimations(state.activeSession.modeKey, false);
    // Notification toast
    showNotification("Stimulation Suspended", "Session canceled. Bio-stimulation nodes offline.", "warning");
    
    if (!forceHalt) {
        closeTherapyConsole();
    }
}
// Restart session
function restartActiveSession() {
    synth.click();
    if (confirm("Restart stimulation cycle from beginning?")) {
        clearInterval(state.timerId);
        
        state.activeSession.remainingTime = state.activeSession.totalTime;
        state.activeSession.isPaused = false;
        
        document.getElementById("btn-modal-resume").classList.add("hide");
        document.getElementById("btn-modal-pause").classList.remove("hide");
        document.getElementById("modal-timer-status").textContent = "Stimulating";
        updateCountdownDisplay();
        
        // Re-apply SVG animation
        activateJacketAnimations(state.activeSession.modeKey, true);
        
        startSessionTimer();
        showNotification("Cycle Restarted", "Countdown timer reset. Stimulator online.", "success");
    }
}
// Completion cycle
function completeActiveSession() {
    clearInterval(state.timerId);
    state.timerId = null;
    synth.success();
    // Log history
    logSessionToHistory(state.activeSession.modeKey, state.activeSession.totalTime, "Completed");
    // Clear session status
    state.activeSession.isRunning = false;
    state.activeSession.isPaused = false;
    // Reset controls
    document.getElementById("input-session-duration").disabled = false;
    document.querySelectorAll(".intensity-pill").forEach(pill => pill.disabled = false);
    document.getElementById("btn-modal-start").classList.remove("hide");
    document.getElementById("btn-modal-pause").classList.add("hide");
    document.getElementById("btn-modal-resume").classList.add("hide");
    document.getElementById("btn-modal-stop").setAttribute("disabled", "true");
    document.getElementById("btn-modal-restart").setAttribute("disabled", "true");
    document.getElementById("modal-timer-status").textContent = "Completed";
    // Update Card indicators
    updateHomeCardIndicators();
    // Stop Animations
    activateJacketAnimations(state.activeSession.modeKey, false);
    alert(`Therapy Program "${PROGRAM_CONFIGS[state.activeSession.modeKey].name}" successfully completed! Great wellness boost.`);
    showNotification("Therapy Complete", "Session successfully completed. Biosensors entering idle mode.", "success");
    
    closeTherapyConsole();
}
// UI updates on Card Indicator states (Home Page list)
function updateHomeCardIndicators() {
    const configs = Object.keys(PROGRAM_CONFIGS);
    configs.forEach(key => {
        const ind = document.getElementById(`indicator-${key}`);
        if (!ind) return;

        const indDot = ind.querySelector(".indicator-dot");
        const indTxt = ind.querySelector(".indicator-text");
        const isActiveMode = state.activeSession.modeKey === key;
        const isRunning = state.activeSession.isRunning && isActiveMode;

        ind.className = isRunning
            ? "session-indicator running"
            : isActiveMode && !state.activeSession.isRunning
                ? "session-indicator connecting"
                : "session-indicator";

        if (indTxt) {
            indTxt.textContent = isRunning
                ? (state.activeSession.isPaused ? "Paused" : "Running")
                : isActiveMode && !state.activeSession.isRunning
                    ? "Connected"
                    : "Idle";
        }

        if (indDot) {
            indDot.style.animation = "";
        }
    });
}
// SVG node animation toggler
function activateJacketAnimations(modeKey, isActive) {
    // If animations settings are disabled globally, ignore
    if (!state.settings.animationsEnabled) {
        // Reset all animations
        document.querySelectorAll(".jacket-svg-el .node-group").forEach(n => n.classList.remove("active"));
        document.querySelectorAll(".glowing-path").forEach(p => p.classList.remove("active"));
        return;
    }
    const config = PROGRAM_CONFIGS[modeKey];
    const path = document.getElementById(`path-${modeKey}`);
    
    if (isActive) {
        // First reset all nodes to clean slate
        document.querySelectorAll(".jacket-svg-el .node-group").forEach(n => n.classList.remove("active"));
        document.querySelectorAll(".glowing-path").forEach(p => p.classList.remove("active"));
        // Activate specific node IDs for selected program
        if (config && config.nodes) {
            config.nodes.forEach(nodeId => {
                const node = document.getElementById(nodeId);
                if (node) node.classList.add("active");
            });
        }
        // Activate corresponding connection wire track
        if (path) path.classList.add("active");
    } else {
        // Reset nodes for this specific key
        if (config && config.nodes) {
            config.nodes.forEach(nodeId => {
                const node = document.getElementById(nodeId);
                if (node) node.classList.remove("active");
            });
        }
        if (path) path.classList.remove("active");
    }
}
// ==========================================================================
// SESSION HISTORY MANAGEMENT SYSTEM
// ==========================================================================
function logSessionToHistory(modeKey, secondsCompleted, status) {
    const config = PROGRAM_CONFIGS[modeKey];
    if (!config) return;
    // Convert seconds elapsed to formatted mins & secs
    let durStr = "";
    const mins = Math.floor(secondsCompleted / 60);
    const secs = secondsCompleted % 60;
    
    if (mins > 0) {
        durStr = `${mins}m ${secs}s`;
    } else {
        durStr = `${secs}s`;
    }
    // Format local date and time string
    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    }) + " " + now.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const sessionRecord = {
        id: "session_" + Date.now() + "_" + Math.floor(Math.random()*100),
        dateTime: dateStr,
        modeName: config.name,
        duration: durStr,
        intensity: state.activeSession.intensity,
        status: status // "Completed" or "Stopped"
    };
    // Store to internal state
    state.history.unshift(sessionRecord);
    
    // Save to LocalStorage
    localStorage.setItem("acu_history_db", JSON.stringify(state.history));
    
    // Refresh History table data
    renderHistoryTable();
}
function renderHistoryTable() {
    const tbody = document.getElementById("history-tbody");
    if (!tbody) return;
    // Fetch filters
    const searchVal = document.getElementById("history-search").value.toLowerCase();
    const modeFilter = document.getElementById("filter-mode").value;
    const intensityFilter = document.getElementById("filter-intensity").value;
    // Filter array
    const filtered = state.history.filter(item => {
        // Search filter: mode name or intensity
        const matchesSearch = item.modeName.toLowerCase().includes(searchVal) || 
                              item.intensity.toLowerCase().includes(searchVal);
        
        // Mode filter dropdown
        const matchesMode = modeFilter === "all" || item.modeName === modeFilter;
        
        // Intensity filter dropdown
        const matchesIntensity = intensityFilter === "all" || item.intensity.toLowerCase() === intensityFilter;
        return matchesSearch && matchesMode && matchesIntensity;
    });
    // Reset table elements
    tbody.innerHTML = "";
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="table-empty-state">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <p>No therapeutic session records found matching filter criteria.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    filtered.forEach(item => {
        const tr = document.createElement("tr");
        const badgeClass = item.status.toLowerCase() === "completed" ? "completed" : "stopped";
        tr.innerHTML = `
            <td>${item.dateTime}</td>
            <td style="font-weight: 500;">${item.modeName}</td>
            <td>${item.duration}</td>
            <td>${item.intensity}</td>
            <td>
                <span class="status-badge ${badgeClass}">
                    <span class="status-indicator-dot" style="animation: none;"></span>
                    ${item.status}
                </span>
            </td>
            <td style="text-align: center;">
                <button class="btn-delete-row" data-id="${item.id}" title="Delete session log">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </td>
        `;
        // Register action row delete
        const delBtn = tr.querySelector(".btn-delete-row");
        delBtn.addEventListener("click", () => {
            deleteSession(item.id);
        });
        tbody.appendChild(tr);
    });
}
function deleteSession(id) {
    synth.click();
    if (confirm("Permanently delete this stimulation record?")) {
        state.history = state.history.filter(item => item.id !== id);
        localStorage.setItem("acu_history_db", JSON.stringify(state.history));
        renderHistoryTable();
        showNotification("Record Purged", "Session history log removed from console database.", "info");
    }
}
function clearAllHistory() {
    synth.alert();
    if (state.history.length === 0) {
        showNotification("Action Canceled", "Session history database is already empty.", "warning");
        return;
    }
    if (confirm("Are you sure you want to permanently delete all therapy records? This action is irreversible.")) {
        state.history = [];
        localStorage.setItem("acu_history_db", JSON.stringify(state.history));
        renderHistoryTable();
        showNotification("Database Purged", "All historical therapy session records deleted.", "warning");
    }
}
// History CSV Exporter
function exportHistoryCSV() {
    synth.success();
    if (state.history.length === 0) {
        showNotification("Export Blocked", "No session logs in database to export.", "warning");
        return;
    }
    // 1. Build CSV headers
    let csvContent = "Date & Time,Therapy Mode,Duration,Intensity,Status\n";
    // 2. Format entries
    state.history.forEach(item => {
        // Wrap fields in quotes to prevent spacing conflicts
        const row = `"${item.dateTime}","${item.modeName}","${item.duration}","${item.intensity}","${item.status}"`;
        csvContent += row + "\n";
    });
    // 3. Trigger browser download
    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        link.setAttribute("href", url);
        link.setAttribute("download", `acu_therapy_session_history.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("CSV Exported", "Spreadsheet log downloaded successfully.", "success");
    } catch (e) {
        console.error(e);
        showNotification("Export Failed", "Error compiling database CSV payload.", "error");
    }
}
// ==========================================================================
// SYSTEM PURGE / FACTORY RESET
// ==========================================================================
function handleFactoryReset() {
    synth.alert();
    if (confirm("CRITICAL WARNING: This will permanently delete your session history, customized settings, profile configurations, and reset the app. Are you sure you want to proceed?")) {
        // Halt running sessions
        if (state.activeSession.isRunning) {
            stopActiveSession(true);
        }
        // Wipe LocalStorage
        localStorage.clear();
        
        // Reset variables
        state.currentUser = null;
        state.history = [];
        state.settings = {
            lightMode: false,
            soundEnabled: true,
            notificationsEnabled: true,
            animationsEnabled: true
        };
        showNotification("Factory Reset Complete", "Reloading system interfaces.", "warning");
        // Force full reload of interface
        setTimeout(() => {
            window.location.reload();
        }, 1200);
    }
}