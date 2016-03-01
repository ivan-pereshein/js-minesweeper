'use strict';

var cellState = {
    CLOSED: 0,
    OPENED: 1,
    MARKED_AS_BOMB: 2,
    DEFUSED: 3,
    DETONATED: 4
};

var gameState = {
    READY: 0,
    RUNNING: 1,
    WIN: 2,
    LOSING: 3
};

/*
*
*   Cell.
*
*/
function Cell() {
    // Creates a non-bomb, closed cell.
    this._isBomb = false;
    this._state = cellState.CLOSED;
}

Cell.prototype.reset = function () {
    this._isBomb = false;
    if (this._state !== cellState.CLOSED) {
        this._state = cellState.CLOSED;
        return true;
    }
    return false;
}

Cell.prototype.setBomb = function () {
    this._isBomb = true;
}

Cell.prototype.isBomb = function () {
    return this._isBomb;
}

Cell.prototype.invertBombMark = function () {
    if (this._state === cellState.CLOSED) {
        this._state = cellState.MARKED_AS_BOMB;
        return true;
    }
    else if (this._state === cellState.MARKED_AS_BOMB) {
        this._state = cellState.CLOSED;
        return true;
    }
    return false;
}

Cell.prototype.openOrDetonate = function () {
    return this._openOrDoOtherIfBomb(cellState.DETONATED);
}

Cell.prototype.openOrDefuse = function () {
    return this._openOrDoOtherIfBomb(cellState.DEFUSED);
}

Cell.prototype.getState = function () {
    return this._state;
}

Cell.prototype._openOrDoOtherIfBomb = function (otherState) {
    if (this._state === cellState.CLOSED || this._state === cellState.MARKED_AS_BOMB) {
        // Assert(otherState, cellState.DEFUSED || cellState.DETONATED)
        this._state = this._isBomb ? otherState : cellState.OPENED;
        return true;
    }
    return false;
}

/*
*
*   Minesweeper.
*
*/
function Minesweeper(fieldSize, bombNumber) {
    this._fieldSize = fieldSize;
    this._bombNumber = bombNumber;
    this.state = gameState.READY;

    // Initialize the game field.
    this._gameField = new Array(this._fieldSize);
    for (var i = 0; i < this._fieldSize; i++) {
        this._gameField[i] = new Array(this._fieldSize);
        for (var j = 0; j < this._fieldSize; j++) {
            this._gameField[i][j] = new Cell();
        }
    }

    this._resetGameField(false);
}

Minesweeper.prototype.restartGame = function () {
    _resetGameField(true);
    this.state = gameState.READY;
}

Minesweeper.prototype.openCell = function (x, y) {
    // startedGame if not yet
    if (this.state === gameState.READY)
        this.state = gameState.RUNNING;

    if (this.state !== gameState.RUNNING)
        return;
    //alert(x + ' ' + y);
    var cell = this._gameField[x][y];
    var stateChanged = cell.openOrDetonate();
    if (stateChanged) {
        if (this.state === gameState.READY)
            this.state === gameState.RUNNING;

        this.notifyCellStateChanged(x, y);

        if (cell.getState() === cellState.DETONATED) {
            // Cell is bomb: Open all cells, detonate all bombs. A player is LooOoOooOseEeEeer!
            for (var i = 0; i < this._fieldSize; i++) {
                for (var j = 0; j < this._fieldSize; j++) {
                    if (this._gameField[i][j].openOrDetonate()) {
                        this.notifyCellStateChanged(i, j);
                    }
                }
            }
            this.state = gameState.LOSING;
        } else {
            // Assert(cell.getState() === cellState.OPENED)
            // Cell is not bomb: open cell, if cell does not have adjacent bombs then open all adjacent cells recurcively.
            if (!this._getNumberAdjacentBombs(x, y)) {
                for (var i = Math.max(x - 1, 0) ; i <= Math.min(x + 1, this._fieldSize - 1) ; i++) {
                    for (var j = Math.max(y - 1, 0) ; j <= Math.min(y + 1, this._fieldSize - 1) ; j++) {
                        this.openCell(i, j); // recurcive call.
                    }
                }
            }

            // Check whether there are closed cells or cells which mistakenly marked as bomb, if no, set all bombs as DEFUSED. A user won :(...
            // this.state = gameState.LOSING;
            var win = true;
            for (var i = 0; i < this._fieldSize; i++) {
                for (var j = 0; j < this._fieldSize; j++) {
                    var cell = this._gameField[i][j];
                    if (cell.getState() === cellState.CLOSED || (cell.getState() === cellState.MARKED_AS_BOMB && !cell.isBomb())) {
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
                this.state = gameState.WIN;
            }

        }

    }
}

Minesweeper.prototype.invertCellBombMark = function (x, y) {
    var stateChanged = this._gameField[x][y].invertBombMark();
    if (stateChanged) {
        this.notifyCellStateChanged(x, y);

        var win = true;
        for (var i = 0; i < this._fieldSize; i++) {
            for (var j = 0; j < this._fieldSize; j++) {
                var cell = this._gameField[i][j];
                if (cell.getState() === cellState.CLOSED || (cell.getState() === cellState.MARKED_AS_BOMB && !cell.isBomb())) {
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
            this.state = gameState.WIN;
        }

    }
}

Minesweeper.prototype.notifyCellStateChanged = function (x, y) {
    if (this.onCellStateChanged)
        this.onCellStateChanged(x, y, this.getCellData(x, y));
}


/*
*   Returns a state of (x, y) cell and number of adjacent bombs if a cell is opened.
*/
Minesweeper.prototype.getCellData = function (x, y) {
    var state = this._gameField[x][y].getState();
    var numberBombs = state == cellState.OPENED ? this._getNumberAdjacentBombs(x, y) : null;
    return { state: state, numberBombs: numberBombs };
    // return { state, numberBombs }; works in Chrome, doesn't work in IE.
}

/*
*   Resets all cells and tries to set bombs randomly.
*/
Minesweeper.prototype._resetGameField = function (clearCells) {

    if (clearCells) {
        // Reset all cells on the game field.
        for (var i = 0; i < this._fieldSize; i++) {
            for (var j = 0; j < this._fieldSize; j++) {
                if (this._gameField[i][j].reset()) {
                    this.notifyCellStateChanged(i, j);
                }
            }
        }
    }

    // Number of bombs which already set.
    var numberPutBombs = 0;

    // Admissible-Number-Of-Failed-Attempts-To-Put-All-Bombs is the simpliest (and a bit silly) way to prevent an infinity loop 
    // due to discrepancy of the game field size and number of bombs which need to be set.
    // If the code will have to make more attempts to set all bombs than specified number, 
    // we can assume that it is impossible to set so many bombs on this small game field.
    // This way is not absolutly correct, but it may give incorrect results only for mindless, not playable values of the game field size and number of bombs.
    var admissibleNumberFailedAttemptsToPutBomb = this._fieldSize * this._fieldSize;
    
    while (numberPutBombs < this._bombNumber && admissibleNumberFailedAttemptsToPutBomb) {
        // Generate a random (x, y) cell for a next bomb on the game field.
        var x = Math.floor(Math.random() * this._fieldSize);
        var y = Math.floor(Math.random() * this._fieldSize);
        var bombCanBePutHere = true;

        // Check all adjacent cells around a (x, y) cell. We cannot set a bomb if one of adjacent cells has an installed bomb.
        for (var i = Math.max(x - 1, 0) ; i <= Math.min(x + 1, this._fieldSize - 1) ; i++) {
            for (var j = Math.max(y - 1, 0) ; j <= Math.min(y + 1, this._fieldSize - 1) ; j++) {
                if (this._gameField[i][j].isBomb()) {
                    bombCanBePutHere = false;
                    break;
                }
            }
        }

        if (bombCanBePutHere) {
            this._gameField[x][y].setBomb();
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
    for (var i = Math.max(x - 1, 0) ; i <= Math.min(x + 1, this._fieldSize - 1) ; i++) {
        for (var j = Math.max(y - 1, 0) ; j <= Math.min(y + 1, this._fieldSize - 1) ; j++) {
            if (this._gameField[i][j].isBomb()) {
                number++;
            }
        }
    }
    return number;
}
