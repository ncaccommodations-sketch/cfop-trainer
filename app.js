// ===============================
// GLOBAL APP STATE
// ===============================

const appState = {
  currentTab: 'dashboard',
  currentStep: 'cross', // CFOP step: cross, f2l, oll, pll
  solves: [],            // {time, scramble, date, session}
  sessionSolves: [],
  algorithms: {
    cross: [],   // fill with CFOP cross algorithms
    f2l: [],     // fill with standard F2L cases
    oll: [],     // 57 OLL cases
    pll: []      // 21 PLL cases
  },
  settings: {
    theme: 'dark',         // 'light' or 'dark'
    animations: true,
    notation: 'WCA'
  },
  sessionId: Date.now()
};

// ===============================
// DOM ELEMENTS
// ===============================

const tabs = document.querySelectorAll('.tab');
const navButtons = document.querySelectorAll('.nav-btn');
const stepButtons = document.querySelectorAll('.step-btn');
const recentSolvesList = document.getElementById('recentSolves');
const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const animationToggle = document.getElementById('animationToggle');

// ===============================
// TAB NAVIGATION
// ===============================

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    switchTab(target);
  });
});

function switchTab(tabName) {
  tabs.forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');

  navButtons.forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.nav-btn[data-tab="${tabName}"]`).classList.add('active');

  appState.currentTab = tabName;
}

// ===============================
// STEP NAVIGATION (TRAINING)
// ===============================

stepButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const step = btn.dataset.step;
    switchStep(step);
  });
});

function switchStep(step) {
  stepButtons.forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.step-btn[data-step="${step}"]`).classList.add('active');
  appState.currentStep = step;

  renderAlgorithms();
}

// ===============================
// LOAD / SAVE SETTINGS
// ===============================

function loadSettings() {
  const savedSettings = JSON.parse(localStorage.getItem('cfopSettings'));
  if (savedSettings) {
    appState.settings = savedSettings;
    applyTheme();
    animationToggle.checked = appState.settings.animations;
  }
}

function saveSettings() {
  localStorage.setItem('cfopSettings', JSON.stringify(appState.settings));
}

// ===============================
// THEME MANAGEMENT
// ===============================

themeToggle.addEventListener('change', () => {
  appState.settings.theme = themeToggle.checked ? 'light' : 'dark';
  applyTheme();
  saveSettings();
});

animationToggle.addEventListener('change', () => {
  appState.settings.animations = animationToggle.checked;
  saveSettings();
});

function applyTheme() {
  if (appState.settings.theme === 'light') {
    body.classList.add('light');
  } else {
    body.classList.remove('light');
  }
}

// ===============================
// SOLVE MANAGEMENT
// ===============================

function addSolve(time, scramble) {
  const date = new Date();
  const solve = {
    time,
    scramble,
    date: date.toISOString(),
    session: appState.sessionId
  };
  appState.solves.push(solve);
  appState.sessionSolves.push(solve);
  saveSolves();
  updateDashboard();
  if (appState.currentTab === 'dashboard') renderRecentSolves();
}

function saveSolves() {
  localStorage.setItem('cfopSolves', JSON.stringify(appState.solves));
}

function loadSolves() {
  const saved = JSON.parse(localStorage.getItem('cfopSolves'));
  if (saved) appState.solves = saved;
  updateDashboard();
  renderRecentSolves();
}

// ===============================
// DASHBOARD CALCULATIONS
// ===============================

function calculateAverage(n, solvesArray) {
  const recent = solvesArray.slice(-n);
  if (recent.length === 0) return '--';
  const sum = recent.reduce((acc, s) => acc + s.time, 0);
  return (sum / recent.length).toFixed(2);
}

function updateDashboard() {
  const allSolves = appState.solves;
  document.getElementById('ao5').textContent = calculateAverage(5, allSolves);
  document.getElementById('ao12').textContent = calculateAverage(12, allSolves);
  document.getElementById('ao50').textContent = calculateAverage(50, allSolves);
  document.getElementById('ao100').textContent = calculateAverage(100, allSolves);

  const best = allSolves.length ? Math.min(...allSolves.map(s => s.time)) : '--';
  document.getElementById('best').textContent = best;

  const sessionBest = appState.sessionSolves.length
    ? Math.min(...appState.sessionSolves.map(s => s.time))
    : '--';
  document.getElementById('sessionBest').textContent = sessionBest;
}

// ===============================
// RECENT SOLVES RENDER
// ===============================

function renderRecentSolves() {
  recentSolvesList.innerHTML = '';
  const last10 = appState.solves.slice(-10).reverse();
  last10.forEach(solve => {
    const li = document.createElement('li');
    li.textContent = `${solve.time}s — ${solve.scramble} — ${new Date(solve.date).toLocaleString()}`;
    recentSolvesList.appendChild(li);
  });
}

// ===============================
// ALGORITHMS RENDERING (TRAINING)
// ===============================

function renderAlgorithms() {
  const container = document.getElementById('algorithmList');
  container.innerHTML = '';

  const list = appState.algorithms[appState.currentStep];
  list.forEach(algo => {
    const card = document.createElement('div');
    card.className = 'algorithm-card';

    card.innerHTML = `
      <div class="algorithm-title">${algo.name}</div>
      <div class="algorithm-notation">${algo.notation}</div>
      <div class="difficulty">
        ${'⭐'.repeat(algo.difficulty)} (${algo.level})
      </div>
      <div class="algorithm-actions">
        <button class="practice-btn">Practice ▶️</button>
        <button class="favorite-btn">❤️</button>
      </div>
    `;

    container.appendChild(card);
  });
}

// ===============================
// INITIALIZATION
// ===============================

function initApp() {
  loadSettings();
  loadSolves();
  switchTab(appState.currentTab);
  switchStep(appState.currentStep);
}

initApp();
// ===============================
// TIMER ELEMENTS
// ===============================

const timerDisplay = document.getElementById('timerDisplay');
const newScrambleBtn = document.getElementById('newScramble');
const toggleInspectionBtn = document.getElementById('toggleInspection');
const scrambleEl = document.getElementById('scramble');
const inspectionEl = document.getElementById('inspection');
const inspectionTimeEl = document.getElementById('inspectionTime');

let timerInterval = null;
let startTime = null;
let running = false;
let inspectionActive = false;
let inspectionCountdown = 15;

// ===============================
// WCA SCRAMBLE GENERATOR
// ===============================

const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
const modifiers = ['', '\'', '2'];

function generateScramble(length = 20) {
  let scramble = [];
  for (let i = 0; i < length; i++) {
    let move;
    do {
      move = faces[Math.floor(Math.random() * faces.length)];
    } while (i > 0 && move === scramble[i-1][0]);
    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    scramble.push(move + mod);
  }
  return scramble.join(' ');
}

function newScramble() {
  const s = generateScramble();
  scrambleEl.textContent = s;
  return s;
}

newScrambleBtn.addEventListener('click', () => {
  newScramble();
});

// ===============================
// TIMER FUNCTIONS
// ===============================

function startTimer() {
  if (running) return;
  running = true;
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    timerDisplay.textContent = elapsed.toFixed(2);
  }, 10);
}

function stopTimer() {
  if (!running) return;
  running = false;
  clearInterval(timerInterval);

  const time = parseFloat(timerDisplay.textContent);
  const scrambleUsed = scrambleEl.textContent;
  addSolve(time, scrambleUsed);

  // Reset display for next solve
  timerDisplay.textContent = '0.00';
  newScramble();
}

// ===============================
// INSPECTION
// ===============================

function startInspection() {
  if (inspectionActive) return;
  inspectionActive = true;
  inspectionEl.classList.remove('hidden');
  inspectionCountdown = 15;
  inspectionTimeEl.textContent = inspectionCountdown;

  const countdown = setInterval(() => {
    inspectionCountdown--;
    inspectionTimeEl.textContent = inspectionCountdown;

    // Color warnings
    if (inspectionCountdown <= 5) inspectionTimeEl.style.color = 'var(--danger)';
    else if (inspectionCountdown <= 10) inspectionTimeEl.style.color = 'orange';
    else inspectionTimeEl.style.color = 'var(--accent)';

    if (inspectionCountdown <= 0) {
      clearInterval(countdown);
      inspectionActive = false;
      inspectionEl.classList.add('hidden');
      startTimer();
    }
  }, 1000);
}

toggleInspectionBtn.addEventListener('click', () => {
  if (!inspectionActive) startInspection();
});

// ===============================
// KEYBOARD CONTROLS (SPACEBAR)
// ===============================

document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (inspectionActive) return; // cannot stop/start during inspection
    if (running) stopTimer();
    else startTimer();
  }
});

// ===============================
// INITIALIZE TIMER TAB
// ===============================

function initTimer() {
  newScramble(); // show initial scramble
}

initTimer();// ===============================
// ALGORITHM DATA (EXAMPLES)
// ===============================

// In a real app, all 57 OLL, 21 PLL, F2L cases, and Cross cases would be fully listed.
// For demo purposes, we include a few representative examples.
// You would expand this to all CFOP algorithms.

appState.algorithms = {
  cross: [
    { name: "White Cross - Standard", notation: "F R U R' U' F'", difficulty: 2, level: "Beginner" },
    { name: "White Cross - Advanced", notation: "R U R' U R U2 R'", difficulty: 3, level: "Intermediate" }
  ],
  f2l: [
    { name: "F2L Case 1", notation: "U R U' R'", difficulty: 2, level: "Beginner" },
    { name: "F2L Case 2", notation: "y' U' L' U L", difficulty: 3, level: "Intermediate" }
  ],
  oll: [
    { name: "OLL 21 - Sune", notation: "R U R' U R U2 R'", difficulty: 3, level: "Intermediate" },
    { name: "OLL 22 - Anti-Sune", notation: "L' U' L U' L' U2 L", difficulty: 3, level: "Intermediate" }
  ],
  pll: [
    { name: "PLL Aa", notation: "x R' U R' D2 R U' R' D2 R2 x'", difficulty: 4, level: "Advanced" },
    { name: "PLL Ub", notation: "M2 U M U2 M U M2", difficulty: 4, level: "Advanced" }
  ]
};

// ===============================
// ALGORITHM CARD RENDERING
// ===============================

function renderAlgorithms() {
  const container = document.getElementById('algorithmList');
  container.innerHTML = '';

  const list = appState.algorithms[appState.currentStep];
  list.forEach(algo => {
    const card = document.createElement('div');
    card.className = 'algorithm-card';

    // 2D cube placeholder (replace with real visualization library if desired)
    const cubePlaceholder = document.createElement('div');
    cubePlaceholder.className = 'cube-2d';
    cubePlaceholder.style.height = '80px';
    cubePlaceholder.style.background = 'linear-gradient(45deg, #222, #444)';
    cubePlaceholder.style.borderRadius = '8px';
    cubePlaceholder.style.display = 'flex';
    cubePlaceholder.style.alignItems = 'center';
    cubePlaceholder.style.justifyContent = 'center';
    cubePlaceholder.style.color = '#aaa';
    cubePlaceholder.textContent = '2D Cube Preview';

    card.appendChild(cubePlaceholder);

    const title = document.createElement('div');
    title.className = 'algorithm-title';
    title.textContent = algo.name;
    card.appendChild(title);

    const notation = document.createElement('div');
    notation.className = 'algorithm-notation';
    notation.textContent = algo.notation;
    card.appendChild(notation);

    const difficulty = document.createElement('div');
    difficulty.className = 'difficulty';
    difficulty.innerHTML = `${'⭐'.repeat(algo.difficulty)} (${algo.level})`;
    card.appendChild(difficulty);

    const actions = document.createElement('div');
    actions.className = 'algorithm-actions';
    
    const practiceBtn = document.createElement('button');
    practiceBtn.className = 'practice-btn';
    practiceBtn.textContent = 'Practice ▶️';
    practiceBtn.addEventListener('click', () => startPractice(algo));
    
    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'favorite-btn';
    favoriteBtn.textContent = '❤️';
    favoriteBtn.addEventListener('click', () => toggleFavorite(algo));

    actions.appendChild(practiceBtn);
    actions.appendChild(favoriteBtn);
    card.appendChild(actions);

    container.appendChild(card);
  });
}

// ===============================
// PRACTICE BUTTON HANDLER
// ===============================

function startPractice(algo) {
  alert(`Practice mode started for ${algo.name}\nNotation: ${algo.notation}`);
  // In a full app, this would link to an interactive practice interface
}

// ===============================
// FAVORITE / SAVE ALGORITHM
// ===============================

function toggleFavorite(algo) {
  if (!algo.favorite) algo.favorite = true;
  else algo.favorite = !algo.favorite;
  renderAlgorithms(); // refresh display
}

// ===============================
// INITIALIZE TRAINING TAB
// ===============================

function initTraining() {
  renderAlgorithms();
}

// Initialize on load
initTraining();
// ===============================
// ANALYTICS TAB (CHARTS)
// ===============================

// Using Chart.js style vanilla canvas (no external frameworks)
// We'll create simple line charts for averages and consistency

function renderAnalytics() {
  const avgCanvas = document.getElementById('averageChart');
  const consistencyCanvas = document.getElementById('consistencyChart');

  if (!avgCanvas || !consistencyCanvas) return;

  // Simple line chart using 2D canvas
  const avgCtx = avgCanvas.getContext('2d');
  const consCtx = consistencyCanvas.getContext('2d');

  // Clear previous drawings
  avgCtx.clearRect(0, 0, avgCanvas.width, avgCanvas.height);
  consCtx.clearRect(0, 0, consistencyCanvas.width, consistencyCanvas.height);

  // Prepare data
  const times = appState.solves.map(s => s.time);
  const labels = appState.solves.map(s => new Date(s.date).toLocaleDateString());

  // Draw average trend
  drawLineChart(avgCtx, times, labels, 'Average Trends', 'var(--accent)');

  // Draw consistency (difference between consecutive solves)
  const consistency = times.map((t,i,a) => i===0?0:Math.abs(t-a[i-1]));
  drawLineChart(consCtx, consistency, labels, 'Solve Consistency', 'orange');
}

// Simple vanilla 2D line chart
function drawLineChart(ctx, data, labels, title, color) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.clearRect(0,0,width,height);

  const padding = 40;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((value, i) => {
    const x = padding + (i / (data.length-1)) * (width - 2*padding);
    const y = height - padding - ((value - min)/(max - min))*(height - 2*padding);
    if (i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });

  ctx.stroke();

  // Draw title
  ctx.fillStyle = 'var(--text-dark)';
  ctx.font = '16px sans-serif';
  ctx.fillText(title, padding, 20);
}

// ===============================
// PROGRESS TAB
// ===============================

function renderProgress() {
  const progressGrid = document.getElementById('progressGrid');
  progressGrid.innerHTML = '';

  const steps = ['cross','f2l','oll','pll'];

  steps.forEach(step => {
    const total = appState.algorithms[step].length;
    const learned = appState.algorithms[step].filter(a => a.favorite).length;
    const percent = total ? Math.round((learned/total)*100) : 0;

    const card = document.createElement('div');
    card.className = 'progress-card';

    card.innerHTML = `
      <h3>${step.toUpperCase()}</h3>
      <p>Algorithms Learned: ${learned}/${total} (${percent}%)</p>
      <div class="progress-bar" style="background:#333; border-radius:12px; height:12px; margin-top:6px;">
        <div style="width:${percent}%; background:var(--accent); height:100%; border-radius:12px;"></div>
      </div>
    `;

    progressGrid.appendChild(card);
  });
}

// ===============================
// SETTINGS TAB FUNCTIONALITY
// ===============================

const exportBtn = document.getElementById('exportData');
const resetBtn = document.getElementById('resetData');

exportBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(appState.solves, null, 2);
  const blob = new Blob([dataStr], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'solves.json';
  a.click();
  URL.revokeObjectURL(url);
});

resetBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to reset all data? This cannot be undone.")) {
    localStorage.clear();
    appState.solves = [];
    appState.sessionSolves = [];
    updateDashboard();
    renderRecentSolves();
    renderProgress();
    renderAnalytics();
    alert("All data reset!");
  }
});

// ===============================
// INITIALIZATION
// ===============================

function initAll() {
  initApp();        // Part 3 init
  initTimer();      // Part 4 init
  initTraining();   // Part 5 init
  renderProgress();
  renderAnalytics();
}

// Initialize full app
initAll();

// Optional: Auto-refresh analytics & progress on new solves
document.addEventListener('cfopSolveAdded', () => {
  renderProgress();
  renderAnalytics();
});

