const { Phaser } = window;

if (!Phaser) {
  throw new Error('Phaser failed to load. Check the CDN script in index.html or install Phaser locally.');
}

const GAME_WIDTH = 390;
const GAME_HEIGHT = 680;
const PLAYER_SPEED = 175;
const PUSH_STRENGTH = 88;

class DungeonEscapeScene extends Phaser.Scene {
  constructor() {
    super('DungeonEscapeScene');
    this.joystickVector = new Phaser.Math.Vector2(0, 0);
    this.keyboardVector = new Phaser.Math.Vector2(0, 0);
    this.steps = 0;
    this.elapsedDistance = 0;
    this.won = false;
  }

  preload() {
    this.load.setPath('');
  }

  create() {
    this.cameras.main.setBackgroundColor('#08111f');
    this.physics.world.setBounds(0, 96, GAME_WIDTH, GAME_HEIGHT - 96);

    this.createBackground();
    this.createUi();
    this.createDungeonSpace();
    this.createDecorations();
    this.createPuzzleObjects();
    this.createControls();
    this.resetPuzzle();
  }

  createBackground() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07111f).setOrigin(0);
    this.add.rectangle(0, 0, GAME_WIDTH, 96, 0x101827).setOrigin(0);

    const floor = this.add.graphics();
    floor.fillStyle(0x111827, 1);
    floor.fillRoundedRect(14, 112, GAME_WIDTH - 28, GAME_HEIGHT - 132, 28);
    floor.lineStyle(3, 0x344155, 1);
    floor.strokeRoundedRect(14, 112, GAME_WIDTH - 28, GAME_HEIGHT - 132, 28);
    floor.lineStyle(1, 0xffffff, 0.04);
    floor.strokeRoundedRect(23, 121, GAME_WIDTH - 46, GAME_HEIGHT - 150, 22);

    for (let y = 144; y < GAME_HEIGHT - 36; y += 42) {
      floor.lineStyle(1, 0xffffff, 0.035);
      floor.lineBetween(32, y, GAME_WIDTH - 32, y);
    }

    for (let x = 48; x < GAME_WIDTH - 36; x += 54) {
      floor.lineStyle(1, 0x000000, 0.16);
      floor.lineBetween(x, 132, x - 18, GAME_HEIGHT - 42);
    }
  }

  createUi() {
    this.add.text(18, 22, 'Free Move Vector Dungeon', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      fontStyle: '800',
      color: '#d9f99d',
    });
    this.statusText = this.add.text(18, 52, '', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#cbd5e1',
    });
    this.stepText = this.add.text(GAME_WIDTH - 18, 26, '', {
      fontFamily: 'system-ui',
      fontSize: '15px',
      fontStyle: '800',
      color: '#fef08a',
    }).setOrigin(1, 0);
    this.resetButton = this.add.text(GAME_WIDTH - 18, 56, '재시작', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      fontStyle: '800',
      color: '#07111f',
      backgroundColor: '#bef264',
      padding: { x: 10, y: 5 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.resetButton.on('pointerdown', () => this.resetPuzzle());
  }

  createDungeonSpace() {
    this.wallGroup = this.physics.add.staticGroup();
    this.decorLayer = this.add.graphics();

    const walls = [
      { x: 195, y: 124, width: 332, height: 18, radius: 9 },
      { x: 195, y: 642, width: 332, height: 18, radius: 9 },
      { x: 30, y: 383, width: 18, height: 500, radius: 9 },
      { x: 360, y: 383, width: 18, height: 500, radius: 9 },
      { x: 111, y: 236, width: 126, height: 24, radius: 12 },
      { x: 292, y: 236, width: 90, height: 24, radius: 12 },
      { x: 83, y: 358, width: 96, height: 24, radius: 12 },
      { x: 266, y: 360, width: 128, height: 24, radius: 12 },
      { x: 134, y: 476, width: 24, height: 124, radius: 12 },
      { x: 256, y: 502, width: 24, height: 120, radius: 12 },
    ];

    for (const wall of walls) {
      this.drawWall(wall);
      const body = this.add.zone(wall.x, wall.y, wall.width, wall.height);
      this.wallGroup.add(body);
      body.body.setSize(wall.width, wall.height);
    }
  }

  createDecorations() {
    this.decorationLayer = this.add.graphics();
    const pillars = [
      { x: 70, y: 180 },
      { x: 320, y: 180 },
      { x: 74, y: 604 },
      { x: 316, y: 604 },
    ];

    for (const pillar of pillars) {
      this.drawPillar(pillar.x, pillar.y);
    }

    const torches = [
      { x: 44, y: 278 },
      { x: 346, y: 278 },
      { x: 44, y: 520 },
      { x: 346, y: 520 },
    ];

    for (const torch of torches) {
      this.drawTorch(torch.x, torch.y);
    }
  }

  createPuzzleObjects() {
    this.exitZone = this.add.zone(GAME_WIDTH / 2, 132, 76, 24);
    this.physics.add.existing(this.exitZone, true);
    this.exitGlow = this.add.graphics();
    this.exitFrame = this.add.graphics();

    this.switchZone = this.add.circle(260, 426, 24, 0x4b5563, 1);
    this.switchRing = this.add.circle(260, 426, 31).setStrokeStyle(3, 0xa78bfa, 0.38);
    this.switchRune = this.add.star(260, 426, 5, 6, 15, 0xc4b5fd, 0.38);
    this.physics.add.existing(this.switchZone, true);
    this.switchZone.body.setCircle(24);

    this.boulderShadow = this.add.ellipse(132, 576, 44, 16, 0x000000, 0.28);
    this.boulder = this.add.circle(132, 560, 20, 0x8b7355, 1);
    this.boulder.setStrokeStyle(3, 0x5f4a35, 1);
    this.boulderCrack = this.add.graphics();
    this.boulderShine = this.add.circle(124, 552, 5, 0xffffff, 0.2);
    this.physics.add.existing(this.boulder);
    this.boulder.body.setCircle(20);
    this.boulder.body.setCollideWorldBounds(true);
    this.boulder.body.setBounce(0.15);
    this.boulder.body.setDrag(420, 420);
    this.boulder.body.setMaxVelocity(130, 130);

    this.playerShadow = this.add.ellipse(195, 608, 42, 16, 0x000000, 0.28);
    this.player = this.add.container(195, 594);
    this.playerCloak = this.add.triangle(0, 10, -16, 18, 16, 18, 0, -16, 0x2563eb, 1);
    this.playerBody = this.add.circle(0, 0, 15, 0x60a5fa, 1);
    this.playerBody.setStrokeStyle(3, 0x1e3a8a, 1);
    this.playerHead = this.add.circle(0, -11, 8, 0xfacc15, 1);
    this.playerFace = this.add.circle(0, -10, 5, 0xffedd5, 1);
    this.playerSword = this.add.rectangle(13, -8, 4, 26, 0xe2e8f0, 0.95).setRotation(0.5);
    this.playerDirection = this.add.triangle(0, -27, 0, -10, -7, 4, 7, 4, 0xdbeafe, 0.82);
    this.player.add([this.playerCloak, this.playerBody, this.playerHead, this.playerFace, this.playerSword, this.playerDirection]);
    this.physics.add.existing(this.player);
    this.player.body.setCircle(16, -16, -16);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setDrag(900, 900);

    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.boulder, this.wallGroup);
    this.physics.add.collider(this.player, this.boulder, () => this.pushBoulder());
    this.physics.add.overlap(this.player, this.exitZone, () => this.tryCompleteLevel());
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    this.joystickBase = this.add.circle(72, GAME_HEIGHT - 78, 58, 0x0f172a, 0.6)
      .setStrokeStyle(2, 0xffffff, 0.2)
      .setScrollFactor(0);
    this.joystickKnob = this.add.circle(72, GAME_HEIGHT - 78, 24, 0x67e8f9, 1).setScrollFactor(0);
    this.add.text(72, GAME_HEIGHT - 14, 'JOYSTICK', {
      fontFamily: 'system-ui',
      fontSize: '10px',
      fontStyle: '800',
      color: '#94a3b8',
    }).setOrigin(0.5).setScrollFactor(0);

    this.input.on('pointerdown', (pointer) => this.updateJoystick(pointer));
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown) this.updateJoystick(pointer);
    });
    this.input.on('pointerup', () => this.resetJoystick());
    this.input.on('pointerupoutside', () => this.resetJoystick());
  }

  resetPuzzle() {
    this.steps = 0;
    this.elapsedDistance = 0;
    this.won = false;
    this.player.setPosition(195, 594);
    this.player.body.setVelocity(0, 0);
    this.boulder.setPosition(132, 560);
    this.boulder.body.setVelocity(0, 0);
    this.boulderShadow.setPosition(132, 576);
    this.boulderShine.setPosition(124, 552);
    this.redrawBoulderCracks();
    this.playerShadow.setPosition(195, 608);
    this.winPanel?.destroy();
    this.winPanel = null;
    this.refreshExitAndSwitch();
    this.refreshStatus();
  }

  update(_, deltaMs) {
    if (this.won) return;

    const delta = deltaMs / 1000;
    const direction = this.getMoveDirection();
    this.player.body.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);

    if (direction.lengthSq() > 0) {
      this.playerDirection.rotation = direction.angle() + Math.PI / 2;
      this.elapsedDistance += PLAYER_SPEED * delta;
      this.steps = Math.floor(this.elapsedDistance / 34);
    }

    this.boulderShadow.setPosition(this.boulder.x, this.boulder.y + 16);
    this.boulderShine.setPosition(this.boulder.x - 8, this.boulder.y - 8);
    this.redrawBoulderCracks();
    this.playerShadow.setPosition(this.player.x, this.player.y + 14);
    this.refreshExitAndSwitch();
    this.refreshStatus();
  }

  getMoveDirection() {
    const keyboardX = Number(this.cursors.right.isDown || this.wasd.D.isDown) - Number(this.cursors.left.isDown || this.wasd.A.isDown);
    const keyboardY = Number(this.cursors.down.isDown || this.wasd.S.isDown) - Number(this.cursors.up.isDown || this.wasd.W.isDown);
    this.keyboardVector.set(keyboardX, keyboardY);

    const activeVector = this.keyboardVector.lengthSq() > 0 ? this.keyboardVector : this.joystickVector;
    if (activeVector.lengthSq() === 0) return new Phaser.Math.Vector2(0, 0);
    return activeVector.clone().normalize();
  }

  pushBoulder() {
    const dx = this.boulder.x - this.player.x;
    const dy = this.boulder.y - this.player.y;
    const pushVector = new Phaser.Math.Vector2(dx, dy);
    if (pushVector.lengthSq() === 0) return;
    pushVector.normalize().scale(PUSH_STRENGTH);
    this.boulder.body.setVelocity(pushVector.x, pushVector.y);
  }

  isSwitchPressed() {
    return Phaser.Math.Distance.Between(this.boulder.x, this.boulder.y, this.switchZone.x, this.switchZone.y) < 28;
  }

  refreshExitAndSwitch() {
    const open = this.isSwitchPressed();
    this.switchZone.setFillStyle(open ? 0x84cc16 : 0x4b5563, 1);
    this.switchRing.setStrokeStyle(3, open ? 0xbef264 : 0xa78bfa, open ? 0.78 : 0.38);
    this.switchRune.setFillStyle(open ? 0xecfccb : 0xc4b5fd, open ? 0.78 : 0.38);

    this.exitGlow.clear();
    this.exitGlow.fillStyle(open ? 0x16a34a : 0x7f1d1d, 1);
    this.exitGlow.fillRoundedRect(GAME_WIDTH / 2 - 48, 119, 96, 28, 14);
    this.exitGlow.fillStyle(open ? 0xbbf7d0 : 0xfca5a5, open ? 0.2 : 0.1);
    this.exitGlow.fillRoundedRect(GAME_WIDTH / 2 - 35, 126, 70, 6, 4);

    this.exitFrame.clear();
    this.exitFrame.lineStyle(5, open ? 0x86efac : 0x991b1b, 0.9);
    this.exitFrame.strokeRoundedRect(GAME_WIDTH / 2 - 58, 112, 116, 42, 18);
    this.exitFrame.lineStyle(1, 0xffffff, 0.18);
    this.exitFrame.strokeRoundedRect(GAME_WIDTH / 2 - 48, 120, 96, 26, 12);
  }

  refreshStatus() {
    this.statusText.setText(this.isSwitchPressed() ? '출구가 열렸습니다. 위쪽으로 이동하세요!' : '자유롭게 이동하며 돌을 스위치로 밀어보세요.');
    this.stepText.setText(`${this.steps} 이동`);
  }

  tryCompleteLevel() {
    if (!this.isSwitchPressed() || this.won) return;
    this.won = true;
    this.player.body.setVelocity(0, 0);
    this.boulder.body.setVelocity(0, 0);
    this.winPanel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      this.add.rectangle(0, 0, 310, 168, 0x020617, 0.88).setStrokeStyle(2, 0xbef264, 0.78),
      this.add.text(0, -42, '탈출 성공!', {
        fontFamily: 'system-ui',
        fontSize: '30px',
        fontStyle: '900',
        color: '#bef264',
      }).setOrigin(0.5),
      this.add.text(0, 4, `${this.steps} 이동으로 출구에 도착했습니다.`, {
        fontFamily: 'system-ui',
        fontSize: '15px',
        color: '#dbeafe',
      }).setOrigin(0.5),
      this.add.text(0, 42, '재시작 버튼으로 다시 도전하세요.', {
        fontFamily: 'system-ui',
        fontSize: '13px',
        color: '#94a3b8',
      }).setOrigin(0.5),
    ]);
  }

  updateJoystick(pointer) {
    const maxDistance = 44;
    const dx = pointer.x - this.joystickBase.x;
    const dy = pointer.y - this.joystickBase.y;
    const distance = Math.min(Math.hypot(dx, dy), maxDistance);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * distance;
    const knobY = Math.sin(angle) * distance;

    this.joystickKnob.setPosition(this.joystickBase.x + knobX, this.joystickBase.y + knobY);
    this.joystickVector.set(knobX / maxDistance, knobY / maxDistance);
  }

  resetJoystick() {
    this.joystickKnob.setPosition(this.joystickBase.x, this.joystickBase.y);
    this.joystickVector.set(0, 0);
  }

  redrawBoulderCracks() {
    this.boulderCrack.clear();
    this.boulderCrack.lineStyle(2, 0x5f4a35, 0.85);
    this.boulderCrack.lineBetween(this.boulder.x - 3, this.boulder.y - 14, this.boulder.x + 2, this.boulder.y - 4);
    this.boulderCrack.lineBetween(this.boulder.x + 2, this.boulder.y - 4, this.boulder.x - 7, this.boulder.y + 7);
    this.boulderCrack.lineBetween(this.boulder.x + 6, this.boulder.y + 2, this.boulder.x + 13, this.boulder.y + 9);
  }

  drawWall({ x, y, width, height, radius }) {
    this.decorLayer.fillStyle(0x0b1220, 0.42);
    this.decorLayer.fillRoundedRect(x - width / 2 + 4, y - height / 2 + 5, width, height, radius);
    this.decorLayer.fillStyle(0x263247, 1);
    this.decorLayer.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius);
    this.decorLayer.lineStyle(2, 0x64748b, 0.32);
    this.decorLayer.strokeRoundedRect(x - width / 2 + 2, y - height / 2 + 2, width - 4, height - 4, radius - 2);
    this.decorLayer.fillStyle(0xffffff, 0.09);
    this.decorLayer.fillRoundedRect(x - width / 2 + 8, y - height / 2 + 5, width - 16, 4, 3);
  }

  drawPillar(x, y) {
    this.decorationLayer.fillStyle(0x000000, 0.24);
    this.decorationLayer.fillEllipse(x, y + 18, 46, 16);
    this.decorationLayer.fillStyle(0x334155, 1);
    this.decorationLayer.fillRoundedRect(x - 16, y - 22, 32, 44, 10);
    this.decorationLayer.fillStyle(0x475569, 1);
    this.decorationLayer.fillRoundedRect(x - 20, y - 28, 40, 10, 5);
    this.decorationLayer.fillRoundedRect(x - 20, y + 18, 40, 10, 5);
    this.decorationLayer.lineStyle(1, 0xffffff, 0.12);
    this.decorationLayer.lineBetween(x - 7, y - 15, x - 7, y + 15);
    this.decorationLayer.lineBetween(x + 7, y - 15, x + 7, y + 15);
  }

  drawTorch(x, y) {
    this.decorationLayer.fillStyle(0xf97316, 0.16);
    this.decorationLayer.fillCircle(x, y, 34);
    this.decorationLayer.fillStyle(0x92400e, 1);
    this.decorationLayer.fillRoundedRect(x - 4, y + 4, 8, 20, 4);
    this.decorationLayer.fillStyle(0xfb923c, 1);
    this.decorationLayer.fillTriangle(x, y - 18, x - 9, y + 7, x + 9, y + 7);
    this.decorationLayer.fillStyle(0xfef3c7, 0.86);
    this.decorationLayer.fillTriangle(x, y - 10, x - 4, y + 4, x + 4, y + 4);
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#08111f',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
  },
  scene: DungeonEscapeScene,
};

new Phaser.Game(config);
