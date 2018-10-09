export class initialScene extends Phaser.Scene {
    private phaserSprite: Phaser.GameObjects.Sprite;
    constructor() {
        super({
          key: "initialScene"
        });
    }

    preload(): void {
        this.load.pack(
            "preload",
            "./src/assets/pack.json",
            "preload"
          );
    }

    create(): void {
            
    }

}
