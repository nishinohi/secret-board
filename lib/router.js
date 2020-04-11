'use strict';

const postsHandler = require('./posts-handler');
const util = require('./handler-util');

function route(req, res) {
    if (process.env.DATABASE_URL &&
        req.headers['x-forwarded-proto'] === 'http') {
        res.writeHead(301, {
            'Location': 'https://gentle-ravine-97641.herokuapp.com/posts'
        });
        res.end();
    }
    switch (req.url) {
        case '/posts':
            postsHandler.handle(req, res);
            break;
        case '/posts?delete=1':
            postsHandler.handleDelete(req, res);
            break;
        case '/logout':
            util.handleLogout(req, res);
            break;
        case '/favicon.ico':
            util.handleFavicon(req, res);
            break;
        default:
            util.handleNotFound(req, res);
    }
}

module.exports = {
    route
};