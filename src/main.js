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
    this.createPuzzleObjects();
    this.createControls();
    this.resetPuzzle();
  }

  createBackground() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x08111f).setOrigin(0);
    this.add.rectangle(0, 0, GAME_WIDTH, 96, 0x0f172a).setOrigin(0);

    const floor = this.add.graphics();
    floor.fillStyle(0x101827, 1);
    floor.fillRoundedRect(14, 112, GAME_WIDTH - 28, GAME_HEIGHT - 132, 28);
    floor.lineStyle(2, 0x1f2a44, 1);
    floor.strokeRoundedRect(14, 112, GAME_WIDTH - 28, GAME_HEIGHT - 132, 28);

    for (let y = 144; y < GAME_HEIGHT - 36; y += 42) {
      floor.lineStyle(1, 0xffffff, 0.025);
      floor.lineBetween(32, y, GAME_WIDTH - 32, y);
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
      { x: 111, y: 236, width: 126, height: 20, radius: 10 },
      { x: 292, y: 236, width: 90, height: 20, radius: 10 },
      { x: 83, y: 358, width: 96, height: 20, radius: 10 },
      { x: 266, y: 360, width: 128, height: 20, radius: 10 },
      { x: 134, y: 476, width: 20, height: 124, radius: 10 },
      { x: 256, y: 502, width: 20, height: 120, radius: 10 },
    ];

    for (const wall of walls) {
      this.drawWall(wall);
      const body = this.add.zone(wall.x, wall.y, wall.width, wall.height);
      this.wallGroup.add(body);
      body.body.setSize(wall.width, wall.height);
    }
  }

  createPuzzleObjects() {
    this.exitZone = this.add.zone(GAME_WIDTH / 2, 132, 76, 24);
    this.physics.add.existing(this.exitZone, true);
    this.exitGlow = this.add.graphics();

    this.switchZone = this.add.circle(260, 426, 24, 0x64748b, 1);
    this.switchRing = this.add.circle(260, 426, 31).setStrokeStyle(3, 0x94a3b8, 0.38);
    this.physics.add.existing(this.switchZone, true);
    this.switchZone.body.setCircle(24);

    this.boulder = this.add.circle(132, 560, 20, 0x8b7355, 1);
    this.boulderShine = this.add.circle(124, 552, 5, 0xffffff, 0.18);
    this.physics.add.existing(this.boulder);
    this.boulder.body.setCircle(20);
    this.boulder.body.setCollideWorldBounds(true);
    this.boulder.body.setBounce(0.15);
    this.boulder.body.setDrag(420, 420);
    this.boulder.body.setMaxVelocity(130, 130);

    this.player = this.add.container(195, 594);
    this.playerBody = this.add.circle(0, 0, 16, 0x60a5fa, 1);
    this.playerHead = this.add.circle(0, -8, 7, 0xbfdbfe, 1);
    this.playerDirection = this.add.triangle(0, -22, 0, -8, -7, 6, 7, 6, 0xdbeafe, 0.85);
    this.player.add([this.playerBody, this.playerHead, this.playerDirection]);
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
    this.boulderShine.setPosition(124, 552);
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

    this.boulderShine.setPosition(this.boulder.x - 8, this.boulder.y - 8);
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
    this.switchZone.setFillStyle(open ? 0xbef264 : 0x64748b, 1);
    this.switchRing.setStrokeStyle(3, open ? 0xbef264 : 0x94a3b8, open ? 0.76 : 0.38);

    this.exitGlow.clear();
    this.exitGlow.fillStyle(open ? 0x22c55e : 0x7f1d1d, 1);
    this.exitGlow.fillRoundedRect(GAME_WIDTH / 2 - 46, 120, 92, 24, 12);
    this.exitGlow.fillStyle(0xffffff, open ? 0.18 : 0.08);
    this.exitGlow.fillRoundedRect(GAME_WIDTH / 2 - 32, 126, 64, 5, 4);
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

  drawWall({ x, y, width, height, radius }) {
    this.decorLayer.fillStyle(0x263247, 1);
    this.decorLayer.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius);
    this.decorLayer.fillStyle(0xffffff, 0.08);
    this.decorLayer.fillRoundedRect(x - width / 2 + 6, y - height / 2 + 4, width - 12, 4, 3);
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
