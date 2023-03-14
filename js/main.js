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
    const fileId = ids.shift();
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
        bindKey: { win: 'Ctrl-S', mac: 'Command-S'},
        exec: async (editor) => {
            await save(session, editor.getValue());
        },
        readOnly: false,
    });
    session.editor = editor;
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
        const session = new Session(client);

        setupEditor(session);

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
    });
}

window.onload = main;
