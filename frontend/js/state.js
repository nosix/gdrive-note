export class State {

    constructor(state) {
        if (state) {
            console.debug(state);
            this.__state = JSON.parse(decodeURIComponent(state));
        } else {
            this.__state = null;
        }
    }

    action() {
        if (this.__state) {
            return this.__state;
        } else {
            return 'open';
        }
    }

    folderId() {
        return this.__state.folderId || null;
    }

    fileId() {
        if (this.__state.ids) {
            return this.__state.ids[0] || null;
        } else {
            return null;
        }
    }
}