import { Player } from "../objects/Player";
import { Switcher } from "../objects/items/Switcher";

const redColor = 0xff0000;
const blueColor = 0x4286f4;

export class gameScene extends Phaser.Scene {
    private players: Phaser.GameObjects.Group;
    private player1: Player;
    private player2: Player;
    private playerOneTurn: boolean;   
    private scoreText: Phaser.GameObjects.Text;
    private timerText: Phaser.GameObjects.Text;
    private roundTime: number;
    private initalRoundTime: number = 15;
    private switcher: Switcher;
    private itemPosition: number;
    private itemPositions: [] = [];
    private map: Phaser.Tilemaps.Tilemap;
    private walls: Phaser.Tilemaps.StaticTilemapLayer;
    private tileset: Phaser.Tilemaps.Tileset;
    private back: Phaser.Tilemaps.StaticTilemapLayer;
    private clouds: Phaser.GameObjects.TileSprite;
    private cloudSpawnDelay: number = 1000;
    private smallClouds: any[] = [];

    constructor() {
        super({
          key: "gameScene"
        });
    }

    init(): void{
        this.itemPosition = 0;
        this.players = this.add.group({ classType: Player }); 
        this.playerOneTurn = true; 
        this.sound.add('jump');
        this.sound.add('itemcatch');
        this.sound.add('playercatch');
        this.sound.add('switchturn');
        this.sound.add('dead');
    }

    create(): void {
        const cloudCachedKey = this.textures.get('clouds');
        const cloudCachedImage = cloudCachedKey.getSourceImage();
        this.clouds = this.add.tileSprite(
            cloudCachedImage.width + 100,
            this.game.canvas.height - cloudCachedImage.height * 1.5,
            cloudCachedImage.width,
            cloudCachedImage.height,
            'clouds'
        );
        this.clouds.setScale(3);

        this.map = this.add.tilemap('map1');
        this.tileset = this.map.addTilesetImage('genericspritesheet','tileset', 16, 16);
        this.walls = this.map.createStaticLayer('walls', this.tileset, 0, 0);
        this.walls.setCollisionBetween(1, 10000);
        this.back = this.map.createStaticLayer('back', this.tileset, 0, 0);
        this.children.bringToTop(this.walls);

        this.map.objects[0].objects.forEach(function (switcherPosition){
            this.itemPositions.push([switcherPosition.x, switcherPosition.y]);
        }.bind(this));


        this.switcher = this.addSwitcher(this.itemPositions[this.itemPosition][0], 
                                        this.itemPositions[this.itemPosition][1]);

        this.roundTime = this.initalRoundTime;
        this.player1 = this.addPlayer(1, 150, 290, redColor);
        this.player2 = this.addPlayer(2, 650, 290, blueColor);
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
        this.time.addEvent({ delay: this.cloudSpawnDelay, callback: this.cloudSpawner, callbackScope: this, loop: true });
    }

    cloudSpawner(): void{
        this.cloudSpawnDelay = Phaser.Math.Between(500, 2500);
        this.smallClouds.push(
            this.cloudSetup()
        );
    }

    cloudSetup(): any{
        let cloud;
        cloud = this.add.sprite(
            Phaser.Math.Between(-130, -65), 
            Phaser.Math.Between(0, this.game.canvas.height), 
            'smallclouds',
            Phaser.Math.Between(0, 3)
            ).setScale(2);
        cloud.speed = Phaser.Math.Between(1, 3);
        return cloud;
    }

    update(): void{
        this.smallClouds.forEach(function(cloud, index, object) {
            cloud.x += cloud.speed;
            if (cloud.x > this.game.canvas.width) {
                object.splice(index, 1);
            }
        }.bind(this));

        this.clouds.tilePositionX -= 0.3;
        this.timerText.setText(' - ' + this.roundTime + ' - ');

        this.physics.collide(this.players.getChildren(), this.walls);
        this.physics.collide(this.switcher, this.walls);
        
        this.physics.overlap(this.player1, this.player2, this.playerCatch, null, this);
        this.physics.overlap(this.players.getChildren(), this.switcher, this.getSwitcher, null, this);

        this.updateScore();
    }

    private playerCatch(): void{
        this.sound.play('playercatch');

        if(this.playerOneTurn)
        {
            this.player1.score++;
        }
        else
        {
            this.player2.score++;
        }

        this.toggleTurn();

        this.player1.setPosition(150, 290);
        this.player2.setPosition(650, 290);
        this.updateScore();
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

        this.roundTime = this.initalRoundTime;
    }

    private addSwitcher(x, y): Switcher{
        return new Switcher({
            scene: this,
            x: x,
            y: y,
            key: 'item'
          });
    }

    private addPlayer(playerNumber, x, y, tint): Player{
        let player = new Player({
            scene: this,
            x: x,
            y: y,
            tint: tint,
            key: "player",
            number: playerNumber
        });
        this.players.add(player);
        return player;
    }

    private tick(): void{
        this.roundTime--;

        if(this.roundTime < 0){
            this.playerOneTurn ? this.player2.score++ : this.player1.score++;
            this.updateScore();
            this.toggleTurn();
            this.roundTime = this.initalRoundTime;
        }
    }

    private toggleTurn(): void{
        this.sound.play('switchturn');

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

    private updateScore(): void{
        this.scoreText.setText('Player1: '+this.player1.score+'\nPlayer2: '+this.player2.score);
    }
}
