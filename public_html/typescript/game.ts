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

            // test missile graphic
            let missileSquare = this.game.add.bitmapData(10, 50);
            missileSquare.rect(0, 0, 10, 50, 'rgb(255,10,10)');
            this.game.cache.addBitmapData('missile', missileSquare);
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

    /*
     * The main game running state
     */
    export class GameState extends Phaser.State {
        game: Phaser.Game;

        player: Phaser.Sprite;

        missile: Phaser.Sprite;

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

            this.player = this.game.add.sprite(100, this.game.world.centerY, this.game.cache.getBitmapData('player'));
            this.game.physics.arcade.enable(this.player);
            this.player.body.gravity = new Phaser.Point(-this.game.physics.arcade.gravity.x, 400);
            this.player.body.collideWorldBounds = true;
            this.player.anchor.setTo(0.5, 0.5);

            this.missile = this.game.add.sprite(this.game.world.centerX, 50, this.game.cache.getBitmapData('missile'));
            this.game.physics.arcade.enable(this.missile);
            this.missile.body.gravity = new Phaser.Point(-this.game.physics.arcade.gravity.x, 400);
            this.missile.body.collideWorldBounds = true;
            this.missile.anchor.setTo(0.5, 0);
        }

        /*
         * controls player horizontal movement
         */
        movePlayer(direction: GameModuleName.Movement) {
            // The player's avatar's physics body will be disabled if they touch the lava hazards, so stop
            // controlling their movement if they're dead.
            if (!this.player.body.enable) {
                return;
            }

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
            }
        }

        homeIn() {
            if (this.game.physics.arcade.angleBetween(this.missile, this.player) - this.missile.body.angle > 0) {
                this.missile.body.rotation += 10;
            } else {
                this.missile.body.rotation -= 10;
            }

            this.game.physics.arcade.velocityFromAngle(this.missile.body.rotation, 200, this.missile.body.velocity);
        }

        update() {
            // reset the player's avatar's velocity so it won't move forever
            this.player.body.velocity.x = 0;

            this.homeIn();

            // processing cursor keys or onscreen controls input to move the player avatar
            if (this.cursors.left.isDown) {
                this.movePlayer(GameModuleName.Movement.Left);
            }
            else if (this.cursors.right.isDown) {
                this.movePlayer(GameModuleName.Movement.Right);
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