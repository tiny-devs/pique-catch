import { Platform } from "../objects/Platform";
import { Player } from "../objects/Player";
import { Switcher } from "../objects/items/Switcher";

const redColor = 0xff0000;
const blueColor = 0x4286f4;

export class initialScene extends Phaser.Scene {
    private platforms: Phaser.GameObjects.Group;
    private player1: Player;
    private player2: Player;
    private playerOneTurn: boolean;   
    private scoreText: Phaser.GameObjects.Text;
    private timerText: Phaser.GameObjects.Text;
    private roundTime: number;
    private initalRoundTime: number = 15;
    private switcher: Switcher;
    private itemPosition: number;
    private itemPositions;

    constructor() {
        super({
          key: "initialScene"
        });
    }

    init(): void{
        this.itemPosition = 0;
        this.itemPositions = [[450, 50],
                              [220, 220],
                              [730, 100],
                              [410, 250]];
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
        this.switcher = this.addSwitcher(this.itemPositions[this.itemPosition][0], 
                                        this.itemPositions[this.itemPosition][1]);
        this.roundTime = this.initalRoundTime;
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

        this.timerText = this.add.text(
            350,10,
            ' - ' + this.roundTime + ' - ',
            {
                fontFamily: "Connection",
                fontSize: 20                                          
            }
        );

        this.time.addEvent({ delay: 1000, callback: this.tick, callbackScope: this, loop: true });
    }

    update(): void{
        this.physics.collide(this.player1, this.platforms.getChildren());
        this.physics.collide(this.player2, this.platforms.getChildren());
        this.physics.overlap(this.player1, this.player2, this.playerCatch, null, this);  
        this.timerText.setText(' - ' + this.roundTime + ' - '); 

        this.physics.collide(this.switcher, this.platforms.getChildren());
        this.physics.overlap(this.player1, this.switcher, this.getSwitcher, null, this); 
        this.physics.overlap(this.player2, this.switcher, this.getSwitcher, null, this); 
    }

    private playerCatch(): void{

        if(this.playerOneTurn)
        {
            this.player1.score++;
        }
        else
        {
            this.player2.score++;
        }

        this.toggleTurn();

        this.player1.setPosition(100, 200);
        this.player2.setPosition(600, 300);
        this.scoreText.setText('Player1: '+this.player1.score+'\nPlayer2: '+this.player2.score);
    }

    private getSwitcher(player, switcher): void{
        this.toggleTurn();

        if(this.itemPosition + 1 < this.itemPositions.length){
            this.itemPosition++;

            switcher.changeLocation(this.itemPositions[this.itemPosition][0],
                                    this.itemPositions[this.itemPosition][1]);
        }
        else {
            
            this.itemPosition = 0;

            switcher.changeLocation(this.itemPositions[this.itemPosition][0],
                                    this.itemPositions[this.itemPosition][1]);
        }

        
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

    private addSwitcher(x, y): Switcher{
        return new Switcher({
            scene: this,
            x: x,
            y: y,
            key: 'item'
          });
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

    private tick(){
        this.roundTime--;

        if(this.roundTime < 0){
            this.toggleTurn();
            this.roundTime = this.initalRoundTime;
        }
    }

    private toggleTurn(){
        if(this.playerOneTurn)
        {
            this.player1.setTint(blueColor);
            this.player2.setTint(redColor);
        }
        else
        {
            this.player2.setTint(blueColor);
            this.player1.setTint(redColor);
            
        }

        this.playerOneTurn = !this.playerOneTurn;
    }
}
