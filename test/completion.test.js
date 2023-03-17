import {expect, assert} from "chai";
import {config} from 'dotenv';
import axios from "axios";

config(); // load environment variables from .env

const GPT_FUNCTION_URL = process.env.GPT_FUNCTION_URL;

describe('completion test', () => {
    it('WITH_AUTH が false ならば成功する', async () => {
        const config = {
            headers: {
                'Content-Type': 'application/json',
            }
        };
        const requestBody = {
            model: 'gpt-3.5-turbo', prompt: 'こんにちは', temperature: 0.1, max_tokens: 10,
        };
        try {
            const response = await axios.post(`${GPT_FUNCTION_URL}/completion`, requestBody, config);
            expect(response.status).to.equal(200);
            console.info(response.data);
        } catch (e) {
            assert.fail(e);
        }
    });
});
