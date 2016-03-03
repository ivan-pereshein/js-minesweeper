'use strict';

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

    this._setBombsOnGameField();
}

/*
 * Gets current game state.
 * @type {number}
 */
Object.defineProperty(Minesweeper.prototype, "state", {
    get: function () { return this._state; }
});

/*
 * Opens or detonates a cell at the specified position.
 * @param {number} x Horizontal position.
 * @param {number} y Vertical position.
 */
Minesweeper.prototype.openCell = function (x, y) {

    if (!this._startGameIfNeeded())
        return;

    this._openCell(this._gameField[x][y]);
    this._setWinIfNeeded();
}

/*
 * Switches a bomb mark on a cell at the specified position.
 * @param {number} x Horizontal position.
 * @param {number} y Vertical position.
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

/*
 * Restarts the game.
 */
Minesweeper.prototype.restartGame = function () {
    this._setBombsOnGameField();
}

/*
 * Clears all cells if needed and tries to set all bombs on the game field.
 */
Minesweeper.prototype._setBombsOnGameField = function () {

    // Clear all cells on the game field.
    this._forEachCell(
        function (paramCell, i, j) {
            if (paramCell) {
                if (paramCell.clear()) {
                    this._notifyCellStateChanged(paramCell);
                }
            } else {
                var cell = new Cell();
                cell._position = { x: i, y: j };
                this._gameField[i][j] = cell;
            }
        });

    // Number of bombs which already installed.
    var numberSetBombs = 0;

    // Admissible-Number-Of-Failed-Attempts-To-Put-All-Bombs is the simpliest way to prevent an infinity loop 
    // due to discrepancy of the game field size and number of bombs which need to be set.
    // If the code will have to make more attempts to set all bombs than specified number, 
    // we can assume that it is impossible to set so many bombs on this small game field.
    // This method is not absolutely correct, but it may not be able to set all bombs (when theoretically possible to set all bombs) 
    // only for mindless values of the game field size and number of bombs.
    // Therefore, this method is good enough for standard fields sizes and number of bombs of the Minesweeper.
    var admissibleNumberFailedAttemptsToPutBomb = this._fieldSize * this._fieldSize;

    while (numberSetBombs < this._bombNumber && admissibleNumberFailedAttemptsToPutBomb) {
        // Generate random positions (x, y) for a next bomb on the game field.
        var x = Math.floor(Math.random() * this._fieldSize);
        var y = Math.floor(Math.random() * this._fieldSize);

        var selectedCell = this._gameField[x][y];

        var bombCanBeSetHere = false;

        if (!selectedCell.isBomb) {
            // Check bombs in adjacent cells. Bombs cannot be put if all cells around have an installed bombs.
            var thereIsAtLeastOneAdjacentCellWithoutBomb = !this._allAdjacentCellsAreBombs(selectedCell);
            bombCanBeSetHere = thereIsAtLeastOneAdjacentCellWithoutBomb;

            if (thereIsAtLeastOneAdjacentCellWithoutBomb) {
                // Set a fake bomb into selected cell for check that each adjacent cells will have at least one adjacent cell without bomb when we set a bomb into selected cell.
                selectedCell.isBomb = true;

                this._forEachAdjacentCell(
                    function (adjacentCell) {
                        if (adjacentCell.isBomb && this._allAdjacentCellsAreBombs(adjacentCell)) {
                            // We found a cell with a bomb that will be surrounded only by bombs if we set a bomb into selected cell.
                            // So, we cannot set a bomb into selected cell.
                            bombCanBeSetHere = false;
                            // No sense to continue the search.
                            return true;
                        }                            
                    }, selectedCell);
                // Clear a fake bomb.
                selectedCell.isBomb = false;
            }
        }

        if (bombCanBeSetHere) {
            selectedCell.isBomb = true;
            numberSetBombs++;
        } else {
            admissibleNumberFailedAttemptsToPutBomb--;
        }
    }

    this._setGameState(GameState.READY);
}

/*
 * Returns True if all cells around have an installed bombs.
 */
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
            // All adjacent cells without bombs around should be opened recurcively.
            if (!this._getNumberAdjacentBombs(cell)) {
                this._forEachAdjacentCell(
                    function (adjacentCell) {
                        this._openCell(adjacentCell); // recursive call.
                    }, cell);
            }
        }
    }
}

/*
 * Calls the specified function for each cell on the game field.
 * Breaks a loop if the func return True.
 */
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

/*
 * Calls the specified function for each adjacent cell of the specified cell.
 * Breaks a loop if the func return True.
 */
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
 * Checks whether there are cells in INITIAL state or cells which are incorrectly marked as a bomb. 
 * If such cells cannot be found, ends current game, sets all bombs states to DEFUSED and the game state to WIN. 
 */
Minesweeper.prototype._setWinIfNeeded = function () {

    if (this._state !== GameState.RUNNING)
        return;

    var win = true;

    this._forEachCell(
            function (cell) {
                if (cell.state === CellState.INITIAL || (cell.state === CellState.MARKED_AS_BOMB && !cell.isBomb)) {
                    // A cell in INITIAL state or a cell incorrectly marked as bomb means that game is not won.
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

/*
 * Ends current game.
 * Opens all cells. Detonates all bombs. 
 * Sets the game status to LOSS.
 */
Minesweeper.prototype._setLoss = function () {
    // Open all cells, detonate all bombs. 
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
    var numberBombs = state === CellState.OPENED ? this._getNumberAdjacentBombs(cell) : null;
    return { state: state, numberBombs: numberBombs };
}

Minesweeper.prototype._getNumberAdjacentBombs = function (cell)
{
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
