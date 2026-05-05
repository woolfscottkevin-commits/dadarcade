import { FootlockerPuzzle } from "../puzzles/Footlocker.js";
import { DiaryPuzzle } from "../puzzles/Diary.js";
import { RadioPuzzle } from "../puzzles/Radio.js";
import { MusicBoxPuzzle } from "../puzzles/MusicBox.js";
import { SafePuzzle } from "../puzzles/Safe.js";
import { HotspotRenderer } from "./HotspotRenderer.js";

const itemLabels = {
  BRASS_KEY: "Brass Key",
  DIARY: "Diary",
  MUSIC_BOX: "Music Box",
  BADGE: "Badge"
};

const granddadRadioMessage = "If you're hearing this, you found the radio. Good. The next piece is in the music box. The melody isn't a song - it's a message. Listen for the pattern, not the tune. Five notes. They spell something.";

export class SceneManager {
  constructor({ root, scenes, gameState, audio, onStateChange, onEnd }) {
    this.root = root;
    this.scenes = scenes;
    this.gameState = gameState;
    this.audio = audio;
    this.onStateChange = onStateChange;
    this.onEnd = onEnd;
    this.hotspots = new HotspotRenderer({ gameState });
    this.currentSceneId = null;
    this.debug = new URLSearchParams(window.location.search).has("debug");
  }

  show(sceneId) {
    const scene = this.scenes[sceneId];
    if (!scene) {
      throw new Error(`Unknown attic scene: ${sceneId}`);
    }

    this.currentSceneId = sceneId;
    this.gameState.set("currentScene", sceneId);
    this.gameState.markVisited(sceneId);
    this.render(scene);
    this.commit();
  }

  render(scene) {
    this.root.innerHTML = "";
    const shell = document.createElement("section");
    shell.className = `scene-shell${this.debug ? " debug" : ""}`;

    const topbar = document.createElement("div");
    topbar.className = "topbar";
    topbar.append(this.renderInventory());

    const frame = document.createElement("div");
    frame.className = "scene-frame";
    frame.setAttribute("aria-label", scene.label);

    if (scene.image) {
      const image = document.createElement("img");
      image.className = "scene-image";
      image.src = scene.image;
      image.alt = scene.label;
      image.addEventListener("error", () => {
        image.replaceWith(this.renderPlaceholder(scene));
      }, { once: true });
      frame.append(image);
    } else {
      frame.append(this.renderPlaceholder(scene));
    }

    const hotspotLayer = this.hotspots.render(scene.hotspots, {
      onActivate: (hotspot) => this.activateHotspot(hotspot)
    });
    frame.append(hotspotLayer);

    const caption = document.createElement("div");
    caption.className = "scene-caption";
    caption.textContent = scene.caption ?? "";

    shell.append(topbar, frame, caption, this.renderSceneActions(scene));
    this.root.append(shell);
  }

  renderPlaceholder(scene) {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder-scene";
    placeholder.textContent = scene.placeholder ?? scene.label;
    return placeholder;
  }

  renderInventory() {
    const inventory = document.createElement("div");
    inventory.className = "inventory";
    inventory.setAttribute("aria-label", "Inventory");

    const items = this.gameState.snapshot().inventory;
    for (const item of items) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "inventory-item";
      button.textContent = itemLabels[item] ?? item;
      button.addEventListener("click", () => this.useInventory(item));
      inventory.append(button);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "inventory-item photo-hint";
    button.textContent = "Photo";
    button.addEventListener("click", () => this.showMemoryPhoto());
    inventory.append(button);

    return inventory;
  }

  renderSceneActions(scene) {
    const actions = document.createElement("div");
    actions.className = "scene-actions";

    for (const hotspot of scene.hotspots ?? []) {
      if (!this.shouldShowSceneAction(hotspot)) continue;

      const button = document.createElement("button");
      button.type = "button";
      button.className = hotspot.action === "goToScene" ? "secondary-button" : "primary-button";
      button.textContent = hotspot.label;
      button.addEventListener("click", () => this.activateHotspot(hotspot));
      actions.append(button);
    }

    return actions;
  }

  shouldShowSceneAction(hotspot) {
    if (!this.hotspots.isEnabled(hotspot)) return false;
    if (hotspot.id === "take-rewards" && this.gameState.hasItem("BRASS_KEY") && this.gameState.hasItem("DIARY")) {
      return false;
    }
    return true;
  }

  activateHotspot(hotspot) {
    const actions = {
      goToScene: () => this.show(hotspot.target),
      message: () => this.setCaption(hotspot.text),
      footlocker: () => this.showFootlocker(),
      takeFootlockerRewards: () => this.takeFootlockerRewards(),
      weddingPhoto: () => this.showWeddingPhoto(),
      radio: () => this.showRadio(),
      takeMusicBox: () => this.takeMusicBox(),
      jacket: () => this.searchJacket(),
      painting: () => this.movePainting(),
      safe: () => this.showSafe(),
      letter: () => this.showLetter()
    };

    actions[hotspot.action]?.();
  }

  useInventory(item) {
    if (item === "DIARY") {
      if (this.gameState.get("diary")) {
        this.showDiaryEntries();
      } else {
        this.showDiaryLock();
      }
      return;
    }

    if (item === "MUSIC_BOX") {
      this.showMusicBox();
      return;
    }

    if (item === "BADGE") {
      this.showBadge();
      return;
    }

    if (item === "BRASS_KEY") {
      this.showBrassKey();
    }
  }

  showBrassKey() {
    this.showModal({
      title: "Brass Key",
      art: `
        <div class="item-illustration" aria-hidden="true">
          <div class="brass-key-art">
            <span class="key-bow"></span>
            <span class="key-shaft"></span>
            <span class="key-bit"></span>
          </div>
        </div>
      `,
      body: "<p>The key looks like it belongs to something small and mechanical.</p>",
      actions: [{ label: "Close", onClick: () => this.closeModal() }]
    });
  }

  showFootlocker() {
    if (this.gameState.get("footlocker")) {
      this.show("footlockerOpen");
      return;
    }

    this.showDialModal({
      title: "Footlocker Lock",
      image: "assets/closeups/footlocker-lock.webp",
      intro: "<span>Wedding photograph</span><strong>Hank & Margaret - 6.14.46</strong>",
      values: [0, 0, 0],
      min: 0,
      max: 99,
      pad: 2,
      labels: ["Month", "Day", "Year"],
      tryLabel: "Try Combination",
      onTry: (values, modal) => {
        if (!FootlockerPuzzle.check(values)) {
          this.audio.wrong();
          this.shake(modal);
          this.setModalStatus(modal, "The lock gives a dull thud and resets.");
          return false;
        }

        this.audio.chime();
        this.gameState.markSolved("footlocker");
        this.closeModal();
        this.show("footlockerOpen");
        return true;
      }
    });
  }

  takeFootlockerRewards() {
    this.gameState.addItem("BRASS_KEY");
    this.gameState.addItem("DIARY");
    this.audio.chime();
    this.commit();
    this.refreshScene();
    this.showModal({
      title: "Footlocker Open",
      image: "assets/scenes/footlocker-open.webp",
      body: `
        <p>You take the brass key and the locked diary.</p>
        <p>The diary has five letter dials on its clasp.</p>
      `,
      actions: [{ label: "Return", onClick: () => this.closeModal() }]
    });
  }

  showWeddingPhoto() {
    this.gameState.markExamined("wedding_photo_back");
    this.commit();
    this.showModal({
      title: "Wedding Photograph",
      image: "assets/closeups/wedding-photo-back.webp",
      body: `
        <p class="inscription artifact-card">Hank & Margaret - 6.14.46</p>
        <p>The date is written carefully, as if it mattered.</p>
      `,
      actions: [{ label: "Put Back", onClick: () => this.closeModal() }]
    });
  }

  showDiaryLock() {
    this.showLetterDialModal({
      title: "Diary Lock",
      image: "assets/closeups/diary-locked.webp",
      intro: `
        <div class="artifact-card">
          <span>Spine engraving</span>
          <strong>${DiaryPuzzle.cipherText}</strong>
        </div>
        <p class="inscription artifact-note">Sworn to silence. So I shifted three to the right. - H.W.</p>
      `,
      tryLabel: "Unlock Diary",
      autoCheck: (value) => DiaryPuzzle.check(value),
      onTry: (value, modal) => {
        if (!DiaryPuzzle.check(value)) {
          this.audio.wrong();
          this.shake(modal);
          this.setModalStatus(modal, "The diary clasp holds.");
          return false;
        }

        this.audio.page();
        this.gameState.markSolved("diary");
        this.closeModal();
        this.showDiaryEntries();
        return true;
      }
    });
  }

  showDiaryEntries() {
    this.gameState.markExamined("diary_entries");
    this.commit();
    this.showModal({
      title: "Diary",
      image: "assets/closeups/diary-open.webp",
      body: `
        <div class="diary-pages">
          <article><strong>2-3 / Apr 1943</strong><span class="redacted"></span></article>
          <article><strong>3-4 / May 1943</strong><span class="redacted"></span></article>
          <article><strong>3-3 / May 1943</strong><span class="redacted"></span></article>
          <article><strong>3-4 / Jun 1943</strong><span class="redacted"></span></article>
          <article><strong>4-2 / Jul 1943</strong><span class="redacted"></span></article>
          <article><strong>Sep 7 / 1944</strong><p>Listened to Margaret's birthday program after midnight. Even from this far away, 97.0 still feels like home.</p></article>
        </div>
      `,
      actions: [{ label: "Close Diary", onClick: () => this.closeModal() }]
    });
  }

  showRadio() {
    if (!this.gameState.hasItem("BRASS_KEY")) {
      this.showModal({
        title: "Radio",
        image: "assets/closeups/radio-locked.webp",
        body: "<p>The rear panel is locked. A small brass keyhole catches the light.</p>",
        actions: [{ label: "Back", onClick: () => this.closeModal() }]
      });
      return;
    }

    if (!this.gameState.get("radioUnlocked")) {
      this.gameState.set("radioUnlocked", true);
      this.audio.click();
      this.commit();
    }

    if (this.gameState.get("radio")) {
      this.showModal({
        title: "Radio",
        image: "assets/closeups/radio-tuning.webp",
        body: "<p>The message has already played. The floorboard is waiting.</p>",
        actions: [{ label: "Loose Floorboard", onClick: () => { this.closeModal(); this.show("floorboardReveal"); } }]
      });
      return;
    }

    this.showRadioTuner();
  }

  showRadioTuner() {
    let frequency = 88.0;
    let holdTimer = null;
    let holdProgress = null;
    let holdElement = null;
    const holdMs = 1500;
    const clearHold = () => {
      if (holdTimer) window.clearTimeout(holdTimer);
      if (holdProgress) window.clearInterval(holdProgress);
      holdTimer = null;
      holdProgress = null;
      if (holdElement) holdElement.style.width = "0%";
    };
    this.audio.radioStatic?.();

    this.showModal({
      title: "Radio Tuning",
      image: "assets/closeups/radio-tuning.webp",
      body: `
        <div class="radio-panel">
          <p>The brass key turns. Static breathes through the speaker.</p>
          <div class="frequency-readout"><span data-frequency>88.0</span> <small>FM</small></div>
          <input class="range-control" type="range" min="88" max="108" step="0.1" value="88" aria-label="Radio frequency">
          <div class="signal-meter" aria-hidden="true"><span data-signal></span></div>
          <div class="hold-meter" aria-hidden="true"><span data-hold></span></div>
          <p class="static-line" data-static>Static: heavy</p>
          <p class="modal-status" data-status></p>
        </div>
      `,
      actions: [{ label: "Close", onClick: () => { clearHold(); this.closeModal(); } }],
      onMount: (modal) => {
        const range = modal.querySelector("input");
        const readout = modal.querySelector("[data-frequency]");
        const staticLine = modal.querySelector("[data-static]");
        const signal = modal.querySelector("[data-signal]");
        const hold = modal.querySelector("[data-hold]");
        const status = modal.querySelector("[data-status]");
        holdElement = hold;

        const startHold = () => {
          if (holdTimer) return;
          const startedAt = Date.now();
          status.textContent = "The signal is clear. Hold it steady.";
          hold.style.width = "0%";
          holdProgress = window.setInterval(() => {
            const progress = Math.min((Date.now() - startedAt) / holdMs, 1);
            hold.style.width = `${Math.round(progress * 100)}%`;
          }, 40);
          holdTimer = window.setTimeout(() => {
            clearHold();
            this.playRadioMessage();
          }, holdMs);
        };

        const updateTuning = () => {
          frequency = Number(range.value);
          readout.textContent = frequency.toFixed(1);
          const distance = Math.abs(frequency - RadioPuzzle.solutionFrequency);
          signal.style.width = `${Math.max(6, 100 - Math.min(distance * 38, 94))}%`;
          staticLine.textContent = `Static: ${distance < 0.3 ? "almost gone" : distance < 2 ? "thin" : "heavy"}`;
          if (RadioPuzzle.isTuned(frequency)) {
            startHold();
          } else {
            clearHold();
            status.textContent = "";
          }
        };

        range.addEventListener("input", updateTuning);
        range.addEventListener("change", updateTuning);
      }
    });
  }

  playRadioMessage() {
    this.audio.chime();
    this.audio.radioVoice?.(granddadRadioMessage);
    this.gameState.markSolved("radio");
    this.gameState.set("radio_message_played", true);
    this.gameState.set("floorboard_revealed", true);
    this.commit();
    this.showModal({
      title: "Granddad's Message",
      image: "assets/closeups/radio-tuning.webp",
      body: `
        <p class="subtitle">${granddadRadioMessage}</p>
        <p>A floorboard rattles somewhere near the desk.</p>
      `,
      actions: [{ label: "Find the Floorboard", onClick: () => { this.closeModal(); this.show("floorboardReveal"); } }]
    });
  }

  takeMusicBox() {
    this.gameState.addItem("MUSIC_BOX");
    this.gameState.markSolved("musicbox");
    this.audio.chime();
    this.commit();
    this.refreshScene();
    this.showMusicBox();
  }

  showMusicBox() {
    this.audio.playMelody(MusicBoxPuzzle.notes);
    this.showModal({
      title: "Music Box",
      image: "assets/closeups/music-box-open.webp",
      body: `
        <div class="music-strip" aria-label="Music box notes">
          <span>Bb</span><span>A</span><span>D</span><span>G</span><span>E</span>
        </div>
        <p class="inscription artifact-note">Some words sound like music.</p>
        <button class="secondary-button" type="button" data-sheet>Examine Sheet Music</button>
      `,
      actions: [{ label: "Close", onClick: () => this.closeModal() }],
      onMount: (modal) => {
        modal.querySelector("[data-sheet]").addEventListener("click", () => {
          this.gameState.set("hint_badge_realized", true);
          this.commit();
          this.showModal({
            title: "Sheet Music",
            image: "assets/closeups/sheet-music.webp",
            body: "<p class=\"sheet\">Bb - A - D - G - E</p><p class=\"artifact-note\">The notes spell BADGE.</p>",
            actions: [{ label: "Close", onClick: () => this.closeModal() }]
          });
        });
      }
    });
  }

  searchJacket() {
    if (!this.gameState.get("hint_badge_realized")) {
      this.toast("The pocket is stitched tight. Granddad said the music box notes spell where to look next.");
      return;
    }

    this.gameState.addItem("BADGE");
    this.audio.chime();
    this.commit();
    this.refreshScene();
    this.showBadge();
  }

  showBadge() {
    this.gameState.markExamined("badge_back");
    this.commit();
    this.showModal({
      title: "Badge Back",
      image: "assets/closeups/badge-back.webp",
      body: `
        <table class="polybius" aria-label="Polybius square">
          <tr><th></th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
          <tr><th>1</th><td>A</td><td>B</td><td>C</td><td>D</td><td>E</td></tr>
          <tr><th>2</th><td>F</td><td>G</td><td>H</td><td>I</td><td>K</td></tr>
          <tr><th>3</th><td>L</td><td>M</td><td>N</td><td>O</td><td>P</td></tr>
          <tr><th>4</th><td>Q</td><td>R</td><td>S</td><td>T</td><td>U</td></tr>
          <tr><th>5</th><td>V</td><td>W</td><td>X</td><td>Y</td><td>Z</td></tr>
        </table>
        <p class="artifact-note">Diary coordinates: 2-3, 3-4, 3-3, 3-4, 4-2.</p>
      `,
      actions: [{ label: "Close", onClick: () => this.closeModal() }]
    });
  }

  movePainting() {
    if (!this.gameState.hasItem("BADGE")) {
      this.toast("The frame shifts, but the safe behind it needs the word from Granddad's badge first.");
      return;
    }

    this.gameState.set("paintingMoved", true);
    this.audio.click();
    this.commit();
    this.show("paintingMoved");
  }

  showSafe() {
    if (!this.gameState.hasItem("BADGE")) {
      this.toast("The safe is waiting for a five-letter word.");
      return;
    }

    if (this.gameState.get("safe")) {
      this.show("safeOpen");
      return;
    }

    this.showLetterDialModal({
      title: "Safe Lock",
      image: "assets/closeups/safe-lock.webp",
      intro: "<p class=\"artifact-note\">Five letter dials. The badge and the diary agree on one word.</p>",
      tryLabel: "Open Safe",
      autoCheck: (value) => SafePuzzle.check(value),
      onTry: (value, modal) => {
        if (!SafePuzzle.check(value)) {
          this.audio.wrong();
          this.shake(modal);
          this.setModalStatus(modal, "The safe stays shut.");
          return false;
        }

        this.audio.chime();
        this.gameState.markSolved("safe");
        this.closeModal();
        this.show("safeOpen");
        return true;
      }
    });
  }

  async showLetter() {
    this.audio.page();
    this.gameState.set("letterRead", true);
    this.gameState.finish();
    this.commit();

    let letter = "";
    try {
      letter = await fetch("assets/text/letter.txt").then((response) => response.text());
    } catch {
      letter = "To whoever finds this -\n\nI love you. Be kind to your mother. Read more books.\n\n- Granddad";
    }

    this.showModal({
      title: "Final Letter",
      image: "assets/closeups/final-letter.webp",
      body: `<pre class="letter-text">${letter}</pre><p class="modal-status">Take a moment. Continue unlocks in eight seconds.</p>`,
      actions: [{ label: "Continue", onClick: () => { this.closeModal(); this.onEnd?.(); }, disabled: true }],
      onMount: (modal) => {
        const button = modal.querySelector(".modal-actions button");
        setTimeout(() => {
          button.disabled = false;
          modal.querySelector(".modal-status").textContent = "You can continue now.";
        }, 8000);
      }
    });
  }

  showMemoryPhoto() {
    const hint = this.currentHint();
    this.gameState.addHint(hint.id);
    this.commit();
    this.showModal({
      title: "Memory Photo",
      image: "assets/closeups/wedding-photo-front.webp",
      body: `<p>${hint.text}</p>`,
      actions: [{ label: "Close", onClick: () => this.closeModal() }]
    });
  }

  currentHint() {
    if (this.gameState.get("safe")) return { id: "ending", text: "Thank you for finding this." };
    if (this.gameState.hasItem("BADGE")) return { id: "safe_unsolved_2", text: "HONOR. The word that mattered most. Use the badge to find it." };
    if (this.gameState.get("hint_badge_realized")) return { id: "badge_realized", text: "The jacket deserves another look." };
    if (this.gameState.get("radio")) return { id: "musicbox_unsolved_2", text: "B-A-D-G-E. Some words just sound like music." };
    if (this.gameState.get("diary")) return { id: "radio_unsolved_2", text: "Margaret's birthday - September seventh. Couldn't forget that one if I tried." };
    if (this.gameState.get("footlocker")) return { id: "diary_unsolved_2", text: "Shift three to the right and call it Tuesday." };
    return { id: "intro", text: "Take your time. Look at everything." };
  }

  showDialModal({ title, image, intro, values, min, max, pad, labels, tryLabel, onTry }) {
    this.showModal({
      title,
      image,
      body: `
        <div class="clue-card">${intro}</div>
        <div class="dial-row">
          ${values.map((value, index) => this.numberDialHtml(index, value, labels[index], pad)).join("")}
        </div>
        <p class="modal-status" data-status></p>
      `,
      actions: [{ label: tryLabel, onClick: () => {} }],
      onMount: (modal) => {
        const current = [...values];
        modal.querySelectorAll("[data-dial]").forEach((dial) => {
          const index = Number(dial.dataset.dial);
          const input = dial.querySelector("input");
          input.addEventListener("input", () => {
            const next = Math.min(max, Math.max(min, Number(input.value || min)));
            current[index] = next;
            dial.querySelector("[data-value]").textContent = String(next).padStart(pad, "0");
          });
          dial.querySelector("[data-up]").addEventListener("click", () => {
            current[index] = current[index] >= max ? min : current[index] + 1;
            dial.querySelector("[data-value]").textContent = String(current[index]).padStart(pad, "0");
            input.value = current[index];
          });
          dial.querySelector("[data-down]").addEventListener("click", () => {
            current[index] = current[index] <= min ? max : current[index] - 1;
            dial.querySelector("[data-value]").textContent = String(current[index]).padStart(pad, "0");
            input.value = current[index];
          });
        });
        modal.querySelector(".modal-actions button").addEventListener("click", () => onTry(current, modal));
      }
    });
  }

  numberDialHtml(index, value, label, pad) {
    return `
      <div class="dial" data-dial="${index}">
        <span class="dial-label">${label}</span>
        <button type="button" data-up>+</button>
        <strong data-value>${String(value).padStart(pad, "0")}</strong>
        <input type="number" min="0" max="99" value="${value}" aria-label="${label}">
        <button type="button" data-down>-</button>
      </div>
    `;
  }

  showLetterDialModal({ title, image, intro, tryLabel, onTry, autoCheck }) {
    const letters = Array.from("AAAAA");
    this.showModal({
      title,
      image,
      body: `
        <div class="clue-card">${intro}</div>
        <div class="letter-row">
          ${letters.map((letter, index) => this.letterDialHtml(index, letter)).join("")}
        </div>
        <p class="modal-status" data-status></p>
      `,
      actions: [{ label: tryLabel, onClick: () => {} }],
      onMount: (modal) => {
        const current = [...letters];
        let unlocked = false;
        const currentValue = () => current.join("");
        const tryAutoUnlock = () => {
          if (unlocked || !autoCheck?.(currentValue())) return;
          unlocked = true;
          this.setModalStatus(modal, "Unlocked.");
          onTry(currentValue(), modal);
        };
        modal.querySelectorAll("[data-letter-dial]").forEach((dial) => {
          const index = Number(dial.dataset.letterDial);
          const input = dial.querySelector("input");
          input.addEventListener("input", () => {
            const next = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1) || "A";
            input.value = next;
            current[index] = next;
            dial.querySelector("[data-value]").textContent = next;
            tryAutoUnlock();
          });
          dial.querySelector("[data-up]").addEventListener("click", () => {
            current[index] = this.shiftLetter(current[index], 1);
            dial.querySelector("[data-value]").textContent = current[index];
            input.value = current[index];
            tryAutoUnlock();
          });
          dial.querySelector("[data-down]").addEventListener("click", () => {
            current[index] = this.shiftLetter(current[index], -1);
            dial.querySelector("[data-value]").textContent = current[index];
            input.value = current[index];
            tryAutoUnlock();
          });
        });
        modal.querySelector(".modal-actions button").addEventListener("click", () => {
          if (unlocked) return;
          unlocked = Boolean(onTry(currentValue(), modal));
        });
      }
    });
  }

  letterDialHtml(index, letter) {
    return `
      <div class="dial" data-letter-dial="${index}">
        <span class="dial-label">Letter ${index + 1}</span>
        <button type="button" data-up>+</button>
        <strong data-value>${letter}</strong>
        <input type="text" maxlength="1" value="${letter}" aria-label="Letter ${index + 1}">
        <button type="button" data-down>-</button>
      </div>
    `;
  }

  shiftLetter(letter, delta) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const index = alphabet.indexOf(letter);
    return alphabet[(index + delta + alphabet.length) % alphabet.length];
  }

  showModal({ title, image, art, body, actions = [], onMount }) {
    this.closeModal();
    const overlay = document.createElement("div");
    const hasArt = Boolean(image || art);
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <section class="attic-modal${hasArt ? "" : " no-art"}" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="modal-art">${image ? `<img src="${image}" alt="">` : art ?? ""}</div>
        <div class="modal-copy">
          <h2>${title}</h2>
          <div class="modal-body">${body}</div>
          <div class="modal-actions"></div>
        </div>
      </section>
    `;

    const actionBar = overlay.querySelector(".modal-actions");
    for (const action of actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary-button";
      button.textContent = action.label;
      button.disabled = Boolean(action.disabled);
      button.addEventListener("click", action.onClick);
      actionBar.append(button);
    }

    document.body.append(overlay);
    onMount?.(overlay);
  }

  closeModal() {
    document.querySelector(".modal-overlay")?.remove();
  }

  toast(text, title = "Granddad's Attic") {
    this.showModal({
      title,
      body: `<p>${text}</p>`,
      actions: [{ label: "Close", onClick: () => this.closeModal() }]
    });
  }

  setCaption(text) {
    this.root.querySelector(".scene-caption").textContent = text;
  }

  setModalStatus(modal, text) {
    modal.querySelector("[data-status]").textContent = text;
  }

  shake(modal) {
    const dialog = modal.querySelector(".attic-modal");
    dialog.classList.remove("shake");
    requestAnimationFrame(() => dialog.classList.add("shake"));
  }

  commit() {
    this.onStateChange?.();
  }

  refreshScene() {
    if (this.currentSceneId && this.scenes[this.currentSceneId]) {
      this.render(this.scenes[this.currentSceneId]);
    }
  }
}
