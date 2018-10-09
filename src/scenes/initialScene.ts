import { Platform } from "../objects/Platform";
import { Player } from "../objects/Player";

export class initialScene extends Phaser.Scene {
    private platforms: Phaser.GameObjects.Group;
    private player1: Player;
    private player2: Player;

    constructor() {
        super({
          key: "initialScene"
        });
    }

    init(): void{
        this.platforms = this.add.group({ classType: Platform });  
    }

    preload(): void {
        this.load.pack(
            "preload",
            "./src/assets/pack.json",
            "preload"
          );
    }

    create(): void {        
        this.addPlatform(200, 150);
        this.addPlatform(-200, 300);
        this.addPlatform(400, 450);
        this.player1 = this.addPlayer(100, 200, "0xff0000");
        this.player2 = this.addPlayer(600, 300, "0x4286f4");
    }

    update(): void{
        this.physics.collide(this.player1, this.platforms.getChildren());
        this.physics.collide(this.player2, this.platforms.getChildren());
    }

    private addPlatform(x, y): void{
        let platform = new Platform({
            scene: this,
            x: x,
            y: y,
            key: 'platform'
          });            
          this.platforms.add(platform);
    }

    private addPlayer(x, y, tint): Player{
        return new Player({
            scene: this,
            x: x,
            y: y,
            tint: tint,
            key: "player"
        });
    }

}
