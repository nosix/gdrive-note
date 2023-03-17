import {expect, assert} from "chai";
import {config} from 'dotenv';
import axios from "axios";

config(); // load environment variables from .env

const functionUrl = process.env.GPT_FUNCTION_URL;

describe('completion test', () => {
    it('成功する', async () => {
        const requestHeader = {
            'Content-Type': 'application/json',
        };
        const requestBody = {
            model: 'gpt-3.5-turbo', prompt: 'こんにちは', temperature: 0.1, max_tokens: 10,
        };
        try {
            const response = await axios.post(functionUrl, requestBody, {headers: requestHeader});
            expect(response.status).to.equal(200);
            console.info(response.data);
        } catch (e) {
            assert.fail(e);
        }
    });
});
