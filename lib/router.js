'use strict';

const postsHandler = require('./posts-handler');
const util = require('./handler-util');

function route(req, res) {
    switch (req.url) {
        case '/posts':
            postsHandler.hadler(req, res);
            break;
        case '/logout':
            util.handleLogout(req, res);
            break;
        default:
            util.handleNotFound(req, res);
    }
}

module.exports = {
    route
};