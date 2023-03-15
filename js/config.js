export class Config {
    constructor(config) {
        this.config = config;
    }

    getGptKey() {
        return this.config['GPT_KEY'];
    }
}

export function parseConfig(text) {
    const regex = /^<!--.*?(\{.*}).*?-->/s;
    const matches = text.match(regex);
    if (matches) {
        try {
            return new Config(JSON.parse(matches[1]));
        } catch (e) {
            return null;
        }
    } else {
        return null;
    }
}
