// 🔥 Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, update, onValue }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 🔥 Firebase Config (Your Config)
const firebaseConfig = {
  apiKey: "AIzaSyATRbG1kwDpCIKdsLS5v_Qz0czImHCmlfc",
  authDomain: "accupuncture-676a1.firebaseapp.com",
  databaseURL: "https://accupuncture-676a1-default-rtdb.firebaseio.com",
  projectId: "accupuncture-676a1",
  storageBucket: "accupuncture-676a1.firebasestorage.app",
  messagingSenderId: "710518273793",
  appId: "1:710518273793:web:ff749b734180beeabd8d00"
};

// 🔥 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---------------- UI STATE ----------------
const UI = {
    history: JSON.parse(localStorage.getItem('j_hist') || '[]'),
    activeMode: new URLSearchParams(window.location.search).get('mode') || 'stress',
    ip: localStorage.getItem('j_ip') || '192.168.4.1',
    timer: null,
    timeRemaining: 600,
    totalDuration: 600
};

const allowedModes = ['stress', 'sleep', 'back', 'neck', 'relax'];
if (!allowedModes.includes(UI.activeMode)) UI.activeMode = 'stress';

// ---------------- INITIALIZER ----------------
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('t-body')) initTherapy();
    if (document.getElementById('history-container')) initDashboard();
});

// ---------------- DASHBOARD ----------------
function initDashboard() {
    const histEl = document.getElementById('history-container');
    const ipInp = document.getElementById('ip-addr');

    ipInp.value = UI.ip;
    ipInp.onchange = () => localStorage.setItem('j_ip', ipInp.value);

    // 🔥 LIVE FIREBASE LISTENER
    onValue(ref(db, 'jacket/currentSession'), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        console.log("Live Session Data:", data);
    });

    // Render Local History (UNCHANGED)
    histEl.innerHTML = UI.history.slice(0, 10).map(h => `
        <div class="history-item">
            <div><b>${h.mode.toUpperCase()}</b><br><span>${h.date}</span></div>
            <div style="text-align:right">Pain: ${h.pain}/10<br><span>${h.int}% Intensity</span></div>
        </div>
    `).join('') || '<p style="opacity:0.5; text-align:center; padding-top:20px;">No sessions yet.</p>';

    // Chart.js
    const ctx = document.getElementById('painChart').getContext('2d');
    const chartData = UI.history.slice(0, 7).reverse();
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(h => h.date.split(',')[0]),
            datasets: [{
                label: 'Pain Trend',
                data: chartData.map(h => h.pain),
                borderColor: '#0ea5e9',
                tension: 0.4,
                fill: true,
                backgroundColor:'rgba(14, 165, 233, 0.1)'
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 10 } } }
    });
}

// ---------------- THERAPY ----------------
function initTherapy() {
    document.body.className = `theme-${UI.activeMode}`;
    document.getElementById('m-title').innerText = UI.activeMode.toUpperCase() + ' SESSION';

    const slider = document.getElementById('int-slider');

    slider.oninput = (e) => {
        document.getElementById('int-label').innerText = e.target.value + '%';
    };

    document.querySelectorAll('.chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelector('.chip.active').classList.remove('active');
            chip.classList.add('active');
            UI.timeRemaining = parseInt(chip.dataset.s);
            UI.totalDuration = parseInt(chip.dataset.s);
            document.getElementById('timer-txt').innerText = formatTime(UI.timeRemaining);
        };
    });

    document.getElementById('start-btn').onclick = startSession;
    document.getElementById('stop-btn').onclick = stopSession;
}

// ---------------- START SESSION ----------------
// ---------------- START SESSION ----------------
function startSession() {

    const intensity = parseInt(document.getElementById('int-slider').value);

    // Fixed PWM according to therapy mode
    let pwm;

    switch(UI.activeMode)
    {
        case "stress":
            pwm = 10;
            break;

        case "back":
            pwm = 255;
            break;

        case "neck":
            pwm = 200;
            break;

        case "sleep":
            pwm = 150;
            break;

        case "relax":
            pwm = 100;
            break;

        default:
            pwm = 50;
    }


    document.getElementById('the-orb').classList.add('pulsing');
    document.getElementById('start-btn').innerText = "SESSION IN PROGRESS";
    document.getElementById('start-btn').disabled = true;


    // 🔥 WRITE TO FIREBASE
    set(ref(db, 'jacket/currentSession'), {

        mode: UI.activeMode,

        // slider intensity remains unchanged
        intensity: intensity,

        // fixed PWM sent to ESP32
        pwm: pwm,

        remainingTime: UI.timeRemaining,

        totalDuration: UI.totalDuration,

        status: "running",

        startTimestamp: Math.floor(Date.now()/1000)

    });


    const total = UI.timeRemaining;


    UI.timer = setInterval(() => {

        UI.timeRemaining--;


        update(ref(db, 'jacket/currentSession'), {

            remainingTime: UI.timeRemaining

        });


        document.getElementById('timer-txt').innerText =
        formatTime(UI.timeRemaining);



        const offset =
        880 - ((total - UI.timeRemaining) / total * 880);


        document.getElementById('progress-bar').style.strokeDashoffset = offset;



        if(UI.timeRemaining <= 0)
        {
            stopSession();
        }


    }, 1000);
}

// ---------------- STOP SESSION ----------------
function stopSession() {

    clearInterval(UI.timer);

    document.getElementById('the-orb').classList.remove('pulsing');
    document.getElementById('start-btn').innerText = "BEGIN THERAPY";
    document.getElementById('start-btn').disabled = false;

    update(ref(db, 'jacket/currentSession'), {
        status: "stopped",
        remainingTime: 0
    });

    const session = {
        mode: UI.activeMode,
        date: new Date().toLocaleString(),
        pain: document.getElementById('pain-inp').value,
        int: document.getElementById('int-slider').value
    };

    UI.history.unshift(session);
    localStorage.setItem('j_hist', JSON.stringify(UI.history));

    alert("Session data saved successfully!");
}

// ---------------- UTIL ----------------
function formatTime(s) {
    return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}