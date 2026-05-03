const MAX_DRAG = 250;
const CANCEL_DRAG = 30;
const TOP_UI_SAFE = 86;
const BOTTOM_UI_SAFE = 1168;

export class DragController {
  constructor(scene, ball, callbacks) {
    this.scene = scene;
    this.ball = ball;
    this.callbacks = callbacks;
    this.active = false;
    this.start = new Phaser.Math.Vector2();
    this.current = new Phaser.Math.Vector2();

    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.on("pointerupoutside", this.cancel, this);
  }

  destroy() {
    this.scene.input.off("pointerdown", this.onDown, this);
    this.scene.input.off("pointermove", this.onMove, this);
    this.scene.input.off("pointerup", this.onUp, this);
    this.scene.input.off("pointerupoutside", this.cancel, this);
  }

  onDown(pointer) {
    if (this.ball.isMoving || this.callbacks.isLocked()) return;
    if (pointer.y < TOP_UI_SAFE || pointer.y > BOTTOM_UI_SAFE) return;
    if (this.callbacks.shouldIgnorePointer?.(pointer)) return;
    this.active = true;
    this.start.set(pointer.worldX, pointer.worldY);
    this.current.copy(this.start);
    this.callbacks.onStart(this.state());
  }

  onMove(pointer) {
    if (!this.active) return;
    if (pointer.y < 0 || pointer.y > 1280) {
      this.cancel();
      return;
    }
    this.current.set(pointer.worldX, pointer.worldY);
    this.callbacks.onChange(this.state());
  }

  onUp() {
    if (!this.active) return;
    const state = this.state();
    this.active = false;
    if (state.drag < CANCEL_DRAG) {
      this.callbacks.onCancel();
      return;
    }
    this.callbacks.onRelease(state);
  }

  cancel() {
    if (!this.active) return;
    this.active = false;
    this.callbacks.onCancel();
  }

  state() {
    const pull = this.current.clone().subtract(this.start);
    const drag = Math.min(MAX_DRAG, pull.length());
    const power = Phaser.Math.Clamp(drag / MAX_DRAG, 0, 1);
    const direction = pull.lengthSq() > 0
      ? pull.clone().normalize().negate()
      : new Phaser.Math.Vector2(0, -1);
    return {
      drag,
      power,
      direction,
      anchor: this.start.clone(),
      pointer: this.current.clone(),
      launch: new Phaser.Math.Vector2(this.ball.x, this.ball.y),
    };
  }
}
