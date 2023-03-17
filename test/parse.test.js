import {expect} from "chai";
import {parseConfig} from "../frontend/js/config.js";

describe('parseConfig test', () => {
    it('空白を含んでも解析される', () => {
        const text = '<!-- { "GPT_MODEL" : "-.azAZ09" } -->';
        const config = parseConfig(text);
        expect(config.getGptModel()).to.equal('-.azAZ09');
    });

    it('空白を含まなくても解析される', () => {
        const text = '<!--{"GPT_MODEL":"-.azAZ09"}-->';
        const config = parseConfig(text);
        expect(config.getGptModel()).to.equal('-.azAZ09');
    });

    it('改行しても解析される', () => {
        const text = '<!--\n{\n"GPT_MODEL": "-.azAZ09"\n}\n-->';
        const config = parseConfig(text);
        expect(config.getGptModel()).to.equal('-.azAZ09');
    });

    it('JSON形式ではないと解析されない', () => {
        const text = '<!--\n{\nGPT_MODEL: "-.azAZ09"\n}\n-->';
        const config = parseConfig(text);
        expect(config.getGptModel()).to.equal('gpt-3.5-turbo');
    });

    it('コメントで始めないと解析しない', () => {
        const text = ' <!-- { "GPT_MODEL" : "-.azAZ09" } -->';
        const config = parseConfig(text);
        expect(config.getGptModel()).to.equal('gpt-3.5-turbo');
    });
});
