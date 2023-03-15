import {expect} from "chai";
import {parseConfig, Config} from "../js/config.js";

describe('parseConfig', () => {
    it('空白を含んでも解析される', () => {
        const text = '<!-- { "GPT_KEY" : "sk-azAZ09" } -->';
        const result = parseConfig(text);
        expect(result).to.deep.equal(new Config({
            GPT_KEY: 'sk-azAZ09'
        }));
    });

    it('空白を含まなくても解析される', () => {
        const text = '<!--{"GPT_KEY":"sk-azAZ09"}-->';
        const result = parseConfig(text);
        expect(result).to.deep.equal(new Config({
            GPT_KEY: 'sk-azAZ09'
        }));
    });

    it('改行しても解析される', () => {
        const text = '<!--\n{\n"GPT_KEY": "sk-azAZ09"\n}\n-->';
        const result = parseConfig(text);
        expect(result).to.deep.equal(new Config({
            GPT_KEY: 'sk-azAZ09'
        }));
    });

    it('JSON形式ではないと解析されない', () => {
        const text = '<!--\n{\nGPT_KEY: "sk-azAZ09"\n}\n-->';
        const result = parseConfig(text);
        expect(result).is.null;
    });

    it('コメントで始めないと解析しない', () => {
        const text = ' <!-- { "GPT_KEY" : "sk-azAZ09" } -->';
        const result = parseConfig(text);
        expect(result).is.null;
    });
});
