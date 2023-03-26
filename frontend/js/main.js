import {marked} from 'marked';
import dompurify from 'dompurify';
import axios from 'axios';
import {State} from './state';
import {Content} from './content.js';
import {StatusBar} from "./statusbar.js";
import {UndoManager} from './undo.js';
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
        this.undoManager = null;
        this.contentArea = document.getElementById('contentArea');
        this.buttons = {
            title: document.getElementById('title'),
            save: document.getElementById('save'),
            undo: document.getElementById('undo'),
            redo: document.getElementById('redo'),
            gpt: document.getElementById('gpt'),
            tips: document.getElementById('tips'),
        };
    }

    setEditor(editor, viewer) {
        this.editor = editor;
        this.viewer = viewer;
        this.undoManager = new UndoManager(editor.session.getUndoManager());
    }

    setText(text) {
        console.assert(this.editor !== null);
        this.editor.setValue(text, -1);
        // Undoで戻れるのはコンテンツを設定した直後まで
        this.undoManager.reset();
    }

    onChanged() {
        this.onChangedConfig(parseConfig(this.editor.getValue()));
        if (this.viewer.isEnabled()) {
            this.viewer.setContent(this.editor.getValue());
        }
        this.updateButtonState();
    }

    bookmark() {
        this.undoManager.bookmark();
        this.updateButtonState();
    }

    updateButtonState() {
        const undoManager = this.undoManager;
        const saved = undoManager.isAtBookmark();
        this.buttons.title.disabled = saved;
        this.buttons.save.disabled = saved;
        this.buttons.undo.disabled = !undoManager.canUndo();
        this.buttons.redo.disabled = !undoManager.canRedo();
    }

    onChangedCursor() {
        const positionRatio = this.editor.getCursorPosition().row / this.editor.session.getLength();
        this.viewer.setScrollTop(positionRatio);
    }

    onChangedConfig(config) {
        this.buttons.gpt.disabled = false;
        this.editor.setOptions(config.getAceOptions());
        this.config = config;
    }

    resize() {
        const headerHeight = document.querySelector('nav').offsetHeight;
        const footerHeight = document.querySelector('footer').offsetHeight;
        this.contentArea.style.height = `calc(100vh - ${headerHeight}px - ${footerHeight}px)`
        const contentAreaHeight = this.contentArea.offsetHeight;

        const e = this.editor;
        const v = this.viewer;

        if (v.isEnabled()) {
            const viewerHeight = contentAreaHeight / 2;
            v.container.style.height = `${viewerHeight}px`;
            e.container.style.height = `${contentAreaHeight - viewerHeight}px`;
        } else {
            v.container.style.height = '0px';
            e.container.style.height = `${contentAreaHeight}px`;
        }

        e.resize();
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

    toggleEnabled(session) {
        this.container.classList.toggle('viewer-enabled');
        if (this.isEnabled()) {
            this.setContent(session.editor.getValue());
        }
        session.resize();
    }
}

function loadPicture(url) {
    document.getElementById('account').src = url;
}

async function completion(session) {
    if (session.idToken == null) {
        session.buttons.gpt.disabled = true;
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
        session.editor.session.insert(session.editor.getCursorPosition(), `${response.data}\n`);
    } catch (e) {
        console.error(e);
        session.buttons.gpt.disabled = true;
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
            session.bookmark();
        },
        readOnly: false,
    });
    editor.commands.addCommand({
        name: 'preview',
        description: 'Preview markdown',
        bindKey: {win: 'Ctrl-Alt-P', mac: 'Ctrl-Option-P'},
        exec: async () => {
            viewer.toggleEnabled(session);
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

    session.buttons.title.onclick = () => {
        editor.execCommand('save');
    };
    session.buttons.save.onclick = () => {
        editor.execCommand('save');
    };
    session.buttons.undo.onclick = () => {
        session.undoManager.undo();
    };
    session.buttons.redo.onclick = () => {
        session.undoManager.redo();
    };
    session.buttons.gpt.onclick = () => {
        editor.execCommand('gptCompletion');
    };
    session.buttons.tips.onclick = () => {
        editor.execCommand('openCommandPallete'); // https://github.com/ajaxorg/ace/issues/5105
    }

    session.setEditor(editor, viewer);
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

            session.resize();
            window.addEventListener('resize', () => {
                session.resize();
            });

            switch (state.action()) {
                case 'create':
                    await content.create();
                    break;
                case 'open':
                    const text = await content.loadText();
                    session.setText(text);
                    session.bookmark();
                    break;
                default:
                    console.error(`Unknown action '${state.action()}'`)
            }
        });
    });
}

window.onload = main;
