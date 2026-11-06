const {app, dialog} = require('electron');
const {createServer} = require('node:http');
const {mkdtempSync, rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const {join} = require('node:path');
const profile = mkdtempSync(join(tmpdir(), 'btunes-startup-reload-'));
app.setPath('userData', profile);
let requests = 0;
let aborted = false;
let finished = false;
const server = createServer((request, response) => {
    if (request.url === '/slow.png') {
        setTimeout(() => {
            if (!response.destroyed) response.end();
        }, 1000);
        return;
    }
    if (request.url !== '/') {
        response.end();
        return;
    }
    requests++;
    response.setHeader('Content-Type', 'text/html');
    response.end(requests === 1
        ? '<html><body><img src="/slow.png"><script>setTimeout(()=>location.reload(),50)</script></body></html>'
        : '<html><body>Reload complete</body></html>');
});

function finish(code) {
    if (finished) return;
    finished = true;
    server.close();
    rmSync(profile, {recursive: true, force: true});
    app.exit(code);
}

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    finish(1);
});
dialog.showErrorBox = (title, message) => {
    console.error(title, message);
    finish(1);
};
app.on('browser-window-created', (_, win) => {
    win.hide();
    win.webContents.on('did-fail-load', (_, code) => {
        if (code === -3) aborted = true;
    });
    win.webContents.on('did-finish-load', async () => {
        const text = await win.webContents.executeJavaScript('document.body.textContent');
        if (!text.includes('Reload complete')) return;
        setTimeout(() => {
            if (!aborted || requests < 2) {
                console.error('Test did not reproduce an aborted load');
                finish(1);
                return;
            }
            console.log('Startup reload passed: initial load aborted, replacement page loaded, no unhandled rejection.');
            finish(0);
        }, 100);
    });
});
setTimeout(() => {
    console.error('Startup reload test timed out');
    finish(1);
}, 10000);
server.listen(0, '127.0.0.1', () => {
    process.env.ELECTRON_RENDERER_URL = 'http://127.0.0.1:' + server.address().port + '/';
    require('../out/main/index.js');
});
