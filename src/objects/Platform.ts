export class Platform extends Phaser.GameObjects.Image {
    constructor(params) {
        super(params.scene, params.x, params.y, params.key);                    
        this.setOrigin(0, 0);
        this.setSize(500,64); // Tamanho para colisao
        this.setDisplaySize(500,64); // Tamanho para exibir        
        params.scene.physics.world.enable(this);
        this.body.allowGravity = false;
        this.body.immovable = true;        
        params.scene.add.existing(this);
    }    
}