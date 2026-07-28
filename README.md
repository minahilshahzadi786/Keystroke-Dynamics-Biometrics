# KeyPulse AI — Sub-Millisecond Behavioral Biometric Authentication Engine

KeyPulse AI is a web-based authentication system that evaluates keystroke timing dynamics — specifically **Dwell Time** and **Flight Time** — to verify user identities and detect imposters in real time, even when the correct password is entered. It adds a silent, frictionless second factor to conventional password login, requiring no extra hardware, token, or user action.

---

## 💡 Idea & Purpose

A password only proves someone knows a string of characters — it cannot tell a legitimate user apart from an attacker who has phished, guessed, or leaked that same string. KeyPulse AI closes that gap by fingerprinting *how* the password is typed. Every person's typing rhythm is rooted in subconscious muscle memory, making it extremely difficult for an attacker to consciously reproduce, even with full knowledge of the correct password.

---

## ✨ Features

- **Enrollment Studio:** Captures multi-sample baseline profile data (5 typed attempts).
- **Real-Time Key Visualizer:** Live display of dwell/flight timings per key event.
- **Verification Engine:** Dynamic distance scoring using weighted Z-Score algorithms.
- **Security Audit Certificate Exporter:** One-click, printable ISO/IEC 19792-aligned audit certificate. *(see walkthrough below)*
- **Rolling Adaptive Baseline Engine:** Profile updates automatically after each successful login using exponential smoothing. *(see walkthrough below)*
- **Multi-User Profile Switcher:** Switch active biometric profiles from the top nav to demo impostor detection instantly. *(see walkthrough below)*
- **Sensitivity & Threshold Tuning:** Interactive threshold control balancing FAR and FRR.
- **Step-Up OTP Challenge:** Triggers secondary verification on a rhythm mismatch instead of a hard block.
- **ISO/IEC 19792 Alignment:** Structured biometric performance evaluation.

---

## 📐 Algorithm & Math

### Keystroke timing features

Two features are extracted from every keystroke event using the `performance.now()` API (sub-millisecond resolution):

$$\text{Dwell}(k) = \text{release}(k) - \text{press}(k)$$

$$\text{Flight}(k_1, k_2) = \text{press}(k_2) - \text{release}(k_1)$$

### Baseline profile

During enrollment, the user types their password 5 times. The per-feature mean ($\mu$) and standard deviation ($\sigma$) are computed and stored as the **Biometric Baseline Profile**.

### Distance scoring

$$\text{Distance} = \frac{1}{N} \sum \frac{|\text{Attempt}_i - \mu_i|}{\sigma_i + \varepsilon} \quad [\varepsilon = 10\text{ ms}]$$

- **$\mu_i$** — baseline mean timing for feature $i$
- **$\sigma_i$** — standard deviation for feature $i$
- **$\varepsilon$** — smoothing floor, prevents divide-by-zero on ultra-consistent positions
- Features with lower standard deviation (stable muscle memory) receive higher evaluation weight

### Decision rule

- `Distance ≤ Threshold` → **Access Granted**
- `Distance > Threshold` → **Step-Up OTP Triggered**

### Adaptive baseline

$$\mu_{\text{new}} = 0.9 \cdot \mu_{\text{old}} + 0.1 \cdot \text{attempt}$$

The baseline nudges toward each successful login attempt, allowing the profile to track gradual, natural drift (fatigue, a new keyboard) without going stale.

---

## 🎬 Feature Walkthroughs & Demo Guide

### 1. 📄 One-Click Security Audit Certificate Exporter

**What it does:** Generates a printable, ISO/IEC 19792-aligned Biometric Security Audit Certificate summarizing a verification result.

**How to demo:** Click **📄 Export Security Audit Certificate** inside the Verification Result card. A printable report opens, complete with SHA-256 hash status, certificate ID, timestamp, and signature blocks. Click **🖨️ Print / Save PDF Certificate** to export a clean PDF for your mentor.

### 2. 🔄 Rolling Adaptive Baseline Engine

**What it does:** Every successful login automatically updates the baseline mean timings using exponential smoothing:

$$\mu_{\text{new}} = 0.9 \cdot \mu_{\text{old}} + 0.1 \cdot \text{attempt}$$

**How to demo:** Toggle **Rolling Adaptive Baseline Mode** in the Enrollment Studio. Each successful login adapts your profile, so your baseline evolves naturally as your typing speed changes over time.

### 3. 👥 Multi-User Profile Switcher

**What it does:** Lets you switch the active biometric profile directly from the top navigation bar, useful for demonstrating impostor detection without needing a second physical device.

**Included profiles:**
- 👤 `Profile: Owner Baseline` — your enrolled profile
- ⚡ `Profile: Demo User 2 (Bob – Fast Typist)` — pre-configured fast dwell/flight timings
- 🐢 `Profile: Demo User 3 (Charlie – Heavy Dwell)` — pre-configured heavy dwell timings

**How to demo:** Select **Profile: Demo User 2 (Bob)** from the top-right dropdown and try typing your own password — watch the engine instantly flag the timing mismatch against Bob's profile, even though the password itself is correct.

---

## 🧪 Validation Scenarios

| Scenario | Password | Biometric Result | Outcome |
|---|---|---|---|
| Legitimate owner | Correct ✓ | Z-Score within baseline limits | **Access Granted** |
| Human imposter (knows password) | Correct ✓ | Timing rhythm mismatch detected | **Step-Up 2FA** |
| Uniform bot (100ms static dwell) | Correct ✓ | Zero-variance anomaly detected | **Blocked** |
| Paste / inject attack | Correct ✓ | Near-zero flight time detected | **Blocked** |
| Wrong password | Incorrect ✗ | SHA-256 hash rejected at Stage 1 | **Rejected** |

The biometric layer only ever intervenes once the password itself is correct, so it adds friction exactly where a stolen or guessed password would otherwise succeed on its own.

---

## 🏭 Industry & Target Domain

Behavioral biometrics sits at the intersection of cybersecurity, human-computer interaction, and applied machine learning. Target verticals include:

`Online Banking` · `Enterprise IAM` · `FinTech / Payments` · `Government Auth` · `Healthcare Portals` · `E-Commerce`

---

## 🛠️ Technology Stack

**Frontend / Client Engine**
- HTML5 / CSS3, Vanilla JavaScript (ES2023)
- `performance.now()` API — sub-millisecond keystroke capture
- Web Crypto API (SHA-256) — client-side password hashing
- HTML5 Canvas — key-dwell timing charts

**Algorithms & Standards**
- Variance-Weighted Z-Score Distance
- ε-Smoothing (10 ms floor)
- Rolling Adaptive Baseline (EMA)
- ISO/IEC 19792 Biometrics
- Risk-Based Step-Up OTP (2FA)

---

## 🚀 Getting Started

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/KeyPulse-AI.git
   ```
2. Navigate into the project folder:
   ```bash
   cd KeyPulse-AI
   ```
3. Open `index.html` in your browser (no build step or server required).
4. **Enroll:** choose a password and type it 5 times to build your baseline profile.
5. **Log in:** type your password normally — access should be granted.
6. **Test the imposter case:** have someone else type your exact password — the step-up OTP challenge should trigger instead.

---

## ⚠️ Limitations & Future Scope

Typing rhythm is a **soft biometric signal**, not a password replacement — it can naturally shift with fatigue, injury, or a different keyboard, which is why a mismatch triggers a step-up challenge rather than an outright block. The threshold involves an inherent trade-off between false rejections and false acceptances.

**Planned future work:**
- Server-side baseline encryption (AES-256)
- Live SMS OTP gateway integration
- Machine learning classifier (SVM / kNN) as an alternative scoring engine
- Multi-device biometric calibration
- Continuous session monitoring mode
- Equal Error Rate (EER) benchmark study across a larger user base
- FIDO2 / WebAuthn API integration

---

## 📄 License

MIT

## 👤 Author

**Minahil Shahzadi** — Cybersecurity Internship Project, NCAI (UET Lahore)
