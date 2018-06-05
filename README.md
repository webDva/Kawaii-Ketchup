# Kawaii Ketchup

Open source HTML5 game

# Setup/Installation

## Add Phaser node module

Run `npm install` to install the `phaser-ce` dependency else the game won't be built. See the `.gitignore` file to see excluded files.

## phaser.js

The `index.html` file needs a corresponding `phaser.js` file (from the `node_modules/phaser-ce/build` directory) in order to successfully run (the .git repository excluded it from being committed).

## typescript directory

The `typescript` directory needs the following files (as they were excluded from commits) from the `node_modules/phaser-ce/typescript` directory:

* `p2.d.ts`
* `phaser.d.ts`
* `pixi.d.ts`