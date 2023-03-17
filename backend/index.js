import {config} from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import {google} from 'googleapis';
import {Configuration, OpenAIApi} from 'openai';

config(); // load environment variables from .env

const CLIENT_ID = process.env.CLIENT_ID;
const GPT_KEY = process.env.GPT_KEY;
const ORIGIN = process.env.ORIGIN;
const WITH_AUTH = process.env.WITH_AUTH === 'true';

const corsOptions = {
    origin: ORIGIN,
    optionsSuccessStatus: 200 // レガシーブラウザ（IE11など）向けの設定
};

const jwtOptions = {
    algorithm: 'HS256'
};

const privateKey = `${CLIENT_ID}-${GPT_KEY}`;
const openai = new OpenAIApi(new Configuration({apiKey: GPT_KEY}));

function getTime() {
    return Math.floor(Date.now() / 1000);
}

export function backend(req, res) {
    cors(corsOptions)(req, res, async () => {
        switch (req.path) {
            case '/auth':
                await authenticate(req, res);
                break;
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

async function authenticate(req, res) {
    if (!WITH_AUTH) {
        res.status(200).send({id_token: '-'});
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const accessToken = req.header('Authorization').split(' ')[1];
        const oAuth2Client = new google.auth.OAuth2();
        oAuth2Client.setCredentials({access_token: accessToken});
        const people = google.people({
            version: 'v1',
            auth: oAuth2Client,
        });
        const response = await people.people.get({
            resourceName: 'people/me',
            personFields: 'organizations',
        });

        const payload = {
            name: response.data.resourceName,
            iat: getTime(),
            exp: getTime() + (6 * 60 * 60), // 6時間後に有効期限切れ
        }

        const idToken = jwt.sign(payload, privateKey, jwtOptions);
        res.status(200).send({id_token: idToken})
    } catch (e) {
        res.status(401).send('Unauthorized');
    }
}

async function verifyCredential(req, res, next) {
    if (!WITH_AUTH) {
        next();
        return;
    }
    try {
        const idToken = req.header('Authorization').split(' ')[1];
        jwt.verify(idToken, privateKey, jwtOptions);
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
        const completion = await openai.createCompletion(req.body);
        res.status(200).send(completion);
    } catch (e) {
        res.status(e.response.status).send(e.response.statusText);
    }
}