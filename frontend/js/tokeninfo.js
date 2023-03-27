import axios from 'axios';

class TokenInfo {
    constructor(o) {
        this.__email = o.email;
        this.__picture = o.picture;
        this.__clientId = o.aud;
    }

    email() {
        return this.__email;
    }

    picture() {
        return this.__picture;
    }

    clientId() {
        return this.__clientId;
    }
}

/**
 * 指定したIDトークンのTokenInfoを取得する
 * @param idToken
 * @returns {Promise<null|TokenInfo>}
 */
export async function getTokenInfo(idToken) {
    const config = {
        params: {
            id_token: idToken
        }
    }
    try {
        const response = await axios.post('https://oauth2.googleapis.com/tokeninfo', '', config);
        console.debug(response.data);
        return new TokenInfo(response.data);
    } catch (e) {
        console.error(e);
        return null;
    }
}