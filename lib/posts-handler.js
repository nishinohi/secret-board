'use strict';

const crypto = require('crypto');
const pug = require('pug');
const util = require('./handler-util');
const Cookies = require('cookies');
const Post = require('./post');
const moment = require('moment-timezone');

const trackingIdKey = 'tracking_id';

const oneTimeTokenMap = new Map();

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
                const oneTimeToken = crypto.randomBytes(8).toString('hex');
                oneTimeTokenMap.set(req.user, oneTimeToken);
                res.end(pug.renderFile('./views/posts.pug', {
                    posts: posts,
                    user: req.user,
                    oneTimeToken: oneTimeToken
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
                const dataArray = decoded.split('&');
                const content = dataArray[0] ? dataArray[0].split('content=')[1] : '';
                const requestOneTimeToken = dataArray[1] ? dataArray[1].split('oneTimeToken=')[1] : '';
                // tokenがおかしい場合投稿させない
                if (oneTimeTokenMap.get(req.user) !== requestOneTimeToken) {
                    util.handleBadRequest(req, res);
                    return;
                }
                Post.create({
                    content: content,
                    trackingCookie: trackingId,
                    postedBy: req.user
                }).then(() => {
                    console.info(`投稿されました：${content}`);
                    oneTimeTokenMap.delete(req.user);
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
                const dataArray = decoded.split('&');
                const id = dataArray[0] ? dataArray[0].split('id=')[1] : '';
                const requestOneTimeToken = dataArray[1] ? dataArray[1].split('oneTimeToken=')[1] : '';
                if (requestOneTimeToken !== oneTimeTokenMap.get(req.user)) {
                    util.handleBadRequest(req, res);
                    return;
                }
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
    const originalId = parseInt(crypto.randomBytes(8).toString('hex'), 16);
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

const secretKey = 'fe3d243caf6d7f02a53028a69513bec32f27202387645b31eea6af064e089784490109a8751268bf1db0fe1660f73b91d5d4e63412afbbb1839cc2636a38560e05de727718e79b38a726dee61f1fd6a2006ab73647809593bcd3dfc62ec99638b5c92341bff7c6e5f73768962ba114cbe685e04eff29736d77396c49bd23ad2e37e10bb1b4b4c76161255790a4844e710d3dc764ea93dcd1bd381b5c5d8f0ceaea90bec6477fd66fa864b343a6737a1a5a977f5e25f0a32d8dfaeb911eae543a82f5cab4720065036009b00e06c3cb5489f73c2c9b994c818988e0b6cb9bc4475c1b802fba0dfbd1696a37b6c18c8e539a4a3c89c361cb322fdfc4ae8e708061';

function createValidHash(originalId, userId) {
    const sha1sum = crypto.createHash('sha1');
    sha1sum.update(originalId + userId + secretKey);
    return sha1sum.digest('hex');
}

module.exports = {
    handle,
    handleDelete
}