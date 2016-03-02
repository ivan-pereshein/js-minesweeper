'use strict';

var CellState = {
    CLOSED: 0,
    OPENED: 1,
    MARKED_AS_BOMB: 2,
    DEFUSED: 3,
    DETONATED: 4
};

var GameState = {
    INITIATED: 0,
    READY: 1,
    RUNNING: 2,
    WIN: 3,
    LOSS: 4
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
    this._state = GameState.INITIATED;
    this._gameField = new Array(this._fieldSize);

    for (var i = 0; i < this._fieldSize; i++) {
        this._gameField[i] = new Array(this._fieldSize);
    }
}

/*
 * Opens cell at specified position.
 * @param {number} x
 * @param {number} y
 */
Minesweeper.prototype.openCell = function (x, y) {

    if (!this._startGameIfNeeded())
        return;

    this._openCell(this._gameField[x][y]);
    this._setWinIfNeeded();
}

/*
 * Switches a bomb mark on a cell at specified position.
 * @param {number} x
 * @param {number} y
 */
Minesweeper.prototype.toggleCellBombMark = function (x, y) {

    if (!this._startGameIfNeeded())
        return;

    var cell = this._gameField[x][y];
    var stateChanged = cell.toggleBombMark();

    if (stateChanged) {
        this._notifyCellStateChanged(cell);
        this._setWinIfNeeded();
    }
}

Minesweeper.prototype.startGame = function () {
    this._resetGameField();
}

/*
 * Resets all cells and tries to set all bombs.
 */
Minesweeper.prototype._resetGameField = function () {

    // Reset all cells on the game field.
    this._forEachCell(
        function (paramCell, i, j) {
            if (paramCell) {
                if (paramCell.reset()) {
                    this._notifyCellStateChanged(paramCell);
                }
            } else {
                var cell = new Cell();
                cell._position = { x: i, y: j };
                this._gameField[i][j] = cell;
            }
        });

    // Number of bombs which already set.
    var numberPutBombs = 0;

    // Admissible-Number-Of-Failed-Attempts-To-Put-All-Bombs is the simpliest way to prevent an infinity loop 
    // due to discrepancy of the game field size and number of bombs which need to be set.
    // If the code will have to make more attempts to set all bombs than specified number, 
    // we can assume that it is impossible to set so many bombs on this small game field.
    // This method is not absolutely correct, but it may not be able to set all bombs (when theoretically possible to set all bombs) 
    // only for mindless, not playable values of the game field size and number of bombs.
    // Therefore, this method is good enough for standard fields sizes and number of bombs of the Minesweeper.
    var admissibleNumberFailedAttemptsToPutBomb = this._fieldSize * this._fieldSize;

    while (numberPutBombs < this._bombNumber && admissibleNumberFailedAttemptsToPutBomb) {
        // Generate random positions (x, y) for a next bomb on the game field.
        var x = Math.floor(Math.random() * this._fieldSize);
        var y = Math.floor(Math.random() * this._fieldSize);

        var selectedCell = this._gameField[x][y];

        var bombCanBePutHere = false;

        if (!selectedCell.isBomb) {
            // Check bombs in adjacent cells. Bombs cannot be put if all cells around have an installed bomb.
            var thereIsAtLeastOneAdjacentCellWithoutBomb = !this._allAdjacentCellsAreBombs(selectedCell);
            bombCanBePutHere = thereIsAtLeastOneAdjacentCellWithoutBomb;

            if (bombCanBePutHere) {
                // Set a fake bomb in selected cell for check that each adjacent cells will have at least one adjacent cell without bomb when we set a bomb into selected cell.
                selectedCell.isBomb = true;

                this._forEachAdjacentCell(
                    function (adjacentCell) {
                        if (adjacentCell.isBomb && this._allAdjacentCellsAreBombs(adjacentCell)) {
                            // We found a cell with a bomb that will be surrounded only by bombs if we set a bomb into selected cell.
                            // So, we cannot put a bomb into selected cell.
                            bombCanBePutHere = false;
                            // No sense to continue the search.
                            return true;
                        }                            
                    }, selectedCell);
                // Clear a fake bomb.
                selectedCell.isBomb = false;
            }

        }

        if (bombCanBePutHere) {
            selectedCell.isBomb = true;
            numberPutBombs++;
        } else {
            admissibleNumberFailedAttemptsToPutBomb--;
        }
    }

    this._setGameState(GameState.READY);
}

Minesweeper.prototype._allAdjacentCellsAreBombs = function (cell)
{
    var allBombs = true;
    this._forEachAdjacentCell(
        function (adjacentCell) {
            if (!adjacentCell.isBomb) {
                // Cell without bomb is found in an adjacent cell. So, new bomb can be put in the selected cell.
                allBombs = false;
                // No sense to continue the search.
                return true;
            }
        }, cell);
    return allBombs;
}

Minesweeper.prototype._openCell = function (cell) {

    var stateChanged = cell.openOrDetonate();

    if (stateChanged) {

        this._notifyCellStateChanged(cell);

        if (cell.state === CellState.DETONATED) {
            // There is a bomb in this cell and a bomb is detonated. The game is lost.
            this._setLoss();
        } else {
            // Assert(cell.state === CellState.OPENED)

            // If there is not a bomb around this cell, open all adjacent cells.
            if (!this._getNumberAdjacentBombs(cell)) {
                this._forEachAdjacentCell(
                    function (adjacentCell) {
                        this._openCell(adjacentCell); // recursive call.
                    }, cell);
            }
        }

    }
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

Minesweeper.prototype._forEachAdjacentCell = function (func, cell) {

    var x = cell._position.x;
    var y = cell._position.y;

    for (var i = Math.max(x - 1, 0) ; i <= Math.min(x + 1, this._fieldSize - 1) ; i++) {
        for (var j = Math.max(y - 1, 0) ; j <= Math.min(y + 1, this._fieldSize - 1) ; j++) {
            if (x === i && y === j)
                continue;
            var canBeStopped = func.call(this, this._gameField[i][j]);
            if (canBeStopped) {
                return;
            }
        }
    }
}

/*
 * Checks whether there are closed cells or cells which incorrectly marked as bomb. 
 * If such cells cannot be found, sets all bombs as DEFUSED and game state as WIN. 
 */
Minesweeper.prototype._setWinIfNeeded = function () {

    if (this._state !== GameState.RUNNING)
        return;

    var win = true;

    this._forEachCell(
            function (cell) {
                if (cell.state === CellState.CLOSED || (cell.state === CellState.MARKED_AS_BOMB && !cell.isBomb)) {
                    // A closed cell or a cell incorrectly marked as bomb means that game is not won.
                    win = false;
                    // A loop over all cells can be broken now. 
                    return true; 
                }
                return false;
            }
        );

    if (win) {
        this._forEachCell(
                function (cell) {
                    if (cell.openOrDefuse()) {
                        this._notifyCellStateChanged(cell);
                    }
                }
            );
        // Game over. A player is winner.
        this._setGameState(GameState.WIN);
    }    
}

Minesweeper.prototype._setLoss = function () {
    // There is a bomb in this cell and a bomb is detonated. Open all cells, detonate all bombs. 
    this._forEachCell(
        function (paramCell) {
            if (paramCell.openOrDetonate()) {
                this._notifyCellStateChanged(paramCell);
            }
        });
    // Game over. A player is LooOoOooOseEeEeer!
    this._setGameState(GameState.LOSS);
}

Minesweeper.prototype._setGameState = function (newState) {
    this._state = newState;
    this._notifyGameStateChanged(this._state);
}

Minesweeper.prototype._startGameIfNeeded = function () {

    // Run the game if the game is ready.
    if (this._state === GameState.READY)
        this._setGameState(GameState.RUNNING);

    return this._state === GameState.RUNNING;
}

/*
 * Returns a state of the specified cell and number of bombs in adjacent cells if the cell is opened.
 */
Minesweeper.prototype._getCellData = function (cell) {
    var state = cell.state;
    var numberBombs = state == CellState.OPENED ? this._getNumberAdjacentBombs(cell) : null;
    return { state: state, numberBombs: numberBombs };
}

Minesweeper.prototype._getNumberAdjacentBombs = function (cell)
{
    // Assert(cell.isBomb)
    var number = 0;

    this._forEachAdjacentCell(
        function (adjacentCell) {
            if (adjacentCell.isBomb) {
                number++;
            }
        }, cell);
    
    return number;
}

Minesweeper.prototype._notifyCellStateChanged = function (cell) {
    if (this.onCellStateChanged)
        this.onCellStateChanged(cell._position.x, cell._position.y, this._getCellData(cell));
}

Minesweeper.prototype._notifyGameStateChanged = function () {
    if (this.onGameStateChanged)
        this.onGameStateChanged(this._state);
}
