const GAME_WIDTH = 1080;
const GAME_HEIGHT = 720;

const COLORS = {
  player: 0x54c6eb,
  playerAttack: 0xeef276,
  base: 0xf2c14e,
  healthBack: 0x253042,
  healthGood: 0x44d17c,
  healthLow: 0xf45b69,
  playerHealth: 0x7df9ff,
  text: "#f7f3e8",
};

const THORNSHELL_ANIMATION_FRAMES = {
  walk: ["walk-0", "walk-1", "walk-2", "walk-3", "walk-4", "walk-5"],
  bite: ["bite-0", "bite-1", "bite-2", "bite-3"],
  ram: ["ram-0", "ram-1", "ram-2", "ram-3"],
  death: ["death-0", "death-1", "death-2", "death-3", "death-4"],
};

const HUNTER_ANIMATION_FRAMES = {
  idle: ["idle-0", "idle-1", "idle-2", "idle-3"],
  walk: ["walk-0", "walk-1", "walk-2", "walk-3", "walk-4", "walk-5"],
};

const ABILITIES = [
  { key: "fire", label: "1", color: 0xff6b1a, damage: 42, radius: 62, range: 150 },
  { key: "grass", label: "2 Grass", color: 0x76d64f, damage: 30, radius: 78, range: 135 },
  { key: "water", label: "3 Water", color: 0x4cb8ff, damage: 34, radius: 66, range: 155 },
  { key: "ice", label: "4 Ice", color: 0x9ee7ff, damage: 28, radius: 70, range: 145 },
  { key: "potion", label: "5 Potion", color: 0xf04f58, heal: 28, radius: 42, range: 0 },
  { key: "bomb", label: "6 Bomb", color: 0xf4b04c, damage: 60, radius: 88, range: 130 },
];

class HealthBar {
  constructor(scene, owner, width, yOffset, fillColor = COLORS.healthGood, height = 6) {
    this.scene = scene;
    this.owner = owner;
    this.width = width;
    this.height = height;
    this.yOffset = yOffset;
    this.fillColor = fillColor;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1000);
  }

  update() {
    const ratio = Phaser.Math.Clamp(this.owner.health / this.owner.maxHealth, 0, 1);
    const x = this.owner.x - this.width / 2;
    const y = this.owner.y + this.yOffset - this.height / 2;
    const fillWidth = this.width * ratio;
    const currentColor = ratio > 0.35 ? this.fillColor : COLORS.healthLow;

    this.graphics.clear();
    if (!this.owner.active) {
      this.graphics.setVisible(false);
      return;
    }

    this.graphics.setVisible(true);
    this.graphics.fillStyle(0x071009, 0.95);
    this.graphics.fillRoundedRect(x - 3, y - 3, this.width + 6, this.height + 6, 5);
    this.graphics.fillStyle(0x1d2a20, 1);
    this.graphics.fillRect(x, y, this.width, this.height);
    if (fillWidth > 0) {
      this.graphics.fillStyle(currentColor, 1);
      this.graphics.fillRect(x, y, fillWidth, this.height);
    }
    this.graphics.lineStyle(2, 0xffffff, 0.95);
    this.graphics.strokeRoundedRect(x - 3, y - 3, this.width + 6, this.height + 6, 5);
  }

  setVisible(isVisible) {
    this.graphics.setVisible(isVisible);
  }

  destroy() {
    this.graphics.destroy();
  }
}

class Base {
  constructor(scene, x, y) {
    this.scene = scene;
    this.maxHealth = 250;
    this.health = this.maxHealth;
    this.sprite = scene.physics.add.staticSprite(x, y, "castleBase-clean");
    this.sprite.setOrigin(0.5, 0.68);
    this.sprite.setScale(1);
    this.sprite.refreshBody();
    this.sprite.body.setCircle(68, 58, 92);
    this.sprite.owner = this;
    this.healthBar = new HealthBar(scene, this.sprite, 150, -152);
    this.healthBar.graphics.setDepth(150);
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  update() {
    this.sprite.health = this.health;
    this.sprite.maxHealth = this.maxHealth;
    this.healthBar.owner = this.sprite;
    this.healthBar.update();
  }
}

class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.maxHealth = 120;
    this.health = this.maxHealth;
    this.speed = 230;
    this.selectedAbilityIndex = 0;
    this.attackCooldownMs = 360;
    this.lastAttackAt = -Infinity;

    this.sprite = scene.physics.add.sprite(x, y, "hunter-idle-0-clean");
    this.sprite.setOrigin(0.5, 0.72);
    this.sprite.setScale(0.85);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setSize(30, 34);
    this.sprite.body.setOffset(20, 58);
    this.sprite.owner = this;
    this.sprite.setDepth(35);
    this.sprite.play("hunter-idle");
    this.healthBar = new HealthBar(scene, this.sprite, 58, -58, COLORS.playerHealth);
    this.healthBar.graphics.setDepth(150);

    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
      ability1: Phaser.Input.Keyboard.KeyCodes.ONE,
      ability2: Phaser.Input.Keyboard.KeyCodes.TWO,
      ability3: Phaser.Input.Keyboard.KeyCodes.THREE,
      ability4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      ability5: Phaser.Input.Keyboard.KeyCodes.FIVE,
      ability6: Phaser.Input.Keyboard.KeyCodes.SIX,
    });
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  update(time, monsters) {
    const velocity = new Phaser.Math.Vector2(
      Number(this.keys.right.isDown) - Number(this.keys.left.isDown),
      Number(this.keys.down.isDown) - Number(this.keys.up.isDown),
    );

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(this.speed);
    }

    this.sprite.setVelocity(velocity.x, velocity.y);

    if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
      const pointer = this.scene.input.activePointer;
      this.attack(time, monsters, { x: pointer.worldX, y: pointer.worldY });
    }

    this.updateAbilitySelection();
    this.updateAnimation(velocity);
    this.healthBar.update();
  }

  get selectedAbility() {
    return ABILITIES[this.selectedAbilityIndex];
  }

  selectAbility(index) {
    this.selectedAbilityIndex = Phaser.Math.Clamp(index, 0, ABILITIES.length - 1);
  }

  updateAbilitySelection() {
    for (let index = 0; index < ABILITIES.length; index += 1) {
      if (Phaser.Input.Keyboard.JustDown(this.keys[`ability${index + 1}`])) {
        this.selectAbility(index);
        this.scene.updateHotbar();
      }
    }
  }

  updateAnimation(velocity) {
    if (velocity.x !== 0) {
      this.sprite.flipX = velocity.x < 0;
    }

    if (velocity.lengthSq() > 0) {
      this.sprite.play("hunter-walk", true);
    } else {
      this.sprite.play("hunter-idle", true);
    }

    this.sprite.setDepth(35 + this.sprite.y / GAME_HEIGHT);
  }

  attack(time, monsters, targetPoint = null) {
    if (time - this.lastAttackAt < this.attackCooldownMs) {
      return;
    }

    this.lastAttackAt = time;
    const ability = this.selectedAbility;
    if (ability.key === "potion") {
      this.usePotion();
      return;
    }

    const impactPoint = this.resolveAttackTarget(ability, targetPoint);
    this.sprite.flipX = impactPoint.x < this.x;
    this.drawAbilityEffect(ability, impactPoint);

    monsters.children.each((monsterSprite) => {
      if (!monsterSprite.active) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(impactPoint.x, impactPoint.y, monsterSprite.x, monsterSprite.y);
      if (distance <= ability.radius) {
        monsterSprite.owner.takeDamage(ability.damage, ability.key);
      }
    });
  }

  resolveAttackTarget(ability, targetPoint) {
    const origin = new Phaser.Math.Vector2(this.x, this.y - 22);
    if (!targetPoint) {
      return {
        x: origin.x + (this.sprite.flipX ? -ability.range : ability.range),
        y: origin.y,
      };
    }

    const target = new Phaser.Math.Vector2(targetPoint.x, targetPoint.y);
    const direction = target.subtract(origin);
    const distance = direction.length();
    if (distance === 0) {
      direction.set(this.sprite.flipX ? -1 : 1, 0);
    } else {
      direction.normalize();
    }
    direction.scale(Math.min(ability.range, Math.max(distance, 1)));
    return { x: origin.x + direction.x, y: origin.y + direction.y };
  }

  drawAbilityEffect(ability, impactPoint) {
    const origin = new Phaser.Math.Vector2(this.x, this.y - 24);
    if (ability.key === "fire") {
      this.drawFireEffect(origin, impactPoint, ability.color);
    } else if (ability.key === "water") {
      this.drawWaterEffect(origin, impactPoint, ability.color);
    } else if (ability.key === "grass") {
      this.drawGrassEffect(origin, impactPoint, ability.color);
    } else if (ability.key === "ice") {
      this.drawIceEffect(origin, impactPoint, ability.color);
    } else if (ability.key === "bomb") {
      this.drawBombEffect(impactPoint, ability.color);
    }
  }

  drawFireEffect(origin, impactPoint, color) {
    const graphics = this.scene.add.graphics().setDepth(80);
    const direction = new Phaser.Math.Vector2(impactPoint.x - origin.x, impactPoint.y - origin.y);
    const distance = Math.max(direction.length(), 1);
    direction.normalize();
    const normal = new Phaser.Math.Vector2(-direction.y, direction.x);

    // Small ignition flash at the hunter's hand.
    graphics.fillStyle(0xfff3a0, 1);
    graphics.fillCircle(origin.x, origin.y, 6);
    graphics.fillStyle(0xff7a0a, 0.9);
    graphics.fillCircle(origin.x + direction.x * 8, origin.y + direction.y * 8, 8);

    // A compact fire bolt with a bright core and tapered fiery trail.
    const trailLength = Math.min(58, distance * 0.48);
    const tailX = impactPoint.x - direction.x * trailLength;
    const tailY = impactPoint.y - direction.y * trailLength;
    graphics.lineStyle(11, 0xff3b08, 0.32);
    graphics.lineBetween(tailX, tailY, impactPoint.x, impactPoint.y);
    graphics.lineStyle(6, 0xff8b16, 0.78);
    graphics.lineBetween(tailX, tailY, impactPoint.x, impactPoint.y);
    graphics.lineStyle(2, 0xfff2a0, 0.95);
    graphics.lineBetween(tailX, tailY, impactPoint.x, impactPoint.y);

    // Sparks along the flight path make the bolt read as moving fire, not a laser.
    for (let i = 1; i <= 8; i += 1) {
      const t = i / 9;
      const px = Phaser.Math.Linear(origin.x, impactPoint.x, t);
      const py = Phaser.Math.Linear(origin.y, impactPoint.y, t);
      const offset = Phaser.Math.Between(-7, 7);
      graphics.fillStyle(i % 2 === 0 ? 0xffc23d : 0xff5a0a, 0.82);
      graphics.fillCircle(px + normal.x * offset, py + normal.y * offset, Phaser.Math.Between(1, 3));
    }

    // Focused flaming projectile at the cursor-facing end.
    graphics.fillStyle(0xff3b08, 0.78);
    graphics.fillCircle(impactPoint.x, impactPoint.y, 16);
    graphics.fillStyle(0xff8b16, 1);
    graphics.fillCircle(impactPoint.x, impactPoint.y, 11);
    graphics.fillStyle(0xfff5b0, 1);
    graphics.fillCircle(impactPoint.x, impactPoint.y, 6);

    this.fadeEffect(graphics, 300);
  }

  drawWaterEffect(origin, impactPoint, color) {
    const graphics = this.scene.add.graphics().setDepth(80);
    for (let i = 0; i < 4; i += 1) {
      graphics.lineStyle(3, i % 2 === 0 ? color : 0xb9ecff, 0.82);
      const offset = (i - 1.5) * 7;
      graphics.beginPath();
      graphics.moveTo(origin.x, origin.y + offset);
      graphics.lineTo((origin.x + impactPoint.x) / 2, (origin.y + impactPoint.y) / 2 + Math.sin(i) * 18);
      graphics.lineTo(impactPoint.x, impactPoint.y - offset);
      graphics.strokePath();
    }
    graphics.fillStyle(color, 0.72);
    for (let i = 0; i < 10; i += 1) {
      const t = i / 9;
      graphics.fillCircle(
        Phaser.Math.Linear(origin.x, impactPoint.x, t) + Phaser.Math.Between(-8, 8),
        Phaser.Math.Linear(origin.y, impactPoint.y, t) + Phaser.Math.Between(-8, 8),
        Phaser.Math.Between(2, 5),
      );
    }
    this.fadeEffect(graphics, 460);
  }

  drawGrassEffect(origin, impactPoint, color) {
    const graphics = this.scene.add.graphics().setDepth(80);
    graphics.lineStyle(3, color, 0.85);
    graphics.lineBetween(origin.x, origin.y, impactPoint.x, impactPoint.y);
    for (let i = 0; i < 16; i += 1) {
      const angle = i * 0.75;
      const radius = 4 + i * 2.1;
      const x = impactPoint.x + Math.cos(angle) * radius;
      const y = impactPoint.y + Math.sin(angle) * radius * 0.72;
      graphics.fillStyle(i % 2 === 0 ? color : 0xd4ff75, 0.86);
      graphics.fillEllipse(x, y, 12, 5);
    }
    this.fadeEffect(graphics, 520);
  }

  drawIceEffect(origin, impactPoint, color) {
    const graphics = this.scene.add.graphics().setDepth(80);
    const angle = Phaser.Math.Angle.Between(origin.x, origin.y, impactPoint.x, impactPoint.y);
    graphics.lineStyle(3, color, 0.85);
    graphics.lineBetween(origin.x, origin.y, impactPoint.x, impactPoint.y);
    graphics.fillStyle(0xd9f8ff, 0.9);
    graphics.fillTriangle(
      impactPoint.x + Math.cos(angle) * 34,
      impactPoint.y + Math.sin(angle) * 34,
      impactPoint.x + Math.cos(angle + 2.65) * 16,
      impactPoint.y + Math.sin(angle + 2.65) * 16,
      impactPoint.x + Math.cos(angle - 2.65) * 16,
      impactPoint.y + Math.sin(angle - 2.65) * 16,
    );
    graphics.lineStyle(2, 0x67c7ff, 0.9);
    for (let i = -2; i <= 2; i += 1) {
      graphics.lineBetween(
        impactPoint.x + i * 8,
        impactPoint.y + 24,
        impactPoint.x + i * 3,
        impactPoint.y - 20 - Math.abs(i) * 4,
      );
    }
    this.fadeEffect(graphics, 480);
  }

  drawBombEffect(impactPoint, color) {
    const graphics = this.scene.add.graphics().setDepth(80);
    graphics.fillStyle(0x2b1b13, 0.72);
    graphics.fillCircle(impactPoint.x, impactPoint.y, 30);
    graphics.fillStyle(color, 0.92);
    graphics.fillCircle(impactPoint.x, impactPoint.y, 18);
    graphics.lineStyle(4, 0xfff0a6, 0.95);
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      graphics.lineBetween(
        impactPoint.x + Math.cos(angle) * 10,
        impactPoint.y + Math.sin(angle) * 10,
        impactPoint.x + Math.cos(angle) * 48,
        impactPoint.y + Math.sin(angle) * 30,
      );
    }
    this.fadeEffect(graphics, 520);
  }

  fadeEffect(graphics, duration) {
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      scale: 1.08,
      duration,
      onComplete: () => graphics.destroy(),
    });
  }

  usePotion() {
    this.health = Math.min(this.maxHealth, this.health + this.selectedAbility.heal);
    const healFlash = this.scene.add.circle(this.x, this.y, 42, this.selectedAbility.color, 0.24);
    healFlash.setStrokeStyle(2, this.selectedAbility.color, 0.85);
    this.scene.tweens.add({
      targets: healFlash,
      alpha: 0,
      scale: 1.4,
      duration: 260,
      onComplete: () => healFlash.destroy(),
    });
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }
}

class Monster {
  constructor(scene, x, y, waveNumber) {
    this.scene = scene;
    this.maxHealth = 42 + waveNumber * 8;
    this.health = this.maxHealth;
    this.speed = 28 + Math.min(waveNumber * 2, 18);
    this.baseDamageMin = 2;
    this.baseDamageMax = 3.5;
    this.playerDamage = 2;
    this.attackCooldownMs = 2200;
    this.lastBaseAttackAt = 0;
    this.lastPlayerAttackAt = 0;
    this.isDying = false;
    this.lastDamageType = null;

    this.sprite = scene.physics.add.sprite(x, y, "thornshell-walk-0-clean");
    this.sprite.setOrigin(0.5, 0.64);
    this.sprite.setScale(0.82);
    this.sprite.body.setSize(46, 28);
    this.sprite.body.setOffset(42, 48);
    this.sprite.owner = this;
    this.sprite.play("thornshell-walk");
    this.healthBar = new MonsterHealthBar(scene, this);
  }

  update(time, base, player) {
    if (this.isDying) {
      return;
    }

    const distanceToBase = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, base.x, base.y);
    const distanceToPlayer = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.x, player.y);

    if (distanceToBase <= 78) {
      this.sprite.setVelocity(0, 0);
      if (time - this.lastBaseAttackAt > this.attackCooldownMs) {
        this.playAttack("thornshell-ram");
        base.takeDamage(Phaser.Math.FloatBetween(this.baseDamageMin, this.baseDamageMax));
        this.lastBaseAttackAt = time;
      }
    } else {
      this.scene.physics.moveToObject(this.sprite, base.sprite, this.speed);
      this.playWalk();
    }

    if (distanceToPlayer <= 30 && time - this.lastPlayerAttackAt > this.attackCooldownMs) {
      this.playAttack("thornshell-bite");
      player.takeDamage(this.playerDamage);
      this.lastPlayerAttackAt = time;
    }

    this.sprite.flipX = base.x > this.sprite.x;
    this.sprite.setDepth(10 + this.sprite.y / GAME_HEIGHT);
    this.healthBar.update();
  }

  takeDamage(amount, damageType = null) {
    if (this.isDying) {
      return;
    }

    this.lastDamageType = damageType;
    this.health = Math.max(0, this.health - amount);
    this.healthBar.update();
    if (this.health <= 0) {
      this.startDeath(damageType);
    }
  }

  playWalk() {
    const currentKey = this.sprite.anims.currentAnim?.key;
    if (!currentKey || currentKey === "thornshell-walk") {
      this.sprite.play("thornshell-walk", true);
    }
  }

  playAttack(animationKey) {
    if (this.isDying) {
      return;
    }

    this.sprite.play(animationKey, true);
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.isDying && this.health > 0) {
        this.sprite.play("thornshell-walk", true);
      }
    });
  }

  startDeath(damageType = this.lastDamageType) {
    this.isDying = true;
    this.sprite.setVelocity(0, 0);
    this.sprite.disableBody(true, false);
    this.healthBar.destroy();

    if (damageType === "fire") {
      this.playFireDustDeath();
      return;
    }

    this.sprite.play("thornshell-death");
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.sprite.destroy();
    });
  }

  playFireDustDeath() {
    const deathX = this.sprite.x;
    const deathY = this.sprite.y;
    const dust = this.scene.add.graphics().setDepth(45);

    // Thornshell chars/shrivels inward before collapsing.
    this.sprite.setTint(0x4b2d20);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.sprite.scaleX * 0.48,
      scaleY: this.sprite.scaleY * 0.32,
      y: deathY + 20,
      alpha: 0.38,
      angle: Phaser.Math.Between(-7, 7),
      duration: 430,
      ease: "Quad.easeIn",
      onComplete: () => {
        this.sprite.destroy();

        // A low brown/gray ash pile remains briefly where the monster fell.
        dust.fillStyle(0x3a3029, 0.9);
        dust.fillEllipse(deathX, deathY + 28, 58, 18);
        dust.fillStyle(0x6b5748, 0.8);
        dust.fillEllipse(deathX - 8, deathY + 24, 32, 12);
        dust.fillStyle(0x8a7562, 0.55);
        dust.fillEllipse(deathX + 12, deathY + 25, 24, 9);

        // Ash motes puff upward as the body turns to dust.
        for (let i = 0; i < 14; i += 1) {
          const mote = this.scene.add.circle(
            deathX + Phaser.Math.Between(-25, 25),
            deathY + Phaser.Math.Between(8, 30),
            Phaser.Math.Between(2, 5),
            i % 2 === 0 ? 0x6b5748 : 0x3a3029,
            0.72,
          ).setDepth(46);
          this.scene.tweens.add({
            targets: mote,
            y: mote.y - Phaser.Math.Between(18, 46),
            x: mote.x + Phaser.Math.Between(-12, 12),
            alpha: 0,
            scale: 0.35,
            duration: Phaser.Math.Between(650, 1050),
            onComplete: () => mote.destroy(),
          });
        }

        this.scene.tweens.add({
          targets: dust,
          alpha: 0,
          duration: 2200,
          delay: 1500,
          onComplete: () => dust.destroy(),
        });
      },
    });
  }

  destroy() {
    this.healthBar.destroy();
    this.sprite.destroy();
  }
}
class MonsterHealthBar {
  constructor(scene, monster) {
    this.scene = scene;
    this.monster = monster;
    this.width = 72;
    this.height = 9;
    this.graphics = scene.add.graphics().setDepth(10000);
  }

  update() {
    const sprite = this.monster.sprite;
    if (!sprite.active || this.monster.isDying) {
      this.graphics.setVisible(false);
      return;
    }

    const ratio = Phaser.Math.Clamp(this.monster.health / this.monster.maxHealth, 0, 1);
    // Thornshell's source images contain transparent padding. Anchor the bar to the
    // visible/physics body instead of the full image canvas.
    const bodyTop = sprite.body ? sprite.body.y : sprite.y - 20;
    const x = sprite.x - this.width / 2;
    const y = bodyTop - 16;
    const fillWidth = this.width * ratio;
    const color = ratio > 0.35 ? 0x20ff45 : 0xff334f;

    this.graphics.clear();
    this.graphics.setVisible(true);
    this.graphics.fillStyle(0x000000, 0.92);
    this.graphics.fillRoundedRect(x - 3, y - 3, this.width + 6, this.height + 6, 4);
    this.graphics.fillStyle(0x263029, 1);
    this.graphics.fillRect(x, y, this.width, this.height);
    if (fillWidth > 0) {
      this.graphics.fillStyle(color, 1);
      this.graphics.fillRect(x, y, fillWidth, this.height);
    }
    this.graphics.lineStyle(2, 0xffffff, 1);
    this.graphics.strokeRoundedRect(x - 3, y - 3, this.width + 6, this.height + 6, 4);
  }

  destroy() {
    this.graphics.destroy();
  }
}


class WaveSpawner {
  constructor(scene, monsterGroup) {
    this.scene = scene;
    this.monsterGroup = monsterGroup;
    this.waveNumber = 0;
    this.remainingToSpawn = 0;
    this.spawnDelayMs = 580;
    this.nextSpawnAt = 0;
    this.nextWaveAt = 1000;
  }

  update(time) {
    if (this.remainingToSpawn > 0 && time >= this.nextSpawnAt) {
      this.spawnMonster();
      this.remainingToSpawn -= 1;
      this.nextSpawnAt = time + this.spawnDelayMs;
      return;
    }

    const noMonstersActive = this.remainingToSpawn === 0 && this.monsterGroup.countActive(true) === 0;
    if (noMonstersActive && time >= this.nextWaveAt) {
      this.startWave(time);
    }
  }

  startWave(time) {
    this.waveNumber += 1;
    this.remainingToSpawn = 4 + this.waveNumber * 2;
    this.spawnDelayMs = Math.max(260, 640 - this.waveNumber * 24);
    this.nextSpawnAt = time;
    this.scene.showWaveBanner(`Wave ${this.waveNumber}`);
  }

  spawnMonster() {
    const margin = 42;
    const side = Phaser.Math.Between(0, 3);
    let x = 0;
    let y = 0;

    if (side === 0) {
      x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      y = -margin;
    } else if (side === 1) {
      x = GAME_WIDTH + margin;
      y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
    } else if (side === 2) {
      x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      y = GAME_HEIGHT + margin;
    } else {
      x = -margin;
      y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
    }

    const monster = new Monster(this.scene, x, y, this.waveNumber);
    this.monsterGroup.add(monster.sprite);
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("forestArena", "assets/forest-arena.png");
    this.load.image("castleBase", "assets/castle/base-fortress.png");
    Object.values(HUNTER_ANIMATION_FRAMES)
      .flat()
      .forEach((frameKey) => {
        this.load.image(`hunter-${frameKey}`, `assets/hunter_frames/${frameKey}.png`);
      });
    Object.values(THORNSHELL_ANIMATION_FRAMES)
      .flat()
      .forEach((frameKey) => {
        this.load.image(`thornshell-${frameKey}`, `assets/thornshell_frames/${frameKey}.png`);
      });
  }

  create() {
    this.isGameOver = false;
    this.createPlaceholderTextures();
    this.createTransparentTexture("castleBase", "castleBase-clean", "edgeLight");
    this.createHunterAnimations();
    this.createThornshellAnimations();
    this.createMap();

    this.monsters = this.physics.add.group();
    this.base = new Base(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 190);
    this.spawner = new WaveSpawner(this, this.monsters);

    this.physics.add.collider(this.player.sprite, this.base.sprite);
    this.physics.add.collider(this.player.sprite, this.monsters);
    this.physics.add.collider(this.monsters, this.base.sprite);
    this.physics.add.collider(this.monsters, this.monsters);

    this.input.on("pointerdown", (pointer) => {
      if (!this.isGameOver && pointer.y < GAME_HEIGHT - 84) {
        this.player.attack(this.time.now, this.monsters, { x: pointer.x, y: pointer.y });
      }
    });

    this.createHud();
  }

  update(time) {
    if (this.isGameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }
      return;
    }

    this.player.update(time, this.monsters);
    this.base.update();
    this.spawner.update(time);

    this.monsters.children.each((monsterSprite) => {
      monsterSprite.owner.update(time, this.base, this.player);
    });

    this.updateHud();
    this.checkGameOver();
  }

  createPlaceholderTextures() {
  }

  createCircleTexture(key, color, size, radius) {
    if (this.textures.exists(key)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(color, 1);
    graphics.fillCircle(size / 2, size / 2, radius);
    graphics.lineStyle(3, 0xffffff, 0.35);
    graphics.strokeCircle(size / 2, size / 2, radius);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  createThornshellAnimations() {
    Object.values(THORNSHELL_ANIMATION_FRAMES)
      .flat()
      .forEach((frameKey) => {
        this.createTransparentTexture(`thornshell-${frameKey}`, `thornshell-${frameKey}-clean`, "lightAll");
      });

    this.createFrameAnimation("thornshell-walk", THORNSHELL_ANIMATION_FRAMES.walk, 8, -1);
    this.createFrameAnimation("thornshell-bite", THORNSHELL_ANIMATION_FRAMES.bite, 10, 0);
    this.createFrameAnimation("thornshell-ram", THORNSHELL_ANIMATION_FRAMES.ram, 12, 0);
    this.createFrameAnimation("thornshell-death", THORNSHELL_ANIMATION_FRAMES.death, 7, 0);
  }

  createHunterAnimations() {
    Object.values(HUNTER_ANIMATION_FRAMES)
      .flat()
      .forEach((frameKey) => {
        this.createTransparentTexture(`hunter-${frameKey}`, `hunter-${frameKey}-clean`, "lightAll");
      });

    this.createFrameAnimation("hunter-idle", HUNTER_ANIMATION_FRAMES.idle, 4, -1, "hunter");
    this.createFrameAnimation("hunter-walk", HUNTER_ANIMATION_FRAMES.walk, 9, -1, "hunter");
  }

  createFrameAnimation(key, frameKeys, frameRate, repeat, prefix = "thornshell") {
    if (this.anims.exists(key)) {
      return;
    }

    this.anims.create({
      key,
      frames: frameKeys.map((frameKey) => ({ key: `${prefix}-${frameKey}-clean` })),
      frameRate,
      repeat,
    });
  }

  createTransparentTexture(sourceKey, targetKey, cleanupMode = "lightAll") {
    if (this.textures.exists(targetKey)) {
      return;
    }

    const source = this.textures.get(sourceKey).getSourceImage();
    const texture = this.textures.createCanvas(targetKey, source.width, source.height);
    const canvas = texture.getSourceImage();
    const context = canvas.getContext("2d");
    context.drawImage(source, 0, 0);

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    const width = canvas.width;
    const height = canvas.height;
    const isSheetBackground = (pixelIndex) => {
      const dataIndex = pixelIndex * 4;
      const red = data[dataIndex];
      const green = data[dataIndex + 1];
      const blue = data[dataIndex + 2];
      const maxChannel = Math.max(red, green, blue);
      const minChannel = Math.min(red, green, blue);
      return minChannel > 138 && maxChannel - minChannel < 48;
    };

    if (cleanupMode === "edgeLight") {
      const visited = new Uint8Array(width * height);
      const stack = [];
      const addPixel = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) {
          return;
        }

        const pixelIndex = y * width + x;
        if (!visited[pixelIndex] && isSheetBackground(pixelIndex)) {
          visited[pixelIndex] = 1;
          stack.push(pixelIndex);
        }
      };

      for (let x = 0; x < width; x += 1) {
        addPixel(x, 0);
        addPixel(x, height - 1);
      }
      for (let y = 0; y < height; y += 1) {
        addPixel(0, y);
        addPixel(width - 1, y);
      }

      while (stack.length > 0) {
        const pixelIndex = stack.pop();
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        data[pixelIndex * 4 + 3] = 0;
        addPixel(x + 1, y);
        addPixel(x - 1, y);
        addPixel(x, y + 1);
        addPixel(x, y - 1);
      }
    } else {
      for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
        if (isSheetBackground(pixelIndex)) {
          data[pixelIndex * 4 + 3] = 0;
        }
      }
    }

    context.putImageData(pixels, 0, 0);
    texture.refresh();
  }

  createMap() {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "forestArena").setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  }

  createHud() {
    this.hudText = this.add.text(18, 16, "", {
      color: COLORS.text,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "18px",
      lineSpacing: 8,
    });
    this.hudText.setDepth(100);

    this.controlsText = this.add.text(GAME_WIDTH - 18, 18, "WASD move  |  Space/click use  |  1-6 select", {
      color: "#cbd4e4",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
    });
    this.controlsText.setOrigin(1, 0);
    this.controlsText.setDepth(100);

    this.waveBanner = this.add.text(GAME_WIDTH / 2, 86, "", {
      color: COLORS.text,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "34px",
      fontStyle: "700",
    });
    this.waveBanner.setOrigin(0.5);
    this.waveBanner.setDepth(100);

    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.createHotbar();
  }

  createHotbar() {
    this.hotbarButtons = [];
    const buttonWidth = 122;
    const buttonHeight = 44;
    const gap = 10;
    const startX = GAME_WIDTH / 2 - ((buttonWidth + gap) * ABILITIES.length - gap) / 2;
    const y = GAME_HEIGHT - 46;

    ABILITIES.forEach((ability, index) => {
      const x = startX + buttonWidth / 2 + index * (buttonWidth + gap);
      const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x111923, 0.82);
      button.setStrokeStyle(2, ability.color, 0.8);
      button.setDepth(120);
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => {
        this.player.selectAbility(index);
        this.updateHotbar();
      });

      const swatch = this.add.circle(x - buttonWidth / 2 + 18, y, 7, ability.color, 1);
      swatch.setDepth(121);

      if (ability.key === "fire") {
        swatch.setVisible(false);
        const icon = this.add.graphics().setDepth(122);
        const iconX = x + 14;
        const iconY = y;
        // Small Fire Bolt icon: bright core, orange flame body, tapered tail.
        icon.fillStyle(0xff3b08, 0.95);
        icon.fillTriangle(iconX - 24, iconY, iconX - 8, iconY - 9, iconX - 8, iconY + 9);
        icon.fillStyle(0xff8b16, 1);
        icon.fillCircle(iconX, iconY, 11);
        icon.fillStyle(0xfff3a0, 1);
        icon.fillCircle(iconX + 2, iconY - 1, 5);
      }

      const label = this.add.text(ability.key === "fire" ? x - 28 : x + 6, y, ability.label, {
        color: COLORS.text,
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "14px",
      });
      label.setOrigin(0.5);
      label.setDepth(121);

      this.hotbarButtons.push({ button, label, swatch });
    });

    this.updateHotbar();
  }

  updateHotbar() {
    if (!this.hotbarButtons) {
      return;
    }

    this.hotbarButtons.forEach(({ button, label }, index) => {
      const isSelected = index === this.player.selectedAbilityIndex;
      button.setFillStyle(isSelected ? 0x26384c : 0x111923, isSelected ? 0.94 : 0.82);
      button.setStrokeStyle(isSelected ? 4 : 2, ABILITIES[index].color, isSelected ? 1 : 0.72);
      label.setColor(isSelected ? "#ffffff" : "#d6deea");
    });
  }

  updateHud() {
    this.hudText.setText(
      [
        `Base: ${Math.ceil(this.base.health)}/${this.base.maxHealth}`,
        `Player: ${Math.ceil(this.player.health)}/${this.player.maxHealth}`,
        `Wave: ${this.spawner.waveNumber}`,
        `Monsters: ${this.monsters.countActive(true) + this.spawner.remainingToSpawn}`,
      ].join("\n"),
    );
  }

  showWaveBanner(text) {
    this.waveBanner.setText(text);
    this.waveBanner.setAlpha(1);
    this.waveBanner.setScale(0.92);
    this.tweens.add({
      targets: this.waveBanner,
      alpha: 0,
      scale: 1,
      duration: 1300,
      ease: "Sine.easeOut",
    });
  }

  checkGameOver() {
    if (this.base.health > 0 && this.player.health > 0) {
      return;
    }

    this.isGameOver = true;
    this.physics.pause();
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x080b10, 0.62)
      .setDepth(200);
    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        [
          "Game Over",
          this.base.health <= 0 ? "The base was destroyed." : "The hunter fell.",
          "Press R or click to restart",
        ].join("\n"),
        {
          align: "center",
          color: COLORS.text,
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "34px",
          lineSpacing: 14,
        },
      )
      .setOrigin(0.5)
      .setDepth(201);

    this.input.keyboard.once("keydown-R", () => this.scene.restart());
    this.input.once("pointerdown", () => this.scene.restart());
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#151820",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [GameScene],
};

new Phaser.Game(config);
