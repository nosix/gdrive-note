/**
 * テキスト先頭に記述した HTML コメント内に記述した JSON 形式の設定
 * 例:
 * <!--{
 *   "aceOptions": {
 *     "fontSize": 16,
 *     "keyboardHandler": "ace/keyboard/emacs",
 *     more...
 *   },
 *   "gptParams": {
 *     "model": "gpt-3.5-turbo",
 *     "maxTokens": 16,
 *     "temperature": 1,
 *     "topP": 1,
 *     "systemMessage": "You are a helpful assistant."
 *   }
 * }-->
 */
export class Config {
    constructor(config) {
        config = config || {};
        this.__aceOptions = config['aceOptions'] || {};

        const gptParams = config['gptParams'] || {};
        this.__gptModel = gptParams['model'] || 'gpt-3.5-turbo';
        const maxT = gptParams['maxTokens'];
        this.__gptMaxToken = maxT !== undefined && maxT > 0 ? maxT : 1024;
        const temp = gptParams['temperature'];
        this.__gptTemperature = temp !== undefined && temp >= 0 && temp <= 2 ? temp : 1;
        const topP = gptParams['topP'];
        this.__gptTopP = topP !== undefined && topP >= 0 && topP <= 1 ? topP : 1;
        this.__gptSystemMessage = gptParams['systemMessage'] || "You are a helpful assistant.";
    }

    /**
     * Ace Editor の設定 (aceOptions)
     * @see https://github.com/ajaxorg/ace/wiki/Configuring-Ace
     * @see https://codepen.io/zymawy/pen/XwbxoJ
     * @returns {string} JSON
     */
    getAceOptions() {
        return this.__aceOptions;
    }

    /**
     * モデル名 (gptParams.model)
     * @see https://platform.openai.com/docs/models/overview
     * @returns {string} (default: 'gpt-3.5-turbo')
     */
    getGptModel() {
        return this.__gptModel;
    }

    /**
     * 生成されるテキストの最大トークン数 (gptParams.maxTokens)
     * @returns {number} 値の範囲は各モデルで異なる (default: 1024)
     */
    getGptMaxTokens() {
        return this.__gptMaxToken;
    }

    /**
     * 大きい程に結果のランダム性が高くなる値 (gptParams.temperature)
     * @returns {number} 0.0〜2.0 (default: 1.0)
     */
    getGptTemperature() {
        return this.__gptTemperature;
    }

    /**
     * 上位P%の確率質量からなるトークンだけを考慮する (gptParams.topP)
     * @returns {number} 0.0〜1.0 (default: 1.0)
     */
    getGptTopP() {
        return this.__gptTopP;
    }

    /**
     * チャットメッセージの先頭で送られる system メッセージ (gptParams.systemMessage)
     * @returns {string} (default: "You are a helpful assistant.")
     */
    getGptSystemMessage() {
        return this.__gptSystemMessage;
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
