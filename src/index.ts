import * as Phaser from "phaser";
import { loadingScene } from "./scenes/loadingScene";
import { gameScene } from "./scenes/gameScene";

function buildConfig(): Phaser.Types.Core.GameConfig {
    return {
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
        input: { keyboard: true, mouse: true },
        pixelArt: true
    };
}

export class Game extends Phaser.Game {
    constructor(config: Phaser.Types.Core.GameConfig) {
        super(config);
    }
}

// Called by index.html (or auto-invoked below) once a nickname is chosen.
(window as any).startGame = (nickname: string) => {
    (window as any).PLAYER_NAME = nickname;

    const login = document.getElementById("login");
    if (login) login.style.display = "none";

    const isTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
    if (isTouch) {
        const touch = document.getElementById("touch");
        if (touch) touch.style.display = "block";
    }

    return new Game(buildConfig());
};

// If the player clicked PLAY before this bundle finished loading, start now.
if ((window as any).__pendingName) {
    (window as any).startGame((window as any).__pendingName);
    (window as any).__pendingName = null;
}
