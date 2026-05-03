const STOP_SPEED = 5;
const STOP_TIME = 0.2;
const GRAVITY_Z = 980;
const MAX_POWER_SPEED = 580;

export class BallPhysics {
  constructor(scene, x, y, biome) {
    this.scene = scene;
    this.biome = biome;
    this.z = 0;
    this.vz = 0;
    this.flightVelocity = new Phaser.Math.Vector2();
    this.flight = false;
    this.rolling = false;
    this.stoppedFor = 0;
    this.lastSafe = { x, y };
    this.surface = "fairway";

    this.shadow = scene.add.ellipse(x, y + 8, 30, 10, 0x000000, 0.34).setDepth(18);
    this.sprite = scene.add.container(x, y).setDepth(26);
    const ball = scene.add.circle(0, 0, 8, 0xffffff, 1);
    const highlight = scene.add.circle(-3, -4, 3, 0xdce8ff, 0.7);
    this.sprite.add([ball, highlight]);
    this.groundPoint = scene.add.zone(x, y, 1, 1);

    this.body = scene.matter.add.circle(x, y, 8, {
      restitution: biome.bounce,
      frictionAir: 0,
      friction: 0,
      label: "ball",
    });
    this.body.ignoreGravity = true;
    scene.matter.body.setMass(this.body, 1);
  }

  get x() {
    return this.body.position.x;
  }

  get y() {
    return this.body.position.y;
  }

  get velocity() {
    return this.body.velocity;
  }

  get speed() {
    if (this.flight) return this.flightVelocity.length();
    return Math.hypot(this.velocity.x, this.velocity.y) * 60;
  }

  get isMoving() {
    return this.flight || this.speed > STOP_SPEED;
  }

  reset(x, y) {
    this.z = 0;
    this.vz = 0;
    this.flight = false;
    this.rolling = false;
    this.stoppedFor = 0;
    this.lastSafe = { x, y };
    this.scene.matter.body.setPosition(this.body, { x, y });
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
    this.syncVisuals();
  }

  launch(vector, power) {
    const speed = MAX_POWER_SPEED * power;
    this.flightVelocity.set(vector.x * speed, vector.y * speed);
    this.vz = 420 + 520 * power;
    this.z = 1;
    this.flight = true;
    this.rolling = false;
    this.stoppedFor = 0;
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
  }

  update(dt, wind, surfaceAt) {
    if (this.flight) {
      wind.apply(this.flightVelocity, dt);
      this.vz -= GRAVITY_Z * dt;
      this.z = Math.max(0, this.z + this.vz * dt);
      this.scene.matter.body.setPosition(this.body, {
        x: this.x + this.flightVelocity.x * dt,
        y: this.y + this.flightVelocity.y * dt,
      });
      if (this.z <= 0 && this.vz < 0) {
        this.land(surfaceAt);
      }
    } else {
      const surface = surfaceAt(this.x, this.y);
      this.surface = surface.type;
      const friction = surface.friction;
      this.scene.matter.body.setVelocity(this.body, {
        x: this.velocity.x * friction,
        y: this.velocity.y * friction,
      });
      if (surface.type === "green") {
        Phaser.Physics.Matter.Matter.Body.applyForce(this.body, this.body.position, {
          x: surface.slope.x * 0.000045,
          y: surface.slope.y * 0.000045,
        });
      }
      this.trackStopped(dt);
      if (surface.safe) this.lastSafe = { x: this.x, y: this.y };
    }
    this.syncVisuals();
  }

  land(surfaceAt) {
    this.flight = false;
    this.rolling = true;
    const surface = surfaceAt(this.x, this.y);
    const rollout = surface.rollout ?? this.biome.rollout;
    this.scene.matter.body.setVelocity(this.body, {
      x: (this.flightVelocity.x * rollout) / 60,
      y: (this.flightVelocity.y * rollout) / 60,
    });
    this.flightVelocity.set(0, 0);
    this.vz = 0;
    this.z = 0;
  }

  trackStopped(dt) {
    if (this.speed < STOP_SPEED) {
      this.stoppedFor += dt;
      if (this.stoppedFor >= STOP_TIME) {
        this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
        this.rolling = false;
      }
    } else {
      this.stoppedFor = 0;
      this.rolling = true;
    }
  }

  syncVisuals() {
    const liftScale = 1 + Math.min(this.z / 240, 0.4);
    this.sprite.setPosition(this.x, this.y - this.z);
    this.sprite.setScale(liftScale);
    this.shadow.setPosition(this.x, this.y + 8);
    this.shadow.setScale(1 + Math.min(this.z / 300, 0.2), 1);
    this.shadow.setAlpha(Phaser.Math.Clamp(0.34 - this.z / 600, 0.14, 0.34));
    this.groundPoint.setPosition(this.x, this.y);
  }
}
