import { Platform } from "../objects/Platform";
import { Player } from "../objects/Player";

const redColor = 0xff0000;
const blueColor = 0x4286f4;

export class initialScene extends Phaser.Scene {
    private platforms: Phaser.GameObjects.Group;
    private player1: Player;
    private player2: Player;
    private playerOneTurn: boolean;   
    private scoreText: Phaser.GameObjects.Text;
    

    constructor() {
        super({
          key: "initialScene"
        });
    }

    init(): void{
        this.platforms = this.add.group({ classType: Platform }); 
        this.playerOneTurn = true; 
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
        this.player1 = this.addPlayer(1, 100, 200, redColor);
        this.player2 = this.addPlayer(2, 600, 300, blueColor);
        this.scoreText = this.add.text(
            10,10,
            'Player1: '+this.player1.score+'\nPlayer2: '+this.player2.score,
            {
              fontFamily: "Connection",
              fontSize: 20                                          
            }
          );
    }

    update(): void{
        this.physics.collide(this.player1, this.platforms.getChildren());
        this.physics.collide(this.player2, this.platforms.getChildren());
        this.player1.update();
        this.player2.update();
        this.physics.overlap(this.player1, this.player2, this.playerCatch, null, this);   
    }

    private playerCatch(): void{
        if(this.playerOneTurn)
        {
            this.playerOneTurn = false;
            this.player1.score++;
            this.player1.setTint(blueColor);
            this.player2.setTint(redColor);
        }
        else
        {
            this.player2.score++;
            this.player2.setTint(blueColor);
            this.player1.setTint(redColor);
            this.playerOneTurn = true;
        }
        this.player1.setPosition(100, 200);
        this.player2.setPosition(600, 300);
        this.scoreText.setText('Player1: '+this.player1.score+'\nPlayer2: '+this.player2.score);
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

    private addPlayer(playernumber, x, y, tint): Player{
        return new Player({
            scene: this,
            x: x,
            y: y,
            tint: tint,
            key: "player",
            playerNumber: playernumber
        });
    }


}
