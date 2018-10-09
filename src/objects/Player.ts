export class Player extends Phaser.GameObjects.Sprite {    

    constructor(params) {
        super(params.scene, params.x, params.y, params.key);                          
        this.setOrigin(0, 0);        
        this.setSize(27,40); // Tamanho para colisao
        this.setTint(params.tint);             
        params.scene.add.existing(this);
        this.initPhysics();                        
    }
     
    update(): void{                 
    }

    initPhysics(): void{
        this.scene.physics.world.enable(this);  
        this.body.setBounce(0.1);
        this.body.setCollideWorldBounds(true); 
    }    
}