/*
 * Template
 */
module KetchupAndRaisins {
    /*
     * Boot state for only loading the loading screen
     */
    export class BootState extends Phaser.State {
        constructor() {
            super();
        }

        init() {
            // Set scale using ScaleManager
            this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
            // Set background color
            this.game.stage.backgroundColor = "#1e97d8";
        }

        preload() {
            // Load loading screen image
        }

        create() {
            // Start true loading state
            this.game.state.start("PreloadState");
        }
    }

    /*
     * Preload state for actually loading assets
     */
    export class PreloadState extends Phaser.State {
        constructor() {
            super();
        }

        preload() {
            // Display the loading screen image

            // Load assets

            this.game.load.image('player', 'assets/kawaii_chan.png');
            this.game.load.image('ketchup', 'assets/ketchup_test.png');

            // explosion graphic
            let explosionCircle = this.game.add.bitmapData(32, 32);
            explosionCircle.circle(16, 16, 16, 'rgb(255,255,255');
            this.game.cache.addBitmapData('explosionCircle', explosionCircle);

            // raisin graphic
            let raisin = this.game.add.bitmapData(24, 24);
            raisin.circle(12, 12, 12, 'rgb(54, 27, 79)');
            this.game.cache.addBitmapData('raisin', raisin);
        }

        create() {
            this.game.state.start("GameState");
        }
    }

    // Enum for the controls.
    export enum Movement {
        Left,
        Right,
        Up,
        Down
    }

    /*
     * Derived KetchupSprite class for handling ketchup bottle properties.
     */
    export class KetchupSprite extends Phaser.Sprite {

        targetToFollow: Phaser.Sprite; // Will be following the player sprite.
        isFollowing: boolean = false; // Initially, it won't be following the player at its birth.

        constructor(game: Phaser.Game, x: number, y: number, key: string) {
            super(game, x, y, key);

            this.game.physics.arcade.enable(this);
            this.body.gravity = new Phaser.Point(-this.game.physics.arcade.gravity.x, PlayingState.GRAVITY_Y_VECTOR);
            this.checkWorldBounds = true;
            this.outOfBoundsKill = true;
            this.anchor.setTo(0.5, 0.5); // Set the center of the ketchup bottles.

            this.scale.setTo(1.5, 1.5); // Increase the size of the ketchup bottles so that the player can more easily see them.

            // Add to the display, but the physics system already did this, so this is redundant.
            this.game.stage.addChild(this);
        }

        update() {
            if (this.isFollowing) {
                let angle = Phaser.Math.angleBetweenPoints(this.position, this.targetToFollow.position);
                this.body.velocity.x = Math.cos(angle) * 200;
                this.body.velocity.y = Math.sin(angle) * 200;

                this.rotation = angle + Math.PI / 2; // Changing the rotation so that it can look better than if the rotation wasn't changed.
            }
        }
    }
    /*
     * The main game running state
     */
    export class PlayingState extends Phaser.State {

        game: Phaser.Game;

        player: Phaser.Sprite;
        currentHealth: number = PlayingState.INITIAL_HEALTH;
        score: number = 0;
        textScore: Phaser.Text;

        ketchupGroup: Phaser.Group;
        raisinGroup: Phaser.Group;

        lifeBar: Phaser.Graphics;

        // keyboard cursor key controls
        cursors: Phaser.CursorKeys;

        // A bunch of constant values.

        static MOVEMENT_SPEED: number = 365;
        static JUMPING_SPEED: number = PlayingState.MOVEMENT_SPEED + PlayingState.MOVEMENT_SPEED * 0.38;
        static GRAVITY_Y_VECTOR: number = 400;

        static INITIAL_HEALTH: number = 100;

        static KETCHUP_SPAWN_RATE: number = 800; // Number of milliseconds for spawning ketchup bottles.

        static RAISIN_POINT_VALUE: number = 10; // How much collecting an individual raisin is worth.
        static HEAL_AMOUNT: number = 1; // Determines how much to increase the player's health by when a raisin is collected.

        static LIFEBAR_COLOR: number = 0xC70039;
        static SCORE_TEXT_COLOR: string = "#2FDF00";

        // Unused stuff can go here.

        raisinsCollected: number = 0; // Can use this for calculating a score at the end of the game. Currently unused though.

        constructor() {
            super();
        }

        create() {
            this.game.physics.startSystem(Phaser.Physics.ARCADE);

            // add cursor keys controls
            this.cursors = this.game.input.keyboard.createCursorKeys();

            // Add and configure the player sprite.
            this.player = this.game.add.sprite(100, this.game.world.centerY, 'player');
            this.player.scale.setTo(2, 2); // Increase the player's sprite size so that it can be more easily seen.
            this.game.physics.arcade.enable(this.player);
            this.player.body.gravity = new Phaser.Point(-this.game.physics.arcade.gravity.x, PlayingState.GRAVITY_Y_VECTOR);
            this.player.body.collideWorldBounds = true;
            this.player.anchor.setTo(0.5, 0.5);

            // Create the Group that will hold the ketchup bottles.
            this.ketchupGroup = this.game.add.group();

            // A spawn timer for creating ketchup bottles.
            let spawnTimer = this.game.time.create(false);
            spawnTimer.loop(PlayingState.KETCHUP_SPAWN_RATE, () => {
                let singleKetchup = this.ketchupGroup.add(
                    new KetchupSprite(this.game, this.game.rnd.integerInRange(0, this.game.width), this.game.rnd.integerInRange(0, 150), 'ketchup')
                );

                // Wait, then attack the player.

                let waitTimer = this.game.time.create(true);
                waitTimer.add(500, () => {
                    singleKetchup.targetToFollow = this.player;
                    singleKetchup.isFollowing = true;
                }, this);
                waitTimer.start();

                // TTL

                let TTLTimer = this.game.time.create(true);
                TTLTimer.add(5000, () => {
                    singleKetchup.kill();
                    waitTimer.destroy();
                }, this);
                TTLTimer.start();
            }, this);
            spawnTimer.start();

            this.textScore = this.game.add.text(0, 50, "", {
                font: '4em "Segoe UI", Impact, sans-serif',
                fontWeight: "700",
                fill: PlayingState.SCORE_TEXT_COLOR,
                align: "center"
            });

            this.raisinGroup = this.game.add.group();

            let raisinSpawnTimer = this.game.time.create(false);
            raisinSpawnTimer.loop(1500, () => {
                let singleRaisin = this.raisinGroup.create(
                    this.game.rnd.integerInRange(0, this.game.width - 24),
                    this.game.rnd.integerInRange(this.game.world.centerY - 64, this.game.world.height - 24),
                    this.game.cache.getBitmapData('raisin'));

                this.game.physics.arcade.enable(singleRaisin);
            }, this);
            raisinSpawnTimer.start();

            this.lifeBar = this.game.add.graphics(10, 10);
            this.drawLifeBar();

            let dyingHealthTimer = this.game.time.create(false);
            dyingHealthTimer.loop(1800, () => {
                this.currentHealth--;
            }, this);
            dyingHealthTimer.start();

            let incrementScoreTimer = this.game.time.create(false);
            incrementScoreTimer.loop(900, () => {
                this.score += 80;
            }, this);
            incrementScoreTimer.start();
        }

        /*
         * controls player horizontal movement
         */
        movePlayer(direction: KetchupAndRaisins.Movement) {
            // If the player is in mid-air, decrease their movement speed by 10%.
            let speedModifier = 0;
            if (!this.player.body.onFloor()) {
                speedModifier = 0.10 * PlayingState.MOVEMENT_SPEED;
            }

            if (direction === KetchupAndRaisins.Movement.Left) {
                this.player.body.velocity.x = -PlayingState.MOVEMENT_SPEED - speedModifier;
            } else if (direction === KetchupAndRaisins.Movement.Right) {
                this.player.body.velocity.x = PlayingState.MOVEMENT_SPEED - speedModifier;
            } else if (direction === KetchupAndRaisins.Movement.Up) {
                // checks to see if the player is on the ground, then jumps and plays jumping sound
                if (this.player.body.onFloor()) {
                    this.player.body.velocity.y = -PlayingState.JUMPING_SPEED;
                }
            } else if (direction === KetchupAndRaisins.Movement.Down) {
                this.player.body.velocity.y = PlayingState.MOVEMENT_SPEED;
            }
        }

        collisionKetchupPlayer(player: Phaser.Sprite, ketchup: KetchupSprite) {
            let newExplosion = this.game.add.sprite(ketchup.x, ketchup.y, this.game.cache.getBitmapData('explosionCircle'));
            newExplosion.anchor.setTo(0.5, 0.5);
            this.game.physics.arcade.enable(newExplosion);

            let tween = this.game.add.tween(newExplosion.scale).to({x: 5, y: 5}, 300, "Linear", true);
            tween.onComplete.add(() => {
                newExplosion.kill();
            }, this);

            ketchup.kill();
            this.currentHealth--;

            this.game.camera.shake(0.01, 250);
        }

        collisionRaisinPlayer(player: Phaser.Sprite, raisin: Phaser.Sprite) {
            raisin.kill(); // Remove the raisin when it's been collected.
            this.score += PlayingState.RAISIN_POINT_VALUE; // Increment the score by a raisin point value.
            if (this.currentHealth < PlayingState.INITIAL_HEALTH) { // Increase the player's health, but only if they already aren't at full health.
                this.currentHealth += PlayingState.HEAL_AMOUNT;
            }
        }

        /*
         * For drawing the player's health bar at the top of the screen.
         */
        drawLifeBar() {
            this.lifeBar.clear();
            this.lifeBar.beginFill(PlayingState.LIFEBAR_COLOR);
            this.lifeBar.drawRoundedRect(0, 0, (this.game.width - 20) * (this.currentHealth / PlayingState.INITIAL_HEALTH), 30, 9);
            this.lifeBar.endFill();
            this.lifeBar.beginFill(0x999999); // Not sure why this is needed, really.        
        }

        update() {
            this.game.physics.arcade.collide(this.player, this.ketchupGroup, this.collisionKetchupPlayer, null, this);
            this.game.physics.arcade.overlap(this.player, this.raisinGroup, this.collisionRaisinPlayer, null, this);

            this.textScore.text = "" + this.score;

            // reset the player's avatar's velocity so it won't move forever
            this.player.body.velocity.x = 0;

            // processing cursor keys or onscreen controls input to move the player avatar
            if (this.cursors.left.isDown) {
                this.movePlayer(KetchupAndRaisins.Movement.Left);
            }
            else if (this.cursors.right.isDown) {
                this.movePlayer(KetchupAndRaisins.Movement.Right);
            }
            if (this.cursors.up.isDown) {
                this.movePlayer(KetchupAndRaisins.Movement.Up);
            } else if (this.cursors.down.isDown) {
                this.movePlayer(KetchupAndRaisins.Movement.Down);
            }

            this.drawLifeBar();
        }
    }

    export class Game {
        game: Phaser.Game;

        constructor() {
            this.game = new Phaser.Game(800, 600, Phaser.AUTO, "phaser");

            /* The boot state will contain an init() for the scale manager and will load the loading screen,
             * while the preloader will display the loading screen and load assets and then start the main game state.
             */
            this.game.state.add("BootState", BootState, true);
            this.game.state.add("PreloadState", PreloadState);
            this.game.state.add("GameState", PlayingState);
        }
    }
}

window.onload = () => {
    let game = new KetchupAndRaisins.Game();
};