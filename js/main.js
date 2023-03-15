import {marked} from "marked";
import dompurify from "dompurify";

class Session {
    constructor(client) {
        this.client = client;
        this.editor = null;
        this.viewer = null;
        this.fileId = null;
        this.edited = false;
    }

    setFileId(fileId) {
        this.fileId = fileId;
        this.clearEdited();
    }

    hasFileId() {
        return this.fileId !== null;
    }

    setContent(content) {
        console.assert(this.editor !== null);
        this.editor.setValue(content, -1);
        // Undoで戻れるのはコンテンツを設定した直後まで
        this.editor.session.getUndoManager().reset();
    }

    onChanged(delta) {
        if (this.viewer.isEnabled()) {
            this.viewer.setContent(this.editor.getValue());
        }
        if (!this.edited) {
            this.markEdited();
        }
    }

    markEdited() {
        const pageTitle = document.getElementById('pageTitle');
        pageTitle.classList.add('toggle-enabled');
        pageTitle.onclick = async () => {
            await save(this, this.editor.getValue());
        };
        this.edited = true;
    }

    clearEdited() {
        const pageTitle = document.getElementById('pageTitle');
        pageTitle.classList.remove('toggle-enabled');
        pageTitle.onclick = undefined;
        this.edited = false;
    }

    onChangedCursor() {
        const positionRatio = this.editor.getCursorPosition().row / this.editor.session.getLength();
        this.viewer.setScrollTop(positionRatio);
    }
}

class Viewer {
    constructor(elementId) {
        this.container = document.getElementById(elementId);
    }

    isEnabled() {
        return this.container.classList.contains('viewer-enabled');
    }

    setContent(editorContent) {
        this.container.innerHTML = dompurify.sanitize(marked.parse(editorContent));
    }

    setScrollTop(positionRatio) {
        this.container.scrollTop = this.container.scrollHeight * positionRatio - this.container.clientHeight / 2;
    }

    toggleEnabled(editor) {
        this.container.classList.toggle('viewer-enabled');
        if (this.isEnabled()) {
            this.setContent(editor.getValue());
            const editorHeight = editor.container.offsetHeight;
            const viewerHeight = editorHeight / 2;
            this.container.style.height = `${viewerHeight}px`;
            editor.container.style.height = `${editorHeight - viewerHeight}px`;
            editor.resize();
        } else {
            const editorHeight = editor.container.offsetHeight;
            const viewerHeight = this.container.offsetHeight;
            this.container.style.height = '0px';
            editor.container.style.height = `${editorHeight + viewerHeight}px`;
            editor.resize();
        }
    }
}

const defaultPhotoSrc = document.getElementById('account').src;

async function loadPhoto(session) {
    try {
        const response = await session.client.people.people.get({
            resourceName: 'people/me',
            personFields: 'photos',
        });
        console.debug(response);
        const photo = response.result.photos[0];
        if (photo !== undefined) {
            document.getElementById('account').src = photo.url;
        }
    } catch (e) {
        console.error(e.message);
    }
}

function unloadPhoto() {
    document.getElementById('account').src = defaultPhotoSrc;
}

async function create(session, folderId) {
    try {
        const response = await session.client.request({
            path: '/drive/v3/files',
            method: 'POST',
            body: {
                name: 'sample.md',
                mimeType: 'text/markdown',
                parents: [folderId],
            }
        });
        console.debug(response);
        session.setFileId(response.result.id);
    } catch (e) {
        console.error(e.message);
    }
}

async function open(session, ids) {
    const fileId = ids[0];
    if (fileId === undefined) {
        console.error('Cannot open the file because fileId is missing.');
        return;
    }

    try {
        const response = await session.client.request({
            path: `/drive/v3/files/${fileId}`,
            method: 'GET',
            params: {
                alt: 'media'
            }
        });
        console.debug(response);
        session.setContent(response.body);
        session.setFileId(fileId);
    } catch (e) {
        console.error(e.message);
    }
}

async function save(session, content) {
    if (!session.hasFileId()) {
        return;
    }

    try {
        const response = await session.client.request({
            path: `/upload/drive/v3/files/${session.fileId}`,
            method: 'PATCH',
            headers: {
                'Content-Type': 'text/markdown',
                'Content-Length': new TextEncoder().encode(content).length,
            },
            body: content,
        });
        console.debug(response);
        session.setFileId(response.result.id);
    } catch (e) {
        console.error(e.message);
    }
}

function setupEditor(session) {
    const editor = ace.edit('editor');
    const viewer = new Viewer('viewer');
    editor.commands.addCommand({
        name: 'save',
        bindKey: {win: 'Ctrl-S', mac: 'Command-S'},
        exec: async (editor) => {
            await save(session, editor.getValue());
        },
        readOnly: false,
    });
    editor.commands.addCommand({
        name: 'preview',
        bindKey: {win: 'Ctrl-Alt-P', mac: 'Ctrl-Option-P'},
        exec: async (editor) => {
            viewer.toggleEnabled(editor);
        },
        readOnly: false,
    });
    editor.session.setMode('ace/mode/markdown');
    editor.session.on('change', (delta) => {
        session.onChanged(delta);
    });
    editor.selection.on('changeCursor', () => {
        session.onChangedCursor();
    });

    const headerHeight = document.querySelector('nav').offsetHeight;
    const footerHeight = 16;
    editor.container.style.height = `calc(100vh - ${headerHeight}px - ${footerHeight}px)`

    session.editor = editor;
    session.viewer = viewer;
}

function closeEditor() {
    const editor = ace.edit('editor');
    editor.destroy();
    // class属性の値が残り表示されてしまう
    const classList = editor.container.classList;
    classList.forEach(className => {
        if (className.startsWith('ace')) {
            classList.remove(className);
        }
    });
}

async function apiActivated(state, client) {
    const session = new Session(client);

    setupEditor(session);
    await loadPhoto(session);

    switch (state.action) {
        case 'create':
            await create(session, state.folderId);
            break;
        case 'open':
            await open(session, state.ids);
            break;
        default:
            console.error(`Unknown action '${state.action}'`)
    }
}

function apiDeactivated() {
    closeEditor();
    unloadPhoto();
}

async function main() {
    console.debug(window.location.href);

    const queryParam = new Map(
        location.search.substring(1)
            .split('&')
            .map((s) => s.split('='))
    );
    const state = JSON.parse(decodeURIComponent(queryParam.get('state')));
    console.debug(state);

    setOnApiActivated(async (client) => {
        if (client !== null) {
            await apiActivated(state, client);
        } else {
            apiDeactivated();
        }
    });
}

window.onload = main;
