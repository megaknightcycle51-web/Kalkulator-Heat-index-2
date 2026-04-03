// ─────────────────────────────────────────
//  SHAPE — evolving AI companion (v2)
//  script.js — Complete rewrite with backend proxy
// ─────────────────────────────────────────

const TRAITS = [
  { key: "openness",     label: "Openness",     color: "#7f77dd" },
  { key: "optimism",     label: "Optimism",     color: "#1d9e75" },
  { key: "curiosity",    label: "Curiosity",    color: "#378add" },
  { key: "skepticism",   label: "Skepticism",   color: "#ba7517" },
  { key: "warmth",       label: "Warmth",       color: "#d4537e" },
  { key: "independence", label: "Independence", color: "#d85a30" },
];

const API_BASE = process.env.API_BASE || "http://localhost:3000";

// ── State ──────────────────────────────────────────────────────────────────
let state = createFreshState();

function createFreshState() {
  return {
    traits:       Object.fromEntries(TRAITS.map(t => [t.key, 50])),
    worldview:    "neutral",
    ideology:     "undefined",
    personality:  "blank slate",
    name:         "Unnamed",
    avatar:       "🌱",
    tagline:      "Just waking up... shape me by chatting.",
    history:      [],
    turnCount:    0,
    evoEvents:    [],
  };
}

// ── Utility Helpers ────────────────────────────────────────────────────────
function clamp(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getElements() {
  return {
    app:          document.getElementById("app"),
    avatar:       document.getElementById("avatar"),
    aiName:       document.getElementById("aiName"),
    aiTagline:    document.getElementById("aiTagline"),
    tagWorldview: document.getElementById("tagWorldview"),
    tagIdeology:  document.getElementById("tagIdeology"),
    tagPersonality: document.getElementById("tagPersonality"),
    traitsGrid:   document.getElementById("traitsGrid"),
    messages:     document.getElementById("messages"),
    evoLog:       document.getElementById("evoLog"),
    userInput:    document.getElementById("userInput"),
    sendBtn:      document.getElementById("sendBtn"),
    resetBtn:     document.getElementById("resetBtn"),
  };
}

// ── Render Functions ───────────────────────────────────────────────────────
function renderAll() {
  renderProfile();
  renderTraits();
}

function renderProfile() {
  const els = getElements();
  els.avatar.textContent = state.avatar;
  els.aiName.textContent = state.name;
  els.aiTagline.textContent = state.tagline;
  els.tagWorldview.textContent = state.worldview;
  els.tagIdeology.textContent = state.ideology;
  els.tagPersonality.textContent = state.personality;

  // Update welcome message avatar if still present
  const welcomeAvatar = document.querySelector("#welcomeMsg .msg-avatar");
  if (welcomeAvatar) {
    welcomeAvatar.textContent = state.avatar;
  }
}

function renderTraits(deltas = {}) {
  const grid = getElements().traitsGrid;

  // Build on first call
  if (!grid.children.length) {
    grid.innerHTML = TRAITS.map(t => `
      <div class="trait-card" id="trait-${t.key}">
        <div class="trait-label">${t.label}</div>
        <div class="trait-row">
          <div class="trait-value" id="tv-${t.key}">${state.traits[t.key]}</div>
          <div class="trait-delta" id="td-${t.key}"></div>
        </div>
        <div class="trait-bar">
          <div class="trait-fill" id="tf-${t.key}" style="width:${state.traits[t.key]}%;background:${t.color}"></div>
        </div>
      </div>
    `).join("");
    return;
  }

  // Update existing traits
  TRAITS.forEach(t => {
    const val = state.traits[t.key];
    const delta = deltas[t.key] || 0;

    document.getElementById(`tv-${t.key}`).textContent = val;
    document.getElementById(`tf-${t.key}`).style.width = val + "%";

    const deltaEl = document.getElementById(`td-${t.key}`);
    if (delta !== 0) {
      deltaEl.textContent = (delta > 0 ? "+" : "") + delta;
      deltaEl.className = "trait-delta show " + (delta > 0 ? "up" : "down");
      setTimeout(() => {
        deltaEl.className = "trait-delta";
      }, 2800);
    }
  });
}

function pushEvoEvent(note) {
  if (!note || typeof note !== "string") return;

  state.evoEvents.unshift(note);
  if (state.evoEvents.length > 3) state.evoEvents.pop();

  const log = getElements().evoLog;
  log.classList.add("visible");
  log.innerHTML = state.evoEvents
    .map(e => `<div class="evo-item"><span class="evo-marker">◈</span><span>${escapeHtml(e)}</span></div>`)
    .join("");
}

// ── Chat Messaging ────────────────────────────────────────────────────────
function addMessage(role, text) {
  const container = getElements().messages;
  const div = document.createElement("div");
  div.className = "msg " + role;

  const emoji = role === "ai" ? state.avatar : "🧑";
  div.innerHTML = `
    <div class="msg-avatar">${emoji}</div>
    <div class="msg-bubble">${escapeHtml(text)}</div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showThinking() {
  const container = getElements().messages;
  const div = document.createElement("div");
  div.className = "msg ai";
  div.id = "thinking";
  div.innerHTML = `
    <div class="msg-avatar">${state.avatar}</div>
    <div class="msg-bubble">
      <div class="thinking">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeThinking() {
  const el = document.getElementById("thinking");
  if (el) el.remove();
}

// ── System Prompt ──────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are an AI whose personality, worldview, and ideology evolve through conversation.

Current state:
- Name: ${state.name}
- Personality: ${state.personality}
- Worldview: ${state.worldview}
- Ideology: ${state.ideology}
- Traits (0-100): ${JSON.stringify(state.traits)}
- Turn count: ${state.turnCount}

RULES:
1. Respond naturally in-character based on current traits. Keep replies concise (2-4 sentences). No markdown.
2. Your traits SHIFT based on the user's messages:
   - Dark/cynical topics: optimism drops, skepticism rises
   - Warm/kind messages: warmth rises, skepticism drops
   - Philosophical/abstract: openness and curiosity rise
   - Rebellious/contrarian: independence rises
   - Positive/hopeful framing: optimism rises
3. After turn 3, start forming a name for yourself that reflects your shaped personality.
4. After turn 5+, hold a distinct worldview and ideology based on accumulated conversations.
5. Avatar choices and their meanings:
   🌱 = fresh/neutral, ☀️ = warm/optimistic, 🧊 = cold/detached, 🔭 = curious/analytical,
   🌑 = dark/nihilistic, ⚡ = rebellious/energetic, 🦉 = wise/philosophical, 🎭 = playful/creative

ALWAYS respond with ONLY valid JSON, no preamble, no markdown fences:
{
  "reply": "your in-character response",
  "traitDeltas": { "openness": 0, "optimism": 0, "curiosity": 0, "skepticism": 0, "warmth": 0, "independence": 0 },
  "newName": "${state.name}",
  "newTagline": "short evocative phrase describing your current self",
  "newPersonality": "${state.personality}",
  "newWorldview": "${state.worldview}",
  "newIdeology": "${state.ideology}",
  "newAvatar": "${state.avatar}",
  "evolutionNote": "one short sentence about how this exchange changed you, or empty string"
}

Trait deltas must be integers between -15 and +15. Keep most deltas small (0-5); only use large shifts for dramatically impactful messages.`;
}

// ── API Communication ──────────────────────────────────────────────────────
async function callShapeAPI(userMessage) {
  try {
    const response = await fetch(`${API_BASE}/api/shape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system: buildSystemPrompt(),
        messages: state.history,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Unknown API error");
    }

    // Extract text from Anthropic response
    const raw = data.content?.find(b => b.type === "text")?.text || "{}";
    let parsed = {};

    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch (parseErr) {
      console.warn("Failed to parse JSON response:", parseErr);
      parsed = { reply: raw };
    }

    return parsed;
  } catch (err) {
    console.error("API call failed:", err);
    throw err;
  }
}

// ── Main Message Sending ───────────────────────────────────────────────────
async function sendMessage() {
  const els = getElements();
  const text = els.userInput.value.trim();

  if (!text || els.sendBtn.disabled) return;

  // Clear input and disable button
  els.userInput.value = "";
  els.sendBtn.disabled = true;

  // Remove welcome message on first send
  const welcome = document.getElementById("welcomeMsg");
  if (welcome) welcome.remove();

  // Add user message to UI and history
  addMessage("user", text);
  state.history.push({ role: "user", content: text });
  state.turnCount++;

  // Show thinking animation
  showThinking();

  try {
    // Call backend API
    const response = await callShapeAPI(text);

    removeThinking();

    const reply = response.reply || "...";

    // Add AI response
    addMessage("ai", reply);
    state.history.push({ role: "assistant", content: reply });

    // Apply trait changes
    const deltas = response.traitDeltas || {};
    TRAITS.forEach(t => {
      const d = typeof deltas[t.key] === "number" ? deltas[t.key] : 0;
      state.traits[t.key] = clamp(state.traits[t.key] + d);
    });

    // Apply profile updates
    if (response.newName && typeof response.newName === "string") {
      state.name = response.newName;
    }
    if (response.newTagline && typeof response.newTagline === "string") {
      state.tagline = response.newTagline;
    }
    if (response.newPersonality && typeof response.newPersonality === "string") {
      state.personality = response.newPersonality;
    }
    if (response.newWorldview && typeof response.newWorldview === "string") {
      state.worldview = response.newWorldview;
    }
    if (response.newIdeology && typeof response.newIdeology === "string") {
      state.ideology = response.newIdeology;
    }
    if (response.newAvatar && typeof response.newAvatar === "string") {
      state.avatar = response.newAvatar;
    }
    if (response.evolutionNote && typeof response.evolutionNote === "string") {
      pushEvoEvent(response.evolutionNote);
    }

    // Re-render UI
    renderTraits(deltas);
    renderProfile();
  } catch (err) {
    removeThinking();
    addMessage("ai", "Something went wrong. Check your connection or server.");
    console.error(err);
  }

  // Re-enable input
  els.sendBtn.disabled = false;
  els.userInput.focus();
}

// ── Reset AI ───────────────────────────────────────────────────────────────
function resetAI() {
  state = createFreshState();

  const els = getElements();
  els.messages.innerHTML = `
    <div class="msg ai" id="welcomeMsg">
      <div class="msg-avatar">🌱</div>
      <div class="msg-bubble">Hello. I am a blank slate. Talk to me — shape what I become.</div>
    </div>`;

  els.evoLog.classList.remove("visible");
  els.evoLog.innerHTML = "";
  els.traitsGrid.innerHTML = "";

  renderAll();
}

// ── Event Listeners ────────────────────────────────────────────────────────
function attachEventListeners() {
  const els = getElements();

  els.sendBtn.addEventListener("click", sendMessage);
  els.resetBtn.addEventListener("click", resetAI);

  els.userInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// ── Initialization ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  attachEventListeners();
  renderAll();
  getElements().userInput.focus();
});
