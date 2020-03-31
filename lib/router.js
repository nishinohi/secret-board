'use strict';

const postsHandler = require('./posts-handler');

function route(req, res) {
    switch (req.url) {
        case '/posts':
            postsHandler.hadler(req, res);
            break;
        case 'logout':
            break;
        default:
    }
}

module.exports = {
    route
};