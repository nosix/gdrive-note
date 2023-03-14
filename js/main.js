async function create(client, folderId) {
    try {
        await client.request({
            path: '/drive/v3/files',
            method: 'POST',
            body: {
                name: 'sample.md',
                mimeType: 'text/markdown',
                parents: [folderId],
            }
        });
    } catch (e) {
        console.error(e.message);
    }
}

async function open(client, ids) {
    const fileId = ids.shift();
    if (fileId === undefined) {
        console.error('Cannot open the file because fileId is missing.');
        return;
    }
    try {
        const blob = await client.request({
            path: `/drive/v3/files/${fileId}`,
            method: 'GET',
            params: {
                alt: 'media'
            }
        });
        console.debug(blob);
    } catch (e) {
        console.error(e.message);
    }
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
        switch (state.action) {
            case 'create':
                await create(client, state.folderId);
                break;
            case 'open':
                await open(client, state.ids);
                break;
            default:
                console.error(`Unknown action '${state.action}'`)
        }
    });
}

window.onload = main;
