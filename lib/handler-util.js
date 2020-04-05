'use strict';

function handleLogout(req, res) {
    res.writeHead(401, {
        'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end('ログアウトしました');
    console.info(
        `ログアウトしました：user: ${req.user}` +
        `remoteAddress: ${req.connection.remoteAddress}, ` +
        `userAgent: ${req.headers['user-agent']}`);
}

function handleNotFound(req, res) {
    res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end('ページが見つかりません');
}

function handleBadRequest(req, res) {
    res.writeHead(400, {
        'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end('404-Bad Request');
}

module.exports = {
    handleLogout,
    handleNotFound,
    handleBadRequest
};