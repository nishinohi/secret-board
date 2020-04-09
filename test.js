'use strict';

const pug = require('pug');
const assert = require('assert');

const html = pug.renderFile('./views/posts.pug', {
    posts: [{
        id: 1,
        content: `<script>alert('test');</script>`,
        postedBy: 'guest1',
        trackingCookie: "4530744991697575_772458356ace297c43c815f6d09208443c32edd9",
        createdAt: new Date(),
        updatedAt: new Date()
    }],
    user: 'guest1'
});

// スクリプトタグがエスケープされて含まれていることをチェック
assert(html.includes(`&lt;script&gt;alert('test');&lt;/script&gt;`));
// IDにトラッキングIDのハイフンより前半のみが含まれているか
assert(html.includes('4530744991697575'));
// IDにトラッキングIDのハイフンより後半が含まれていないか
assert(!html.includes('772458356ace297c43c815f6d09208443c32edd9'));
console.log('テストが正常に完了しました');