import {marked} from 'marked';
import dompurify from 'dompurify';
import axios from 'axios';
import {State} from './state';
import {Content} from './content.js';
import {StatusBar} from "./statusbar.js";
import {listenIdToken} from './idtoken.js';
import {getTokenInfo} from './tokeninfo.js';
import {parseConfig, Config} from './config.js';
import {GPT_FUNCTION_URL} from './properties.js';

const DEFAULT_STATUS_TIMEOUT = 5000;

class Session {
    constructor(idToken, content, status) {
        this.idToken = idToken;
        this.content = content;
        this.status = status;
        this.config = new Config();
        this.editor = null;
        this.viewer = null;
        // テキスト変更後、ファイルを保存するまで true
        this.edited = false;
    }

    setText(text) {
        console.assert(this.editor !== null);
        this.editor.setValue(text, -1);
        // Undoで戻れるのはコンテンツを設定した直後まで
        this.editor.session.getUndoManager().reset();
    }

    onChanged(delta) {
        this.onChangedConfig(parseConfig(this.editor.getValue()));
        if (this.viewer.isEnabled()) {
            this.viewer.setContent(this.editor.getValue());
        }
        if (!this.edited) {
            this.markEdited();
        }
    }

    markEdited() {
        const pageTitle = document.getElementById('title');
        pageTitle.classList.add('toggle-enabled');
        pageTitle.onclick = () => {
            this.editor.execCommand('save');
        };
        this.edited = true;
    }

    clearEdited() {
        const pageTitle = document.getElementById('title');
        pageTitle.classList.remove('toggle-enabled');
        pageTitle.onclick = undefined;
        this.edited = false;
    }

    onChangedCursor() {
        const positionRatio = this.editor.getCursorPosition().row / this.editor.session.getLength();
        this.viewer.setScrollTop(positionRatio);
    }

    onChangedConfig(config) {
        const gpt = document.getElementById('gpt');
        gpt.classList.remove('gpt-error');
        gpt.disabled = false;
        this.editor.setOptions(config.getAceOptions());
        this.config = config;
    }
}

class Viewer {
    constructor(elementId) {
        this.container = document.getElementById(elementId);
    }

    isEnabled() {
        return this.container.classList.contains('viewer-enabled');
    }

    setContent(editorContent) {
        this.container.innerHTML = dompurify.sanitize(marked.parse(editorContent));
    }

    setScrollTop(positionRatio) {
        this.container.scrollTop = this.container.scrollHeight * positionRatio - this.container.clientHeight / 2;
    }

    toggleEnabled(editor) {
        this.container.classList.toggle('viewer-enabled');
        if (this.isEnabled()) {
            this.setContent(editor.getValue());
            const editorHeight = editor.container.offsetHeight;
            const viewerHeight = editorHeight / 2;
            this.container.style.height = `${viewerHeight}px`;
            editor.container.style.height = `${editorHeight - viewerHeight}px`;
            editor.resize();
        } else {
            const editorHeight = editor.container.offsetHeight;
            const viewerHeight = this.container.offsetHeight;
            this.container.style.height = '0px';
            editor.container.style.height = `${editorHeight + viewerHeight}px`;
            editor.resize();
        }
    }
}

function loadPicture(url) {
    document.getElementById('account').src = url;
}

async function completion(session) {
    const gpt = document.getElementById('gpt');
    if (session.idToken == null) {
        gpt.classList.add('gpt-error');
        gpt.disabled = true;
        session.status.show('No ID token found.', DEFAULT_STATUS_TIMEOUT);
        return;
    }
    const prompt = session.editor.getSelectedText();
    if (!prompt) {
        session.status.show('The text is not selected.', DEFAULT_STATUS_TIMEOUT);
        return;
    }

    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.idToken}`,
        }
    }
    const requestBody = {
        model: session.config.getGptModel(),
        prompt: prompt,
        temperature: session.config.getGptTemperature(),
        max_tokens: session.config.getGptMaxTokens(),
    };
    try {
        const response = await axios.post(`${GPT_FUNCTION_URL}/completion`, requestBody, config);
        console.debug(response.data);
        // TODO insert result into editor
    } catch (e) {
        console.error(e);
        gpt.classList.add('gpt-error');
        gpt.disabled = true;
        session.status.show(e.message, DEFAULT_STATUS_TIMEOUT);
    }
}

function setupEditor(session) {
    const editor = ace.edit('editor');
    const viewer = new Viewer('viewer');

    editor.commands.addCommand({
        name: 'save',
        description: 'Save',
        bindKey: {win: 'Ctrl-S', mac: 'Command-S'},
        exec: async (editor) => {
            const statusId = session.status.show('Saving...');
            await session.content.saveText(editor.getValue());
            session.status.clear(statusId);
            session.clearEdited();
        },
        readOnly: false,
    });
    editor.commands.addCommand({
        name: 'preview',
        description: 'Preview markdown',
        bindKey: {win: 'Ctrl-Alt-P', mac: 'Ctrl-Option-P'},
        exec: async (editor) => {
            viewer.toggleEnabled(editor);
        },
        readOnly: true,
        scrollIntoView: "cursor",
    });
    editor.commands.addCommand({
        name: 'gptCompletion',
        description: 'GPT completion',
        bindKey: {win: 'Alt-Space', mac: 'Option-Space'},
        exec: async () => {
            await completion(session);
        },
        readOnly: false,
    });
    editor.session.setMode('ace/mode/markdown');
    editor.session.on('change', (delta) => {
        session.onChanged(delta);
    });
    editor.selection.on('changeCursor', () => {
        session.onChangedCursor();
    });

    document.getElementById('gpt').onclick = () => {
        editor.execCommand('gptCompletion');
    };
    document.getElementById('tips').onclick = () => {
        editor.execCommand('openCommandPallete'); // https://github.com/ajaxorg/ace/issues/5105
    };

    const headerHeight = document.querySelector('nav').offsetHeight;
    const footerHeight = document.querySelector('footer').offsetHeight;
    editor.container.style.height = `calc(100vh - ${headerHeight}px - ${footerHeight}px)`

    session.editor = editor;
    session.viewer = viewer;
}

async function main() {
    console.debug(window.location.href);

    const queryParam = new Map(
        location.search.substring(1)
            .split('&')
            .map((s) => s.split('='))
    );
    const state = new State(queryParam.get('state'));
    console.debug(state);

    const status = new StatusBar();

    listenIdToken(async (idToken) => {
        const tokenInfo = await getTokenInfo(idToken); // FIXME 取得に失敗することがある
        console.debug(tokenInfo);
        if (tokenInfo === null) {
            status.show('No token info found.', DEFAULT_STATUS_TIMEOUT);
            return;
        }
        loadPicture(tokenInfo.picture());
        Content.create(tokenInfo, state, async (content) => {
            const session = new Session(idToken, content, status);
            setupEditor(session);

            switch (state.action()) {
                case 'create':
                    await content.create();
                    break;
                case 'open':
                    const text = await content.loadText();
                    session.setText(text);
                    session.clearEdited();
                    break;
                default:
                    console.error(`Unknown action '${state.action()}'`)
            }
        });
    });
}

window.onload = main;
