'use strict';

var CellState = {
    INITIAL: 0,
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