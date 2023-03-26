import {config} from 'dotenv';
import axios from 'axios';
import cors from 'cors';
import {Configuration, OpenAIApi} from 'openai';

config(); // load environment variables from .env

const GPT_KEY = process.env.GPT_KEY;
const ORIGIN = process.env.ORIGIN;
const WITH_AUTH = process.env.WITH_AUTH === 'true';

const corsOptions = {
    origin: ORIGIN,
    optionsSuccessStatus: 200 // レガシーブラウザ（IE11など）向けの設定
};

const openai = new OpenAIApi(new Configuration({apiKey: GPT_KEY}));

export function backend(req, res) {
    cors(corsOptions)(req, res, async () => {
        switch (req.path) {
            case '/completion':
                await verifyCredential(req, res, async () => {
                    await completion(req, res);
                });
                break;
            default:
                res.status(404).send('Not Found');
        }
    });
}

async function verifyCredential(req, res, next) {
    if (!WITH_AUTH) {
        next();
        return;
    }
    try {
        const idToken = req.header('Authorization').split(' ')[1];
        const config = {
            params: {
                id_token: idToken
            }
        }
        await axios.post('https://oauth2.googleapis.com/tokeninfo', '', config);
        next();
    } catch (e) {
        res.status(401).send('Unauthorized');
    }
}

async function completion(req, res) {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const completion = await openai.createChatCompletion(req.body);
        res.status(200).send(completion.data.choices[0].message.content);
    } catch (e) {
        if (e.response) {
            res.status(e.response.status).send(e.response.statusText);
        } else {
            res.status(500).send(e.message);
        }
    }
}