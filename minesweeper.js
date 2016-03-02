'use strict';

var CellState = {
    CLOSED: 0,
    OPENED: 1,
    MARKED_AS_BOMB: 2,
    DEFUSED: 3,
    DETONATED: 4
};

var GameState = {
    READY: 0,
    RUNNING: 1,
    WIN: 2,
    LOSING: 3
};

/*
 * Creates new instance of a closed cell without bomb.
 * Type {Cell} represents a cell on a minesweeper game field.
 * @constructor
 */
function Cell() {
    this._isBomb = false;
    this._state = CellState.CLOSED;
}

/*
 * Gets current cell state.
 * @type {number}
 */
Object.defineProperty(Cell.prototype, "state", {
    get: function () { return this._state; }
});

/*
 * Gets or sets a real existence of a bomb in the cell.
 * @type {boolean}
 */
Object.defineProperty(Cell.prototype, "isBomb", {
    set: function (value) { this._isBomb = value; },
    get: function () { return this._isBomb; }
});

/*
 * Opens the cell or detonates the bomb in the cell.
 * Returns True if cell state is changed, False otherwise.
 * @type {boolean}
 */
Cell.prototype.openOrDetonate = function () {
    return this._openOrDoOtherIfBomb(CellState.DETONATED);
}

/*
 * Opens the cell or defuse the bomb in the cell.
 * Returns True if cell state is changed, False otherwise.
 * @type {boolean}
 */
Cell.prototype.openOrDefuse = function () {
    return this._openOrDoOtherIfBomb(CellState.DEFUSED);
}

/*
 * Turns on/off the bomb mark on the cell. 
 * "A bomb mark" is just an user's assumption whether there is a bomb in a cell.
 * Returns True if cell state is changed, False otherwise.
 * @type {boolean}
 */
Cell.prototype.toggleBombMark = function () {
    var initialState = this._state;

    switch (this._state) {
        case CellState.MARKED_AS_BOMB:
            this._state = CellState.CLOSED;
            break;
        case CellState.CLOSED:
            this._state = CellState.MARKED_AS_BOMB;
            break;
        default:
            break;
    }
    return initialState !== this._state;
}

/*
 * Removes a bomb from the cell and closes the cell. 
 * Returns True if cell state is changed, False otherwise.
 * @type {boolean}
 */
Cell.prototype.reset = function () {
    this._isBomb = false;
    if (this._state !== CellState.CLOSED) {
        this._state = CellState.CLOSED;
        return true;
    }
    return false;
}

Cell.prototype._openOrDoOtherIfBomb = function (otherState) {
    if (this._state === CellState.CLOSED || this._state === CellState.MARKED_AS_BOMB) {
        // Assert(otherState, CellState.DEFUSED || CellState.DETONATED)
        this._state = this._isBomb ? otherState : CellState.OPENED;
        return true;
    }
    return false;
}

/*
 * Creates new instance of Minesweeper.
 * @param {number} fieldSize 
 * @param {number} bombNumber Number of bombs to be set.
 * @constructor
 */
function Minesweeper(fieldSize, bombNumber) {
    this._fieldSize = fieldSize;
    this._bombNumber = bombNumber;
    this.state = GameState.READY;

    // Initialize the game field.
    this._gameField = new Array(this._fieldSize);
    for (var i = 0; i < this._fieldSize; i++) {
        this._gameField[i] = new Array(this._fieldSize);
        for (var j = 0; j < this._fieldSize; j++) {
            var cell = new Cell();
            cell._position = { x: i, y: i };
            this._gameField[i][j] = cell;
        }
    }

    this._resetGameField(false);
}

Minesweeper.prototype.restartGame = function () {
    _resetGameField(true);
    this.state = GameState.READY;
}

Minesweeper.prototype._forEachCell = function (func) {

    for (var i = 0; i < this._fieldSize; i++) {
        for (var j = 0; j < this._fieldSize; j++) {
            var canBeStopped = func.call(this, this._gameField[i][j], i, j);
            if (canBeStopped) {
                return;
            }
        }
    }
}

Minesweeper.prototype._forEachAdjacentCell = function (func, x, y) {

    for (var i = Math.max(x - 1, 0) ; i <= Math.min(x + 1, this._fieldSize - 1) ; i++) {
        for (var j = Math.max(y - 1, 0) ; j <= Math.min(y + 1, this._fieldSize - 1) ; j++) {
            var canBeStopped = func.call(this, i, j);
            if (canBeStopped) {
                return;
            }
        }
    }
}

Minesweeper.prototype.openCell = function (x, y) {
    /*
    if (this.state === GameState.READY)
        this.state = GameState.RUNNING;

    if (this.state !== GameState.RUNNING)
        return;
    */

    var cell = this._gameField[x][y];
    var stateChanged = cell.openOrDetonate();
    if (stateChanged) {
        if (this.state === GameState.READY)
            this.state === GameState.RUNNING;

        this.notifyCellStateChanged(x, y);

        if (cell.state === CellState.DETONATED) {
            // Cell is bomb: Open all cells, detonate all bombs. A player is LooOoOooOseEeEeer!
            this._forEachCell(
                function(cell, i, j) {
                    if (cell.openOrDetonate()) {
                        this.notifyCellStateChanged(i, j);
                    }
                });
            this.state = GameState.LOSING;
        } else {
            if (!this._getNumberAdjacentBombs(x, y)) {

                this._forEachAdjacentCell(
                    function(i, j) {
                         this.openCell(i, j);
                    }, x, y);

            }

            // Check whether there are closed cells or cells which mistakenly marked as bomb, if no, set all bombs as DEFUSED. A user won :(...
            // this.state = GameState.LOSING;
            var win = true;

            this._forEachCell (
                function (cell, i, j) {
                    if (cell.state === CellState.CLOSED || (cell.state === CellState.MARKED_AS_BOMB && !cell.isBomb)) {
                        win = false;
                        return true;
                    }
                    return false;
                } );

            if (win) {
                this._forEachCell (
                    function(cell, i, j) {
                        if (cell.openOrDefuse()) {
                            this.notifyCellStateChanged(i, j);
                        }
                    });

                this.state = GameState.WIN;
            }

        }

    }
}

Minesweeper.prototype.toggleCellBombMark = function (x, y) {

    var stateChanged = this._gameField[x][y].toggleBombMark();

    if (stateChanged) {

        this.notifyCellStateChanged(x, y);

        var win = true;
        for (var i = 0; i < this._fieldSize; i++) {
            for (var j = 0; j < this._fieldSize; j++) {
                var cell = this._gameField[i][j];
                if (cell.state === CellState.CLOSED || (cell.state === CellState.MARKED_AS_BOMB && !cell.isBomb)) {
                    win = false;
                }
            }
        }

        if (win) {
            for (var i = 0; i < this._fieldSize; i++) {
                for (var j = 0; j < this._fieldSize; j++) {
                    if (this._gameField[i][j].openOrDefuse()) {
                        this.notifyCellStateChanged(i, j);
                    }
                }
            }
            this.state = GameState.WIN;
        }
    }
}

Minesweeper.prototype.notifyCellStateChanged = function (x, y) {
    if (this.onCellStateChanged)
        this.onCellStateChanged(x, y, this.getCellData(x, y));
}

/*
 * Returns a state of (x, y) cell and number of adjacent bombs if a cell is opened.
 */
Minesweeper.prototype.getCellData = function (x, y) {
    var state = this._gameField[x][y].state;
    var numberBombs = state == CellState.OPENED ? this._getNumberAdjacentBombs(x, y) : null;
    return { state: state, numberBombs: numberBombs };
}

/*
 * Resets all cells and tries to set all bombs.
 */
Minesweeper.prototype._resetGameField = function (resetCells) {

    if (resetCells) {
        // Reset all cells on the game field.
        this._forEachCell(
            function (cell, i, j) {
                if (cell.reset()) {
                    this.notifyCellStateChanged(i, j);
                }
            });
    }

    // Number of bombs which already set.
    var numberPutBombs = 0;

    // Admissible-Number-Of-Failed-Attempts-To-Put-All-Bombs is the simpliest way to prevent an infinity loop 
    // due to discrepancy of the game field size and number of bombs which need to be set.
    // If the code will have to make more attempts to set all bombs than specified number, 
    // we can assume that it is impossible to set so many bombs on this small game field.
    // This way is not absolutly correct, but it may not set all bombs only for mindless, not playable values of the game field size and number of bombs.
    var admissibleNumberFailedAttemptsToPutBomb = this._fieldSize * this._fieldSize;
    
    while (numberPutBombs < this._bombNumber && admissibleNumberFailedAttemptsToPutBomb) {
        // Generate a random (x, y) cell for a next bomb on the game field.
        var x = Math.floor(Math.random() * this._fieldSize);
        var y = Math.floor(Math.random() * this._fieldSize);
        var bombCanBePutHere = true;
        this._forEachAdjacentCell(
            function(i, j) {
                if (this._gameField[i][j].isBomb) {
                    bombCanBePutHere = false;
                    return true;
                }
            });

        if (bombCanBePutHere) {
            this._gameField[x][y].isBomb = true;
            numberPutBombs++;
        } else {
            admissibleNumberFailedAttemptsToPutBomb--;
        }
    }
}

Minesweeper.prototype._getNumberAdjacentBombs = function (x, y)
{
    // Assert(!_gameField[x][y].isBomb)
    var number = 0;

    this._forEachAdjacentCell(
        function (i, j) {
            if (this._gameField[i][j].isBomb) {
                number++;
            }
        }, x, y);
    
    return number;
}
