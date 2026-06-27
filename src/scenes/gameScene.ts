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
    private frozen: boolean = false;

    // cameras
    private uiCamera: Phaser.Cameras.Scene2D.Camera;

    // hud (UI camera)
    private hud: Phaser.GameObjects.Text;
    private rankText: Phaser.GameObjects.Text;
    private roundText: Phaser.GameObjects.Text;
    private announce: Phaser.GameObjects.Text;
    private catchText: Phaser.GameObjects.Text;

    // world overlay
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

        // --- HUD (rendered by a separate UI camera so it is never zoomed/grayed)
        this.rankText = this.add.text(10, 8, '', {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
        }).setDepth(1000);
        this.rankText.setStroke('#000000', 4);

        this.roundText = this.add.text(400, 8, '', {
            fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5, 0).setDepth(1000);
        this.roundText.setStroke('#000000', 4);

        this.hud = this.add.text(790, 8, '', {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'right'
        }).setOrigin(1, 0).setDepth(1000);
        this.hud.setStroke('#000000', 3);

        this.announce = this.add.text(400, 110, '', {
            fontFamily: 'monospace', fontSize: '24px', color: '#ffd23f', align: 'center'
        }).setOrigin(0.5).setDepth(1001);
        this.announce.setStroke('#000000', 5);

        this.catchText = this.add.text(400, 300, '', {
            fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '40px',
            color: '#ffffff', align: 'center', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1002).setAlpha(0);
        this.catchText.setStroke('#000000', 8);

        // --- two-camera split: main = world (zoom/B&W), uiCamera = HUD (always crisp)
        this.uiCamera = this.cameras.add(0, 0, 800, 600);
        const uiObjects: Phaser.GameObjects.GameObject[] =
            [this.rankText, this.roundText, this.hud, this.announce, this.catchText];
        const worldObjects: Phaser.GameObjects.GameObject[] =
            [this.clouds, this.back, this.walls, this.marker, this.localPlayer, this.localLabel];
        this.cameras.main.ignore(uiObjects);
        this.uiCamera.ignore(worldObjects);

        // --- networking
        this.connect();
        this.time.addEvent({
            delay: 2000, loop: true, callback: () => this.send({ t: 'ping', ts: this.now() })
        });
        this.events.once('shutdown', () => { if (this.ws) this.ws.close(); });
    }

    update(time: number): void {
        if (this.frozen) return; // cinematic running — camera/tweens keep playing on their own

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

    // -------------------------------------------------------------- cinematic
    private startCatchCinematic(msg: any): void {
        if (this.frozen) return;
        this.frozen = true;

        const cam = this.cameras.main;
        const fx = (msg.catcher.x + msg.victim.x) / 2 + 8;
        const fy = (msg.catcher.y + msg.victim.y) / 2 + 8;

        this.physics.pause();
        this.setHudVisible(false);

        // impact juice
        cam.flash(160, 255, 255, 255);
        cam.shake(240, 0.014);
        cam.pan(fx, fy, 380, 'Sine.easeInOut');
        cam.zoomTo(3.2, 380, 'Sine.easeInOut');

        // desaturate to black & white (WebGL only)
        let gray: any = null;
        if (this.renderer.type === Phaser.WEBGL && (cam as any).postFX) {
            gray = (cam as any).postFX.addColorMatrix();
            this.tweens.addCounter({
                from: 0, to: 1, duration: 280,
                onUpdate: (tw) => gray.grayscale(tw.getValue())
            });
        }

        // "X caught Y" with a punchy scale-in
        const catcher = msg.catcher.id === this.myId ? 'You' : msg.catcher.name;
        const victim = msg.victim.id === this.myId ? 'you' : msg.victim.name;
        this.catchText.setText(catcher + ' caught ' + victim + '!');
        this.catchText.setAlpha(1).setScale(0).setAngle(-6);
        this.tweens.add({ targets: this.catchText, scale: 1, angle: 0, duration: 550, ease: 'Back.easeOut' });
        this.tweens.add({ targets: this.catchText, scale: 1.06, yoyo: true, repeat: 2, delay: 600, duration: 220 });

        this.time.delayedCall(2500, () => this.endCatchCinematic());
    }

    private endCatchCinematic(): void {
        const cam = this.cameras.main;
        cam.zoomTo(1, 320, 'Sine.easeInOut');
        cam.pan(400, 300, 320, 'Sine.easeInOut');
        this.tweens.add({ targets: this.catchText, alpha: 0, duration: 260 });

        this.time.delayedCall(340, () => {
            if ((cam as any).postFX) (cam as any).postFX.clear();
            cam.setZoom(1);
            cam.centerOn(400, 300);
            this.physics.resume();
            this.setHudVisible(true);
            this.frozen = false;
        });
    }

    private setHudVisible(v: boolean): void {
        this.rankText.setVisible(v);
        this.roundText.setVisible(v);
        this.hud.setVisible(v);
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
                this.showAnnounce(me ? "You're IT! Run!" : 'Catch ' + msg.name + '!');
            } else if (msg.t === 'roundEnd') {
                if (msg.reason === 'caught') {
                    this.sound.play('playercatch');
                    this.startCatchCinematic(msg);
                } else {
                    this.sound.play('dead');
                    const me = msg.winner === this.myId;
                    this.showAnnounce((me ? 'You' : msg.name) + ' survived! +1');
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
                // remotes are world objects — keep them off the UI camera
                this.uiCamera.ignore([sprite, label]);
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
        const sorted = this.scoreboard.slice().sort((a, b) =>
            b.score - a.score || a.name.localeCompare(b.name));
        let rank = 'RANK\n';
        for (let i = 0; i < sorted.length && i < 8; i++) {
            const p = sorted[i];
            const tag = (p.id === this.marked ? '* ' : '  ')
                + p.name + (p.id === this.myId ? ' (you)' : '');
            rank += (i + 1) + '. ' + tag + '  ' + p.score + '\n';
        }
        this.rankText.setText(rank);

        if (this.phase === 'playing' && this.marked !== null) {
            const m = this.findPlayer(this.marked);
            const who = m ? (this.marked === this.myId ? 'YOU' : m.name) : '?';
            this.roundText.setText('CATCH: ' + who + '\n' + this.roundLeft + 's');
        } else {
            this.roundText.setText('New round...');
        }

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
        this.announce.setAlpha(1).setScale(0.6);
        this.tweens.add({ targets: this.announce, scale: 1, duration: 350, ease: 'Back.easeOut' });
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
