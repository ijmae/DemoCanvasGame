//BEGIN : DEFINE CLASS
let simpleLevelPlan: string[] = [`
.............................
..@..........................
........................o.#..
..#....############.......#..
..#.....................#.#..
..#.......................#..
..#....|..........|....#..#..
..#.......................#..
..#.o....o..|..o.....o#...#..
..#########################..
.............................
+++++++++++++++++++++++++++++`, `
.........................|...
..@...............####.......
..................#+#.....o..
..#=...............v.....=#..
..#..........o..........#.#..
..#.....#...o.o..#........#..
..#........#####......#...#..
..#####...................#..
......#++++++++++###++++++#..
......#####################..
.............................
+++++++++++++++++++++++++++++`];

const SCALE_SIZE: number = 36;
const PLAYER_CONFIG: any = {
    size: [0.8, 1.5],
    moveSpeed: 0.1,
    gravitySpeed: 0.1,
    jumpHeight: 3,
    jumpSpeed: 0.2
};
const LAVA_CONFIG: any = {
    size: [1, 1],
    speed: {
        '=': 0.05,
        '|': 0.05,
        'v': 0.05
    }
};
const COIN_CONFIG: any = {
    size: [0.6, 0.6],
    jumpHeight: 3,
    jumpSpeed: 0.3
};
let isPause = false;
let curMap = 0;

function upgradeGame() {
    let factor = Math.floor(curMap / simpleLevelPlan.length) * 0.5;
    LAVA_CONFIG.speed = {
        '=': 0.05 * (1 + factor),
        '|': 0.05 * (1 + factor),
        'v': 0.05 * (1 + factor)
    }
    PLAYER_CONFIG.moveSpeed = 0.1 * (1 + factor / 2);
    PLAYER_CONFIG.gravitySpeed = 0.1 * (1 + factor / 2);
    PLAYER_CONFIG.jumpSpeed = 0.2 * (1 + factor / 2);

}

class Level {
    private _curPlan: string;
    private _width: number;
    private _height: number;
    private _startActors: any;
    private _rows: string[][];

    constructor(plan: string) {
        this.changePlan(plan);
    }

    get width(): number {
        return this._width;
    }
    get height(): number {
        return this._height;
    }
    get startActors(): any {
        return this._startActors;
    }
    get rows(): any {
        return this._rows;
    }
    set width(v) {
        this._width = v;
    }
    set height(v) {
        this._height = v;
    }
    set startActors(v) {
        this._startActors = v;
    }
    set rows(v) {
        this._rows = v;
    }

    changePlan(plan: string): void {
        let rows = plan.trim().split('\n').map(r => [...r]);
        this._curPlan = plan;
        this._width = rows[0].length;
        this._height = rows.length;
        this._startActors = [];
        this._rows = rows.map((row, y) =>
            row.map((ch, x) => {
                let type = LEVEL_CHARS[ch];
                if (typeof type === 'string') return type;
                this._startActors.push(
                    type.create(new Vec(x, y), ch)
                );
                return 'empty';
            })
        );
    }

    reLoad() {
        this.changePlan(this._curPlan);
    }
}

class State {
    private _level: Level;
    private _player: Player;
    private _coins: Coin[];
    private _lavas: Lava[];
    private _status: string;
    private _xOrigin: number;
    private _yOrigin: number;

    constructor(level: Level, status: string) {
        this._level = level;
        this._status = status;
        this._xOrigin = 0;
        this._yOrigin = 0;
        this.restart();

    }

    get level(): Level {
        return this._level;
    }

    get player(): Player {
        return this._player;
    }

    get coins(): Coin[] {
        return this._coins;
    }

    get lavas(): Lava[] {
        return this._lavas;
    }

    get status(): string {
        return this._status;
    }

    set status(v: string) {
        this._status = v;
    }

    get xOrigin(): number {
        return this._xOrigin;
    }

    set xOrigin(v: number) {
        this._xOrigin = v;
    }

    get yOrigin(): number {
        return this._yOrigin;
    }

    set yOrigin(v: number) {
        this._yOrigin = v;
    }

    restart(): State {
        this._level.reLoad();
        this._status = 'PLAYING';
        this._coins ? (this._coins.length = 0) : this._coins = [];
        this._lavas ? (this._lavas.length = 0) : this._lavas = [];
        let actors = this._level.startActors;
        actors.forEach((i: any) => {
            if (i.type === 'player') this._player = i;
            else if (i.type === 'coin') this._coins.push(i);
            else if (i.type === 'lava') this._lavas.push(i);
        })
        return this;
    }

    changeLevel(level: Level): void {
        this._level = level;
        this.restart();
    }

    update(keyState: any): State {
        if (isPause) this._status = 'PAUSING';
        if (this._status === 'PLAYING') {
            this._player.update(keyState, this);
            this._lavas.forEach(l => {
                l.update(this);
                if (isCollision2Actors(this._player, l)) this._status = 'LOSE';
            });
            this._coins.forEach((c, i) => {
                // c.update(this._level);
                if (isCollision2Actors(this._player, c)) {
                    this._coins[i] = null;
                }
            });
            this._coins = this._coins.filter(c => c);

            //Check all coin is collected
            if (this._coins.length === 0) this._status = 'WIN';

        } else if (this._status === 'LOSE') {
            this._status = 'LOSING';
            setTimeout(() => {
                this.restart();
            }, 500);
        } else if (this._status === 'PAUSING') {
            if (!isPause) this._status = 'PLAYING';
        } else if (this._status === 'WIN') {
            this._status = 'WINING';
            setTimeout(() => {
                upgradeGame();
                this.changeLevel(new Level(simpleLevelPlan[(curMap++ % simpleLevelPlan.length)]));
            }, 500);
        }
        return this;
    }

}

//BEGIN PAUSE GAME


//END PAUSE GAME

//BEGIN DETECT COLLISION
function isCollisionWithX(actor: any, level: Level, x: string) {
    let xMin = Math.floor(actor.pos.x);
    let xMax = Math.floor(actor.pos.x + actor.size.x - 0.01);
    let yMin = Math.floor(actor.pos.y);
    let yMax = Math.floor(actor.pos.y + actor.size.y - 0.01);
    if (xMin < 0 || yMin < 0 || xMax > level.rows[0].length - 1 || yMax > level.rows.length - 1) return true;

    for (let i = xMin; i <= xMax; i++) {
        for (let j = yMin; j <= yMax; j++) {
            if (level.rows[j][i] === x)
                return true;
        }
    }
    return false;
}

function isCollision2Actors(actor1: any, actor2: any) {
    let xMin1 = actor1.pos.x, xMax1 = actor1.pos.x + actor1.size.x;
    let yMin1 = actor1.pos.y, yMax1 = actor1.pos.y + actor1.size.y;
    let xMin2 = actor2.pos.x, xMax2 = actor2.pos.x + actor2.size.x;
    let yMin2 = actor2.pos.y, yMax2 = actor2.pos.y + actor2.size.y;

    return ((xMin1 < xMin2) ? (xMax1 > xMin2) : (xMax2 > xMin1)) &&
        ((yMin1 < yMin2) ? (yMax1 > yMin2) : (yMax2 > yMin1))
}

//END DETECT COLLISION

class Vec {
    private _x: number;
    private _y: number;

    constructor(x: number, y: number) {
        this._x = x;
        this._y = y
    }

    get x(): number {
        return this._x;
    }

    get y(): number {
        return this._y;
    }

    plus(vec: Vec): void {
        this._x += vec.x;
        this._y += vec.y;
    }

    multi(factor: number) {
        this._x *= factor;
        this._y *= factor;
    }
}

class Player {
    private _pos: Vec;
    private _jump: number;
    private _size: Vec;

    constructor(pos: Vec) {
        this._pos = pos;
        this._jump = 0;
        this._size = new Vec(PLAYER_CONFIG.size[0], PLAYER_CONFIG.size[1]);
    }

    get pos(): Vec {
        return this._pos;
    }

    get jump(): number {
        return this._jump;
    }

    set jump(v) {
        this._jump = Math.max(0, v);
    }

    get type(): string {
        return 'player';
    }

    get size(): Vec {
        return this._size;
    }

    set size(v: Vec) {
        this._size = v;
    }

    set pos(v: Vec) {
        this._pos = v;
    }

    static create(pos: Vec): Player {
        pos.plus(new Vec(0, -0.51));
        return new Player(pos);
    }

    update(keyState: any, state: State): void {
        if (keyState.ArrowLeft) {
            this._pos.plus(new Vec(-PLAYER_CONFIG.moveSpeed, 0));
            if (isCollisionWithX(this, state.level, 'wall')) {
                this._pos = new Vec(Math.round(this._pos.x), this._pos.y);
            }
        }
        if (keyState.ArrowRight) {
            this._pos.plus(new Vec(PLAYER_CONFIG.moveSpeed, 0));
            if (isCollisionWithX(this, state.level, 'wall')) {
                this._pos = new Vec(Math.floor(this._pos.x + this.size.x) - this.size.x - 0.01, this._pos.y);
            }
        }

        //Fold the head
        if (keyState.ArrowDown) {
            this.size = new Vec(PLAYER_CONFIG.size[0], 0.9);
            if (this.jump === 0)
                this.pos.plus(new Vec(0, PLAYER_CONFIG.size[1] - 0.9));
        } else {
            this.size = new Vec(PLAYER_CONFIG.size[0], PLAYER_CONFIG.size[1]);
        }

        //While jumping
        if (this.jump > 0) {
            this._pos.plus(new Vec(0, -PLAYER_CONFIG.jumpSpeed));
            this._jump -= PLAYER_CONFIG.jumpSpeed;
            if (this._jump === 0) this._jump = -1;
            if (isCollisionWithX(this, state.level, 'wall')) {
                this._jump = -1;
                this._pos = new Vec(this._pos.x, Math.round(this._pos.y));
            }
        } else {
            //gravity
            this._pos.plus(new Vec(0, PLAYER_CONFIG.gravitySpeed));
            this._jump -= PLAYER_CONFIG.jumpSpeed;
            if (isCollisionWithX(this, state.level, 'wall')) {
                this._jump = 0;
                this._pos = new Vec(this._pos.x, Math.floor(this._pos.y + this.size.y) - this.size.y - 0.01);
            }

        }

        //press Jump
        if (keyState.ArrowUp && this.jump === 0) {
            this.jump = PLAYER_CONFIG.jumpHeight;
        }
        //Check with lava
        if (isCollisionWithX(this, state.level, 'lava')) state.status = 'LOSE';

    }
}

class Lava {
    private _pos: Vec;
    private _speed: Vec;
    private _reset: Vec;

    constructor(pos: Vec, speed: Vec, reset: Vec = null) {
        this._pos = pos;
        this._speed = speed;
        this._reset = reset;
    }

    get pos(): Vec {
        return this._pos;
    }

    get type(): string {
        return 'lava';
    }

    get size(): Vec {
        return new Vec(LAVA_CONFIG.size[0], LAVA_CONFIG.size[1]);
    }

    static create(pos: Vec, ch: string): Lava {
        switch (ch) {
            case '=':
                return new Lava(pos, new Vec(LAVA_CONFIG.speed[ch], 0));
                break;
            case '|':
                return new Lava(pos, new Vec(0, LAVA_CONFIG.speed[ch]));
                break;
            case 'v':
                return new Lava(pos, new Vec(0, LAVA_CONFIG.speed[ch]), new Vec(pos.x, pos.y));
                break;
        }
    }

    update(state: State): Lava {
        this._pos.plus(this._speed);
        if (isCollisionWithX(this, state.level, 'wall'))
            (this._reset) ? this._pos = new Vec(this._reset.x, this._reset.y) : this._speed.multi(-1);
        return this;
    }
}

class Coin {
    private _pos: Vec;
    private _jump: number;

    constructor(pos: Vec) {
        this._pos = pos;
        this._jump = 0;
    }

    get pos(): Vec {
        return this._pos;
    }

    get type(): string {
        return 'coin';
    }

    get size(): Vec {
        return new Vec(COIN_CONFIG.size[0], COIN_CONFIG.size[1]);
    }

    static create(pos: Vec): Coin {
        pos.plus(new Vec((1 - COIN_CONFIG.size[0]) / 2, -COIN_CONFIG.size[0] / 2));
        return new Coin(pos);
    }

    update(): Coin {

        return this;
    }

}

const LEVEL_CHARS: any = {
    '.': 'empty', '#': 'wall', '+': 'lava',
    '@': Player, 'o': Coin,
    '=': Lava, '|': Lava, 'v': Lava
};

//END : DEFINE CLASS
//
//BEGIN : DOM DRAWING

function elt(elementName: string, attrs: any, ...children: any): HTMLElement {
    let node: any = document.createElement(elementName);
    for (let attr of Object.keys(attrs)) {
        node.setAttribute(attr, attrs[attr]);
    }
    children.forEach((child: any) => {
        node.appendChild(child);
    });
    return node;
}

function drawGrid(level: Level): any {
    return elt('table', { class: 'background', style: `width: ${level.width * SCALE_SIZE}px` }, ...level.rows.map((r: any) =>
        elt('tr', { style: `height: ${SCALE_SIZE}px` }, ...r.map((type: any) =>
            elt('td', { class: type, style: `width: ${SCALE_SIZE}px` }))
        )
    ));
};

function drawActor(player: Player, coins: Coin[], lavas: Lava[]): any {
    return elt('div', {},
        elt('div', { class: `actor ${player.type}`, style: `left: ${player.pos.x * SCALE_SIZE}px; top: ${player.pos.y * SCALE_SIZE}px; width: ${player.size.x * SCALE_SIZE}px; height: ${player.size.y * SCALE_SIZE}px` }),

        ...coins.map((c: Coin) => elt('div', { class: `actor ${c.type}`, style: `left: ${c.pos.x * SCALE_SIZE}px; top: ${c.pos.y * SCALE_SIZE}px; width: ${c.size.x * SCALE_SIZE}px; height: ${c.size.y * SCALE_SIZE}px` })),

        ...lavas.map((l: Lava) => elt('div', { class: `actor ${l.type}`, style: `left: ${l.pos.x * SCALE_SIZE}px; top: ${l.pos.y * SCALE_SIZE}px; width: ${l.size.x * SCALE_SIZE}px; height: ${l.size.y * SCALE_SIZE}px` })),
    )
};

function scrollWindowFollowPlayer(DOMGame: HTMLElement, player: Player) {
    let width = DOMGame.clientWidth;
    let height = DOMGame.clientHeight;
    let xCenter = (player.pos.x + player.size.x / 2) * SCALE_SIZE;
    let yCenter = (player.pos.y + player.size.y / 2) * SCALE_SIZE;
    DOMGame.scrollLeft = xCenter - width / 2;
    DOMGame.scrollTop = yCenter - height / 2;
}

class DOMDisplay {
    private _background: HTMLElement;
    private _actorsLayer: any;
    private _parent: HTMLElement;
    private _curMap: number;

    constructor(parent: HTMLElement, state: State) {
        this._background = elt('div', { class: `game ${state.status}` }, drawGrid(state.level));
        this._actorsLayer = drawActor(state.player, state.coins, state.lavas);
        this._background.appendChild(this._actorsLayer);
        this._parent = parent;
        this._curMap = 0;
        parent.appendChild(this._background);
    }

    reloadBackground(state: State) {
        this._background.remove();
        this._background = elt('div', { class: `game ${state.status}` }, drawGrid(state.level));
        this._parent.appendChild(this._background);
    }

    updateState(state: State) {
        if (this._curMap < curMap) {
            this.reloadBackground(state);
            this._curMap = curMap;
        }
        this._parent.className = state.status;
        this._actorsLayer.remove();
        this._background.className = `game ${state.status}`;
        this._actorsLayer = drawActor(state.player, state.coins, state.lavas);
        this._background.appendChild(this._actorsLayer);
        scrollWindowFollowPlayer(this._background, state.player);
    }
}

//END : DOM DRAWING
//
//Begin Canvas Drawing
//
const COLOR_DRAW: any = {
    empty: 'rgb(21, 101, 192)',
    lava: 'rgb(244, 67, 54)',
    wall: 'white',
    player: 'rgba(0, 0, 0, 0.801)',
    coin: 'yellow'
};

// function cScrollWindowFollowPlayer(mainCanvas: HTMLCanvasElement, player: Player) {
//     let width = mainCanvas.parentElement.clientWidth;
//     let height = mainCanvas.parentElement.clientHeight;
//     let xCenter = (player.pos.x + player.size.x / 2) * SCALE_SIZE;
//     let yCenter = (player.pos.y + player.size.y / 2) * SCALE_SIZE;
//     mainCanvas.style.transform = `translate(-${Math.min(mainCanvas.width - width, Math.max(0, xCenter - width / 2))}px,-${Math.min(mainCanvas.height - height, Math.max(0, yCenter - height / 2))}px)`;
// }

function cScrollWindowFollowPlayer(mainCanvas: HTMLCanvasElement, state: State) {
    let width = mainCanvas.parentElement.clientWidth;
    let height = mainCanvas.parentElement.clientHeight;
    let xCenter = (state.player.pos.x + state.player.size.x / 2) * SCALE_SIZE;
    let yCenter = (state.player.pos.y + state.player.size.y / 2) * SCALE_SIZE;
    state.xOrigin = -Math.min(mainCanvas.width - width, Math.max(0, xCenter - width / 2));
    state.yOrigin = -Math.min(mainCanvas.height - height, Math.max(0, yCenter - height / 2));
}

function cDrawBackground(level: Level): HTMLCanvasElement {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    canvas.width = level.width * SCALE_SIZE;
    canvas.height = level.height * SCALE_SIZE;
    level.rows.forEach((row: string[], y: number) => {
        row.forEach((block: string, x: number) => {
            ctx.fillStyle = COLOR_DRAW[block];
            ctx.fillRect(x * SCALE_SIZE, y * SCALE_SIZE, SCALE_SIZE, SCALE_SIZE);
        });
    });
    return canvas;
}

function cDrawActors(mainCanvas: HTMLCanvasElement, bgCanvas: HTMLCanvasElement, state: State) {
    let ctx = mainCanvas.getContext('2d');
    let actors = [state.player, ...state.lavas, ...state.coins];
    ctx.drawImage(bgCanvas, state.xOrigin, state.yOrigin);
    actors.forEach((actor) => {
        ctx.fillStyle = COLOR_DRAW[actor.type];
        ctx.fillRect(state.xOrigin + actor.pos.x * SCALE_SIZE, state.yOrigin + actor.pos.y * SCALE_SIZE, actor.size.x * SCALE_SIZE, actor.size.y * SCALE_SIZE);
    })
}

class CanvasDisplay {
    private _background: HTMLCanvasElement;
    private _mainCanvas: HTMLCanvasElement;
    private _parent: HTMLElement;
    private _curMap: number;

    constructor(parent: HTMLElement, state: State) {
        this._background = cDrawBackground(state.level);
        this._mainCanvas = document.createElement('canvas');
        this._mainCanvas.width = this._background.width;
        this._mainCanvas.height = this._background.height;
        cDrawActors(this._mainCanvas, this._background, state);
        this._parent = parent;
        this._curMap = 0;
        parent.appendChild(this._mainCanvas);
    }

    reloadBackground(state: State) {
        this._background.remove();
        this._background = cDrawBackground(state.level);
    }

    updateState(state: State) {
        if (this._curMap < curMap) {
            this.reloadBackground(state);
            this._curMap = curMap;
        }
        this._parent.className = state.status;
        cDrawActors(this._mainCanvas, this._background, state);
        cScrollWindowFollowPlayer(this._mainCanvas, state);
    }
}

//
//End Canvas Drawing

//BEGIN : TRACKING KEY

function trackingKey() {
    let keyState: any = {
        ArrowLeft: false,
        ArrowRight: false,
        ArrowUp: false,
        ArrowDown: false,
    };

    function track(e: any) {
        for (let key in keyState) {
            if (e.key === key) {
                keyState[key] = e.type === 'keydown';
                e.preventDefault();
            }
        }

        //press Esc
        if (e.type === 'keyup' && e.keyCode === 27) isPause = !isPause;
    }

    window.addEventListener('keydown', track);
    window.addEventListener('keyup', track);
    return keyState;
}
//END : TRACKING KEY
//
//START GAME
const GAME = {
    startDOM(parent: HTMLElement) {
        let level = new Level(simpleLevelPlan[(curMap++ % simpleLevelPlan.length)]);
        let state = new State(level, 'PLAYING');
        let domDisplay = new DOMDisplay(parent, state);
        let keyState = trackingKey();

        function runAnimate() {
            domDisplay.updateState(state.update(keyState));
            requestAnimationFrame(runAnimate);
        }
        requestAnimationFrame(runAnimate);
    },

    startCanvas(parent: HTMLElement) {
        let level = new Level(simpleLevelPlan[(curMap++ % simpleLevelPlan.length)]);
        let state = new State(level, 'PLAYING');
        let canvasDisplay = new CanvasDisplay(parent, state);
        let keyState = trackingKey();

        function runAnimate() {
            canvasDisplay.updateState(state.update(keyState));
            requestAnimationFrame(runAnimate);
        }
        requestAnimationFrame(runAnimate);
    }
}
//END START GAME


