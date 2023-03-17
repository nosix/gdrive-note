import {config} from 'dotenv';
import cors from 'cors';
import {OAuth2Client} from 'google-auth-library';
import {Configuration, OpenAIApi} from 'openai';

config(); // load environment variables from .env

const CLIENT_ID = process.env.CLIENT_ID;
const GPT_KEY = process.env.GPT_KEY;
const ORIGIN = process.env.ORIGIN;
const oAuth2Client = process.env.WITH_OAUTH2 === 'true' ? new OAuth2Client(CLIENT_ID) : null;

const corsOptions = {
    origin: ORIGIN,
    optionsSuccessStatus: 200 // レガシーブラウザ（IE11など）向けの設定
};

const authenticate = oAuth2Client == null ? async (req, res, next) => {
    next();
} : async (req, res, next) => {
    try {
        const token = req.header('Authorization').split(' ')[1];
        const ticket = await oAuth2Client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        req.user = ticket.getPayload();
        next();
    } catch (e) {
        res.status(401).send('Unauthorized');
    }
};

const openai = new OpenAIApi(new Configuration({apiKey: GPT_KEY}));

export function completion(req, res) {
    cors(corsOptions)(req, res, async () => {
        await authenticate(req, res, async () => {
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
        });
    });
}
