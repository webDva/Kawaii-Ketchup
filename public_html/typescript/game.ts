/*
 * Template
 */
module GameModuleName {
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

    // enum for movement directions
    export enum Movement {
        Left,
        Right,
        Jump,
        Down
    }

    export class KetchupSprite extends Phaser.Sprite {
        targetToFollow: Phaser.Sprite;
        isFollowing: boolean = false;

        constructor(game: Phaser.Game, x: number, y: number, key: string) {
            super(game, x, y, key);

            this.game.physics.arcade.enable(this);
            this.checkWorldBounds = true;
            this.outOfBoundsKill = true;
            this.anchor.setTo(0.5, 0.5);

            this.scale.setTo(1.5, 1.5);

            // Add to the display, but the physics system already did this, so this is redundant.
            this.game.stage.addChild(this);
        }

        update() {
            if (this.isFollowing) {
                let angle = Phaser.Math.angleBetweenPoints(this.position, this.targetToFollow.body);
                this.body.velocity.x = Math.cos(angle) * 200;
                this.body.velocity.y = Math.sin(angle) * 200;

                this.rotation = angle + Math.PI / 2;
            }
        }
    }
    /*
     * The main game running state
     */
    export class GameState extends Phaser.State {
        game: Phaser.Game;

        player: Phaser.Sprite;
        health: number = 100;
        static INITIAL_HEALTH: number = 100;
        score: number = 0;
        textScore: Phaser.Text;

        missile: Phaser.Sprite;
        ketchupGroup: Phaser.Group;
        raisinGroup: Phaser.Group;

        raisinsCollected: number = 0;

        lifeBar: Phaser.Graphics;

        // keyboard cursor key controls
        cursors: Phaser.CursorKeys;

        static MOVE_VELOCITY: number = 365;
        static JUMP_VELOCITY: number = GameState.MOVE_VELOCITY + GameState.MOVE_VELOCITY * 0.38;

        constructor() {
            super();
        }

        create() {
            this.game.physics.startSystem(Phaser.Physics.ARCADE);
            //this.game.physics.arcade.gravity.x = -400;            

            // add cursor keys controls
            this.cursors = this.game.input.keyboard.createCursorKeys();

            this.player = this.game.add.sprite(100, this.game.world.centerY, 'player');
            this.player.scale.setTo(2, 2);
            this.game.physics.arcade.enable(this.player);
            this.player.body.gravity = new Phaser.Point(-this.game.physics.arcade.gravity.x, 400);
            this.player.body.collideWorldBounds = true;
            this.player.anchor.setTo(0.5, 0.5);

            this.ketchupGroup = this.game.add.group();

            let spawnTimer = this.game.time.create(false);
            spawnTimer.loop(800, () => {
                let singleKetchup = this.ketchupGroup.add(
                    new KetchupSprite(this.game, this.game.rnd.integerInRange(0, this.game.width), this.game.rnd.integerInRange(0, 150), 'ketchup')
                );

                // wait then attack

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

            this.textScore = this.game.add.text(0, 50, "" + this.raisinsCollected, {
                font: '4em "Segoe UI", Impact, sans-serif',
                fontWeight: "700",
                fill: "#2FDF00",
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
            this.lifeBar.beginFill(0xC70039);
            this.lifeBar.drawRoundedRect(0, 0, (this.game.width - 20) * (this.health / GameState.INITIAL_HEALTH), 30, 9);
            this.lifeBar.endFill();
            this.lifeBar.beginFill(0x999999);

            let dyingHealthTimer = this.game.time.create(false);
            dyingHealthTimer.loop(1800, () => {
                this.health--;
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
        movePlayer(direction: GameModuleName.Movement) {
            // If the player is in mid-air, decrease their movement speed by 10%.
            let speedModifier = 0;
            if (!this.player.body.onFloor()) {
                speedModifier = 0.10 * GameState.MOVE_VELOCITY;
            }

            if (direction === GameModuleName.Movement.Left) {
                this.player.body.velocity.x = -GameState.MOVE_VELOCITY - speedModifier;
            } else if (direction === GameModuleName.Movement.Right) {
                this.player.body.velocity.x = GameState.MOVE_VELOCITY - speedModifier;
            } else if (direction === GameModuleName.Movement.Jump) {
                // checks to see if the player is on the ground, then jumps and plays jumping sound
                if (this.player.body.onFloor()) {
                    this.player.body.velocity.y = -GameState.JUMP_VELOCITY;
                }
            } else if (direction === GameModuleName.Movement.Down) {
                this.player.body.velocity.y = GameState.MOVE_VELOCITY;
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
            this.health--;

            this.game.camera.shake(0.01, 250);
        }

        collisionRaisinPlayer(player: Phaser.Sprite, raisin: Phaser.Sprite) {
            raisin.kill();
            this.score += 10;
            if (this.health < GameState.INITIAL_HEALTH) {
                this.health++;
            }
        }

        update() {
            this.game.physics.arcade.collide(this.player, this.ketchupGroup, this.collisionKetchupPlayer, null, this);
            this.game.physics.arcade.overlap(this.player, this.raisinGroup, this.collisionRaisinPlayer, null, this);

            this.textScore.text = "" + this.score;

            // reset the player's avatar's velocity so it won't move forever
            this.player.body.velocity.x = 0;

            // processing cursor keys or onscreen controls input to move the player avatar
            if (this.cursors.left.isDown) {
                this.movePlayer(GameModuleName.Movement.Left);
            }
            else if (this.cursors.right.isDown) {
                this.movePlayer(GameModuleName.Movement.Right);
            }
            if (this.cursors.up.isDown) {
                this.movePlayer(GameModuleName.Movement.Jump);
            } else if (this.cursors.down.isDown) {
                this.movePlayer(GameModuleName.Movement.Down);
            }

            this.lifeBar.clear();
            this.lifeBar.beginFill(0xC70039);
            this.lifeBar.drawRoundedRect(0, 0, (this.game.width - 20) * (this.health / GameState.INITIAL_HEALTH), 30, 9);
            this.lifeBar.endFill();
            this.lifeBar.beginFill(0x999999);
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
            this.game.state.add("GameState", GameState);
        }
    }
}

window.onload = () => {
    let game = new GameModuleName.Game();
};