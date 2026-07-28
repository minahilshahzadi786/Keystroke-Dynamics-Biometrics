/* ==========================================================================
   KeyDynamics Engine - Sub-millisecond Keystroke Dynamics Biometrics
   ========================================================================== */

// --- Global Application State ---
const state = {
  targetPassword: 'p@ss123',
  targetHash: '',
  enrollmentAttempts: [],
  maxEnrollmentAttempts: 5,
  baseline: null, // { dwell: { keyIndex: { mean, stddev } }, flight: { gapIndex: { mean, stddev } } }
  threshold: 2.5,
  epsilon: 10.0, // Smoothing factor in milliseconds
  activeTab: 'enroll',
  currentVerifyAttempt: null,
  adaptiveBaseline: true, // Feature 3: Rolling Adaptive Baseline toggle
  activeProfile: 'owner', // Feature 4: Profile Switcher
  stepUpOtpVerified: false, // Tracks if Step-Up 2FA OTP was used
  
  // Live keystroke tracking buffers
  enrollKeyEvents: [],
  verifyKeyEvents: []
};

// Preset Demo Profiles (Feature 4)
const profilePresets = {
  owner: null, // Populated on enrollment
  bob: {
    dwells: [
      { index: 0, char: 'p', mean: 55, stddev: 8 },
      { index: 1, char: '@', mean: 60, stddev: 7 },
      { index: 2, char: 's', mean: 50, stddev: 6 },
      { index: 3, char: 's', mean: 48, stddev: 5 },
      { index: 4, char: '1', mean: 65, stddev: 9 },
      { index: 5, char: '2', mean: 52, stddev: 6 },
      { index: 6, char: '3', mean: 50, stddev: 7 }
    ],
    flights: [
      { gapIndex: 0, pair: 'p→@', mean: 70, stddev: 12 },
      { gapIndex: 1, pair: '@→s', mean: 65, stddev: 10 },
      { gapIndex: 2, pair: 's→s', mean: 45, stddev: 8 },
      { gapIndex: 3, pair: 's→1', mean: 80, stddev: 14 },
      { gapIndex: 4, pair: '1→2', mean: 50, stddev: 9 },
      { gapIndex: 5, pair: '2→3', mean: 48, stddev: 7 }
    ]
  },
  charlie: {
    dwells: [
      { index: 0, char: 'p', mean: 175, stddev: 22 },
      { index: 1, char: '@', mean: 190, stddev: 25 },
      { index: 2, char: 's', mean: 160, stddev: 18 },
      { index: 3, char: 's', mean: 155, stddev: 19 },
      { index: 4, char: '1', mean: 180, stddev: 20 },
      { index: 5, char: '2', mean: 165, stddev: 17 },
      { index: 6, char: '3', mean: 170, stddev: 21 }
    ],
    flights: [
      { gapIndex: 0, pair: 'p→@', mean: 280, stddev: 35 },
      { gapIndex: 1, pair: '@→s', mean: 250, stddev: 30 },
      { gapIndex: 2, pair: 's→s', mean: 220, stddev: 28 },
      { gapIndex: 3, pair: 's→1', mean: 310, stddev: 40 },
      { gapIndex: 4, pair: '1→2', mean: 260, stddev: 32 },
      { gapIndex: 5, pair: '2→3', mean: 240, stddev: 29 }
    ]
  }
};

// Profile Switcher (Feature 4)
function switchUserProfile(profileId) {
  state.activeProfile = profileId;
  if (profileId === 'owner') {
    if (profilePresets.owner) state.baseline = profilePresets.owner;
  } else {
    state.baseline = profilePresets[profileId];
  }
  updateUIState();
  if (state.currentVerifyAttempt) processVerification();
}

// Adaptive Baseline Toggle (Feature 3)
function toggleAdaptiveBaseline(enabled) {
  state.adaptiveBaseline = enabled;
}

// Audit Certificate Modal (Feature 2)
function toggleAuditReport(show) {
  const modal = document.getElementById('audit-report-modal');
  if (show) {
    document.getElementById('audit-cert-id').innerText = `KP-${Math.floor(1000 + Math.random() * 9000)}-X9`;
    document.getElementById('audit-cert-time').innerText = new Date().toLocaleString();
    document.getElementById('audit-cert-profile').innerText = state.activeProfile.toUpperCase() + ' Profile';
    
    const statusElem = document.getElementById('audit-cert-status');
    const expElem = document.getElementById('audit-cert-explanation');
    const otpRowElem = document.getElementById('audit-cert-otp-status');

    if (state.stepUpOtpVerified) {
      statusElem.innerText = '✅ ACCESS GRANTED (STEP-UP OTP VERIFIED)';
      statusElem.style.color = '#15803d';
      expElem.innerText = 'Stage 1 Password Hash PASSED ✓. Stage 2 Biometric Timing Anomaly Flagged, but identity successfully validated via 6-Digit Out-of-Band Mobile OTP.';
      if (otpRowElem) otpRowElem.innerText = 'Mobile OTP Verified ✓';
    } else {
      statusElem.innerText = '✅ ACCESS GRANTED (BIOMETRICS PASSED)';
      statusElem.style.color = '#0f172a';
      expElem.innerText = 'Stage 1 Password Hash PASSED ✓. Stage 2 Biometric Z-Score distance is within baseline limits.';
      if (otpRowElem) otpRowElem.innerText = 'Bypassed (Biometrics Passed)';
    }

    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
  }
}

// ==========================================================================
// Initialization & Utility Functions
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  state.targetHash = await computeSHA256(state.targetPassword);
  initEventListeners();
  updateUIState();
});

// SHA-256 cryptographic hash function using Web Crypto API
async function computeSHA256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Tab navigation controller
function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  document.getElementById(`tab-btn-${tabId}`).classList.add('active');
  document.getElementById(`tab-${tabId}`).classList.add('active');

  if (tabId === 'analytics') {
    renderCanvasChart();
  }
}

// Modal control
function toggleCheatSheet(show) {
  const modal = document.getElementById('cheat-sheet-modal');
  if (show) modal.classList.add('active');
  else modal.classList.remove('active');
}

function updateTargetPassword() {
  const input = document.getElementById('target-password-input');
  if (input.value.trim().length > 0) {
    state.targetPassword = input.value.trim();
    computeSHA256(state.targetPassword).then(hash => state.targetHash = hash);
    document.getElementById('prompt-display').innerText = state.targetPassword;
    resetEnrollment();
  }
}

// ==========================================================================
// Sub-millisecond Keystroke Event Listener Engine
// ==========================================================================

function initEventListeners() {
  const enrollInput = document.getElementById('enroll-typing-input');
  const verifyInput = document.getElementById('verify-typing-input');

  setupInputTracker(enrollInput, 'enroll');
  setupInputTracker(verifyInput, 'verify');
}

function setupInputTracker(inputElement, mode) {
  let activeKeys = {}; // key -> pressTimestamp
  let keyStreamEvents = [];

  inputElement.addEventListener('focus', () => {
    document.getElementById('recording-box')?.classList.add('focused');
  });

  inputElement.addEventListener('blur', () => {
    document.getElementById('recording-box')?.classList.remove('focused');
  });

  inputElement.addEventListener('keydown', (e) => {
    // Ignore special navigation keys
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;

    if (e.key === 'Backspace') {
      // Clear tracking on backspace for clean measurement
      activeKeys = {};
      keyStreamEvents = [];
      inputElement.value = '';
      renderKeyBubbles(mode, []);
      return;
    }

    if (!activeKeys[e.code]) {
      activeKeys[e.code] = {
        key: e.key,
        code: e.code,
        pressTime: performance.now()
      };

      const keyCap = document.getElementById(`keycap-${e.key.toLowerCase()}`);
      if (keyCap) keyCap.classList.add('active-key');
    }
  });

  inputElement.addEventListener('keyup', (e) => {
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;

    const keyCap = document.getElementById(`keycap-${e.key.toLowerCase()}`);
    if (keyCap) {
      keyCap.classList.remove('active-key');
      keyCap.classList.add('pressed-key');
      setTimeout(() => keyCap.classList.remove('pressed-key'), 1000);
    }

    if (activeKeys[e.code]) {
      const releaseTime = performance.now();
      const pressTime = activeKeys[e.code].pressTime;
      const dwell = releaseTime - pressTime;

      keyStreamEvents.push({
        char: activeKeys[e.code].key,
        pressTime: pressTime,
        releaseTime: releaseTime,
        dwell: dwell
      });

      delete activeKeys[e.code];

      // Update UI Key Stream
      renderKeyBubbles(mode, keyStreamEvents);

      // Check if target password typed completely
      if (inputElement.value === state.targetPassword) {
        const timingVector = extractTimingVector(keyStreamEvents, state.targetPassword);
        
        if (mode === 'enroll') {
          handleEnrollmentAttempt(timingVector);
          inputElement.value = '';
          keyStreamEvents = [];
          activeKeys = {};
        } else if (mode === 'verify') {
          state.currentVerifyAttempt = timingVector;
          processVerification();
        }
      }
    }
  });
}

function renderKeyBubbles(mode, events) {
  const container = document.getElementById(`${mode}-key-stream`);
  if (!container) return;
  container.innerHTML = '';

  events.forEach((ev) => {
    const bubble = document.createElement('div');
    bubble.className = 'key-bubble';
    bubble.innerHTML = `
      <span>${ev.char === ' ' ? '␣' : ev.char}</span>
      <span class="dwell-label">${Math.round(ev.dwell)}ms</span>
    `;
    container.appendChild(bubble);
  });
}

// Extractor: transforms raw events into Dwell and Flight features
function extractTimingVector(keyEvents, targetStr) {
  const vector = {
    dwells: [],  // [dwell_key0, dwell_key1, ...]
    flights: []  // [flight_gap0, flight_gap1, ...]
  };

  for (let i = 0; i < keyEvents.length; i++) {
    vector.dwells.push({
      index: i,
      char: keyEvents[i].char,
      dwell: keyEvents[i].dwell
    });

    if (i > 0) {
      // Flight time = press(k_i) - release(k_{i-1})
      const flight = keyEvents[i].pressTime - keyEvents[i - 1].releaseTime;
      vector.flights.push({
        gapIndex: i - 1,
        pair: `${keyEvents[i - 1].char}→${keyEvents[i].char}`,
        flight: flight
      });
    }
  }

  return vector;
}

// ==========================================================================
// Enrollment & Baseline Statistics Generator
// ==========================================================================

function handleEnrollmentAttempt(vector) {
  if (state.enrollmentAttempts.length >= state.maxEnrollmentAttempts) return;

  state.enrollmentAttempts.push(vector);
  updateEnrollmentProgressUI();

  if (state.enrollmentAttempts.length === state.maxEnrollmentAttempts) {
    document.getElementById('btn-save-enrollment').disabled = false;
    finalizeEnrollment();
  }
}

function finalizeEnrollment() {
  if (state.enrollmentAttempts.length === 0) return;

  // Build baseline stats: Mean and Standard Deviation per feature
  const dwellsStats = [];
  const flightsStats = [];
  const len = state.targetPassword.length;

  // 1. Dwells per character
  for (let i = 0; i < len; i++) {
    const values = state.enrollmentAttempts.map(att => att.dwells[i] ? att.dwells[i].dwell : 0);
    const mean = calculateMean(values);
    const stddev = calculateStdDev(values, mean);

    dwellsStats.push({
      index: i,
      char: state.targetPassword[i],
      mean: mean,
      stddev: stddev
    });
  }

  // 2. Flights per gap
  for (let i = 0; i < len - 1; i++) {
    const pair = `${state.targetPassword[i]}→${state.targetPassword[i+1]}`;
    const values = state.enrollmentAttempts.map(att => att.flights[i] ? att.flights[i].flight : 0);
    const mean = calculateMean(values);
    const stddev = calculateStdDev(values, mean);

    flightsStats.push({
      gapIndex: i,
      pair: pair,
      mean: mean,
      stddev: stddev
    });
  }

  state.baseline = {
    dwells: dwellsStats,
    flights: flightsStats
  };

  profilePresets.owner = state.baseline;

  renderBaselineTable();
  document.getElementById('enrollment-status-badge').innerText = 'Status: Active Baseline Enrolled';
  document.getElementById('enrollment-status-badge').style.color = 'var(--status-success)';
  
  // Auto switch tab or update UI
  updateUIState();
}

function resetEnrollment() {
  state.enrollmentAttempts = [];
  state.baseline = null;
  document.getElementById('btn-save-enrollment').disabled = true;
  document.getElementById('baseline-table-body').innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; color: var(--text-dim); padding: 2rem;">
        No enrollment baseline built yet. Complete 5 practice attempts on the left.
      </td>
    </tr>
  `;
  updateEnrollmentProgressUI();
  document.getElementById('enrollment-status-badge').innerText = 'Status: Not Enrolled';
  document.getElementById('enrollment-status-badge').style.color = 'var(--text-dim)';
}

function updateEnrollmentProgressUI() {
  const count = state.enrollmentAttempts.length;
  document.getElementById('enroll-progress-text').innerText = `${count} of ${state.maxEnrollmentAttempts} practice attempts captured`;
  
  const dots = document.querySelectorAll('#step-tracker-dots .step-dot');
  dots.forEach((dot, idx) => {
    dot.className = 'step-dot';
    if (idx < count) dot.classList.add('completed');
    else if (idx === count) dot.classList.add('active');
  });
}

function renderBaselineTable() {
  if (!state.baseline) return;

  const tbody = document.getElementById('baseline-table-body');
  tbody.innerHTML = '';

  let totalFeatures = 0;

  state.baseline.dwells.forEach(d => {
    totalFeatures++;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="tag-dwell">Dwell</span></td>
      <td><strong>${d.char}</strong> (Pos ${d.index + 1})</td>
      <td>${Math.round(d.mean)} ms</td>
      <td>${Math.round(d.stddev)} ms</td>
      <td><span style="color: var(--accent-cyan); font-weight: 700;">${(1 / (d.stddev + state.epsilon)).toFixed(3)}</span></td>
    `;
    tbody.appendChild(tr);
  });

  state.baseline.flights.forEach(f => {
    totalFeatures++;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="tag-flight">Flight</span></td>
      <td><strong>${f.pair}</strong></td>
      <td>${Math.round(f.mean)} ms</td>
      <td>${Math.round(f.stddev)} ms</td>
      <td><span style="color: var(--accent-purple); font-weight: 700;">${(1 / (f.stddev + state.epsilon)).toFixed(3)}</span></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('vector-count-label').innerText = `${totalFeatures} Features Configured`;
}

// Statistical Helper Math
function calculateMean(arr) {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

function calculateStdDev(arr, mean) {
  if (arr.length <= 1) return 0;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ==========================================================================
// Verification & Variance-Weighted Distance Engine
// ==========================================================================

async function processVerification() {
  const verifyInput = document.getElementById('verify-typing-input');
  const typedValue = verifyInput.value;

  if (!state.baseline) {
    alert('Please complete 5 enrollment attempts in the Enrollment tab first!');
    switchTab('enroll');
    return;
  }

  // Stage 1: Password Hash Verification
  const typedHash = await computeSHA256(typedValue);
  const hashMatch = (typedHash === state.targetHash);

  const hashBadge = document.getElementById('stage1-hash-badge');
  if (hashMatch) {
    hashBadge.innerText = 'Stage 1 Hash: PASSED ✓';
    hashBadge.style.color = 'var(--status-success)';
    hashBadge.style.background = 'var(--status-success-bg)';
  } else {
    hashBadge.innerText = 'Stage 1 Hash: FAILED ✗';
    hashBadge.style.color = 'var(--status-danger)';
    hashBadge.style.background = 'var(--status-danger-bg)';
    
    renderVerificationResult(false, Infinity, 0, 'Password hash mismatch. Authentication rejected at Stage 1.');
    return;
  }

  // Stage 2: Biometric Variance-Weighted Distance Calculation
  if (!state.currentVerifyAttempt) return;

  const attempt = state.currentVerifyAttempt;
  let totalDistance = 0;
  let featureCount = 0;
  let anomalyLogs = [];

  // Dwell Distance
  state.baseline.dwells.forEach((b, idx) => {
    const attDwell = attempt.dwells[idx] ? attempt.dwells[idx].dwell : 0;
    const zScore = Math.abs(attDwell - b.mean) / (b.stddev + state.epsilon);
    totalDistance += zScore;
    featureCount++;

    if (zScore > 2.0) {
      anomalyLogs.push(`Key '${b.char}': Dwell ${Math.round(attDwell)}ms vs μ=${Math.round(b.mean)}ms (Z=${zScore.toFixed(2)})`);
    }
  });

  // Flight Distance
  state.baseline.flights.forEach((b, idx) => {
    const attFlight = attempt.flights[idx] ? attempt.flights[idx].flight : 0;
    const zScore = Math.abs(attFlight - b.mean) / (b.stddev + state.epsilon);
    totalDistance += zScore;
    featureCount++;

    if (zScore > 2.0) {
      anomalyLogs.push(`Gap '${b.pair}': Flight ${Math.round(attFlight)}ms vs μ=${Math.round(b.mean)}ms (Z=${zScore.toFixed(2)})`);
    }
  });

  const normalizedDistance = featureCount > 0 ? (totalDistance / featureCount) : Infinity;
  
  // Calculate Confidence Match Percentage (0 to 100%)
  // Distance 0 = 100%, Distance >= Threshold*2 = 0%
  const confidence = Math.max(0, Math.min(100, Math.round(100 * (1 - (normalizedDistance / (state.threshold * 2.2))))));

  const isAccessGranted = normalizedDistance <= state.threshold;

  // Feature 3: Rolling Adaptive Baseline Update on Successful Auth
  if (isAccessGranted && state.adaptiveBaseline && state.baseline) {
    state.baseline.dwells.forEach((b, idx) => {
      if (attempt.dwells[idx]) {
        b.mean = 0.9 * b.mean + 0.1 * attempt.dwells[idx].dwell;
      }
    });
    state.baseline.flights.forEach((b, idx) => {
      if (attempt.flights[idx]) {
        b.mean = 0.9 * b.mean + 0.1 * attempt.flights[idx].flight;
      }
    });
    renderBaselineTable();
  }

  let explanation = '';
  if (isAccessGranted) {
    explanation = `Biometric distance (${normalizedDistance.toFixed(2)}) is below threshold (${state.threshold.toFixed(2)}). Subconscious timing pattern matches owner baseline.` + (state.adaptiveBaseline ? ' (Rolling baseline profile updated!)' : '');
  } else {
    explanation = `Biometric distance (${normalizedDistance.toFixed(2)}) exceeded threshold (${state.threshold.toFixed(2)}). Keystroke micro-rhythm does not match owner baseline.`;
  }

  renderVerificationResult(isAccessGranted, normalizedDistance, confidence, explanation, anomalyLogs, hashMatch);
  renderCanvasChart();
}

let activeOtpCode = '849201';

function renderVerificationResult(passed, distance, confidence, explanation, anomalyLogs = [], hashMatch = true) {
  const container = document.getElementById('result-card-container');
  const statusText = document.getElementById('result-status-text');
  const distBadge = document.getElementById('distance-score-badge');
  const expLabel = document.getElementById('result-explanation');
  const percentLabel = document.getElementById('match-percent-label');
  const progressBar = document.getElementById('score-progress-bar');
  const anomalyList = document.getElementById('anomaly-list');

  if (passed) {
    container.className = 'result-card success';
    statusText.innerHTML = '<span>✅</span> Access Granted';
    statusText.style.color = 'var(--status-success)';
  } else if (hashMatch) {
    container.className = 'result-card warning';
    statusText.innerHTML = '<span>⚠️</span> Step-Up 2FA Triggered';
    statusText.style.color = 'var(--status-warning)';
  } else {
    container.className = 'result-card danger';
    statusText.innerHTML = '<span>🚫</span> Access Rejected (Invalid Password)';
    statusText.style.color = 'var(--status-danger)';
  }

  distBadge.innerText = `Distance: ${isFinite(distance) ? distance.toFixed(2) : 'INF'}`;
  expLabel.innerText = explanation;
  percentLabel.innerText = `${confidence}%`;

  progressBar.style.width = `${confidence}%`;
  if (confidence > 70) progressBar.className = 'score-fill green';
  else if (confidence > 45) progressBar.className = 'score-fill yellow';
  else progressBar.className = 'score-fill red';

  if (anomalyLogs.length > 0) {
    let html = anomalyLogs.map(log => `<div style="color: var(--status-warning); margin-bottom: 2px;">⚠️ ${log}</div>`).join('');
    if (!passed && hashMatch) {
      html += `
        <div style="margin-top: 1rem;">
          <button class="btn-primary" style="background: linear-gradient(135deg, var(--status-warning), #ff8f00); color: #000;" onclick="openOtpModal()">
            <span>📱</span> Complete Step-Up OTP Verification
          </button>
        </div>
      `;
    }
    anomalyList.innerHTML = html;
  } else {
    anomalyList.innerHTML = `<div style="color: var(--status-success);">✓ All keystroke features fall within normal baseline limits.</div>`;
  }
}

// OTP Step-Up Modal Control Functions
function openOtpModal() {
  activeOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
  document.getElementById('simulated-otp-code').innerText = activeOtpCode;
  document.getElementById('otp-input-field').value = '';
  document.getElementById('stepup-otp-modal').classList.add('active');
}

function closeOtpModal() {
  document.getElementById('stepup-otp-modal').classList.remove('active');
}

function verifyOtpCode() {
  const entered = document.getElementById('otp-input-field').value.trim();
  if (entered === activeOtpCode) {
    state.stepUpOtpVerified = true;
    closeOtpModal();
    const statusText = document.getElementById('result-status-text');
    const container = document.getElementById('result-card-container');
    const expLabel = document.getElementById('result-explanation');

    container.className = 'result-card success';
    statusText.innerHTML = '<span>✅</span> Access Granted (Verified via Step-Up 2FA)';
    statusText.style.color = 'var(--status-success)';
    expLabel.innerText = 'Step-Up 2FA code successfully verified! User identity confirmed despite typing rhythm variance.';
  } else {
    alert('Incorrect 6-digit OTP code! Please try again.');
  }
}

// ==========================================================================
// Imposter & Attack Simulator Generators
// ==========================================================================

function simulateImposter(mode) {
  if (!state.baseline) {
    alert('Please complete enrollment first to train a baseline profile!');
    return;
  }

  const verifyInput = document.getElementById('verify-typing-input');
  verifyInput.value = state.targetPassword;

  const len = state.targetPassword.length;
  let simulatedEvents = [];
  let currentTime = performance.now();

  for (let i = 0; i < len; i++) {
    let dwell = 0;
    let flight = 0;

    if (mode === 'bot') {
      // Uniform robotic timing (100ms dwell, 150ms flight)
      dwell = 100;
      flight = 150;
    } else if (mode === 'paste') {
      // Paste attack: near zero timing (5ms dwell, 2ms flight)
      dwell = 5;
      flight = 2;
    } else if (mode === 'altered') {
      // Altered rhythm: randomized timings far from baseline
      const bDwell = state.baseline.dwells[i] ? state.baseline.dwells[i].mean : 120;
      dwell = bDwell + (Math.random() > 0.5 ? 180 : -70);
      flight = 250 + Math.random() * 150;
    }

    const press = currentTime;
    const release = press + dwell;

    simulatedEvents.push({
      char: state.targetPassword[i],
      pressTime: press,
      releaseTime: release,
      dwell: dwell
    });

    currentTime = release + flight;
  }

  state.currentVerifyAttempt = extractTimingVector(simulatedEvents, state.targetPassword);
  renderKeyBubbles('verify', simulatedEvents);
  processVerification();
}

// ==========================================================================
// Threshold & Analytics Controllers
// ==========================================================================

function updateThreshold(val) {
  state.threshold = parseFloat(val);
  document.getElementById('threshold-val-display').innerText = state.threshold.toFixed(2);
  
  if (state.currentVerifyAttempt) {
    processVerification();
  }
}

function updateUIState() {
  if (state.baseline) {
    renderBaselineTable();
  }
}

// ==========================================================================
// Custom HTML5 Canvas Timing Chart Renderer
// ==========================================================================

function renderCanvasChart() {
  const canvas = document.getElementById('timing-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio || 600;
  canvas.height = rect.height * window.devicePixelRatio || 280;

  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (!state.baseline) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('No baseline profile enrolled yet to visualize.', rect.width / 2, rect.height / 2);
    return;
  }

  // Labels: Key Dwells + Flight Gaps
  const labels = [];
  const baselineValues = [];
  const attemptValues = [];

  state.baseline.dwells.forEach(d => {
    labels.push(`Dwell '${d.char}'`);
    baselineValues.push(d.mean);
  });

  state.baseline.flights.forEach(f => {
    labels.push(`Flight ${f.pair}`);
    baselineValues.push(f.mean);
  });

  if (state.currentVerifyAttempt) {
    state.currentVerifyAttempt.dwells.forEach(d => attemptValues.push(d.dwell));
    state.currentVerifyAttempt.flights.forEach(f => attemptValues.push(f.flight));
  }

  const barCount = labels.length;
  const paddingLeft = 50;
  const paddingBottom = 40;
  const graphWidth = rect.width - paddingLeft - 20;
  const graphHeight = rect.height - paddingBottom - 20;

  const maxVal = Math.max(300, ...baselineValues, ...attemptValues) * 1.15;

  // Draw Grid Axes
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  
  for (let i = 0; i <= 4; i++) {
    const y = 10 + (graphHeight / 4) * i;
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + graphWidth, y);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(maxVal - (maxVal / 4) * i)}ms`, paddingLeft - 8, y + 4);
  }
  ctx.stroke();

  // Draw Bars
  const groupWidth = graphWidth / barCount;
  const barWidth = Math.min(18, groupWidth * 0.35);

  labels.forEach((lbl, idx) => {
    const groupX = paddingLeft + idx * groupWidth + groupWidth / 2;

    // Baseline bar — Sky Blue gradient
    const bHeight = (baselineValues[idx] / maxVal) * graphHeight;
    const bY = 10 + graphHeight - bHeight;
    const skyGrad = ctx.createLinearGradient(0, bY, 0, bY + bHeight);
    skyGrad.addColorStop(0, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad;
    ctx.beginPath();
    ctx.roundRect
      ? ctx.roundRect(groupX - barWidth - 2, bY, barWidth, bHeight, [4, 4, 0, 0])
      : ctx.rect(groupX - barWidth - 2, bY, barWidth, bHeight);
    ctx.fill();

    // Attempt bar — Pink gradient
    if (attemptValues.length > idx) {
      const aHeight = (attemptValues[idx] / maxVal) * graphHeight;
      const aY = 10 + graphHeight - aHeight;
      const pinkGrad = ctx.createLinearGradient(0, aY, 0, aY + aHeight);
      pinkGrad.addColorStop(0, '#f472b6');
      pinkGrad.addColorStop(1, '#fbcfe8');
      ctx.fillStyle = pinkGrad;
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(groupX + 2, aY, barWidth, aHeight, [4, 4, 0, 0])
        : ctx.rect(groupX + 2, aY, barWidth, aHeight);
      ctx.fill();
    }

    // Label Text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, groupX, rect.height - 15);
  });
}

window.addEventListener('resize', () => {
  if (state.activeTab === 'analytics') renderCanvasChart();
});
