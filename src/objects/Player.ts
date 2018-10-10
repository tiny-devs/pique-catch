export class Player extends Phaser.GameObjects.Sprite {    
    private jumpKey: Phaser.Input.Keyboard.Key;
    private moveLeft: Phaser.Input.Keyboard.Key;
    private moveRight: Phaser.Input.Keyboard.Key;
    private currentScene: Phaser.Scene;
    private playerColor: number;
    private playerScore: number;
    private playerNumber: number;

    constructor(params) {
        super(params.scene, params.x, params.y, params.key);                          
        this.initVars(params);
        this.initPhysics();
        this.initInput(); 
        this.currentScene.add.existing(this);                       
    }

    preUpdate(): void{
        this.update();
    }
     
    update(): void{   
        if(this.moveLeft.isDown)
        {
            this.body.setVelocityX(-160); 
        }
        else if(this.moveRight.isDown)
        {
            this.body.setVelocityX(160); 
        }
        else
        {
            this.body.setVelocityX(0);
        }   
        
        if (this.jumpKey.isDown && (this.body.onFloor() || this.body.touching.down))
        {
            this.body.setVelocityY(-330);
        } 
              
    }

    private initInput(): void{
        if(this.playerNumber === 1)
        {
            this.jumpKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
            this.moveLeft = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
            this.moveRight = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        }
        else
        {
            this.jumpKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ZERO);
            this.moveLeft = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
            this.moveRight = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT); 
        }
    }

    private initPhysics(): void{
        this.currentScene.physics.world.enable(this);  
        this.body.setBounce(0.1);
        this.body.setCollideWorldBounds(true); 
    } 
    
    private initVars(params): void{
        this.playerColor = params.tint;
        this.currentScene = params.scene; 
        this.playerNumber = params.playerNumber;
        this.setOrigin(0, 0);        
        this.setSize(27,40); // Tamanho para colisao
        this.setTint(this.playerColor);
        this.playerScore = 0;        
    }

    public set score(newScore){
        this.playerScore = newScore;
    }

    public get score(){
        return this.playerScore;
    }
}