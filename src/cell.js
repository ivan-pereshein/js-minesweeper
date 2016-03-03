'use strict';

/*
 * Creates new instance of the cell without bomb in INITIAL state.
 * An instance of type {Cell} represents a cell on a minesweeper game field.
 * @constructor
 */
function Cell() {
    this._isBomb = false;
    this._state = CellState.INITIAL;
}

/*
 * Gets current cell's state.
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
            this._state = CellState.INITIAL;
            break;
        case CellState.INITIAL:
            this._state = CellState.MARKED_AS_BOMB;
            break;
        default:
            break;
    }
    return initialState !== this._state;
}

/*
 * Removes a bomb from the cell and set the cell to INITIAL state. 
 * Returns True if cell state is changed, False otherwise.
 * @type {boolean}
 */
Cell.prototype.clear = function () {
    this._isBomb = false;
    if (this._state !== CellState.INITIAL) {
        this._state = CellState.INITIAL;
        return true;
    }
    return false;
}

Cell.prototype._openOrDoOtherIfBomb = function (otherState) {
    if (this._state === CellState.INITIAL || this._state === CellState.MARKED_AS_BOMB) {
        // Assert(otherState, CellState.DEFUSED || CellState.DETONATED)
        this._state = this._isBomb ? otherState : CellState.OPENED;
        return true;
    }
    return false;
}
