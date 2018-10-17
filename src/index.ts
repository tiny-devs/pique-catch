import "phaser";
import { initialScene } from "./scenes/initialSceneTiled";

/// <reference path="../../phaser.d.ts"/>

const config: GameConfig = {
    title: "Pique Catch",
    type: Phaser.AUTO,
    width: 800,
    height: 600,    
    backgroundColor: '#85b5e1',        
    scene: [initialScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    input: {
        keyboard: true
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
  