(() => {
  const D = window.__DATA__ || { picks: { weeks: [] }, summary: {}, wire: { items: [] } };
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

  function untilKick(iso) {
    const ms = new Date(iso) - Date.now();
    if (ms <= 0) return "Kicked off";
    const h = Math.floor(ms / 36e5), d = Math.floor(h / 24);
    return d >= 1 ? `Kickoff in ${d}d ${h % 24}h` : `Kickoff in ${h}h ${Math.floor((ms % 36e5) / 6e4)}m`;
  }

  function clvTrack(p) {
    if (p.clv == null) {
      const why = p.status === "pending" ? "Closing price comes in at kickoff" : p.price === "Pick'em" ? "No closing price for pick'em apps" : "No closing price captured";
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
    const tierTag = p.kind === "paper" ? '<span class="tag">Paper</span>'
      : p.kind === "teaser" ? '<span class="tag T">Teaser</span>'
      : p.tier === "A" ? '<span class="tag A">Strong</span>' : p.tier === "B" ? '<span class="tag">Value</span>' : "";
    const stake = p.stake ? `${+(p.stake / 10).toFixed(2)}u` : "";
    const worst = st === "open" && p.worst ? `<span>Take ${esc(p.worst)} or better</span>` : "";
    const edge = p.edge != null && p.kind !== "teaser" ? `<span>${p.edge > 0 ? "+" : ""}${p.edge}% edge</span>` : "";
    const fresh = Date.now() - new Date(p.posted) < 2 * 36e5 ? " fresh" : "";
    const posted = new Date(p.posted).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
    const stub = st === "open"
      ? `<div class="result open">${ICON.open}<span>Open</span></div><div class="stub-line">${untilKick(p.kick)}</div>`
      : `<div class="result ${st}">${ICON[st] || ""}<span>${STATUS[st]}</span></div>
         <div class="stub-line">${p.actual ? `<b>${esc(p.actual)}</b>` : ""}${p.units != null && p.kind !== "paper" ? ` <span>${fmtU(p.units)}</span>` : ""}</div>`;
    return `<article class="ticket ${st} ${p.kind}${fresh}" id="pick-${esc(p.id)}">
      <div class="t-body">
        <div class="t-meta">${tierTag}<span>${esc(p.game)}</span><span>${esc(p.kick_label)}</span></div>
        ${p.kind === "teaser" ? "" : `<p class="t-who">${esc(p.title)}</p>`}
        <h3 class="t-bet">${esc(p.bet)}</h3>
        <div class="t-price"><span><span class="odds">${esc(p.venue)} ${esc(p.price)}</span></span>${stake ? `<span>${stake}</span>` : ""}${edge}${worst}</div>
        <p class="t-why">${esc(p.analysis)}</p>
        <p class="t-posted">Posted ${esc(posted)}${CFG.repo ? `, <a href="${esc(CFG.repo)}/commits/main/site/data/picks.json">timestamp</a>` : ""}</p>
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
    const b = e.target.closest(".week-pill");
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
      [s.clv == null ? "–" : `${fmtPts(s.clv)} pts`, "Average closing-line value"], [s.beat == null ? "–" : `${s.beat}%`, "Bets that beat the close"]];
    $("#stats").innerHTML = items.map(([v, k]) => `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join("");
    unitsChart(); clvChart();
    const t = D.summary.by_type || [];
    $("#type-table").innerHTML = `<thead><tr><th scope="col">Type</th><th scope="col">Record</th><th scope="col">Units</th><th scope="col">Avg CLV</th></tr></thead><tbody>` +
      (t.length ? t.map((r) => `<tr><td>${esc(r.type)}</td><td>${rec(r)}</td><td>${fmtU(r.units)}</td><td>${r.clv == null ? "–" : fmtPts(r.clv)}</td></tr>`).join("")
        : '<tr><td colspan="4">No graded picks yet.</td></tr>') + "</tbody>";
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

  /* ---------------- alerts ---------------- */
  if (CFG.discord) {
    const d = $("#discord-btn"); d.href = CFG.discord; d.hidden = false; d.target = "_blank"; d.rel = "noopener";
    const t = $("#top-discord"); t.href = CFG.discord; t.target = "_blank"; t.rel = "noopener";
  }

  /* ---------------- routing ---------------- */
  const VIEWS = ["board", "record", "wire", "method"];
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
    if (!h.startsWith("pick-")) window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
  if (D.picks.generated_at) $("#updated").textContent = `Updated ${new Date(D.picks.generated_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`;
})();
