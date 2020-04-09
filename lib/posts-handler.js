'use strict';

const crypto = require('crypto');
const pug = require('pug');
const util = require('./handler-util');
const Cookies = require('cookies');
const Post = require('./post');
const moment = require('moment-timezone');

const trackingIdKey = 'tracking_id';

function handle(req, res) {
    const cookies = new Cookies(req, res);
    const trackingId = addTrackingCookie(cookies, req.user);
    switch (req.method) {
        case 'GET':
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            Post.findAll({
                order: [['id', 'DESC']]
            }).then((posts) => {
                posts.forEach((post) => {
                    post.content = post.content.replace(/\+/g, ' ');
                    post.formattedCreatedAt = moment(post.createdAt).tz('Asia/Tokyo').format('YYYY年MM月DD日 HH時mm分ss秒');
                });
                res.end(pug.renderFile('./views/posts.pug', {
                    posts: posts,
                    user: req.user
                }));
                console.info(`閲覧されました: user: ${req.user}, ` +
                    `trackingId: ${trackingId}, ` +
                    `remoteAddress: ${req.connection.remoteAddress}, ` +
                    `userAgent: ${req.headers[`user-agent`]}`);
            });
            break;
        case 'POST':
            let body = [];
            req.on(`data`, (chunk) => {
                body.push(chunk);
            }).on(`end`, () => {
                body = Buffer.concat(body).toString();
                const decoded = decodeURIComponent(body);
                const content = decoded.split('content=')[1]
                console.info(`投稿されました：${content}`);
                Post.create({
                    content: content,
                    trackingCookie: trackingId,
                    postedBy: req.user
                }).then(() => {
                    handleRedirectPosts(req, res);
                });
            });
            break;
        default:
            util.handleBadRequest(req, res);
    }
}

function handleDelete(req, res) {
    switch (req.method) {
        case 'POST':
            let body = [];
            req.on('data', (chunk) => {
                body.push(chunk);
            }).on('end', () => {
                body = Buffer.concat(body).toString();
                const decoded = decodeURIComponent(body);
                const id = decoded.split('id=')[1];
                Post.findByPrimary(id).then((post) => {
                    if (req.user !== post.postedBy) { return; }
                    post.destroy().then(() => {
                        handleRedirectPosts(req, res);
                        console.info(
                            `削除されました：user: ${req.user}, ` +
                            `remoteAddress: ${req.connection.remoteAddress}, ` +
                            `userAgent: ${req.headers['user-agent']}`);
                    });
                });
            })
            break;
        default:
            util.handleBadRequest(req, res);
    }
}

function handleRedirectPosts(req, res) {
    res.writeHead(303, {
        'Location': '/posts'
    });
    res.end();
}

/**
 * @param {*} cookies 
 * @param {*} user 
 */
function addTrackingCookie(cookies, userId) {
    const requestedTrackingId = cookies.get(trackingIdKey);
    if (isValidTrackingId(requestedTrackingId, userId)) {
        return requestedTrackingId;
    }
    const originalId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    const trackingId = originalId + '_' + createValidHash(originalId, userId);
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
    return trackingId;
}

function isValidTrackingId(trackingId, userId) {
    if (!trackingId) {
        return false;
    }
    const splitted = trackingId.split('_');
    const originId = splitted[0];
    const requestedHash = splitted[1];
    return createValidHash(originId, userId) === requestedHash;
}

function createValidHash(originalId, userId) {
    const sha1sum = crypto.createHash('sha1');
    sha1sum.update(originalId + userId);
    return sha1sum.digest('hex');
}

module.exports = {
    handle,
    handleDelete
}