export class StatusBar {
    constructor() {
        this.__element = document.getElementById('statusbar');
    }

    show(text, timeoutMs) {
        const statusId = Date.now();
        const span = document.createElement('span');
        span.id = `status-${statusId}`;
        span.innerText = text;
        this.__element.appendChild(span);

        if (timeoutMs && timeoutMs > 0) {
            setTimeout(() => {
                this.clear(statusId);
            }, timeoutMs);
        }

        return statusId;
    }

    clear(statusId) {
        const node = this.__element.querySelector(`#status-${statusId}`);
        this.__element.removeChild(node);
    }
}