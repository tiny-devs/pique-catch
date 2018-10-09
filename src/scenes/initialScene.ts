import { Platform } from "../objects/Platform";

export class initialScene extends Phaser.Scene {
    private platforms: Phaser.GameObjects.Group;

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

}
