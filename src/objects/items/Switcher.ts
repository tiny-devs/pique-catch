export class Switcher extends Phaser.GameObjects.Sprite {   
    private currentScene: Phaser.Scene;

    constructor(params) {
        super(params.scene, params.x, params.y, params.key);
        this.currentScene = params.scene;

        this.initPhysics();
        this.setDisplaySize(32,32);
        this.currentScene.add.existing(this);  
    }

    public changeLocation(x, y) {
        this.x = x;
        this.y = y;
    }

    private initPhysics(): void{
        this.currentScene.physics.world.enable(this);  
        this.body.setBounce(0.1);
        this.body.setCollideWorldBounds(true); 
    } 
}