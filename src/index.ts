import "phaser";
import { loadingScene } from "./scenes/loadingScene";
import { menuScene } from "./scenes/menuScene";
import { gameScene } from "./scenes/gameScene";

/// <reference path="../../phaser.d.ts"/>

const config: GameConfig = {
    title: "Pique Catch",
    parent: 'game',
    type: Phaser.AUTO,
    width: 800,
    height: 600,    
    backgroundColor: '#85b5e1',        
    scene: [loadingScene, menuScene, gameScene],
    physics: {
        default: 'arcade',
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
    constructor(config: GameConfig) {
      super(config);      
    }
}
  
window.onload = () => {
    var game = new Game(config);      
};