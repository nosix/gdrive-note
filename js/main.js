class Session {
    constructor(client) {
        this.client = client;
        this.editor = null;
        this.fileId = null;
    }

    hasFileId() {
        return this.fileId !== null;
    }

    setContent(content) {
        console.assert(this.editor !== null);
        this.editor.setValue(content, -1);
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
        session.fileId = response.result.id;
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
    session.fileId = fileId;

    try {
        const response = await session.client.request({
            path: `/drive/v3/files/${session.fileId}`,
            method: 'GET',
            params: {
                alt: 'media'
            }
        });
        console.debug(response);
        session.setContent(response.body);
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
        session.fileId = response.result.id;
    } catch (e) {
        console.error(e.message);
    }
}

function setupEditor(session) {
    const editor = ace.edit('editor');
    editor.commands.addCommand({
        name: 'save',
        bindKey: {win: 'Ctrl-S', mac: 'Command-S'},
        exec: async (editor) => {
            await save(session, editor.getValue());
        },
        readOnly: false,
    });
    session.editor = editor;
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
