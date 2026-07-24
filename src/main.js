import Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.esm.js';

const GAME_WIDTH = 390;
const GAME_HEIGHT = 680;
const TILE_SIZE = 30;
const MAP_OFFSET_Y = 104;
const MOVE_COOLDOWN = 145;

const DUNGEON_MAP = [
  '#############',
  '#.....E.....#',
  '#.###...###.#',
  '#...#...#...#',
  '#...#...#...#',
  '#...........#',
  '#..##...##..#',
  '#...........#',
  '#.....S.....#',
  '#...........#',
  '#..###.###..#',
  '#...........#',
  '#....B......#',
  '#...........#',
  '#.....P.....#',
  '#############',
];

class DungeonEscapeScene extends Phaser.Scene {
  constructor() {
    super('DungeonEscapeScene');
    this.player = { col: 6, row: 14 };
    this.boulder = { col: 5, row: 12 };
    this.switch = { col: 6, row: 8 };
    this.exit = { col: 6, row: 1 };
    this.steps = 0;
    this.won = false;
    this.nextMoveAt = 0;
    this.joystickVector = new Phaser.Math.Vector2(0, 0);
  }

  create() {
    this.cameras.main.setBackgroundColor('#07111f');
    this.createUi();
    this.createDungeonLayer();
    this.createPuzzleObjects();
    this.createControls();
    this.resetPuzzle();
  }

  createUi() {
    this.add.rectangle(0, 0, GAME_WIDTH, MAP_OFFSET_Y, 0x0f172a).setOrigin(0);
    this.add.text(18, 22, 'High Top View Dungeon', {
      fontFamily: 'system-ui',
      fontSize: '19px',
      fontStyle: '700',
      color: '#d9f99d',
    });
    this.statusText = this.add.text(18, 53, '', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#cbd5e1',
    });
    this.stepText = this.add.text(GAME_WIDTH - 18, 28, '', {
      fontFamily: 'system-ui',
      fontSize: '15px',
      fontStyle: '700',
      color: '#fef08a',
    }).setOrigin(1, 0);

    this.resetButton = this.add.text(GAME_WIDTH - 18, 57, '재시작', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      fontStyle: '700',
      color: '#07111f',
      backgroundColor: '#bef264',
      padding: { x: 10, y: 5 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.resetButton.on('pointerdown', () => this.resetPuzzle());
  }

  createDungeonLayer() {
    this.floorLayer = this.add.graphics();
    this.wallLayer = this.add.graphics();
    this.gridLayer = this.add.graphics();

    for (let row = 0; row < DUNGEON_MAP.length; row += 1) {
      for (let col = 0; col < DUNGEON_MAP[row].length; col += 1) {
        this.drawTile(col, row, DUNGEON_MAP[row][col]);
      }
    }

    this.drawGrid();
  }

  createPuzzleObjects() {
    this.switchPad = this.add.rectangle(0, 0, TILE_SIZE - 12, TILE_SIZE - 12, 0x64748b, 1).setOrigin(0.5);
    this.exitDoor = this.add.rectangle(0, 0, TILE_SIZE - 8, TILE_SIZE - 4, 0x7f1d1d, 1).setOrigin(0.5);
    this.exitLabel = this.add.text(0, 0, 'EXIT', {
      fontFamily: 'system-ui',
      fontSize: '11px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0.5);

    this.boulderSprite = this.add.circle(0, 0, 12, 0x8b7355, 1);
    this.boulderShine = this.add.circle(0, 0, 3, 0xffffff, 0.18);
    this.playerBody = this.add.circle(0, 0, 11, 0x60a5fa, 1);
    this.playerHead = this.add.circle(0, 0, 5, 0xbfdbfe, 1);
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    this.joystickBase = this.add.circle(70, GAME_HEIGHT - 76, 58, 0x0f172a, 0.58)
      .setStrokeStyle(2, 0xffffff, 0.2)
      .setScrollFactor(0);
    this.joystickKnob = this.add.circle(70, GAME_HEIGHT - 76, 24, 0x67e8f9, 1).setScrollFactor(0);
    this.joystickLabel = this.add.text(70, GAME_HEIGHT - 12, 'JOYSTICK', {
      fontFamily: 'system-ui',
      fontSize: '10px',
      fontStyle: '700',
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
    this.player = { col: 6, row: 14 };
    this.boulder = { col: 5, row: 12 };
    this.steps = 0;
    this.won = false;
    this.nextMoveAt = 0;
    this.winPanel?.destroy();
    this.winPanel = null;
    this.syncSprites(true);
    this.refreshStatus();
  }

  drawTile(col, row, symbol) {
    const x = col * TILE_SIZE;
    const y = MAP_OFFSET_Y + row * TILE_SIZE;
    const isWall = symbol === '#';

    this.floorLayer.fillStyle((col + row) % 2 ? 0x172033 : 0x141c2d, 1);
    this.floorLayer.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    if (!isWall) return;

    this.wallLayer.fillStyle(0x263247, 1);
    this.wallLayer.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    this.wallLayer.fillStyle(0xffffff, 0.08);
    this.wallLayer.fillRect(x + 3, y + 3, TILE_SIZE - 6, 4);
  }

  drawGrid() {
    this.gridLayer.lineStyle(1, 0xffffff, 0.035);
    for (let x = 0; x <= GAME_WIDTH; x += TILE_SIZE) {
      this.gridLayer.lineBetween(x, MAP_OFFSET_Y, x, MAP_OFFSET_Y + DUNGEON_MAP.length * TILE_SIZE);
    }
    for (let y = MAP_OFFSET_Y; y <= MAP_OFFSET_Y + DUNGEON_MAP.length * TILE_SIZE; y += TILE_SIZE) {
      this.gridLayer.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  refreshStatus() {
    const switchPressed = this.isSwitchPressed();
    this.statusText.setText(switchPressed ? '출구가 열렸습니다. 위쪽으로 탈출하세요!' : '돌을 스위치 위로 밀어 출구를 여세요.');
    this.stepText.setText(`${this.steps} 걸음`);
    this.switchPad.setFillStyle(switchPressed ? 0xbef264 : 0x64748b);
    this.exitDoor.setFillStyle(switchPressed ? 0x22c55e : 0x7f1d1d);
  }

  update(time) {
    if (time < this.nextMoveAt || this.won) return;

    const direction = this.getMoveDirection();
    if (!direction) return;

    this.tryMove(direction.x, direction.y);
    this.nextMoveAt = time + MOVE_COOLDOWN;
  }

  getMoveDirection() {
    const keyboardX = Number(this.cursors.right.isDown || this.wasd.D.isDown) - Number(this.cursors.left.isDown || this.wasd.A.isDown);
    const keyboardY = Number(this.cursors.down.isDown || this.wasd.S.isDown) - Number(this.cursors.up.isDown || this.wasd.W.isDown);
    const x = keyboardX || this.joystickVector.x;
    const y = keyboardY || this.joystickVector.y;

    if (Math.abs(x) < 0.25 && Math.abs(y) < 0.25) return null;
    return Math.abs(x) >= Math.abs(y)
      ? { x: Math.sign(x), y: 0 }
      : { x: 0, y: Math.sign(y) };
  }

  tryMove(dx, dy) {
    const nextCol = this.player.col + dx;
    const nextRow = this.player.row + dy;
    const pushingBoulder = nextCol === this.boulder.col && nextRow === this.boulder.row;

    if (pushingBoulder) {
      const boulderCol = this.boulder.col + dx;
      const boulderRow = this.boulder.row + dy;
      if (!this.canEnter(boulderCol, boulderRow)) return;
      this.boulder = { col: boulderCol, row: boulderRow };
    } else if (!this.canEnter(nextCol, nextRow)) {
      return;
    }

    this.player = { col: nextCol, row: nextRow };
    this.steps += 1;
    this.syncSprites();

    if (this.player.col === this.exit.col && this.player.row === this.exit.row && this.isExitOpen()) {
      this.completeLevel();
    }

    this.refreshStatus();
  }

  canEnter(col, row) {
    if (DUNGEON_MAP[row]?.[col] === '#') return false;
    if (col === this.exit.col && row === this.exit.row) return this.isExitOpen();
    return true;
  }

  isSwitchPressed() {
    return this.boulder.col === this.switch.col && this.boulder.row === this.switch.row;
  }

  isExitOpen() {
    return this.isSwitchPressed();
  }

  syncSprites(skipTween = false) {
    const positions = [
      [this.switchPad, this.switch],
      [this.exitDoor, this.exit],
      [this.exitLabel, this.exit],
      [this.boulderSprite, this.boulder],
      [this.boulderShine, { col: this.boulder.col - 0.12, row: this.boulder.row - 0.16 }],
      [this.playerBody, this.player],
      [this.playerHead, { col: this.player.col, row: this.player.row - 0.16 }],
    ];

    for (const [gameObject, gridPosition] of positions) {
      const target = this.toWorld(gridPosition.col, gridPosition.row);
      if (skipTween) {
        gameObject.setPosition(target.x, target.y);
      } else {
        this.tweens.add({ targets: gameObject, x: target.x, y: target.y, duration: 110, ease: 'Sine.easeOut' });
      }
    }
  }

  toWorld(col, row) {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: MAP_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2,
    };
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

  completeLevel() {
    this.won = true;
    this.winPanel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      this.add.rectangle(0, 0, 310, 168, 0x020617, 0.86).setStrokeStyle(2, 0xbef264, 0.7),
      this.add.text(0, -42, '탈출 성공!', {
        fontFamily: 'system-ui',
        fontSize: '30px',
        fontStyle: '900',
        color: '#bef264',
      }).setOrigin(0.5),
      this.add.text(0, 4, `${this.steps} 걸음으로 출구에 도착했습니다.`, {
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
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#07111f',
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
