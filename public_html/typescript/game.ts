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
        }

        create() {
            this.game.state.start("MainMenuState");
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
        attackTimer: Phaser.Timer; // Looped timer for attacking the player.

        constructor(game: Phaser.Game, x: number, y: number, key: string) {
            super(game, x, y, key);

            this.scale.setTo(0.3, 0.3);
            this.game.physics.arcade.enable(this);
            this.checkWorldBounds = true;
            this.outOfBoundsKill = true;
            this.anchor.setTo(0.5, 0.5); // Set the center of the ketchup bottles.

            // Timers for ketchup actions.

            this.attackTimer = this.game.time.create();
            this.attackTimer.loop(900, () => {
                // Get the angle between the ketchup bottle and the player.
                let angle = Phaser.Math.angleBetweenPoints(this.position, this.targetToFollow.position);

                // Veer toward the player.
                this.body.velocity.x = Math.cos(angle) * 200;
                this.body.velocity.y = Math.sin(angle) * 200;
            }, this);

            // TTL timer.
            let TTLTimer = this.game.time.create();
            TTLTimer.add(PlayingState.KETCHUP_TTL, this.explode, this);

            // Start the timers
            this.attackTimer.start(PlayingState.KETCHUP_BEGIN_ATTACK_TIME); // A delay
            TTLTimer.start();

            // Add to the display, but the physics system already did this, so this is redundant.
            this.game.stage.addChild(this);
        }

        /*
         * Initialize or feed the ketchup bottle with information from the game state, such as the player sprite.
         */
        initialize(player: Phaser.Sprite) {
            this.targetToFollow = player;
        }

        explode() {
            // Disable the ketchup bottle's physics body so that it will no longer collide as it's now exploding and dying.
            this.body.enable = false;

            // Stop the attack timer.
            this.attackTimer.stop();

            // Change the texture of the ketchup bottle to an explosion.
            this.loadTexture('explosion');
            this.scale.setTo(0.01, 0.01); // then set its size to zero

            // An animation tween for creating an explosion effect. When done animating, kills the ketchup sprite.
            let tween = this.game.add.tween(this.scale).to({x: 1, y: 1}, 300, "Linear", true);
            tween.onComplete.add(() => {
                this.kill();
            }, this);
        }
    }

    export class RaisinSprite extends Phaser.Sprite {
        constructor(game: Phaser.Game, x: number, y: number, key: string) {
            super(game, x, y, key);

            this.game.physics.arcade.enable(this);

            // Good size!
            this.scale.setTo(0.5, 0.5);

            this.game.stage.addChild(this);
        }
    }

    /*
     * Main menu state
     */
    export class MainMenuState extends Phaser.State {



        constructor() {
            super();
        }

        init() {

        }

        preload() {
            this.game.load.spritesheet('startButton', 'assets/startButton.png', 640, 400);
        }

        create() {
            let startButton = this.game.add.button(this.game.world.centerX, 100, 'startButton', this.startGame, this, 0, 1);
            startButton.scale.set(0.5, 0.5);
            startButton.anchor.set(0.5, 0);
        }

        startGame() {
            this.game.state.start("PlayingState", true, true);
        }
    }

    /*
     * The main game running state
     */
    export class PlayingState extends Phaser.State {

        game: Phaser.Game;

        player: Phaser.Sprite;
        currentHealth: number;
        score: number;
        textScore: Phaser.Text;

        ketchupGroup: Phaser.Group;
        foodCollectibleGroup: Phaser.Group;

        healthBar: Phaser.Graphics;

        // keyboard cursor key controls
        cursorKeys: Phaser.CursorKeys;

        // onscreen controls sprites
        aButton: Phaser.Button;
        bButton: Phaser.Button;
        leftButton: Phaser.Button;
        rightButton: Phaser.Button;

        // booleans for button holding
        isAButtonPressed: boolean;
        isBButtonPressed: boolean;
        isLeftButtonPressed: boolean;
        isRightButtonPressed: boolean;

        watermark: Phaser.Text; // text for watermark for demo version

        collectRaisinSound: Phaser.Sound;
        ketchupHitSound: Phaser.Sound;

        // A bunch of constant values.

        static MOVEMENT_SPEED: number = 365;
        static JUMPING_SPEED: number = PlayingState.MOVEMENT_SPEED + PlayingState.MOVEMENT_SPEED * 0.38;
        static GRAVITY_Y_COMPONENT: number = 400;

        static INITIAL_HEALTH: number = 10;

        static KETCHUP_SPAWN_RATE: number = 800; // Number of milliseconds for spawning ketchup bottles.
        static KETCHUP_BEGIN_ATTACK_TIME: number = 500; //Number of milliseconds to wait before attacking the player.
        static KETCHUP_TTL: number = 5000; // Number of milliseconds for each individual ketchup to live.

        static RAISIN_POINT_VALUE: number = 10; // How much collecting an individual raisin is worth.
        static HEAL_AMOUNT: number = 1; // Determines how much to increase the player's health by when a raisin is collected.
        static HEALTH_DECREASE_TIME: number = 1800; // Number of milliseconds for how often to decrease the player's health.
        static HEALTH_DECREASE_AMOUNT: number = 1; // How much health to decrease per tick.

        static HEALTHBAR_COLOR: number = 0xC70039;
        static SCORE_TEXT_COLOR: string = "#004401";

        // Unused stuff can go here.

        foodSpritesCollected: number; // Can use this for calculating a score at the end of the game. Currently unused though.

        constructor() {
            super();
        }

        // Resetting class members' values for when this state gets started again.
        init() {
            this.score = 0;
            this.currentHealth = PlayingState.INITIAL_HEALTH
            this.foodSpritesCollected = 0;

            this.game.stage.backgroundColor = "#7691D8";
        }

        // Load assets that will be used during a game session.

        preload() {
            // Load player and ketchup art assets
            this.game.load.image('player', 'assets/player.png'); // the player avatar
            this.game.load.spritesheet('player_spritesheet', 'assets/player_spritesheet.png', 842, 1191, 4);
            this.game.load.spritesheet('run_left_spritesheet', 'assets/run_left_spritesheet.png', 842, 1191, 4);
            this.game.load.image('ketchup', 'assets/ketchup.png'); // ketchup bottle
            this.game.load.image('explosion', 'assets/explosion.png'); // load the explosion graphic  

            // Load the food art assets       
            this.game.load.image('raisin', 'assets/raisin.png');

            this.game.load.image("leftButton", "assets/leftarrow.png");
            this.game.load.image("rightButton", "assets/rightarrow.png");
            this.game.load.image('aButton', 'assets/abutton.png');
            this.game.load.image('bButton', 'assets/bbutton.png');

            this.game.load.audio("raisinCollectSound", "assets/raisinCollect.wav");
            this.game.load.audio('ketchupHitSound', 'assets/ketchupHit.wav');
        }

        create() {
            // Start the arcade physics system
            this.game.physics.startSystem(Phaser.Physics.ARCADE);

            // add sounds
            this.collectRaisinSound = this.game.add.audio('raisinCollectSound');
            this.ketchupHitSound = this.game.add.audio('ketchupHitSound');

            // add cursor keys controls
            this.cursorKeys = this.game.input.keyboard.createCursorKeys();

            // Add and configure the player sprite.
            this.player = this.game.add.sprite(100, this.game.world.centerY, 'player_spritesheet', 0);
            this.player.scale.setTo(0.1, 0.1);
            this.game.physics.arcade.enable(this.player);
            this.player.body.gravity = new Phaser.Point(-this.game.physics.arcade.gravity.x, PlayingState.GRAVITY_Y_COMPONENT);
            this.player.body.collideWorldBounds = true;
            this.player.anchor.setTo(0.5, 0.5);

            // right run animation
            let runAnimation = this.player.animations.add('runRight', null, 10);
            runAnimation.onComplete.add(() => {
                this.player.loadTexture('player_spritesheet'); // reset to the original if haven't done so already
                this.player.frame = 0;
            }, this);

            // run left animation
            let runLeftAnimation = this.player.animations.add('runLeft', null, 10);
            runLeftAnimation.onComplete.add(() => {
                this.player.loadTexture('run_left_spritesheet'); // change to the left-facing texture
                this.player.frame = 0;
            });

            // Create the Groups that will hold the ketchup bottles and collectibles.
            this.ketchupGroup = this.game.add.group();
            this.foodCollectibleGroup = this.game.add.group();

            // A spawn timer for creating ketchup bottles.
            let ketchupSpawnTimer = this.game.time.create();
            ketchupSpawnTimer.loop(PlayingState.KETCHUP_SPAWN_RATE, () => {
                let singleKetchup: KetchupSprite = this.ketchupGroup.add(
                    new KetchupSprite(this.game, this.game.rnd.integerInRange(0, this.game.width), this.game.rnd.integerInRange(0, 150), 'ketchup')
                );
                // Feed the new ketchup bottle information from this game state.
                singleKetchup.initialize(this.player);
            }, this);

            this.textScore = this.game.add.text(0, 50, "", {
                font: '4em "Segoe UI", Impact, sans-serif',
                fontWeight: "700",
                fill: PlayingState.SCORE_TEXT_COLOR,
                align: "center"
            });

            // Responsible for creating new collectibles.
            let foodSpawnTimer = this.game.time.create();
            foodSpawnTimer.loop(1500, () => {
                let aFoodSprite = new RaisinSprite(this.game, this.game.rnd.integerInRange(0, this.game.width - 24), this.game.rnd.integerInRange(this.game.world.centerY - 64, this.game.world.height - 24), 'raisin');
                this.foodCollectibleGroup.add(aFoodSprite);
            }, this);

            // Create the long health bar that gets displayed at the top of the screen.
            this.healthBar = this.game.add.graphics(10, 10);
            this.drawHealthBar();

            // add oncscreen controls to the screen, but only if touch is available
            if (this.game.device.touch) {
                this.aButton = this.game.add.button(500, 390, "aButton", null, this);
                this.aButton.fixedToCamera = true; // stay in one place like a UI button
                this.aButton.alpha = 0.4; // set transparency
                this.aButton.events.onInputDown.add(() => {
                    this.isAButtonPressed = true;
                });
                this.aButton.events.onInputUp.add(() => {
                    this.isAButtonPressed = false;
                });

                this.bButton = this.game.add.button(630, 390, "bButton", null, this);
                this.bButton.fixedToCamera = true; // stay in one place like a UI button
                this.bButton.alpha = 0.4; // set transparency
                this.bButton.events.onInputDown.add(() => {
                    this.isBButtonPressed = true;
                });
                this.bButton.events.onInputUp.add(() => {
                    this.isBButtonPressed = false;
                });

                this.leftButton = this.game.add.button(40, 380, "leftButton", null, this);
                this.leftButton.fixedToCamera = true;
                this.leftButton.alpha = 0.4;
                this.leftButton.events.onInputDown.add(() => {
                    this.isLeftButtonPressed = true;
                });
                this.leftButton.events.onInputUp.add(() => {
                    this.isLeftButtonPressed = false;
                });

                this.rightButton = this.game.add.button(300, 380, "rightButton", null, this);
                this.rightButton.anchor.x = 1;
                this.rightButton.fixedToCamera = true;
                this.rightButton.alpha = 0.4;
                this.rightButton.events.onInputDown.add(() => {
                    this.isRightButtonPressed = true;
                });
                this.rightButton.events.onInputUp.add(() => {
                    this.isRightButtonPressed = false;
                });
            }

            // Decreases the player's health over time.
            let dyingHealthTimer = this.game.time.create();
            dyingHealthTimer.loop(PlayingState.HEALTH_DECREASE_TIME, () => {
                this.currentHealth -= PlayingState.HEALTH_DECREASE_AMOUNT;
            }, this);

            // Responsible for calculating the player's score.
            let calculateScoreTimer = this.game.time.create();
            calculateScoreTimer.loop(900, () => {
                this.score += 80;
            }, this);

            // Start all the timers.
            ketchupSpawnTimer.start();
            foodSpawnTimer.start();
            dyingHealthTimer.start();
            calculateScoreTimer.start();
        }

        // Class methods for the playing state.

        /*
         * controls player movement
         */
        movePlayer(direction: KetchupAndRaisins.Movement) {
            // If the player is in mid-air, decrease their movement speed by 10%.
            let speedModifier = 0;
            if (!this.player.body.onFloor()) {
                speedModifier = 0.10 * PlayingState.MOVEMENT_SPEED;
            }

            if (direction === KetchupAndRaisins.Movement.Left) {
                this.player.body.velocity.x = -PlayingState.MOVEMENT_SPEED - speedModifier;
                this.player.animations.play('runLeft');
            } else if (direction === KetchupAndRaisins.Movement.Right) {
                this.player.body.velocity.x = PlayingState.MOVEMENT_SPEED - speedModifier;
                this.player.animations.play('runRight');
            } else if (direction === KetchupAndRaisins.Movement.Up) {
                // checks to see if the player is on the ground, then jumps and plays jumping sound
                if (this.player.body.onFloor()) {
                    this.player.body.velocity.y = -PlayingState.JUMPING_SPEED;
                }
            } else if (direction === KetchupAndRaisins.Movement.Down) {
                this.player.body.velocity.y = PlayingState.MOVEMENT_SPEED;
            }
        }

        /*
         * Callback for collisions between ketchup bottles and the player.
         */
        collisionKetchupPlayerCallback(player: Phaser.Sprite, ketchup: KetchupSprite) {
            ketchup.explode();
            this.currentHealth--;
            this.game.camera.shake(0.01, 250);
            this.ketchupHitSound.play();
        }

        /*
         * Callback for collisions between FoodSprite collectibles and the player.
         */
        collisionFoodCollectiblePlayerCallback(player: Phaser.Sprite, food: Phaser.Sprite) {
            // text for raisin tween
            let text: Phaser.Text = this.game.add.text(
                food.x + food.width / 2,
                food.y - food.height / 2,
                '+ ' + PlayingState.RAISIN_POINT_VALUE,
                {
                    font: '3em Bookman',
                    fontWeight: '350',
                    fill: PlayingState.SCORE_TEXT_COLOR
                }
            );

            // tweens for fading and transforming text pop up
            this.game.add.tween(text).to({y: text.y - 50}, 500, null, true);
            let secondTween = this.game.add.tween(text).to({alpha: 0}, 500, null, true);
            secondTween.onComplete.add(() => {
                text.kill();
            }, this);

            food.kill(); // Remove the food when it's been collected.
            this.score += PlayingState.RAISIN_POINT_VALUE; // Increment the score by a raisin point value.
            if (this.currentHealth < PlayingState.INITIAL_HEALTH) { // Increase the player's health, but only if they already aren't at full health.
                this.currentHealth += PlayingState.HEAL_AMOUNT;
            }

            // play the raisin collect sound
            this.collectRaisinSound.play();
        }

        /*
         * For drawing the player's health bar at the top of the screen.
         */
        drawHealthBar() {
            this.healthBar.clear();
            this.healthBar.beginFill(PlayingState.HEALTHBAR_COLOR);
            this.healthBar.drawRoundedRect(0, 0, (this.game.width - 20) * (this.currentHealth / PlayingState.INITIAL_HEALTH), 30, 9);
            this.healthBar.endFill();
            this.healthBar.beginFill(0x999999); // Not sure why this is needed, really.        
        }

        update() {
            // Perform physics calculations.
            this.game.physics.arcade.collide(this.player, this.ketchupGroup, this.collisionKetchupPlayerCallback, null, this);
            this.game.physics.arcade.overlap(this.player, this.foodCollectibleGroup, this.collisionFoodCollectiblePlayerCallback, null, this);

            // Update the score text graphic.
            this.textScore.text = "" + this.score;

            // reset the player's avatar's velocity so it won't move forever
            this.player.body.velocity.x = 0;

            // processing cursor keys or onscreen controls input to move the player avatar
            if (this.cursorKeys.left.isDown || this.isLeftButtonPressed) {
                this.movePlayer(KetchupAndRaisins.Movement.Left);
            }
            else if (this.cursorKeys.right.isDown || this.isRightButtonPressed) {
                this.movePlayer(KetchupAndRaisins.Movement.Right);
            }
            if (this.cursorKeys.up.isDown || this.isAButtonPressed) {
                this.movePlayer(KetchupAndRaisins.Movement.Up);
            } else if (this.cursorKeys.down.isDown || this.isBButtonPressed) {
                this.movePlayer(KetchupAndRaisins.Movement.Down);
            }

            this.drawHealthBar(); // Have to continously redraw the health bar like this.

            // Start the losing state when the player dies and clear everything.
            if (this.currentHealth <= 0) {
                this.game.state.start("LosingState", true, true);
            }
        }
    }

    /*
     * State for handling losing.
     */
    export class LosingState extends Phaser.State {

        message: string;
        text: Phaser.Text;
        scoreText: Phaser.Text;

        phrasesOfSoulOfWaifu: string[] = [
            "Bacon's on the to-do list!",
            "You don't have to be sad...",
            "Don't be sad!",
            "Cereal! Cereal! I like cereal!",
            "Eat food or you'll become food.",
            "Remember the times when you felt kawaii and then remember how kawaii it made you feel.",
            "Omae wa mou shindeiru...",
            "Focus, baka!",
            "Oh dear, I'm quite certain that you're a kind person!",
            "My name's Kawaii-chan."
        ];

        constructor() {
            super();
        }

        // More than likely, won't be using this. Will instead be sharing data using this.game.state.states["PlayingState"].DATA
        init() {

        }

        preload() {
            this.game.load.image('kawaii', 'assets/kawaiichan.png');

            this.game.load.audio('lose_music', 'assets/lose_song.wav');
        }

        create() {
            this.game.stage.backgroundColor = "#5E87DE";

            let endMusic = this.game.add.audio('lose_music');
            endMusic.loop = true;
            endMusic.play();

            let kChanFace = this.game.add.sprite(this.game.world.centerX / 4, this.game.world.centerY, 'kawaii');
            kChanFace.anchor.setTo(0.5, 0.5);
            kChanFace.scale.setTo(0.5, 0.5);

            this.message = this.phrasesOfSoulOfWaifu[this.game.rnd.integerInRange(0, this.phrasesOfSoulOfWaifu.length - 1)];

            this.text = this.game.add.text(186,
                this.game.world.centerY, '', {
                    font: '4em "Comic Sans MS"',
                    fontWeight: 'bold',
                    fill: '#ffffff',
                    align: 'center',
                    wordWrap: true,
                    wordWrapWidth: this.game.world.width - 186
                });
            this.text.anchor.setTo(0, 0.5);

            this.scoreText = this.game.add.text(
                this.game.world.centerX,
                0, '', {
                    font: '4em Impact',
                    fontWeight: 'bolder',
                    fill: '#ffffff',
                    align: 'center'
                }
            );
            this.scoreText.anchor.setTo(0.5, 0);
            this.scoreText.text = `score\n${this.game.state.states['PlayingState'].score}`;

            // Display the message character by character by creating a timer for each character.
            for (let i = 0, totalTime = 0; i < this.message.length; i++) {
                this.game.time.events.add(totalTime, () => {
                    this.text.text += this.message[i];
                }, this);
                // Depending on the character's index in the message string, display it after a specific delay.
                totalTime += 150;
            }

            let restartButton = this.game.add.text(this.game.world.centerX, this.game.world.height - 10, "Restart",
                {
                    font: "6em 'Segoe UI', Impact, sans-serif",
                    fill: "#ffffff",
                    align: "center"
                });
            restartButton.anchor.setTo(0.5, 1);
            restartButton.inputEnabled = true;
            restartButton.events.onInputDown.add(() => {
                this.game.state.start("PlayingState", true, true);
            }, this);
        }

        update() {

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
            this.game.state.add("MainMenuState", MainMenuState);
            this.game.state.add("PreloadState", PreloadState);
            this.game.state.add("PlayingState", PlayingState);
            this.game.state.add("LosingState", LosingState);
        }
    }
}

// Kinda like starting the game.
window.onload = () => {
    let game = new KetchupAndRaisins.Game();
};