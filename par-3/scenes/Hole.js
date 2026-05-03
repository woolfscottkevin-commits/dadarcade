import { BIOMES, DIFFICULTIES } from "../data/biomes.js";
import { BallPhysics } from "../systems/BallPhysics.js";
import { CameraDirector } from "../systems/Camera.js";
import { Cup } from "../systems/Cup.js";
import { DragController } from "../systems/DragController.js";
import { HoleGenerator } from "../systems/HoleGenerator.js";
import { Wind } from "../systems/Wind.js";
import { AudioSystem } from "../systems/Audio.js";
import { AimLine } from "../ui/AimLine.js";
import { HUD } from "../ui/HUD.js";
import { PowerMeter } from "../ui/PowerMeter.js";

export class Hole extends Phaser.Scene {
  constructor() {
    super("Hole");
  }

  init(data) {
    this.holeIndex = data.holeIndex || 0;
    this.holes = data.holes;
    this.hole = this.holes[this.holeIndex];
    this.difficultyId = data.difficulty || "normal";
    this.difficulty = DIFFICULTIES[this.difficultyId];
    this.scores = data.scores || [];
    this.strokes = 0;
    this.state = "ready";
    this.lipCooldown = 0;
    this.scorecardQueued = false;
    this.scorecardFallback = null;
    this.penaltyQueued = false;
  }

  create() {
    this.biome = BIOMES[this.hole.biome];
    this.wind = new Wind(this.hole, this.difficulty);
    this.audio = new AudioSystem();
    this.generator = new HoleGenerator(this, this.hole, this.biome, this.difficulty);
    this.generator.build();

    this.ball = new BallPhysics(this, this.hole.tee.x, this.hole.tee.y, this.biome);
    this.cup = new Cup(this, this.hole, this.difficulty);
    this.cameraDirector = new CameraDirector(this);
    this.cameraDirector.setWorld(this.hole.world.width, this.hole.world.height);
    this.cameraDirector.address(this.ball, this.hole.pin);

    this.aimLine = new AimLine(this);
    this.powerMeter = new PowerMeter(this, this.ball);
    this.uiCamera = this.cameras.add(0, 0, 720, 1280).setName("ui");
    this.uiCamera.ignore([...this.children.list]);
    this.hud = new HUD(this);
    this.uiObjects = [...this.hud.objects(), ...this.createControls()];
    this.cameras.main.ignore(this.uiObjects);

    this.drag = new DragController(this, this.ball, {
      isLocked: () => this.state === "holed",
      shouldIgnorePointer: (pointer) => this.isPointerOverHud(pointer),
      onStart: (shot) => {
        this.audio.unlock();
        this.state = "aiming";
        this.aimLine.draw(this.prepareShot(shot), this.wind, this.difficulty, (x, y) => this.generator.surfaceAt(x, y));
        this.powerMeter.draw(shot);
      },
      onChange: (shot) => {
        this.aimLine.draw(this.prepareShot(shot), this.wind, this.difficulty, (x, y) => this.generator.surfaceAt(x, y));
        this.powerMeter.draw(shot);
      },
      onCancel: () => {
        this.state = "ready";
        this.aimLine.clear();
        this.powerMeter.clear();
      },
      onRelease: (shot) => this.takeShot(this.prepareShot(shot)),
    });

    this.input.keyboard?.on("keydown-R", () => this.restartHole());
    this.input.keyboard?.on("keydown-SPACE", () => this.scopePin());
    this.input.keyboard?.on("keydown-M", () => this.toggleMute());
    this.input.on("pointerdown", () => this.audio.unlock());
    this.updateHud();
  }

  prepareShot(shot) {
    const surface = this.generator.surfaceAt(this.ball.x, this.ball.y);
    return {
      ...shot,
      mode: surface.type === "green" && shot.power <= 0.36 ? "putt" : "flight",
      surface: surface.type,
    };
  }

  createControls() {
    return [
      ...this.addHudButton(86, 1242, "Mute", () => this.toggleMute()),
      ...this.addHudButton(360, 1242, "Scope", () => this.scopePin()),
      ...this.addHudButton(630, 1242, "Retry", () => this.restartHole()),
    ];
  }

  addHudButton(x, y, label, onClick) {
    const bg = this.add.rectangle(x, y, 124, 48, 0xffffff, 0.16)
      .setScrollFactor(0)
      .setDepth(1002)
      .setStrokeStyle(2, 0xffffff, 0.3);
    const text = this.add.text(x, y, label, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "18px",
      fontStyle: "800",
      color: "#ffffff",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1003);
    const zone = this.add.zone(x, y, 124, 48).setScrollFactor(0).setDepth(1004).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", (pointer, localX, localY, event) => {
      event?.stopPropagation();
      onClick();
    });
    zone.on("pointerover", () => bg.setFillStyle(0xffffff, 0.26));
    zone.on("pointerout", () => bg.setFillStyle(0xffffff, 0.16));
    return [bg, text, zone];
  }

  isPointerOverHud(pointer) {
    return pointer.y > 1168;
  }

  takeShot(shot) {
    this.strokes += 1;
    this.aimLine.clear();
    this.powerMeter.clear();
    this.ball.launch(shot.direction, shot.power, { mode: shot.mode });
    this.audio.hit(shot.power);
    this.state = shot.mode === "putt" ? "rolling" : "flight";
    this.cameraDirector.follow(this.ball);
    window.gtag?.("event", "par3_shot", {
      hole: this.hole.id,
      difficulty: this.difficultyId,
      mode: shot.mode,
      power: Math.round(shot.power * 100),
      stroke: this.strokes,
    });
  }

  update(_, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.033);
    if (this.lipCooldown > 0) this.lipCooldown -= dt;

    if (this.state === "flight" || this.state === "rolling") {
      const surfaceAt = (x, y) => this.generator.surfaceAt(x, y);
      this.ball.update(dt, this.wind, surfaceAt);
      this.state = this.ball.flight ? "flight" : "rolling";
      const surface = surfaceAt(this.ball.x, this.ball.y);
      if (this.state === "rolling" && surface.penalty) {
        this.applyPenalty(surface);
      } else {
        this.checkCup();
      }
      if (this.state === "rolling" && !this.ball.isMoving) {
        this.ball.stop();
        this.state = "ready";
        this.cameraDirector.stopFollow();
        this.cameraDirector.address(this.ball, this.hole.pin);
      }
    }
    this.updateHud();
  }

  checkCup() {
    const result = this.cup.check(this.ball);
    if (result === "holed") this.holeOut();
    if (result === "lip" && this.lipCooldown <= 0) {
      this.audio.lip();
      this.lipCooldown = 0.45;
      this.matter.body.setVelocity(this.ball.body, {
        x: this.ball.velocity.x * 0.7 + Phaser.Math.FloatBetween(-1.2, 1.2),
        y: this.ball.velocity.y * 0.7 + Phaser.Math.FloatBetween(-1.2, 1.2),
      });
    }
  }

  applyPenalty(surface) {
    if (this.penaltyQueued || this.state === "holed") return;
    this.penaltyQueued = true;
    this.strokes += 1;
    this.ball.stop();
    const drop = this.difficulty.dropAtTee ? this.hole.tee : this.ball.lastSafe;
    this.ball.reset(drop.x, drop.y);
    this.state = "ready";
    this.cameraDirector.stopFollow();
    this.cameraDirector.address(this.ball, this.hole.pin);
    this.showPenalty(surface.type);
    window.gtag?.("event", "par3_penalty", {
      hole: this.hole.id,
      difficulty: this.difficultyId,
      surface: surface.type,
      stroke: this.strokes,
    });
    this.time.delayedCall(300, () => {
      this.penaltyQueued = false;
    });
  }

  showPenalty(surfaceType) {
    const text = this.add.text(360, 610, surfaceType === "water" ? "Water penalty" : "Penalty", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "34px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#07110a",
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1006);
    this.cameras.main.ignore(text);
    this.tweens.add({
      targets: text,
      y: 570,
      alpha: 0,
      delay: 450,
      duration: 480,
      ease: "Cubic.easeIn",
      onComplete: () => text.destroy(),
    });
  }

  holeOut() {
    if (this.state === "holed") return;
    this.state = "holed";
    this.drag.destroy();
    this.matter.body.setVelocity(this.ball.body, { x: 0, y: 0 });
    this.ball.reset(this.hole.pin.x, this.hole.pin.y);
    this.cameraDirector.cup(this.hole.pin);
    this.audio.cup();
    if (this.strokes === 1) this.audio.fanfare();
    this.celebrate();
    this.queueScorecard();
  }

  queueScorecard() {
    const scores = [...this.scores];
    scores[this.holeIndex] = this.strokes;
    const transition = () => {
      if (this.scorecardQueued || !this.sys.settings.active) return;
      this.scorecardQueued = true;
      this.scene.start("Scorecard", {
        difficulty: this.difficultyId,
        hole: this.hole,
        holeIndex: this.holeIndex,
        holes: this.holes,
        scores,
        strokes: this.strokes,
      });
    };
    this.time.delayedCall(1450, transition);
    this.scorecardFallback = window.setTimeout(transition, 1850);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.scorecardFallback) window.clearTimeout(this.scorecardFallback);
    });
  }

  celebrate() {
    const colors = [0xffffff, 0xffd34d, 0x8ae6a2, 0xff5c5c];
    for (let i = 0; i < 34; i += 1) {
      const dot = this.add.circle(this.hole.pin.x, this.hole.pin.y, Phaser.Math.Between(3, 7), Phaser.Utils.Array.GetRandom(colors), 0.95).setDepth(90);
      this.uiCamera.ignore(dot);
      const angle = (Math.PI * 2 * i) / 34;
      const dist = Phaser.Math.Between(65, 150);
      this.tweens.add({
        targets: dot,
        x: this.hole.pin.x + Math.cos(angle) * dist,
        y: this.hole.pin.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 850,
        ease: "Cubic.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
  }

  restartHole() {
    this.scene.restart({
      difficulty: this.difficultyId,
      holeIndex: this.holeIndex,
      holes: this.holes,
      scores: this.scores,
    });
  }

  scopePin() {
    if (this.state === "holed") return;
    this.cameraDirector.stopFollow();
    this.cameras.main.pan(this.hole.pin.x, this.hole.pin.y, 420, "Sine.easeOut", true);
    this.time.delayedCall(1150, () => {
      if (this.state !== "holed") this.cameraDirector.address(this.ball, this.hole.pin);
    });
  }

  toggleMute() {
    this.audio.unlock();
    this.audio.toggleMute();
  }

  updateHud() {
    const surface = this.generator.surfaceAt(this.ball.x, this.ball.y).type;
    this.hud.update({
      hole: this.hole,
      strokes: this.strokes,
      wind: this.wind,
      surface,
      state: this.state,
    });
  }
}
