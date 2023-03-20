/**
 * テキスト先頭に記述した HTML コメント内に記述した JSON 形式の設定
 * 例:
 * <!--{
 *   "ACE_OPTIONS": {
 *     "fontSize": 16,
 *     "keyboardHandler": "ace/keyboard/emacs"
 *   }
 * }-->
 */
export class Config {
    constructor(config) {
        config = config || {};
        this._aceOptions = config['ACE_OPTIONS'] || {};

        this._gptModel = config['GPT_MODEL'] || 'gpt-3.5-turbo';
        const temperature = config['GPT_TEMPERATURE'];
        this._gptTemperature = temperature !== undefined && temperature >= 0 ? temperature : 0.1;
        const maxTokens = config['GPT_MAX_TOKENS'];
        this._gptMaxToken = maxTokens !== undefined && maxTokens > 0 ? maxTokens : 256;
    }

    /**
     * Ace Editor の設定 (key: ACE_OPTIONS)
     * @see https://github.com/ajaxorg/ace/wiki/Configuring-Ace
     * @see https://codepen.io/zymawy/pen/XwbxoJ
     * @returns {string} JSON
     */
    getAceOptions() {
        return this._aceOptions;
    }

    /**
     * モデル名 (key: GPT_MODEL)
     * @see https://platform.openai.com/docs/models/overview
     * @returns {string} (default: 'gpt-3.5-turbo')
     */
    getGptModel() {
        return this._gptModel;
    }

    /**
     * ランダム性に影響を与える 0 以上の実数値 (key: GPT_TEMPERATURE)
     * @returns {number} 0.1〜1.0 の範囲の値を推奨 (default: 0.1)
     */
    getGptTemperature() {
        return this._gptTemperature;
    }

    /**
     * 生成されるテキストの最大トークン数 (key: GPT_MAX_TOKENS)
     * @returns {number} 値の範囲は各モデルで異なる (default: 256)
     */
    getGptMaxTokens() {
        return this._gptMaxToken;
    }
}

/**
 * text の先頭から始まる HTML コメント内に書かれた JSON を読み取る
 * @param text {string}
 * @returns {Config}
 */
export function parseConfig(text) {
    const regex = /^<!--.*?(\{.*}).*?-->/s;
    const matches = text.match(regex);
    if (matches) {
        try {
            return new Config(JSON.parse(matches[1]));
        } catch (e) {
            return new Config({});
        }
    } else {
        return new Config({});
    }
}
