import * as Phaser from "phaser";

export class loadingScene extends Phaser.Scene {
    private loadingBar: Phaser.GameObjects.Graphics;

    constructor() {
        super({ key: "loadingScene" });
    }

    preload(): void {
        this.load.image("logo", "assets/logo.png");
        this.cameras.main.setBackgroundColor(0x232426);
        this.loadingBar = this.add.graphics();

        this.load.on(
            "progress",
            function (this: loadingScene, value: number): void {
                this.loadingBar.clear();
                this.loadingBar.fillStyle(0x66c64b, 1);
                this.loadingBar.fillRect(
                    this.cameras.main.width / 4,
                    this.cameras.main.height / 2 + 100,
                    (this.cameras.main.width / 2) * value,
                    16
                );
            },
            this
        );

        this.load.on(
            "complete",
            function (this: loadingScene): void {
                this.loadingBar.destroy();
            },
            this
        );

        this.load.pack("preload", "assets/pack.json", "preload");
    }

    create(): void {
        this.add.image(400, 300, "logo");
    }

    update(): void {
        this.scene.start("gameScene");
    }
}
