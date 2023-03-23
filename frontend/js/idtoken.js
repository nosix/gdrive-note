export function listenIdToken(callback) {
    if (window.content) {
        const idToken = window.content.getIdToken();
        console.debug(`Android:idToken:${idToken}`);
        callback(idToken);
    } else {
        const idToken = sessionStorage.getItem('idToken');
        console.debug(`Web:idToken:${idToken}`);
        if (idToken) {
            callback(idToken);
        } else {
            window.addEventListener('storage', (event) => {
                if (event.storageArea === sessionStorage && event.key === 'idToken') {
                    callback(sessionStorage.getItem('idToken'));
                }
            });
        }
    }
}