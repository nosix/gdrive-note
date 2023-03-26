import {expect} from 'chai';
import {config} from 'dotenv';
import {Config} from '../frontend/js/config.js';
import {createChatRequestBody} from '../frontend/js/completion.js';

config(); // load environment variables from .env

describe('completion test', () => {
    it('promptとconfigが空の時のメッセージ', async () => {
        const body = createChatRequestBody('', new Config({}));
        expect(body.messages).deep.equals([{role: 'user', content: ''}]);
    });
    it('promptとsystemMessageが設定されている時のメッセージ', async () => {
        const body = createChatRequestBody('A prompt', new Config({
            gptParams: {systemMessage: 'A system message'}
        }));
        expect(body.messages).deep.equals([
            {role: 'system', content: 'A system message'},
            {role: 'user', content: 'A prompt'},
        ]);
    });
    it('promptにassistantとuserのメッセージが含まれていた時のメッセージ(空白で改行)', async () => {
        const prompt = [
            'assistant:  ',
            'A assistant message 1  ',
            'user:  ',
            'A user message 1  ',
            'assistant:  ',
            'A assistant message 2  ',
            'A assistant message 3  ',
            'user:  ',
            'A user message 2  ',
            'A user message 3  ',
        ].join('\n');
        const body = createChatRequestBody(prompt, new Config({
            gptParams: {systemMessage: 'A system message'}
        }));
        expect(body.messages).deep.equals([
            {role: 'system', content: 'A system message'},
            {role: 'assistant', content: 'A assistant message 1'},
            {role: 'user', content: 'A user message 1'},
            {role: 'assistant', content: 'A assistant message 2  \nA assistant message 3'},
            {role: 'user', content: 'A user message 2  \nA user message 3'},
        ]);
    });
    it('promptにassistantとuserのメッセージが含まれていた時のメッセージ(空行で改行)', async () => {
        const prompt = [
            'assistant:',
            '',
            'A assistant message 1',
            '',
            'user:',
            '',
            'A user message 1',
            '',
            'assistant:',
            '',
            'A assistant message 2',
            'A assistant message 3',
            '',
            'user:',
            '',
            'A user message 2',
            'A user message 3',
            '',
        ].join('\n');
        const body = createChatRequestBody(prompt, new Config({
            gptParams: {systemMessage: 'A system message'}
        }));
        expect(body.messages).deep.equals([
            {role: 'system', content: 'A system message'},
            {role: 'assistant', content: 'A assistant message 1'},
            {role: 'user', content: 'A user message 1'},
            {role: 'assistant', content: 'A assistant message 2\nA assistant message 3'},
            {role: 'user', content: 'A user message 2\nA user message 3'},
        ]);
    });
});
