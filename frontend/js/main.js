import {marked} from 'marked';
import dompurify from 'dompurify';
import axios from 'axios';
import {State} from './state';
import {Content} from './content.js';
import {listenIdToken} from './idtoken.js';
import {getTokenInfo} from './tokeninfo.js';
import {parseConfig, Config} from './config.js';
import {GPT_FUNCTION_URL} from './properties.js';

class Session {
    constructor(idToken, content) {
        this.idToken = idToken;
        this.content = content;
        this.config = new Config();
        this.editor = null;
        this.viewer = null;
        this.fileId = null;
        // テキスト変更後、ファイルを保存するまで true
        this.edited = false;
    }

    setFileId(fileId) {
        this.fileId = fileId;
        this.clearEdited();
    }

    hasFileId() {
        return this.fileId !== null;
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
        pageTitle.onclick = async () => {
            await this.content.saveText(this.editor.getValue());
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
        prompt: session.editor.getSelectedText(),
        temperature: session.config.getGptTemperature(),
        max_tokens: session.config.getGptMaxTokens(),
    };
    try {
        const response = await axios.post(`${GPT_FUNCTION_URL}/completion`, requestBody, config);
        console.debug(response.data);
        // TODO insert result into editor
    } catch (e) {
        gpt.classList.add('gpt-error');
        console.error(e);
    }
}

function setupEditor(session) {
    const editor = ace.edit('editor');
    const viewer = new Viewer('viewer');
    editor.commands.addCommand({
        name: 'Save',
        bindKey: {win: 'Ctrl-S', mac: 'Command-S'},
        exec: async (editor) => {
            await session.content.saveText(editor.getValue());
        },
        readOnly: false,
    });
    editor.commands.addCommand({
        name: 'Preview',
        bindKey: {win: 'Ctrl-Alt-P', mac: 'Ctrl-Option-P'},
        exec: async (editor) => {
            viewer.toggleEnabled(editor);
        },
        readOnly: true,
        scrollIntoView: "cursor",
    });
    editor.commands.addCommand({
        name: 'GPT completion',
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

    listenIdToken(async (idToken) => {
        const tokenInfo = await getTokenInfo(idToken);
        console.debug(tokenInfo);
        loadPicture(tokenInfo.picture());
        Content.create(tokenInfo, state, async (content) => {
            const session = new Session(idToken, content);
            setupEditor(session);

            switch (state.action()) {
                case 'create':
                    await content.create();
                    break;
                case 'open':
                    const text = await content.loadText();
                    session.setText(text);
                    break;
                default:
                    console.error(`Unknown action '${state.action()}'`)
            }
        });
    });
}

window.onload = main;
