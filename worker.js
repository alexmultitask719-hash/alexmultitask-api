const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,x-admin-key'
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS)
  });
}

async function saveImage(env, dataUrl) {
  if (!dataUrl) return null;
  const i = dataUrl.indexOf(';base64,');
  const type = dataUrl.slice(5, i);
  const data = dataUrl.slice(i + 8);
  if (i < 0 || ['image/jpeg', 'image/png', 'image/webp'].indexOf(type) < 0) return null;
  if (data.length > 1200000) throw new Error('Picture is too big');
  const r = await env.DB.prepare('INSERT INTO images (data, type) VALUES (?, ?)').bind(data, type).run();
  return r.meta.last_row_id;
}

const ADMIN_HTML = `<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Alex Multitask Admin</title>
<style>
body{font-family:system-ui,Arial,sans-serif;background:#0b0d12;color:#f2f4f8;margin:auto;padding:16px;max-width:760px}
h1{font-size:1.3rem}h2{margin-top:30px;font-size:1.1rem}
input,textarea,button{width:100%;padding:12px;margin:5px 0;border-radius:10px;border:1px solid #222a3a;background:#141824;color:#fff;font-size:1rem;font-family:inherit;box-sizing:border-box}
button{background:#ff6b2c;color:#111;font-weight:700;border:0;cursor:pointer}
button.s{background:#222a3a;color:#fff;width:auto;padding:8px 14px;margin-right:6px}
.box{background:#141824;border:1px solid #222a3a;border-radius:14px;padding:14px;margin:10px 0}
img{max-width:100%;border-radius:10px;display:block;margin:8px 0}
small{color:#9aa3b5}
</style></head><body>
<div id='login'><h1>Alex Multitask Admin</h1><input id='pw' type='password' placeholder='Admin password'><button onclick='login()'>Log in</button></div>
<div id='app' style='display:none'>
<h1>Alex Multitask Admin</h1>
<h2>Services</h2><div id='list'></div>
<div class='box'><b id='ftitle'>Add a service</b>
<input type='hidden' id='sid'><input id='st' placeholder='Service name'><textarea id='sd' rows='3' placeholder='Short description'></textarea><input id='si' placeholder='Emoji icon (optional)'>
<input type='file' id='sf' accept='image/*' onchange='pick(this.files[0],"s")'><img id='prev' style='display:none'>
<button onclick='saveService()'>Save service</button><button class='s' onclick='resetForm()'>Clear form</button></div>
<h2>Portfolio</h2><div id='plist'></div>
<div class='box'><b>Add a portfolio item</b>
<input id='pt' placeholder='Project name'><input id='pl' placeholder='Link to the project (optional)'>
<input type='file' id='pf' accept='image/*' onchange='pick(this.files[0],"p")'><img id='pprev' style='display:none'>
<button onclick='savePortfolio()'>Save portfolio item</button></div>
<h2>Contact details</h2>
<div class='box'><input id='cp' placeholder='Phone'><input id='cw' placeholder='WhatsApp number, digits only'><input id='ce' placeholder='Email'><button onclick='saveSettings()'>Save contact details</button></div>
<h2>Bookings</h2><div id='book'></div>
</div>
<script>
var key = sessionStorage.getItem('amk') || '';
var imgData = '';
var pImgData = '';
function $(id) { return document.getElementById(id); }
function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; }
async function api(path, method, body) {
  var r = await fetch(path, { method: method || 'GET', headers: { 'Content-Type': 'application/json', 'x-admin-key': key }, body: body ? JSON.stringify(body) : undefined });
  var j = await r.json().catch(function () { return {}; });
  if (!r.ok) throw new Error(j.error || 'Something went wrong');
  return j;
}
async function login() {
  key = $('pw').value;
  try { await api('/api/admin/check'); sessionStorage.setItem('amk', key); show(); }
  catch (e) { alert('Wrong password'); }
}
function show() { $('login').style.display = 'none'; $('app').style.display = 'block'; loadServices(); loadPortfolio(); loadSettings(); loadBookings(); }
if (key) { api('/api/admin/check').then(show).catch(function () {}); }
function pick(file, which) {
  if (!file) return;
  var fr = new FileReader();
  fr.onload = function () {
    var img = new Image();
    img.onload = function () {
      var s = Math.min(1, 900 / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      var d = c.toDataURL('image/jpeg', 0.8);
      if (which === 'p') { pImgData = d; $('pprev').src = d; $('pprev').style.display = 'block'; }
      else { imgData = d; $('prev').src = d; $('prev').style.display = 'block'; }
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}
async function loadServices() {
  var s = await api('/api/services');
  window.S = s;
  $('list').innerHTML = s.map(function (x) {
    return '<div class=box>' + (x.image_url ? '<img src=' + x.image_url + '>' : '') + '<b>' + esc(x.icon || '') + ' ' + esc(x.title) + '</b><br><small>' + esc(x.description) + '</small><br><br><button class=s onclick=editS(' + x.id + ')>Edit</button><button class=s onclick=delS(' + x.id + ')>Delete</button></div>';
  }).join('') || '<small>No services yet.</small>';
}
function editS(id) {
  var x = window.S.find(function (a) { return a.id == id; });
  $('sid').value = x.id; $('st').value = x.title; $('sd').value = x.description || ''; $('si').value = x.icon || '';
  imgData = ''; $('prev').style.display = 'none';
  $('ftitle').textContent = 'Edit service (leave the picture empty to keep the old one)';
  $('ftitle').scrollIntoView();
}
function resetForm() {
  ['sid', 'st', 'sd', 'si', 'sf'].forEach(function (i) { $(i).value = ''; });
  imgData = ''; $('prev').style.display = 'none'; $('ftitle').textContent = 'Add a service';
}
async function saveService() {
  var id = $('sid').value;
  var body = { title: $('st').value, description: $('sd').value, icon: $('si').value, image: imgData };
  if (!body.title) { alert('Enter the service name'); return; }
  try {
    if (id) await api('/api/admin/services/' + id, 'PUT', body); else await api('/api/admin/services', 'POST', body);
    resetForm(); loadServices();
  } catch (e) { alert(e.message); }
}
async function delS(id) {
  if (!confirm('Delete this service?')) return;
  await api('/api/admin/services/' + id, 'DELETE'); loadServices();
}
async function loadPortfolio() {
  var p = await api('/api/portfolio');
  $('plist').innerHTML = p.map(function (x) {
    return '<div class=box>' + (x.image_url ? '<img src=' + x.image_url + '>' : '') + '<b>' + esc(x.title) + '</b><br><small>' + esc(x.link) + '</small><br><br><button class=s onclick=delP(' + x.id + ')>Delete</button></div>';
  }).join('') || '<small>No portfolio items yet.</small>';
}
async function savePortfolio() {
  var body = { title: $('pt').value, link: $('pl').value, image: pImgData };
  if (!body.title) { alert('Enter the project name'); return; }
  try {
    await api('/api/admin/portfolio', 'POST', body);
    $('pt').value = ''; $('pl').value = ''; $('pf').value = ''; pImgData = ''; $('pprev').style.display = 'none';
    loadPortfolio();
  } catch (e) { alert(e.message); }
}
async function delP(id) {
  if (!confirm('Delete this portfolio item?')) return;
  await api('/api/admin/portfolio/' + id, 'DELETE'); loadPortfolio();
}
async function loadSettings() {
  var s = await api('/api/settings');
  $('cp').value = s.phone || ''; $('cw').value = s.whatsapp || ''; $('ce').value = s.email || '';
}
async function saveSettings() {
  try { await api('/api/admin/settings', 'PUT', { phone: $('cp').value, whatsapp: $('cw').value, email: $('ce').value }); alert('Saved'); }
  catch (e) { alert(e.message); }
}
async function loadBookings() {
  var b = await api('/api/admin/bookings');
  $('book').innerHTML = b.map(function (x) {
    return '<div class=box><b>' + esc(x.name) + '</b> wants <b>' + esc(x.service) + '</b><br>Phone: ' + esc(x.phone) + '<br>Email: ' + esc(x.email) + '<br>' + esc(x.message) + '<br><small>' + esc(x.created_at) + '</small><br><br><button class=s onclick=delB(' + x.id + ')>Delete</button></div>';
  }).join('') || '<small>No bookings yet.</small>';
}
async function delB(id) {
  if (!confirm('Delete this booking?')) return;
  await api('/api/admin/bookings/' + id, 'DELETE'); loadBookings();
}
</script></body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

    try {
      if (path === '/') return new Response('Alex Multitask API is running', { headers: CORS });
      if (path === '/admin') return new Response(ADMIN_HTML, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });

      if (path === '/api/services' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT id, title, description, icon, image_id FROM services ORDER BY sort, id').all();
        return json(results.map(function (s) {
          return { id: s.id, title: s.title, description: s.description, icon: s.icon, image_url: s.image_id ? url.origin + '/img/' + s.image_id : null };
        }));
      }
      if (path === '/api/portfolio' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT id, title, link, image_id FROM portfolio ORDER BY id DESC').all();
        return json(results.map(function (p) {
          return { id: p.id, title: p.title, link: p.link, image_url: p.image_id ? url.origin + '/img/' + p.image_id : null };
        }));
      }
      if (path === '/api/settings' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
        const o = {};
        results.forEach(function (r) { o[r.key] = r.value; });
        return json(o);
      }
      if (path.startsWith('/img/') && method === 'GET') {
        const row = await env.DB.prepare('SELECT data, type FROM images WHERE id = ?').bind(Number(path.slice(5))).first();
        if (!row) return new Response('Not found', { status: 404 });
        const bin = atob(row.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Response(bytes, { headers: Object.assign({ 'Content-Type': row.type, 'Cache-Control': 'public, max-age=86400' }, CORS) });
      }
      if (path === '/api/bookings' && method === 'POST') {
        const b = await request.json();
        if (!b.name || !b.phone || !b.service) return json({ error: 'Please fill name, phone and service' }, 400);
        await env.DB.prepare('INSERT INTO bookings (name, phone, email, service, message) VALUES (?, ?, ?, ?, ?)')
          .bind(String(b.name).slice(0, 100), String(b.phone).slice(0, 40), String(b.email || '').slice(0, 100), String(b.service).slice(0, 100), String(b.message || '').slice(0, 1000)).run();
        return json({ ok: true });
      }

      if (path.startsWith('/api/admin/')) {
        if (!env.ADMIN_KEY || request.headers.get('x-admin-key') !== env.ADMIN_KEY) return json({ error: 'Wrong password' }, 401);
        const parts = path.split('/');
        const what = parts[3];
        const id = parts[4];

        if (what === 'check') return json({ ok: true });

        if (what === 'bookings') {
          if (method === 'GET') {
            const { results } = await env.DB.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
            return json(results);
          }
          if (method === 'DELETE' && id) {
            await env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(Number(id)).run();
            return json({ ok: true });
          }
        }

        if (what === 'settings' && method === 'PUT') {
          const b = await request.json();
          for (const k of ['phone', 'whatsapp', 'email']) {
            if (typeof b[k] === 'string') {
              await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(k, b[k].slice(0, 100)).run();
            }
          }
          return json({ ok: true });
        }

        if (what === 'portfolio') {
          if (method === 'POST') {
            const b = await request.json();
            const imageId = await saveImage(env, b.image);
            await env.DB.prepare('INSERT INTO portfolio (title, link, image_id) VALUES (?, ?, ?)')
              .bind(String(b.title).slice(0, 100), String(b.link || '').slice(0, 300), imageId).run();
            return json({ ok: true });
          }
          if (method === 'DELETE' && id) {
            const old = await env.DB.prepare('SELECT image_id FROM portfolio WHERE id = ?').bind(Number(id)).first();
            if (old && old.image_id) await env.DB.prepare('DELETE FROM images WHERE id = ?').bind(old.image_id).run();
            await env.DB.prepare('DELETE FROM portfolio WHERE id = ?').bind(Number(id)).run();
            return json({ ok: true });
          }
        }

        if (what === 'services') {
          if (method === 'POST') {
            const b = await request.json();
            const imageId = await saveImage(env, b.image);
            await env.DB.prepare('INSERT INTO services (title, description, icon, image_id) VALUES (?, ?, ?, ?)')
              .bind(String(b.title).slice(0, 100), String(b.description || '').slice(0, 500), b.icon || '✨', imageId).run();
            return json({ ok: true });
          }
          if (method === 'PUT' && id) {
            const b = await request.json();
            const old = await env.DB.prepare('SELECT image_id FROM services WHERE id = ?').bind(Number(id)).first();
            let imageId = old ? old.image_id : null;
            const fresh = await saveImage(env, b.image);
            if (fresh) {
              if (imageId) await env.DB.prepare('DELETE FROM images WHERE id = ?').bind(imageId).run();
              imageId = fresh;
            }
            await env.DB.prepare('UPDATE services SET title = ?, description = ?, icon = ?, image_id = ? WHERE id = ?')
              .bind(String(b.title).slice(0, 100), String(b.description || '').slice(0, 500), b.icon || '✨', imageId, Number(id)).run();
            return json({ ok: true });
          }
          if (method === 'DELETE' && id) {
            const old = await env.DB.prepare('SELECT image_id FROM services WHERE id = ?').bind(Number(id)).first();
            if (old && old.image_id) await env.DB.prepare('DELETE FROM images WHERE id = ?').bind(old.image_id).run();
            await env.DB.prepare('DELETE FROM services WHERE id = ?').bind(Number(id)).run();
            return json({ ok: true });
          }
        }
      }

      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: e.message || 'Server error' }, 500);
    }
  }
};
