export class menuScene extends Phaser.Scene {
    private playButton: Phaser.GameObjects.GameObject;

    constructor() {
        super({
          key: "menuScene"
        });
    }
         
    preload(): void {
        this.cameras.main.setBackgroundColor(0x232426);     
    }
   
    create(): void{
        this.add.image(400,300,"logo");
        this.playButton = this.add.sprite(this.cameras.main.width / 2,this.cameras.main.height/2 + 200,"playButton").setInteractive();

        this.playButton.on('pointerdown', function(pointer){            
            this.scene.start("gameScene");
        }, this);
    }  
    
}
