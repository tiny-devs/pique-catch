export class Player extends Phaser.GameObjects.Sprite {    
    private jumpKey: Phaser.Input.Keyboard.Key;
    private moveLeft: Phaser.Input.Keyboard.Key;
    private moveRight: Phaser.Input.Keyboard.Key;
    private currentScene: Phaser.Scene;
    private color: number;
    private _score: number;
    private number: number;
    private velocity: number;
    private jumpVelocity: number;

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
            this.body.setVelocityX(-this.velocity); 
        }
        else if(this.moveRight.isDown)
        {
            this.body.setVelocityX(this.velocity); 
        }
        else
        {
            this.body.setVelocityX(0);
        }   
        
        if (this.jumpKey.isDown && (this.body.onFloor() || this.body.touching.down))
        {
            this.body.setVelocityY(-this.jumpVelocity);
        }

        if (this.y > this.scene.sys.canvas.width) {
            this.score--;
            this.setPosition(600, 480);
        }

        if (this.x < -this.body.width) {
            this.x = this.scene.sys.canvas.width;
        }
        else if (this.x > this.scene.sys.canvas.width + this.body.width) {
            this.x = -this.body.width;
        }

        if (this.y < -this.body.width ) {
            this.body.setVelocityY(0);
        }
    }

    private initInput(): void{
        if(this.number === 1)
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
        this.body.setCollideWorldBounds(false); 
    } 
    
    private initVars(params): void{
        this.color = params.tint;
        this.currentScene = params.scene; 
        this.number = params.number;
        this.setOrigin(0, 0);        
        this.setSize(16,16); // Tamanho para colisao
        this.setTint(this.color);
        this.score = 0;   
        this.velocity = 160;     
        this.jumpVelocity = 330;
    }

    public set score(newScore:number){
        this._score = newScore;
    }

    public get score():number{
        return this._score;
    }
}