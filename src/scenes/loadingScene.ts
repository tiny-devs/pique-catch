export class loadingScene extends Phaser.Scene {
    private loadingBar: Phaser.GameObjects.Graphics;

    constructor() {
        super({
          key: "loadingScene"
        });
    }
         
    preload(): void {
        this.load.image("logo", "/src/assets/logo.png");
        this.cameras.main.setBackgroundColor(0x232426);
        this.loadingBar = this.add.graphics();        

        this.load.on(
            "progress",
            function(value): void {
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
            function(): void{
                this.loadingBar.destroy();
            },
            this
        );

        this.load.pack(
            "preload",
            "./src/assets/pack.json",
            "preload"
          );
    }
   
    create(): void{
        this.add.image(400,300,"logo");
    }

    update(): void{
        this.scene.start("menuScene");
    }
    
    
}
