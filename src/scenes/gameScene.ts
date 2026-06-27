import Phaser from "phaser";

interface RemotePlayer {
    sprite: Phaser.GameObjects.Sprite;
    label: Phaser.GameObjects.Text;
    tx: number;
    ty: number;
    flip: boolean;
}

interface StatePlayer {
    id: number;
    name: string;
    x: number;
    y: number;
    flip: boolean;
    color: number;
    score: number;
}

export class gameScene extends Phaser.Scene {
    // world
    private map: Phaser.Tilemaps.Tilemap;
    private walls: Phaser.Tilemaps.TilemapLayer;
    private tileset: Phaser.Tilemaps.Tileset;
    private back: Phaser.Tilemaps.TilemapLayer;
    private clouds: Phaser.GameObjects.TileSprite;

    // local player
    private localPlayer: Phaser.Physics.Arcade.Sprite;
    private localLabel: Phaser.GameObjects.Text;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyA: Phaser.Input.Keyboard.Key;
    private keyD: Phaser.Input.Keyboard.Key;
    private keyW: Phaser.Input.Keyboard.Key;
    private keySpace: Phaser.Input.Keyboard.Key;
    private readonly speed: number = 160;
    private readonly jumpPower: number = 330;
    private spawn: number[] = [400, 200];

    // network
    private ws: WebSocket;
    private myId: number = null;
    private myName: string = "Player";
    private remotes: { [id: number]: RemotePlayer } = {};
    private lastSent: number = 0;
    private ping: number = 0;

    // round / scores
    private scoreboard: StatePlayer[] = [];
    private marked: number = null;
    private roundLeft: number = 0;
    private phase: string = "waiting";

    // hud
    private hud: Phaser.GameObjects.Text;
    private rankText: Phaser.GameObjects.Text;
    private roundText: Phaser.GameObjects.Text;
    private announce: Phaser.GameObjects.Text;
    private marker: Phaser.GameObjects.Graphics;

    constructor() {
        super({ key: "gameScene" });
    }

    create(): void {
        this.myName = (window as any).PLAYER_NAME || "Player";

        // --- background clouds
        const cloudImage = this.textures.get('clouds').getSourceImage();
        this.clouds = this.add.tileSprite(
            cloudImage.width + 100,
            this.game.canvas.height - cloudImage.height * 1.5,
            cloudImage.width,
            cloudImage.height,
            'clouds'
        ).setScale(3).setDepth(0);

        // --- tilemap
        this.map = this.make.tilemap({ key: 'map1' });
        this.tileset = this.map.addTilesetImage('genericspritesheet', 'tileset', 16, 16);
        this.back = this.map.createLayer('back', this.tileset, 0, 0).setDepth(1);
        this.walls = this.map.createLayer('walls', this.tileset, 0, 0).setDepth(2);
        this.walls.setCollisionBetween(1, 10000);

        // --- marked-player highlight
        this.marker = this.add.graphics().setDepth(9);

        // --- local player
        this.localPlayer = this.physics.add.sprite(this.spawn[0], this.spawn[1], 'player');
        this.localPlayer.setOrigin(0, 0).setDepth(10);
        this.localPlayer.body.setBounce(0.1);
        this.physics.add.collider(this.localPlayer, this.walls);
        this.localLabel = this.makeLabel(this.myName).setDepth(11);

        // --- input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // --- HUD
        this.rankText = this.add.text(10, 8, '', {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
        }).setDepth(1000).setScrollFactor(0);
        this.rankText.setStroke('#000000', 4);

        this.roundText = this.add.text(400, 8, '', {
            fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5, 0).setDepth(1000).setScrollFactor(0);
        this.roundText.setStroke('#000000', 4);

        this.hud = this.add.text(790, 8, '', {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'right'
        }).setOrigin(1, 0).setDepth(1000).setScrollFactor(0);
        this.hud.setStroke('#000000', 3);

        this.announce = this.add.text(400, 270, '', {
            fontFamily: 'monospace', fontSize: '26px', color: '#ffd23f', align: 'center'
        }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);
        this.announce.setStroke('#000000', 5);

        // --- networking
        this.connect();
        this.time.addEvent({
            delay: 2000, loop: true, callback: () => this.send({ t: 'ping', ts: this.now() })
        });
        this.events.once('shutdown', () => { if (this.ws) this.ws.close(); });
    }

    update(time: number): void {
        this.clouds.tilePositionX -= 0.3;

        this.handleLocalMovement();
        this.followLabel(this.localLabel, this.localPlayer.x, this.localPlayer.y);
        this.interpolateRemotes();
        this.drawMarker();

        if (time - this.lastSent > 50) {
            this.lastSent = time;
            this.send({
                t: 'move',
                x: Math.round(this.localPlayer.x),
                y: Math.round(this.localPlayer.y),
                flip: this.localPlayer.flipX
            });
        }

        this.updateHud();
    }

    // ---------------------------------------------------------------- movement
    private handleLocalMovement(): void {
        const body: any = this.localPlayer.body;
        const tc: any = (window as any).touchControls || {};
        const left = this.cursors.left.isDown || this.keyA.isDown || tc.left;
        const right = this.cursors.right.isDown || this.keyD.isDown || tc.right;
        const jump = this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown || tc.jump;
        const onGround = body.onFloor() || body.blocked.down || body.touching.down;

        if (left) {
            this.localPlayer.setVelocityX(-this.speed);
            this.localPlayer.flipX = true;
        } else if (right) {
            this.localPlayer.setVelocityX(this.speed);
            this.localPlayer.flipX = false;
        } else {
            this.localPlayer.setVelocityX(0);
        }

        if (jump && onGround) {
            this.localPlayer.setVelocityY(-this.jumpPower);
            this.sound.play('jump');
        }

        const w = this.game.canvas.width;
        if (this.localPlayer.x < -16) this.localPlayer.x = w;
        else if (this.localPlayer.x > w + 16) this.localPlayer.x = -16;

        if (this.localPlayer.y > this.game.canvas.height + 40) {
            this.localPlayer.setPosition(this.spawn[0], this.spawn[1]);
            this.localPlayer.setVelocity(0, 0);
        }
    }

    private interpolateRemotes(): void {
        for (const id in this.remotes) {
            const r = this.remotes[id];
            r.sprite.x += (r.tx - r.sprite.x) * 0.25;
            r.sprite.y += (r.ty - r.sprite.y) * 0.25;
            r.sprite.flipX = r.flip;
            this.followLabel(r.label, r.sprite.x, r.sprite.y);
        }
    }

    // draws a pulsing ring around whoever is currently marked
    private drawMarker(): void {
        this.marker.clear();
        if (this.marked === null) return;

        let cx: number, cy: number;
        if (this.marked === this.myId) {
            cx = this.localPlayer.x + 8; cy = this.localPlayer.y + 8;
        } else if (this.remotes[this.marked]) {
            cx = this.remotes[this.marked].sprite.x + 8;
            cy = this.remotes[this.marked].sprite.y + 8;
        } else {
            return;
        }

        const pulse = 13 + Math.sin(this.time.now / 120) * 2;
        this.marker.lineStyle(3, 0xffd23f, 1);
        this.marker.strokeCircle(cx, cy, pulse);
    }

    // ----------------------------------------------------------------- network
    private connect(): void {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        try {
            this.ws = new WebSocket(proto + '//' + location.host);
        } catch (e) {
            return;
        }

        this.ws.onopen = () => this.send({ t: 'join', name: this.myName });

        this.ws.onmessage = (ev: MessageEvent) => {
            let msg: any;
            try { msg = JSON.parse(ev.data); } catch (e) { return; }

            if (msg.t === 'welcome') {
                this.myId = msg.id;
                this.localPlayer.setTint(msg.color);
                this.localPlayer.setPosition(msg.x, msg.y);
                this.spawn = [msg.x, msg.y];
                if (this.remotes[this.myId]) this.destroyRemote(this.myId);
            } else if (msg.t === 'state') {
                this.scoreboard = msg.players;
                this.marked = msg.marked;
                this.roundLeft = msg.roundLeft;
                this.phase = msg.phase;
                this.applyState(msg.players);
            } else if (msg.t === 'round') {
                this.sound.play('switchturn');
                const me = msg.marked === this.myId;
                this.showAnnounce(me ? 'VOCÊ é o marcado! Fuja!' : 'Peguem ' + msg.name + '!');
            } else if (msg.t === 'roundEnd') {
                const me = msg.winner === this.myId;
                if (msg.reason === 'caught') {
                    this.sound.play('playercatch');
                    this.showAnnounce((me ? 'Você' : msg.name) + ' pegou! +1');
                } else {
                    this.sound.play('dead');
                    this.showAnnounce((me ? 'Você' : msg.name) + ' sobreviveu! +1');
                }
            } else if (msg.t === 'pong') {
                this.ping = Math.round(this.now() - msg.ts);
            }
        };
    }

    private applyState(list: StatePlayer[]): void {
        const seen: { [id: number]: boolean } = {};

        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            if (this.myId !== null && p.id === this.myId) continue;
            seen[p.id] = true;

            let r = this.remotes[p.id];
            if (!r) {
                const sprite = this.add.sprite(p.x, p.y, 'player')
                    .setOrigin(0, 0).setTint(p.color).setDepth(10);
                const label = this.makeLabel(p.name).setDepth(11);
                r = this.remotes[p.id] = { sprite, label, tx: p.x, ty: p.y, flip: !!p.flip };
            }
            r.tx = p.x;
            r.ty = p.y;
            r.flip = !!p.flip;
            if (r.label.text !== p.name) r.label.setText(p.name);
        }

        for (const id in this.remotes) {
            if (!seen[id]) this.destroyRemote(Number(id));
        }
    }

    private destroyRemote(id: number): void {
        const r = this.remotes[id];
        if (!r) return;
        r.sprite.destroy();
        r.label.destroy();
        delete this.remotes[id];
    }

    private send(obj: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(obj));
        }
    }

    // -------------------------------------------------------------------- HUD
    private updateHud(): void {
        // leaderboard
        const sorted = this.scoreboard.slice().sort((a, b) =>
            b.score - a.score || a.name.localeCompare(b.name));
        let rank = 'RANK\n';
        for (let i = 0; i < sorted.length && i < 8; i++) {
            const p = sorted[i];
            const tag = (p.id === this.marked ? '* ' : '  ')
                + p.name + (p.id === this.myId ? ' (você)' : '');
            rank += (i + 1) + '. ' + tag + '  ' + p.score + '\n';
        }
        this.rankText.setText(rank);

        // round status
        if (this.phase === 'playing' && this.marked !== null) {
            const m = this.findPlayer(this.marked);
            const who = m ? (this.marked === this.myId ? 'VOCÊ' : m.name) : '?';
            this.roundText.setText('PEGA: ' + who + '\n' + this.roundLeft + 's');
        } else {
            this.roundText.setText('Nova rodada...');
        }

        // fps + ping
        const fps = Math.round((this.game.loop as any).actualFps);
        this.hud.setText('FPS ' + fps + '\nPing ' + this.ping + 'ms');
    }

    private findPlayer(id: number): StatePlayer {
        for (let i = 0; i < this.scoreboard.length; i++) {
            if (this.scoreboard[i].id === id) return this.scoreboard[i];
        }
        return null;
    }

    private showAnnounce(text: string): void {
        this.announce.setText(text);
        this.announce.setAlpha(1);
        this.tweens.add({ targets: this.announce, alpha: 0, delay: 1600, duration: 800 });
    }

    // ------------------------------------------------------------------ helpers
    private makeLabel(name: string): Phaser.GameObjects.Text {
        const label = this.add.text(0, 0, name, {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffffff'
        }).setOrigin(0.5, 1);
        label.setStroke('#000000', 3);
        return label;
    }

    private followLabel(label: Phaser.GameObjects.Text, x: number, y: number): void {
        label.setPosition(x + 8, y - 4);
    }

    private now(): number {
        return (typeof performance !== 'undefined') ? performance.now() : Date.now();
    }
}
