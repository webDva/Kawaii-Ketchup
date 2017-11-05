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
            this.game.stage.backgroundColor = "#312341";
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

            // test square graphic
            let playerSquare = this.game.add.bitmapData(64, 64);
            playerSquare.rect(0, 0, 64, 64, 'rgb(255, 192, 203)');
            this.game.cache.addBitmapData('player', playerSquare);

            // test ketchup graphic
            let ketchupSqaure = this.game.add.bitmapData(10, 50);
            ketchupSqaure.rect(0, 0, 10, 50, 'rgb(255,10,10)');
            this.game.cache.addBitmapData('ketchup', ketchupSqaure);
        }

        create() {
            this.game.state.start("GameState");
        }
    }

    // enum for movement directions
    export enum Movement {
        Left,
        Right,
        Jump
    }

    export class KetchupSprite extends Phaser.Sprite {
        targetToFollow: Phaser.Sprite;
        isFollowing: boolean = false;

        constructor(game: Phaser.Game, x: number, y: number, key: Phaser.BitmapData) {
            super(game, x, y, key);

            this.game.physics.p2.enable(this);
            this.body.setRectangleFromSprite();

            this.checkWorldBounds = true;
            this.outOfBoundsKill = true;

            // Add to the display, but the physics system already did this, so this is redundant.
            this.game.stage.addChild(this);
        }

        update() {
            if (this.isFollowing) {
                let angle = Phaser.Math.angleBetweenPoints(this.position, this.targetToFollow.body);
                this.body.velocity.x = Math.cos(angle) * 200;
                this.body.velocity.y = Math.sin(angle) * 200;
            }
        }
    }
    /*
     * The main game running state
     */
    export class GameState extends Phaser.State {
        game: Phaser.Game;

        player: Phaser.Sprite;
        livesCounter: number = 1000;
        textLives: Phaser.Text;

        missile: Phaser.Sprite;
        ketchupGroup: Phaser.Group;

        playerCollisionGroup: Phaser.Physics.P2.CollisionGroup;
        ketchupCollisionGroup: Phaser.Physics.P2.CollisionGroup;

        jumpTimer: number = 0;

        // keyboard cursor key controls
        cursors: Phaser.CursorKeys;

        static MOVE_VELOCITY: number = 200;
        static JUMP_VELOCITY: number = GameState.MOVE_VELOCITY + GameState.MOVE_VELOCITY * 0.38;

        constructor() {
            super();
        }

        create() {
            this.game.physics.startSystem(Phaser.Physics.P2JS);
            this.game.physics.p2.gravity.y = 100;

            this.game.physics.p2.setImpactEvents(true);
            //this.game.physics.p2.restitution = 0.8;

            this.playerCollisionGroup = this.game.physics.p2.createCollisionGroup();
            this.ketchupCollisionGroup = this.game.physics.p2.createCollisionGroup();

            this.game.physics.p2.updateBoundsCollisionGroup();

            // add cursor keys controls
            this.cursors = this.game.input.keyboard.createCursorKeys();

            this.player = this.game.add.sprite(100, this.game.world.centerY, this.game.cache.getBitmapData('player'));
            this.game.physics.p2.enable(this.player);
            this.player.body.fixedRotation = true;
            this.player.body.setRectangleFromSprite();
            this.player.body.setCollisionGroup(this.playerCollisionGroup);
            this.player.body.dynamic = true;

            let playerMaterial = this.game.physics.p2.createMaterial('playerMaterial', this.player.body);
            let ketchupMaterial = this.game.physics.p2.createMaterial('ketchupMaterial');

            this.player.body.collides(this.ketchupCollisionGroup, this.collisionKetchupPlayer, this);

            let ketchupPlayerContactMaterial = this.game.physics.p2.createContactMaterial(playerMaterial, ketchupMaterial);
            ketchupPlayerContactMaterial.restitution = 1;

            this.ketchupGroup = this.game.add.group();

            let spawnTimer = this.game.time.create(false);
            spawnTimer.loop(800, () => {
                let singleKetchup: KetchupSprite = this.ketchupGroup.add(
                    new KetchupSprite(this.game, this.game.rnd.integerInRange(0, this.game.width), this.game.rnd.integerInRange(0, 150), this.game.cache.getBitmapData('ketchup'))
                );

                singleKetchup.body.setCollisionGroup(this.ketchupCollisionGroup);
                singleKetchup.body.collides([this.ketchupCollisionGroup, this.playerCollisionGroup]);
                singleKetchup.body.setMaterial(ketchupMaterial);

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

            this.textLives = this.game.add.text(0, 0, "" + this.livesCounter, {
                font: '4em "Segoe UI", Impact, sans-serif',
                fontWeight: "700",
                fill: "#ffffff",
                align: "center"
            });
        }

        /*
         * controls player horizontal movement
         */
        movePlayer(direction: GameModuleName.Movement) {
            // The player's avatar's physics body will be disabled if they touch the lava hazards, so stop
            // controlling their movement if they're dead.
            //            if (!this.player.body.enable) {
            //                return;
            //            }

            if (direction === GameModuleName.Movement.Left) {
                this.player.body.moveLeft(GameState.MOVE_VELOCITY);
                //this.player.body.velocity.x = -GameState.MOVE_VELOCITY - speedModifier;
            } else if (direction === GameModuleName.Movement.Right) {
                this.player.body.moveRight(GameState.MOVE_VELOCITY);
                //this.player.body.velocity.x = GameState.MOVE_VELOCITY - speedModifier;
            } else if (direction === GameModuleName.Movement.Jump && this.game.time.now > this.jumpTimer && this.canJump()) {
                this.player.body.moveUp(GameState.JUMP_VELOCITY);
                this.jumpTimer = this.game.time.now + 500;
            }
        }

        canJump() {
            let result = false;

            for (let i = 0; i < this.game.physics.p2.world.narrowphase.contactEquations.length; i++) {
                let c = this.game.physics.p2.world.narrowphase.contactEquations[i];

                if (c.bodyA === this.player.body.data || c.bodyB === this.player.body.data) {
                    let d = p2.vec2.dot(c.normalA, p2.vec2.fromValues(0, 1));

                    if (c.bodyA === this.player.body.data) {
                        d *= -1;
                    }

                    if (d > 0.5) {
                        result = true;
                    }
                }
            }

            return result;
        }

        collisionKetchupPlayer(playerBody: Phaser.Physics.P2.Body, ketchup: Phaser.Physics.P2.Body) {
            ketchup.sprite.update = () => {};
            let killTimer = this.game.time.create(true);
            killTimer.add(1900, () => {
                ketchup.sprite.kill();
            }, this);
            killTimer.start();

            this.livesCounter--;
        }

        update() {
            //this.game.physics.arcade.collide(this.player, this.ketchupGroup, this.collisionKetchupPlayer, null, this);

            this.textLives.text = "" + this.livesCounter;

            // reset the player's avatar's velocity so it won't move forever
            //this.player.body.velocity.x = 0;

            // processing cursor keys or onscreen controls input to move the player avatar
            if (this.cursors.left.isDown) {
                this.movePlayer(GameModuleName.Movement.Left);
            }
            else if (this.cursors.right.isDown) {
                this.movePlayer(GameModuleName.Movement.Right);
            } else {
                this.player.body.velocity.x = 0;
            }
            if (this.cursors.up.isDown) {
                this.movePlayer(GameModuleName.Movement.Jump);
            }
        }
    }

    export class Game {
        game: Phaser.Game;

        constructor() {
            this.game = new Phaser.Game(550, 550, Phaser.AUTO, "phaser");

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