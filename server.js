const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const db = new DatabaseSync(process.env.DB || path.join(__dirname, 'data.db'));
db.exec(`
CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT DEFAULT '', phone TEXT DEFAULT '', notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY, name TEXT NOT NULL, client_id INTEGER, status TEXT DEFAULT 'andamento', deadline TEXT DEFAULT '', description TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, title TEXT DEFAULT '', content TEXT DEFAULT '', project_id INTEGER, client_id INTEGER, pinned INTEGER DEFAULT 0, updated TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, time TEXT DEFAULT '', project_id INTEGER, notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, title TEXT NOT NULL, project_id INTEGER, status TEXT DEFAULT 'todo', priority TEXT DEFAULT 'media', due TEXT DEFAULT '', notes TEXT DEFAULT '');
`);

const COLS = {
  clients: ['name', 'email', 'phone', 'notes'],
  projects: ['name', 'client_id', 'status', 'deadline', 'description'],
  notes: ['title', 'content', 'project_id', 'client_id', 'pinned'],
  events: ['title', 'date', 'time', 'project_id', 'notes'],
  tasks: ['title', 'project_id', 'status', 'priority', 'due', 'notes'],
};
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
const readBody = (req) => new Promise((ok, bad) => {
  let s = ''; req.on('data', (c) => { s += c; if (s.length > 1e6) req.destroy(); });
  req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } });
});
const pick = (t, b) => COLS[t].filter((c) => c in b);
const touch = (t, id) => { if (t === 'notes') db.prepare("UPDATE notes SET updated=datetime('now') WHERE id=?").run(id); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const m = url.pathname.match(/^\/api\/(clients|projects|tasks|notes|events)(?:\/(\d+))?$/);
  try {
    if (m) {
      const [, t, id] = m;
      if (req.method === 'GET' && !id) return send(res, 200, db.prepare(`SELECT * FROM ${t} ORDER BY id DESC`).all());
      if (req.method === 'POST' && !id) {
        const b = await readBody(req); const c = pick(t, b);
        const r = db.prepare(`INSERT INTO ${t} (${c.join(',')}) VALUES (${c.map(() => '?').join(',')})`).run(...c.map((k) => b[k]));
        touch(t, r.lastInsertRowid);
        return send(res, 201, db.prepare(`SELECT * FROM ${t} WHERE id=?`).get(r.lastInsertRowid));
      }
      if (req.method === 'PUT' && id) {
        const b = await readBody(req); const c = pick(t, b);
        if (c.length) db.prepare(`UPDATE ${t} SET ${c.map((k) => k + '=?').join(',')} WHERE id=?`).run(...c.map((k) => b[k]), id);
        touch(t, id);
        return send(res, 200, db.prepare(`SELECT * FROM ${t} WHERE id=?`).get(id));
      }
      if (req.method === 'DELETE' && id) {
        if (t === 'clients') { db.prepare('UPDATE projects SET client_id=NULL WHERE client_id=?').run(id); db.prepare('UPDATE notes SET client_id=NULL WHERE client_id=?').run(id); }
        if (t === 'projects') { db.prepare('DELETE FROM tasks WHERE project_id=?').run(id); db.prepare('DELETE FROM events WHERE project_id=?').run(id); db.prepare('UPDATE notes SET project_id=NULL WHERE project_id=?').run(id); }
        db.prepare(`DELETE FROM ${t} WHERE id=?`).run(id);
        return send(res, 200, { ok: true });
      }
      return send(res, 405, { error: 'method' });
    }
    const file = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
    if (!file.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { send(res, 400, { error: String(e.message || e) }); }
}).listen(PORT, () => console.log(`Meu Workspace em http://localhost:${PORT}`));
