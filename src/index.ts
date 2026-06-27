import Phaser from "phaser";
import { loadingScene } from "./scenes/loadingScene";
import { gameScene } from "./scenes/gameScene";

const config: Phaser.Types.Core.GameConfig = {
    title: "Pique Catch",
    type: Phaser.AUTO,
    backgroundColor: "#85b5e1",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: "game",
        width: 800,
        height: 600
    },
    scene: [loadingScene, gameScene],
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    input: {
        keyboard: true,
        mouse: true
    },
    pixelArt: true
};

export class Game extends Phaser.Game {
    constructor(config: Phaser.Types.Core.GameConfig) {
        super(config);
    }
}

// Called by index.html after the player types a nickname.
(window as any).startGame = (nickname: string) => {
    (window as any).PLAYER_NAME = nickname;
    return new Game(config);
};
