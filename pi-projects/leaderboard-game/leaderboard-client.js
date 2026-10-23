/* Leaderboard client for Bean Run.
 * Posts a finished run to n8n, then shows a refreshable leaderboard
 * with three server-side sort modes: time, score, name. */
(function () {
  "use strict";

  var N8N = "https://n8n-cis091.codislabs.club/webhook";
  var SUBMIT_URL = N8N + "/leaderboard-submit";
  var LIST_URL = N8N + "/leaderboard";

  var qs = new URLSearchParams(location.search);
  var SESSION = (qs.get("session") || "wk4").slice(0, 32);
  var NAME_KEY = "beanrun.player";

  var css = ""
    + ".lb-back{position:fixed;inset:0;background:rgba(6,10,22,.82);display:flex;align-items:center;"
    + "justify-content:center;z-index:50;font-family:ui-monospace,Consolas,monospace;color:#dfe8ff;padding:16px}"
    + ".lb-card{background:#131c3a;border:1px solid #2b3f6b;border-radius:14px;padding:20px 22px;"
    + "width:min(560px,96vw);max-height:88vh;overflow:auto;box-shadow:0 24px 70px rgba(0,0,0,.6)}"
    + ".lb-card h2{margin:0 0 4px;font-size:20px;color:#9fe8b8}"
    + ".lb-sub{font-size:12px;color:#7f92b8;margin-bottom:14px}"
    + ".lb-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}"
    + "button.lbb{font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer;"
    + "background:#22355c;color:#cfe0ff;border:1px solid #3a5387}"
    + "button.lbb:hover{background:#2b4577}"
    + "button.lbb.on{background:#4aa8e8;border-color:#7cc6f5;color:#06101f;font-weight:700}"
    + "table.lbt{width:100%;border-collapse:collapse;font-size:13px}"
    + "table.lbt th{text-align:left;color:#7f92b8;font-weight:600;padding:6px 6px;border-bottom:1px solid #2b3f6b}"
    + "table.lbt td{padding:6px 6px;border-bottom:1px solid #1d2b4f}"
    + "table.lbt tr.me td{color:#9fe8b8}"
    + ".lb-empty{color:#7f92b8;font-size:13px;padding:14px 0}"
    + ".lb-status{font-size:11px;color:#6b7794;margin-top:10px;min-height:14px}"
    + "input.lbi{font:inherit;font-size:14px;padding:8px 10px;border-radius:8px;border:1px solid #3a5387;"
    + "background:#0d1529;color:#dfe8ff;width:100%;box-sizing:border-box}";

  function injectStyle() {
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var player = "";
  try { player = localStorage.getItem(NAME_KEY) || ""; } catch (e) { player = ""; }

  function askName() {
    return new Promise(function (resolve) {
      var back = el("div", "lb-back");
      var card = el("div", "lb-card");
      card.appendChild(el("h2", null, "Bean Run"));
      card.appendChild(el("div", "lb-sub", "Enter a name for the class leaderboard (first name is fine)."));
      var input = el("input", "lbi");
      input.value = player;
      input.maxLength = 20;
      input.placeholder = "your name";
      card.appendChild(input);
      var row = el("div", "lb-row");
      row.style.marginTop = "12px";
      var go = el("button", "lbb on", "Start");
      row.appendChild(go);
      card.appendChild(row);
      var status = el("div", "lb-status", "");
      card.appendChild(status);
      back.appendChild(card);
      document.body.appendChild(back);
      setTimeout(function () { input.focus(); input.select(); }, 40);

      function done() {
        var v = (input.value || "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 20);
        if (!v) { status.textContent = "please enter a name"; return; }
        player = v;
        try { localStorage.setItem(NAME_KEY, v); } catch (e) {}
        back.remove();
        resolve(v);
      }
      go.addEventListener("click", done);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") done(); });
    });
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "r-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function scoreFor(d) {
    // coins are worth 100 each; finishing fast adds up to 3000 bonus points
    var speedBonus = Math.max(0, Math.round((300 - d.seconds) * 10));
    return d.coins * 100 + speedBonus;
  }

  function submit(d) {
    var payload = {
      runId: uuid(),
      session: SESSION,
      player: player,
      score: scoreFor(d),
      ms: Math.round(d.seconds * 1000)
    };
    return fetch(SUBMIT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" }, // text/plain avoids a CORS preflight
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error("submit failed: HTTP " + r.status);
      return r.text();
    });
  }

  function load(sort) {
    var url = LIST_URL + "?session=" + encodeURIComponent(SESSION) + "&sort=" + encodeURIComponent(sort);
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (txt) {
        if (!txt) return { rows: [], total: 0 };
        var parsed = JSON.parse(txt);
        return Array.isArray(parsed) ? (parsed[0] || { rows: [], total: 0 }) : parsed;
      });
  }

  function fmtMs(ms) {
    if (!ms && ms !== 0) return "-";
    var s = ms / 1000;
    var m = Math.floor(s / 60);
    var r = s - m * 60;
    return m + ":" + (r < 10 ? "0" : "") + r.toFixed(1);
  }

  function showBoard(run) {
    var back = el("div", "lb-back");
    var card = el("div", "lb-card");
    card.appendChild(el("h2", null, "You made it!"));
    var sub = el("div", "lb-sub",
      player + " - " + run.coins + "/" + run.total + " coins - " + fmtMs(run.seconds * 1000) +
      " - score " + scoreFor(run) + " - session &quot;" + SESSION + "&quot;");
    card.appendChild(sub);

    var modes = [["score", "Score"], ["time", "Time"], ["name", "Name"]];
    var rowBtns = el("div", "lb-row");
    var refresh = el("button", "lbb", "Refresh");
    var again = el("button", "lbb", "Play again");
    var btns = {};
    modes.forEach(function (m) {
      var b = el("button", "lbb", m[1]);
      btns[m[0]] = b;
      rowBtns.appendChild(b);
    });
    rowBtns.appendChild(refresh);
    rowBtns.appendChild(again);
    card.appendChild(rowBtns);

    var status = el("div", "lb-status", "");
    var body = el("div");
    card.appendChild(body);
    card.appendChild(status);
    back.appendChild(card);
    document.body.appendChild(back);

    var current = "score";

    function render(d) {
      body.textContent = "";
      if (!d.rows || !d.rows.length) {
        body.appendChild(el("div", "lb-empty", "No runs yet - you are first. Press Refresh."));
        status.textContent = "session: " + SESSION + " | " + (d.total || 0) + " entries";
        return;
      }
      var t = el("table", "lbt");
      var head = el("tr");
      ["#", "player", "score", "time"].forEach(function (h) { head.appendChild(el("th", null, h)); });
      t.appendChild(head);
      d.rows.forEach(function (r) {
        var tr = el("tr");
        if (r.player === player) tr.className = "me";
        tr.appendChild(el("td", null, String(r.rank)));
        tr.appendChild(el("td", null, r.player));
        tr.appendChild(el("td", null, String(r.score)));
        tr.appendChild(el("td", null, fmtMs(r.ms)));
        t.appendChild(tr);
      });
      body.appendChild(t);
      status.textContent = "session: " + SESSION + " | sorted by " + d.sort + " | " + d.total + " entries";
    }

    function reload(why) {
      status.textContent = why === "refresh" ? "refreshing..." : "loading...";
      Object.keys(btns).forEach(function (k) { btns[k].className = "lbb" + (k === current ? " on" : ""); });
      load(current)
        .then(render)
        .catch(function (e) {
          status.textContent = "could not reach the leaderboard (" + e.message + ")";
        });
    }

    Object.keys(btns).forEach(function (k) {
      btns[k].addEventListener("click", function () { current = k; reload(); });
    });
    refresh.addEventListener("click", function () { reload("refresh"); });
    again.addEventListener("click", function () { location.reload(); });

    reload();
  }

  function boot() {
    injectStyle();
    if (!player) askName();

    window.addEventListener("pi:win", function (ev) {
      var run = ev.detail || { coins: 0, total: 0, seconds: 0, deaths: 0 };
      function go() { submit(run).then(function () { showBoard(run); }, function () { showBoard(run); }); }
      if (!player) askName().then(go); else go();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
