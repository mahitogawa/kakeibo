// キャッシュバージョン — 変更するたびに古いキャッシュが消える
const CACHE_VER = 'kakeibo-v4';

// アイコン・ライブラリなど変わらないものだけキャッシュ
const STATIC = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.js'
];

// インストール: 静的ファイルをキャッシュ、即座にアクティブ化
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VER)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

// アクティベート: 古いキャッシュを全削除してすぐ制御開始
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// フェッチ戦略:
//   index.html → ネットワーク優先（常に最新を取得。オフライン時のみキャッシュ）
//   その他     → キャッシュ優先（静的アセットは速度重視）
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if (isHTML) {
    // ネットワーク優先: 最新のindex.htmlをサーバーから取得
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_VER).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // オフライン時はキャッシュで
    );
  } else {
    // キャッシュ優先: アイコン・ライブラリは速度重視
    e.respondWith(
      caches.match(e.request).then(r => {
        if (r) return r;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_VER).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
  }
});
