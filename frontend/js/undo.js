export class UndoManager {
    constructor(aceUndoManager) {
        aceUndoManager.undo = undo;
        aceUndoManager.redo = redo;
        aceUndoManager.reset = reset;
        this.__aceUndoManager = aceUndoManager;
    }

    getRevision() {
        return this.__aceUndoManager.getRevision();
    }

    reset() {
        this.__aceUndoManager.reset();
    }

    undo() {
        this.__aceUndoManager.undo();
    }

    redo() {
        this.__aceUndoManager.redo();
    }

    canUndo() {
        return this.__aceUndoManager.canUndo();
    }

    canRedo() {
        return this.__aceUndoManager.canRedo();
    }

    isAtBookmark() {
        return this.__aceUndoManager.isAtBookmark();
    }

    bookmark() {
        return this.__aceUndoManager.bookmark();
    }
}

function undo(session, dontSelect) {
    this.lastDeltas = null;
    const stack = this.$undoStack;

    if (!rearrangeUndoStack(stack, stack.length))
        return;

    if (!session)
        session = this.$session;

    if (this.$redoStackBaseRev !== this.$rev && this.$redoStack.length)
        this.$redoStack = [];

    this.$fromUndo = true;

    const deltaSet = stack.pop();
    let undoSelectionRange = null;
    if (deltaSet) {
        this.$redoStack.push(deltaSet);
        this.$syncRev();
        // FIX on('change')のタイミングで変更済みにする
        undoSelectionRange = session.undoChanges(deltaSet, dontSelect);
    }

    this.$fromUndo = false;

    return undoSelectionRange;
}

function redo(session, dontSelect) {
    this.lastDeltas = null;

    if (!session)
        session = this.$session;

    this.$fromUndo = true;
    if (this.$redoStackBaseRev !== this.$rev) {
        const diff = this.getDeltas(this.$redoStackBaseRev, this.$rev + 1);
        rebaseRedoStack(this.$redoStack, diff);
        this.$redoStackBaseRev = this.$rev;
        this.$redoStack.forEach(function(x) {
            x[0].id = ++this.$maxRev;
        }, this);
    }
    const deltaSet = this.$redoStack.pop();
    let redoSelectionRange = null;

    if (deltaSet) {
        this.$undoStack.push(deltaSet);
        this.$syncRev();
        // FIX on('change')のタイミングで変更済みにする
        redoSelectionRange = session.redoChanges(deltaSet, dontSelect);
    }
    this.$fromUndo = false;

    return redoSelectionRange;
}

function reset() {
    this.lastDeltas = null;
    this.$lastDelta = null;
    this.$undoStack = [];
    this.$redoStack = [];
    this.$rev = 0;
    this.mark = 0;
    this.$redoStackBaseRev = this.$rev;
    this.selections = [];
    this.$maxRev = 0; // FIX resetした後にrevがreset前の継続になる
}

function rearrangeUndoStack(stack, pos) {
    for (let i = pos; i--; ) {
        const deltaSet = stack[i];
        if (deltaSet && !deltaSet[0].ignore) {
            while(i < pos - 1) {
                const swapped = swapGroups(stack[i], stack[i + 1]);
                stack[i] = swapped[0];
                stack[i + 1] = swapped[1];
                i++;
            }
            return true;
        }
    }
}

function swapGroups(ds1, ds2) {
    for (let i = ds1.length; i--; ) {
        for (let j = 0; j < ds2.length; j++) {
            if (!swap(ds1[i], ds2[j])) {
                // rollback, we have to undo ds2 first
                while (i < ds1.length) {
                    while (j--) {
                        swap(ds2[j], ds1[i]);
                    }
                    j = ds2.length;
                    i++;
                }
                return [ds1, ds2];
            }
        }
    }
    ds1.selectionBefore = ds2.selectionBefore =
        ds1.selectionAfter = ds2.selectionAfter = null;
    return [ds2, ds1];
}

function swap(d1, d2) {
    const i1 = d1.action === "insert";
    const i2 = d2.action === "insert";

    if (i1 && i2) {
        if (cmp(d2.start, d1.end) >= 0) {
            shift(d2, d1, -1);
        } else if (cmp(d2.start, d1.start) <= 0) {
            shift(d1, d2, +1);
        } else {
            return null;
        }
    } else if (i1 && !i2) {
        if (cmp(d2.start, d1.end) >= 0) {
            shift(d2, d1, -1);
        } else if (cmp(d2.end, d1.start) <= 0) {
            shift(d1, d2, -1);
        } else {
            return null;
        }
    } else if (!i1 && i2) {
        if (cmp(d2.start, d1.start) >= 0) {
            shift(d2, d1, +1);
        } else if (cmp(d2.start, d1.start) <= 0) {
            shift(d1, d2, +1);
        } else {
            return null;
        }
    } else if (!i1 && !i2) {
        if (cmp(d2.start, d1.start) >= 0) {
            shift(d2, d1, +1);
        } else if (cmp(d2.end, d1.start) <= 0) {
            shift(d1, d2, -1);
        } else {
            return null;
        }
    }
    return [d2, d1];
}

function shift(d1, d2, dir) {
    shiftPos(d1.start, d2.start, d2.end, dir);
    shiftPos(d1.end, d2.start, d2.end, dir);
}

function shiftPos(pos, start, end, dir) {
    if (pos.row === (dir === 1 ? start : end).row) {
        pos.column += dir * (end.column - start.column);
    }
    pos.row += dir * (end.row - start.row);
}

const Range = ace.Range;
const cmp = Range.comparePoints;

function rebaseRedoStack(redoStack, deltaSets) {
    for (let i = 0; i < deltaSets.length; i++) {
        const deltas = deltaSets[i];
        for (let j = 0; j < deltas.length; j++) {
            moveDeltasByOne(redoStack, deltas[j]);
        }
    }
}

function moveDeltasByOne(redoStack, d) {
    d = cloneDelta(d);
    for (let j = redoStack.length; j--;) {
        let deltaSet = redoStack[j];
        for (let i = 0; i < deltaSet.length; i++) {
            const x = deltaSet[i];
            const xformed = xform(x, d);
            d = xformed[0];
            if (xformed.length !== 2) {
                if (xformed[2]) {
                    deltaSet.splice(i + 1, 1, xformed[1], xformed[2]);
                    i++;
                } else if (!xformed[1]) {
                    deltaSet.splice(i, 1);
                    i--;
                }
            }
        }
        if (!deltaSet.length) {
            redoStack.splice(j, 1);
        }
    }
    return redoStack;
}

function cloneDelta(d) {
    return {
        start: clonePos(d.start),
        end: clonePos(d.end),
        action: d.action,
        lines: d.lines.slice()
    };
}

function clonePos(pos) {
    return {row: pos.row,column: pos.column};
}

function xform(d1, c1) {
    const i1 = d1.action === "insert";
    const i2 = c1.action === "insert";

    if (i1 && i2) {
        if (cmp(d1.start, c1.start) < 0) {
            shift(c1, d1, 1);
        } else {
            shift(d1, c1, 1);
        }
    } else if (i1 && !i2) {
        if (cmp(d1.start, c1.end) >= 0) {
            shift(d1, c1, -1);
        } else if (cmp(d1.start, c1.start) <= 0) {
            shift(c1, d1, +1);
        } else {
            shift(d1, Range.fromPoints(c1.start, d1.start), -1);
            shift(c1, d1, +1);
        }
    } else if (!i1 && i2) {
        if (cmp(c1.start, d1.end) >= 0) {
            shift(c1, d1, -1);
        } else if (cmp(c1.start, d1.start) <= 0) {
            shift(d1, c1, +1);
        } else {
            shift(c1, Range.fromPoints(d1.start, c1.start), -1);
            shift(d1, c1, +1);
        }
    } else if (!i1 && !i2) {
        if (cmp(c1.start, d1.end) >= 0) {
            shift(c1, d1, -1);
        } else if (cmp(c1.end, d1.start) <= 0) {
            shift(d1, c1, -1);
        } else {
            let before, after;
            if (cmp(d1.start, c1.start) < 0) {
                before = d1;
                d1 = splitDelta(d1, c1.start);
            }
            if (cmp(d1.end, c1.end) > 0) {
                after = splitDelta(d1, c1.end);
            }

            shiftPos(c1.end, d1.start, d1.end, -1);
            if (after && !before) {
                d1.lines = after.lines;
                d1.start = after.start;
                d1.end = after.end;
                after = d1;
            }

            return [c1, before, after].filter(Boolean);
        }
    }
    return [c1, d1];
}

function splitDelta(c, pos) {
    const lines = c.lines;
    const end = c.end;
    c.end = clonePos(pos);
    const rowsBefore = c.end.row - c.start.row;
    const otherLines = lines.splice(rowsBefore, lines.length);

    const col = rowsBefore ? pos.column : pos.column - c.start.column;
    lines.push(otherLines[0].substring(0, col));
    otherLines[0] = otherLines[0].substr(col)   ;
    return {
        start: clonePos(pos),
        end: end,
        lines: otherLines,
        action: c.action
    };
}
