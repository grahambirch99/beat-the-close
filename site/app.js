(() => {
  const D = window.__DATA__ || { picks: { weeks: [] }, summary: {}, wire: { items: [] } };
  D.nba = D.nba || { summary: {}, nights: [], by_type: [] };
  D.bonus = D.bonus || { summary: {}, parlays: [] };
  const CFG = window.SITE_CONFIG || {};
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtU = (u) => (u == null ? "–" : `${u > 0 ? "+" : u < 0 ? "−" : ""}${Math.abs(u).toFixed(2)}u`);
  const fmtPts = (p) => `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p).toFixed(1)}`;
  const rec = (r) => `${r.w}–${r.l}${r.p ? `–${r.p}` : ""}`;
  const ICON = {
    W: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor" opacity=".18"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    L: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor" opacity=".18"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    open: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    P: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor" opacity=".18"/><path d="M8 12h8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  };
  ICON.void = ICON.P;
  const STATUS = { W: "Won", L: "Lost", P: "Push", void: "Void", open: "Open" };

  /* ---------------- board ---------------- */
  const weeks = D.picks.weeks || [];
  let week = D.picks.current_week;
  let filter = "all";
  const fromHash = () => { const m = location.hash.match(/week-(\d+)/); if (m) week = +m[1]; };
  fromHash();

  function untilKick(iso, nba) {
    const ms = new Date(iso) - Date.now(), w = nba ? "Tip-off" : "Kickoff";
    if (ms <= 0) return nba ? "Tipped off" : "Kicked off";
    const h = Math.floor(ms / 36e5), d = Math.floor(h / 24);
    return d >= 1 ? `${w} in ${d}d ${h % 24}h` : `${w} in ${h}h ${Math.floor((ms % 36e5) / 6e4)}m`;
  }

  function clvTrack(p) {
    if (p.clv == null) {
      const why = p.status === "pending" ? `Closing price comes in at ${p.kind === "nba" ? "tip-off" : "kickoff"}` : p.price === "Pick'em" ? "No closing price for pick'em apps" : "No closing price captured";
      return `<div class="clv"><div class="clv-track"></div><div class="clv-label"><span>${why}</span></div></div>`;
    }
    const span = Math.max(4, Math.abs(p.clv) + 1.5);
    const pos = (v) => 50 + (v / span) * 50;
    const a = pos(0), b = pos(p.clv);
    const left = Math.min(a, b), width = Math.abs(b - a);
    const cls = p.clv >= 0 ? "beat" : "lag";
    return `<div class="clv" title="Our price vs the closing no-margin price">
      <div class="clv-track" role="img" aria-label="${p.clv >= 0 ? "Beat" : "Trailed"} the close by ${Math.abs(p.clv).toFixed(1)} points">
        <div class="clv-fill ${cls}" style="left:${left}%;width:${Math.max(width, 1.5)}%"></div>
        <div class="clv-mark" style="left:calc(${a}% - 2px)"></div>
      </div>
      <div class="clv-label"><span>Closing-line value</span><b>${fmtPts(p.clv)} pts</b></div></div>`;
  }

  function ticket(p) {
    const st = p.status === "pending" ? "open" : p.status;
    const tierTag = p.kind === "nba" ? `<span class="tag T">Paper</span>${p.retired ? '<span class="tag">Retired v1 rules</span>' : p.rules === "h2h" ? '<span class="tag">Matchup test</span>' : p.tier === "A" ? '<span class="tag A">Strong</span>' : ""}`
      : p.kind === "paper" ? '<span class="tag">Paper</span>'
      : p.kind === "teaser" ? '<span class="tag T">Teaser</span>'
      : p.tier === "A" ? '<span class="tag A">Strong</span>' : p.tier === "B" ? '<span class="tag">Value</span>' : "";
    const stake = p.stake ? `${+(p.stake / 10).toFixed(2)}u` : "";
    const worst = st === "open" && p.worst ? `<span>Take ${esc(p.worst)} or better</span>` : "";
    const edge = p.edge != null && p.kind !== "teaser" ? `<span>${p.edge > 0 ? "+" : ""}${p.edge}% edge</span>` : "";
    const fresh = Date.now() - new Date(p.posted) < 2 * 36e5 ? " fresh" : "";
    const posted = new Date(p.posted).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
    const stub = st === "open"
      ? `<div class="result open">${ICON.open}<span>Open</span></div><div class="stub-line">${untilKick(p.kick, p.kind === "nba")}</div>`
      : `<div class="result ${st}">${ICON[st] || ""}<span>${STATUS[st]}</span></div>
         <div class="stub-line">${p.actual ? `<b>${esc(p.actual)}</b>` : ""}${p.units != null && p.kind !== "paper" ? ` <span>${fmtU(p.units)}</span>` : ""}</div>`;
    return `<article class="ticket ${st} ${p.kind}${fresh}" id="pick-${esc(p.id)}">
      <div class="t-body">
        <div class="t-meta">${tierTag}<span>${esc(p.game)}</span><span>${esc(p.kick_label)}</span></div>
        ${p.kind === "teaser" ? "" : `<p class="t-who">${esc(p.title)}</p>`}
        <h3 class="t-bet">${esc(p.bet)}</h3>
        <div class="t-price"><span><span class="odds">${esc(p.venue)} ${esc(p.price)}</span></span>${stake ? `<span>${stake}</span>` : ""}${edge}${worst}</div>
        <p class="t-why">${esc(p.analysis)}</p>
        <p class="t-posted">Posted ${esc(posted)}${CFG.repo ? `, <a href="${esc(CFG.repo)}/commits/main/${p.kind === "nba" ? "data/nba/paper.csv" : "site/data/picks.json"}">timestamp</a>` : ""}</p>
      </div>
      <div class="t-stub">${stub}${p.kind === "teaser" ? "" : clvTrack(p)}</div>
    </article>`;
  }

  function renderBoard() {
    const wk = weeks.find((w) => w.week === week) || weeks[0] || { week, picks: [], record: { w: 0, l: 0, p: 0 } };
    week = wk.week;
    $("#week-num").textContent = wk.week;
    $("#week-sub").textContent = wk.dates ? `${wk.dates}${wk.record && (wk.record.w + wk.record.l) ? `, ${rec(wk.record)} this week` : ""}` : "";
    const s = D.summary.season || {};
    $("#season-line").innerHTML = (s.w + s.l) ? `Season <b>${rec(s)}</b>, <b>${fmtU(s.units)}</b>${s.beat != null ? `, beat the close on <b>${s.beat}%</b> of bets` : ""}` : "";
    $("#week-pills").innerHTML = weeks.map((w) => `<button class="week-pill" role="tab" aria-selected="${w.week === wk.week}" data-week="${w.week}">
        Week ${w.week}<small>${w.record.w + w.record.l ? rec(w.record) : w.picks.length ? `${w.picks.length} open` : "No picks yet"}</small></button>`).join("");
    const ps = wk.picks.filter((p) => filter === "all" || (filter === "open" ? p.status === "pending" : p.status === filter));
    const groups = [["Bets", ps.filter((p) => p.kind === "bet")], ["Teasers", ps.filter((p) => p.kind === "teaser")],
      ["Paper picks (tracked, not counted)", ps.filter((p) => p.kind === "paper")]];
    let html = groups.filter(([, g]) => g.length).map(([t, g]) => `<h2 class="group-title">${t}</h2>${g.map(ticket).join("")}`).join("");
    if (!html) {
      html = wk.picks.length
        ? `<div class="empty"><b>Nothing matches that filter.</b>Pick another filter to see this week's ${wk.picks.length} picks.</div>`
        : `<div class="empty"><b>No picks posted for Week ${wk.week} yet.</b>Most picks post on Sunday morning after inactives. Join the Discord to get them the moment they post.</div>`;
    }
    $("#tickets").innerHTML = html;
  }

  document.addEventListener("click", (e) => {
    const n = e.target.closest(".week-pill[data-night]");
    if (n) { night = n.dataset.night; renderNba(); return; }
    const b = e.target.closest(".week-pill[data-week]");
    if (b) { week = +b.dataset.week; history.replaceState(null, "", `#week-${week}`); renderBoard(); }
    const f = e.target.closest(".chip");
    if (f) { filter = f.dataset.filter; document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === f)); renderBoard(); }
  });

  /* ---------------- record ---------------- */
  function svgEl(w, h, inner) { return `<svg viewBox="0 0 ${w} ${h}" role="img">${inner}</svg>`; }

  function unitsChart() {
    const c = D.summary.curve || [], el = $("#units-chart");
    if (c.length < 2) { el.innerHTML = '<p class="note">The chart starts after a few graded picks.</p>'; return; }
    const W = 720, H = 240, P = { l: 44, r: 14, t: 12, b: 26 };
    const ys = c.map((d) => d.units).concat(0), lo = Math.min(...ys), hi = Math.max(...ys), pad = Math.max(.5, (hi - lo) * .12);
    const y0 = lo - pad, y1 = hi + pad;
    const X = (i) => P.l + (i / (c.length - 1)) * (W - P.l - P.r), Y = (v) => P.t + (1 - (v - y0) / (y1 - y0)) * (H - P.t - P.b);
    const ticks = [y0, (y0 + y1) / 2, y1].map((v) => Math.round(v * 2) / 2);
    let g = ticks.map((v) => `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}"/><g class="axis"><text x="${P.l - 8}" y="${Y(v) + 4}" text-anchor="end">${fmtU(v)}</text></g>`).join("");
    g += `<line class="zero" x1="${P.l}" x2="${W - P.r}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    const path = c.map((d, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(d.units).toFixed(1)}`).join("");
    g += `<path d="${path}" fill="none" stroke="var(--flood)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    const last = c[c.length - 1];
    g += `<circle cx="${X(c.length - 1)}" cy="${Y(last.units)}" r="5" fill="var(--flood)" stroke="var(--panel)" stroke-width="2"/>`;
    const wk = [...new Set(c.map((d) => d.week))];
    g += wk.map((w) => { const i = c.findIndex((d) => d.week === w); return `<g class="axis"><text x="${X(i)}" y="${H - 6}" text-anchor="start">Wk ${w}</text></g>`; }).join("");
    g += `<line id="u-cross" class="grid" y1="${P.t}" y2="${H - P.b}" x1="0" x2="0" visibility="hidden"/><circle id="u-dot" r="5" cx="0" cy="0" fill="var(--ink)" visibility="hidden"/>`;
    g += `<rect x="${P.l}" y="0" width="${W - P.l - P.r}" height="${H}" fill="transparent" id="u-hit"/>`;
    el.innerHTML = svgEl(W, H, g) + '<div class="tip" hidden></div>';
    const svg = el.querySelector("svg"), tip = el.querySelector(".tip");
    svg.addEventListener("pointermove", (e) => {
      const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (W / r.width);
      const i = Math.max(0, Math.min(c.length - 1, Math.round(((x - P.l) / (W - P.l - P.r)) * (c.length - 1))));
      const d = c[i];
      svg.querySelector("#u-cross").setAttribute("x1", X(i)); svg.querySelector("#u-cross").setAttribute("x2", X(i));
      svg.querySelector("#u-dot").setAttribute("cx", X(i)); svg.querySelector("#u-dot").setAttribute("cy", Y(d.units));
      svg.querySelector("#u-cross").setAttribute("visibility", "visible"); svg.querySelector("#u-dot").setAttribute("visibility", "visible");
      tip.hidden = false; tip.style.left = `${(X(i) / W) * 100}%`; tip.style.top = `${(Y(d.units) / H) * 100}%`;
      tip.textContent = `${d.label}: ${fmtU(d.units)} total`;
    });
    svg.addEventListener("pointerleave", () => { tip.hidden = true; svg.querySelector("#u-cross").setAttribute("visibility", "hidden"); svg.querySelector("#u-dot").setAttribute("visibility", "hidden"); });
  }

  function clvChart() {
    const c = D.summary.clv_by_week || [], el = $("#clv-chart");
    if (!c.length) { el.innerHTML = '<p class="note">Shows up once closing prices are graded.</p>'; return; }
    const W = 720, H = 200, P = { l: 44, r: 14, t: 12, b: 26 };
    const m = Math.max(2, ...c.map((d) => Math.abs(d.clv))) * 1.15;
    const bw = Math.min(56, (W - P.l - P.r) / c.length - 10);
    const X = (i) => P.l + ((i + .5) / c.length) * (W - P.l - P.r), Y = (v) => P.t + (1 - (v + m) / (2 * m)) * (H - P.t - P.b);
    let g = [-m, 0, m].map((v) => `<line class="${v ? "grid" : "zero"}" x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}"/><g class="axis"><text x="${P.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v ? fmtPts(v) : "0"}</text></g>`).join("");
    g += c.map((d, i) => {
      const y = Math.min(Y(0), Y(d.clv)), h = Math.max(2, Math.abs(Y(d.clv) - Y(0)));
      return `<rect class="bar" data-i="${i}" x="${X(i) - bw / 2}" y="${y}" width="${bw}" height="${h}" rx="4" fill="${d.clv >= 0 ? "var(--beat)" : "var(--lag)"}"/>
        <g class="axis"><text x="${X(i)}" y="${d.clv >= 0 ? y - 6 : y + h + 14}" text-anchor="middle" style="fill:var(--ink-2)">${fmtPts(d.clv)}</text>
        <text x="${X(i)}" y="${H - 6}" text-anchor="middle">Wk ${d.week}</text></g>`;
    }).join("");
    el.innerHTML = svgEl(W, H, g) + '<div class="tip" hidden></div>';
    const tip = el.querySelector(".tip");
    el.querySelectorAll(".bar").forEach((b) => {
      b.addEventListener("pointerenter", () => { const d = c[+b.dataset.i]; tip.hidden = false; tip.style.left = `${(X(+b.dataset.i) / W) * 100}%`; tip.style.top = `${(Math.min(Y(0), Y(d.clv)) / H) * 100}%`; tip.textContent = `Week ${d.week}: ${fmtPts(d.clv)} pts average over ${d.n} picks`; });
      b.addEventListener("pointerleave", () => { tip.hidden = true; });
    });
  }

  function renderRecord() {
    const s = D.summary.season || { w: 0, l: 0, p: 0 };
    const items = [[rec(s), "Record (bets and teasers)"], [fmtU(s.units), "Profit in units"], [s.roi == null ? "–" : `${s.roi > 0 ? "+" : ""}${s.roi}%`, "Return on stakes"],
      [s.clv == null ? "–" : `${fmtPts(s.clv)} pts`, "Average CLV vs Kalshi's close"], [s.beat == null ? "–" : `${s.beat}%`, "Bets that beat Kalshi's close"],
      [s.h2h && s.h2h.w + s.h2h.l ? `${rec(s.h2h)}, ${fmtU(s.h2h.units)}` : s.h2h && s.h2h.bets ? `${s.h2h.bets} open` : "–", "Matchup test (separate)"],
      [s.v1 && s.v1.w + s.v1.l ? `${rec(s.v1)}, ${fmtU(s.v1.units)}` : "–", "Retired v1 rules (Oct 20–21)"]];
    $("#stats").innerHTML = items.map(([v, k]) => `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join("");
    unitsChart(); clvChart();
    const t = D.summary.by_type || [];
    $("#type-table").innerHTML = `<thead><tr><th scope="col">Type</th><th scope="col">Record</th><th scope="col">Units</th><th scope="col">Avg CLV</th></tr></thead><tbody>` +
      (t.length ? t.map((r) => `<tr><td>${esc(r.type)}</td><td>${rec(r)}</td><td>${fmtU(r.units)}</td><td>${r.clv == null ? "–" : fmtPts(r.clv)}</td></tr>`).join("")
        : '<tr><td colspan="4">No graded picks yet.</td></tr>') + "</tbody>";
  }

  /* ---------------- NBA Test ---------------- */
  let night = null;
  function renderNba() {
    const N = D.nba, s = N.summary || {}, nights = N.nights || [];
    const goal = s.goal || 100, n = s.graded_clv || 0;
    $("#nba-goal-n").textContent = `${Math.min(n, goal)} of ${goal}`;
    const fill = $("#nba-goal-fill");
    fill.style.width = `${Math.min(100, (n / goal) * 100)}%`;
    fill.className = `goal-fill${n ? (s.clv > 0 ? " beat" : " lag") : ""}`;
    $("#nba-goal-bar").setAttribute("aria-valuenow", Math.min(n, goal));
    const v = $("#nba-goal-verdict");
    v.className = "verdict";
    if (!n) v.textContent = "First bets grade at tip-off";
    else if (n >= goal) { v.textContent = s.passed ? "Passed the test" : "Not passing: stays on paper"; v.classList.add(s.passed ? "beat" : "lag"); }
    else { v.textContent = `Average so far ${fmtPts(s.clv)} pts`; v.classList.add(s.clv > 0 ? "beat" : "lag"); }
    const items = [[s.w + s.l + (s.p || 0) ? rec(s) : "–", "Paper record"], [s.w + s.l ? fmtU(s.units) : "–", "Paper profit in units"],
      [s.roi == null ? "–" : `${s.roi > 0 ? "+" : ""}${s.roi}%`, "Return on stakes"],
      [s.clv == null ? "–" : `${fmtPts(s.clv)} pts`, "Average CLV vs Kalshi's close"], [s.beat == null ? "–" : `${s.beat}%`, "Bets that beat Kalshi's close"],
      [s.h2h && s.h2h.w + s.h2h.l ? `${rec(s.h2h)}, ${fmtU(s.h2h.units)}` : s.h2h && s.h2h.bets ? `${s.h2h.bets} open` : "–", "Matchup test (separate)"],
      [s.v1 && s.v1.w + s.v1.l ? `${rec(s.v1)}, ${fmtU(s.v1.units)}` : "–", "Retired v1 rules (Oct 20–21)"]];
    $("#nba-stats").innerHTML = items.map(([val, k]) => `<div class="stat"><div class="v">${val}</div><div class="k">${k}</div></div>`).join("");
    const cur = nights.find((x) => x.night === night) || nights[0];
    night = cur ? cur.night : null;
    $("#nba-sub").textContent = cur ? `${cur.label}: ${cur.picks.length} paper bet${cur.picks.length === 1 ? "" : "s"}${cur.record.w + cur.record.l ? `, ${rec(cur.record)}` : ""}` : "Tracking starts with the first game night.";
    $("#nba-nights").innerHTML = nights.map((x) => `<button class="week-pill" role="tab" aria-selected="${x.night === night}" data-night="${x.night}">
        ${esc(x.label)}<small>${x.record.w + x.record.l ? rec(x.record) : `${x.picks.length} open`}</small></button>`).join("");
    $("#nba-tickets").innerHTML = cur ? cur.picks.map(ticket).join("")
      : '<div class="empty"><b>No NBA paper bets yet.</b>The model checks every game 30 to 60 minutes before tip-off. Bets it would make show up here, then get graded after the game.</div>';
    const t = N.by_type || [];
    $("#nba-type-table").innerHTML = `<thead><tr><th scope="col">Market</th><th scope="col">Record</th><th scope="col">Units</th><th scope="col">Avg CLV</th></tr></thead><tbody>` +
      (t.length ? t.map((r) => `<tr><td>${esc(r.type)}</td><td>${rec(r)}</td><td>${fmtU(r.units)}</td><td>${r.clv == null ? "–" : fmtPts(r.clv)}</td></tr>`).join("")
        : '<tr><td colspan="4">No graded paper bets under the current rules yet.</td></tr>') + "</tbody>";
  }

  /* ---------------- wire ---------------- */
  function ago(iso) {
    const m = Math.round((Date.now() - new Date(iso)) / 6e4);
    return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  }
  function renderWire() {
    const it = (D.wire && D.wire.items) || [];
    $("#wire-list").innerHTML = it.length ? it.map((e) => `<li><span class="tag ${e.kind === "qb" ? "A" : ""} kind">${e.kind === "qb" ? "QB" : "Injury"}</span>
        <span>${esc(e.text)}</span><span class="when">${ago(e.at)}, via ${esc(e.source)}</span></li>`).join("")
      : '<li><span class="tag kind">Quiet</span><span>No quarterback or injury news has triggered a check yet.</span><span class="when">The wire updates every 30 minutes from early morning to evening.</span></li>';
  }

  /* ---------------- where we bet (referral links) ---------------- */
  const apps = (CFG.apps || []).filter((a) => a.url || a.code);
  if (apps.length) {
    $("#apps").hidden = false;
    $("#app-grid").innerHTML = apps.map((a) => `<div class="app">
        <div class="app-name">${esc(a.name)}</div><div class="app-what">${esc(a.what || "")}</div>
        ${a.offer ? `<div class="app-offer">${esc(a.offer)}</div>` : ""}
        <div class="app-row">
          ${a.code ? `<button class="app-code" data-code="${esc(a.code)}" title="Copy code">Code: ${esc(a.code)}</button>` : ""}
          ${a.url ? `<a class="app-go" href="${esc(a.url)}" target="_blank" rel="noopener sponsored">Sign up</a>` : ""}
        </div></div>`).join("");
    $("#app-grid").addEventListener("click", (e) => {
      const b = e.target.closest(".app-code");
      if (!b) return;
      navigator.clipboard?.writeText(b.dataset.code).then(() => { const t = b.textContent; b.textContent = "Copied"; setTimeout(() => (b.textContent = t), 1400); });
    });
  }

  /* ---------------- Bonus parlay ---------------- */
  const pct = (x) => `${Math.round(x * 100)}%`;
  function bonusCard(b) {
    const st = b.status === "pending" ? "open" : b.status === "L" ? "L" : b.status.startsWith("W") ? "W" : "void";
    const label = { open: "Open", W: b.status === "W" ? "Hit" : "Hit (reduced)", L: "Missed", void: "Refund" }[st];
    const legs = b.legs.map((l) => {
      const r = l.result === "W" ? "W" : l.result === "L" ? "L" : l.result === "void" ? "void" : "open";
      return `<li class="leg ${r}"><span class="leg-icon">${ICON[r] || ""}</span><span><b>${esc(l.player)}</b> ${esc(l.bet)}
        <small>${esc(l.game)} · wins ${pct(l.fair)}${l.push ? `, pushes ${pct(l.push)}` : ""}${l.actual ? ` · ${esc(l.actual)}` : ""}</small></span></li>`;
    }).join("");
    const ev = `${b.ev >= 0 ? "+" : ""}${(b.ev * 100).toFixed(0)}% EV`;
    const boostLine = b.boost != null
      ? `<span>${b.boost}% boost → ${b.payout_boost}x, ${b.ev_boost >= 0 ? "+" : ""}${(b.ev_boost * 100).toFixed(0)}% EV</span>`
      : b.boost_needed > 0 ? `<span>Needs a ${b.boost_needed}%+ boost</span>` : "<span>+EV without a boost</span>";
    const units = st === "open" ? `<div class="stub-line">${untilKick(b.legs[0].kick, b.sport === "NBA")}</div>`
      : `<div class="stub-line"><span>${fmtU(b.units)} normal</span>${b.units_boost != null ? ` <span>${fmtU(b.units_boost)} boosted</span>` : ""}</div>`;
    const day = new Date(b.date + "T12:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    return `<article class="ticket paper ${st}" id="bonus-${esc(b.id)}">
      <div class="t-body">
        <div class="t-meta"><span class="tag T">For fun</span><span>${esc(b.sport)}</span><span>${esc(day)}</span></div>
        <h3 class="t-bet">${esc(b.app)} ${b.size}-pick</h3>
        <div class="t-price"><span class="odds">${b.payout}x (+${b.odds})</span><span>Hits ${pct(b.p_hit)}</span><span>${ev}</span>${boostLine}</div>
        <ul class="legs">${legs}</ul>
        <p class="t-posted">Posted ${esc(new Date(b.posted).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }))}</p>
      </div>
      <div class="t-stub"><div class="result ${st}">${ICON[st] || ""}<span>${label}</span></div>${units}</div>
    </article>`;
  }
  function renderBonus() {
    const s = D.bonus.summary || {}, list = D.bonus.parlays || [];
    const items = [[s.n ? `${s.hit}–${s.miss}` : "–", "Hit–missed"], [s.n ? `${s.exp_hits}` : "–", "Hits expected at our prices"],
      [s.n ? fmtU(s.units) : "–", "Units at normal payout"], [s.boosted_n ? fmtU(s.units_boost) : "–", `Units with boosts (${s.boosted_n || 0} entries)`]];
    $("#bonus-stats").innerHTML = items.map(([v, k]) => `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join("");
    $("#bonus-sub").textContent = list.length ? `${list.length} parlay${list.length === 1 ? "" : "s"} so far` : "Starts with the next game day.";
    $("#bonus-cards").innerHTML = list.length ? list.map(bonusCard).join("")
      : '<div class="empty"><b>No bonus parlay yet.</b>It posts late morning: about 11:15 AM PT Saturday for Sunday NFL games, about 11:30 AM PT on NBA game days.</div>';
  }

  /* ---------------- alerts ---------------- */
  if (CFG.discord) {
    const d = $("#discord-btn"); d.href = CFG.discord; d.hidden = false; d.target = "_blank"; d.rel = "noopener";
    const t = $("#top-discord"); t.href = CFG.discord; t.target = "_blank"; t.rel = "noopener";
  }

  /* ---------------- routing ---------------- */
  const VIEWS = ["board", "record", "nba", "bonus", "wire", "method"];
  function route() {
    const h = location.hash.replace("#", "");
    if (h === "alerts") { $("#alerts").scrollIntoView({ behavior: "smooth" }); return; }
    const v = VIEWS.includes(h) ? h : "board";
    if (h.startsWith("week-")) fromHash();
    VIEWS.forEach((x) => { $(`#view-${x}`).hidden = x !== v; });
    document.querySelectorAll(".tabs a").forEach((a) => { if (a.dataset.tab === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (v === "board") renderBoard();
    if (v === "record") renderRecord();
    if (v === "wire") renderWire();
    if (v === "nba") renderNba();
    if (v === "bonus") renderBonus();
    if (!h.startsWith("pick-")) window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
  if (D.picks.generated_at) $("#updated").textContent = `Updated ${new Date(D.picks.generated_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`;
})();
