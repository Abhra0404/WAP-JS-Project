// ─── UTILS ───
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WEEKDAYS_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const fmtNum = (n) => n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
const shortDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const dateRange = (a, b) => (a && b) ? shortDate(a) + " – " + shortDate(b) : "";
const sanitizeColor = (c) => c && /^#[0-9a-fA-F]{3,6}$/.test(c) ? c : "#8b949e";
const escapeHtml = (t) => { const d = el("div"); d.textContent = t; return d.innerHTML; };
const getLevel = (c) => c === 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : c < 10 ? 3 : 4;

const tooltip = $("tooltip");

// ─── SEARCH HISTORY (in-memory) ───
const history = [];

function addHistory(name) {
  const i = history.findIndex(u => u.toLowerCase() === name.toLowerCase());
  if (i > -1) history.splice(i, 1);
  history.unshift(name);
  if (history.length > 10) history.pop();
}

function showHistory(filter = "") {
  const dd = $("history-dropdown");
  const list = filter ? history.filter(u => u.toLowerCase().includes(filter.toLowerCase())) : history;
  if (!list.length) { dd.classList.add("hidden"); return; }

  dd.innerHTML = list.map(u =>
    `<div class="history-item">
      <div class="history-user" data-user="${escapeHtml(u)}">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="#8b949e"><path d="M10.561 8.073a6.005 6.005 0 013.432 5.142.75.75 0 11-1.498.07 4.5 4.5 0 00-8.99 0 .75.75 0 11-1.498-.07 6.004 6.004 0 013.431-5.142 3.999 3.999 0 115.123 0zM10.5 5a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z"/></svg>
        <span>${escapeHtml(u)}</span>
      </div>
      <button class="history-remove" data-user="${escapeHtml(u)}">&times;</button>
    </div>`
  ).join("") + `<button class="history-clear">Clear history</button>`;
  dd.classList.remove("hidden");
}

$("history-dropdown").addEventListener("click", (e) => {
  const dd = $("history-dropdown");
  const userEl = e.target.closest(".history-user");
  const rmEl = e.target.closest(".history-remove");
  if (rmEl) {
    const i = history.indexOf(rmEl.dataset.user);
    if (i > -1) history.splice(i, 1);
    showHistory($("username").value);
  } else if (userEl) {
    $("username").value = userEl.dataset.user;
    dd.classList.add("hidden");
    fetchData();
  } else if (e.target.closest(".history-clear")) {
    history.length = 0;
    dd.classList.add("hidden");
  }
});

// ─── INPUT EVENTS ───
const usernameInput = $("username");
usernameInput.addEventListener("focus", () => showHistory(usernameInput.value));
usernameInput.addEventListener("input", () => showHistory(usernameInput.value));
usernameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { $("history-dropdown").classList.add("hidden"); fetchData(); } });
document.addEventListener("click", (e) => { if (!e.target.closest(".search-wrap")) $("history-dropdown").classList.add("hidden"); });

// ─── BACK NAVIGATION ───
window.history.replaceState({ view: "landing" }, "");
window.addEventListener("popstate", (e) => {
  if (!e.state || e.state.view === "landing") {
    $("dashboard").classList.add("hidden");
    $("welcome").classList.remove("hidden");
    $("username").value = "";
  }
});

// ─── SHARED SVG PATHS ───
const SVG = {
  star: '<path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.751.751 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>',
  fork: '<path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 111.5 0v.878a2.25 2.25 0 01-2.25 2.25h-1.5v2.128a2.251 2.251 0 11-1.5 0V8.5h-1.5A2.25 2.25 0 013.5 6.25v-.878a2.25 2.25 0 111.5 0zM5 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0zm6.75.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8 12.75a.75.75 0 100-1.5.75.75 0 000 1.5z"/>'
};
const miniSvg = (path) => `<svg viewBox="0 0 16 16" width="14" height="14" fill="#8b949e">${path}</svg>`;

// ─── DATA PROCESSING ───
function processContributions(weeks) {
  const allDays = weeks.flatMap(w => w.contributionDays).sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date().toISOString().slice(0, 10);

  let bestDay = allDays[0], longestStreak = 0, tempStreak = 0, longestEnd = 0;
  const weekdayTotals = new Array(7).fill(0);
  const weekdayCounts = new Array(7).fill(0);
  const monthly = {};

  allDays.forEach((d, i) => {
    const c = d.contributionCount;

    // Best day
    if (c > bestDay.contributionCount) bestDay = d;

    // Longest streak
    if (c > 0) { tempStreak++; if (tempStreak > longestStreak) { longestStreak = tempStreak; longestEnd = i; } }
    else tempStreak = 0;

    // Weekday aggregation
    weekdayTotals[d.weekday] += c;
    weekdayCounts[d.weekday]++;

    // Monthly aggregation (avoid new Date — use string slicing)
    const monthKey = d.date.slice(0, 7); // "YYYY-MM"
    if (!monthly[monthKey]) monthly[monthKey] = 0;
    monthly[monthKey] += c;
  });

  // Current streak: walk backwards, but skip today if it has 0 (streak can still be alive)
  let currentStreak = 0;
  let startIdx = allDays.length - 1;
  if (allDays[startIdx].date === today && allDays[startIdx].contributionCount === 0) startIdx--;
  for (let i = startIdx; i >= 0; i--) {
    if (allDays[i].contributionCount > 0) currentStreak++;
    else break;
  }
  const currentStart = startIdx - currentStreak + 1;

  // Most active weekday
  let bestWeekday = 0;
  for (let i = 1; i < 7; i++) if (weekdayTotals[i] > weekdayTotals[bestWeekday]) bestWeekday = i;

  return {
    allDays, bestDay, longestStreak,
    longestStart: longestEnd - longestStreak + 1, longestEnd,
    currentStreak, currentStart, startIdx,
    weekdayTotals, weekdayCounts, bestWeekday,
    monthly
  };
}

// ─── FETCH ───
async function fetchData() {
  const username = $("username").value.trim();
  const token = ENV.GITHUB_TOKEN;

  if (!username) return alert("Please enter a GitHub username.");
  if (!token || token === "YOUR_GITHUB_PAT_HERE") return alert("Please set your GitHub PAT in .env.js");

  $("loading").classList.remove("hidden");
  $("dashboard").classList.add("hidden");
  $("welcome").classList.add("hidden");
  $("btn-text").textContent = "";
  $("btn-spinner").classList.remove("hidden");
  $("fetch-btn").disabled = true;

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($login:String!){user(login:$login){name login avatarUrl bio company location websiteUrl
          followers{totalCount}following{totalCount}
          repositories(first:100,ownerAffiliations:OWNER,orderBy:{field:STARGAZERS,direction:DESC},privacy:PUBLIC){
            totalCount nodes{name description stargazerCount forkCount primaryLanguage{name color}url updatedAt}}
          pinnedItems(first:6,types:REPOSITORY){nodes{...on Repository{name description stargazerCount forkCount primaryLanguage{name color}url}}}
          contributionsCollection{totalCommitContributions totalIssueContributions totalPullRequestContributions totalPullRequestReviewContributions
            contributionCalendar{totalContributions weeks{contributionDays{date contributionCount weekday}}}}}}`,
        variables: { login: username }
      })
    });

    const { data, errors } = await res.json();
    if (errors) return alert("GitHub API error: " + errors[0].message);
    if (!data?.user) return alert("User not found.");
    addHistory(data.user.login);
    renderDashboard(data.user);
    window.history.pushState({ view: "dashboard" }, "");
  } catch (err) {
    console.error(err);
    alert("Error fetching data. Check your token and username.");
  } finally {
    $("loading").classList.add("hidden");
    $("btn-text").textContent = "Fetch";
    $("btn-spinner").classList.add("hidden");
    $("fetch-btn").disabled = false;
  }
}

// ─── ORCHESTRATOR ───
function renderDashboard(user) {
  $("dashboard").classList.remove("hidden");

  const cc = user.contributionsCollection;
  const cal = cc.contributionCalendar;
  const stats = processContributions(cal.weeks);

  renderProfile(user);
  renderContribBreakdown(cc);
  renderCalendar(cal.weeks, cal.totalContributions);
  renderStats(stats, cal.totalContributions);
  renderMonthlyChart(stats.monthly);
  renderWeekdayChart(stats.weekdayTotals, stats.weekdayCounts);
  renderRepos(user.pinnedItems.nodes, user.repositories.nodes);
  renderLanguages(user.repositories.nodes);
}

// ─── PROFILE ───
function renderProfile(user) {
  $("avatar").src = user.avatarUrl;
  $("profile-name").textContent = user.name || user.login;

  const loginEl = $("profile-login");
  loginEl.textContent = "@" + user.login;
  loginEl.href = "https://github.com/" + encodeURIComponent(user.login);

  const bioEl = $("profile-bio");
  bioEl.textContent = user.bio || "";
  bioEl.classList.toggle("hidden", !user.bio);

  [["profile-company", "company-text", user.company],
   ["profile-location", "location-text", user.location]
  ].forEach(([wrapId, textId, val]) => {
    $(wrapId).classList.toggle("hidden", !val);
    if (val) $(textId).textContent = val;
  });

  const wsWrap = $("profile-website"), wsLink = $("website-link");
  wsWrap.classList.toggle("hidden", !user.websiteUrl);
  if (user.websiteUrl) {
    wsLink.href = user.websiteUrl;
    wsLink.textContent = user.websiteUrl.replace(/^https?:\/\//, "");
  }

  $("followers-count").textContent = fmtNum(user.followers.totalCount);
  $("following-count").textContent = fmtNum(user.following.totalCount);
  $("repos-count").textContent = fmtNum(user.repositories.totalCount);
}

// ─── CONTRIBUTION BREAKDOWN ───
function renderContribBreakdown(cc) {
  $("commit-count").textContent = fmtNum(cc.totalCommitContributions);
  $("pr-count").textContent = fmtNum(cc.totalPullRequestContributions);
  $("issue-count").textContent = fmtNum(cc.totalIssueContributions);
  $("review-count").textContent = fmtNum(cc.totalPullRequestReviewContributions);
}

// ─── CONTRIBUTION GRAPH ───
function renderCalendar(weeks, total) {
  const calEl = $("calendar"), monthsEl = $("months");
  calEl.innerHTML = monthsEl.innerHTML = "";

  $("total-label").textContent = `${total.toLocaleString()} contributions in the last year`;

  // Month labels
  let lastMonth = -1;
  const monthSpans = [];
  weeks.forEach((w, i) => {
    const m = +w.contributionDays[0].date.slice(5, 7) - 1; // month from "YYYY-MM-DD"
    if (m !== lastMonth) { monthSpans.push({ m, col: i }); lastMonth = m; }
  });

  const mFrag = document.createDocumentFragment();
  monthSpans.forEach((ms, i) => {
    const span = el("span", null, MONTHS[ms.m]);
    const nextCol = i < monthSpans.length - 1 ? monthSpans[i + 1].col : weeks.length;
    span.style.gridColumn = `${ms.col + 1} / span ${nextCol - ms.col}`;
    mFrag.appendChild(span);
  });
  monthsEl.appendChild(mFrag);

  const cols = `repeat(${weeks.length}, 12px)`;
  calEl.style.gridTemplateColumns = cols;
  monthsEl.style.gridTemplateColumns = cols;

  // Day cells using DocumentFragment
  const frag = document.createDocumentFragment();
  weeks.forEach(w => {
    const dayMap = new Map(w.contributionDays.map(d => [d.weekday, d]));
    for (let d = 0; d < 7; d++) {
      const day = dayMap.get(d);
      const cell = el("div");

      if (day) {
        cell.className = `day level-${getLevel(day.contributionCount)}`;
        cell.addEventListener("mouseenter", () => {
          const c = day.contributionCount;
          tooltip.textContent = `${c} ${c === 1 ? "contribution" : "contributions"} on ${shortDate(day.date)}`;
          tooltip.style.display = "block";
        });
        cell.addEventListener("mousemove", (e) => {
          tooltip.style.left = e.pageX + 12 + "px";
          tooltip.style.top = e.pageY - 34 + "px";
        });
        cell.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });
      } else {
        cell.className = "day day-empty";
      }
      frag.appendChild(cell);
    }
  });
  calEl.appendChild(frag);
}

// ─── STATS ───
function renderStats(s, total) {
  const { allDays, bestDay, longestStreak, longestStart, longestEnd, currentStreak, currentStart, startIdx, bestWeekday, weekdayTotals, weekdayCounts } = s;
  const dailyAvg = allDays.length > 0 ? (total / allDays.length).toFixed(1) : "0";

  $("total").textContent = total.toLocaleString();
  $("current").textContent = currentStreak + " days";
  $("current-dates").textContent = currentStreak > 0 ? dateRange(allDays[currentStart]?.date, allDays[startIdx]?.date) : "";
  $("longest").textContent = longestStreak + " days";
  $("longest-dates").textContent = longestStreak > 0 ? dateRange(allDays[longestStart]?.date, allDays[longestEnd]?.date) : "";
  $("best-day").textContent = bestDay.contributionCount + " contributions";
  $("best-day-date").textContent = shortDate(bestDay.date);
  $("daily-avg").textContent = dailyAvg + " / day";
  $("active-weekday").textContent = WEEKDAYS[bestWeekday];
  $("active-weekday-avg").textContent = (weekdayTotals[bestWeekday] / weekdayCounts[bestWeekday]).toFixed(1) + " avg contributions";
}

// ─── MONTHLY CHART ───
function renderMonthlyChart(monthly) {
  const sorted = Object.keys(monthly).sort().map(k => ({
    label: MONTHS[+k.slice(5) - 1],
    total: monthly[k]
  }));
  const max = Math.max(...sorted.map(m => m.total), 1);

  const container = $("monthly-chart");
  container.innerHTML = "";
  const frag = document.createDocumentFragment();

  sorted.forEach(m => {
    const bar = el("div", "bar-col");
    const fill = el("div", "bar-fill");
    fill.style.height = (m.total / max) * 100 + "%";
    fill.title = `${m.label}: ${m.total} contributions`;
    bar.append(el("span", "bar-value", m.total), fill, el("span", "bar-label", m.label));
    frag.appendChild(bar);
  });
  container.appendChild(frag);
}

// ─── WEEKDAY CHART ───
function renderWeekdayChart(totals, counts) {
  const avgs = totals.map((t, i) => counts[i] > 0 ? t / counts[i] : 0);
  const max = Math.max(...avgs, 1);

  const container = $("weekday-chart");
  container.innerHTML = "";
  const frag = document.createDocumentFragment();

  WEEKDAYS_FULL.forEach((name, i) => {
    const row = el("div", "weekday-row");
    const barWrap = el("div", "weekday-bar-wrap");
    const fill = el("div", "weekday-bar-fill");
    fill.style.width = (avgs[i] / max) * 100 + "%";
    barWrap.appendChild(fill);
    row.append(
      el("span", "weekday-label", name.slice(0, 3)),
      barWrap,
      el("span", "weekday-val", `${avgs[i].toFixed(1)} avg (${totals[i]} total)`)
    );
    frag.appendChild(row);
  });
  container.appendChild(frag);
}

// ─── REPOSITORIES ───
function renderRepos(pinned, allRepos) {
  const repos = pinned.length > 0 ? pinned : allRepos.slice(0, 6);
  $("repos-title").textContent = pinned.length > 0 ? "Pinned Repositories" : "Popular Repositories";

  const grid = $("repos-grid");
  grid.innerHTML = "";
  const frag = document.createDocumentFragment();

  repos.forEach(repo => {
    const card = el("a", "repo-card");
    card.href = repo.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    const meta = el("div", "repo-meta");
    if (repo.primaryLanguage) {
      const lang = el("span", "repo-lang");
      lang.innerHTML = `<span class="lang-dot" style="background:${sanitizeColor(repo.primaryLanguage.color)}"></span>${escapeHtml(repo.primaryLanguage.name)}`;
      meta.appendChild(lang);
    }

    const stars = el("span");
    stars.innerHTML = `${miniSvg(SVG.star)} ${repo.stargazerCount}`;
    const forks = el("span");
    forks.innerHTML = `${miniSvg(SVG.fork)} ${repo.forkCount}`;
    meta.append(stars, forks);

    card.append(
      el("h4", "repo-name", repo.name),
      el("p", "repo-desc", repo.description || "No description"),
      meta
    );
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

// ─── LANGUAGE DISTRIBUTION ───
function renderLanguages(repos) {
  const langMap = {};
  repos.forEach(r => {
    if (!r.primaryLanguage) return;
    const n = r.primaryLanguage.name;
    if (!langMap[n]) langMap[n] = { count: 0, color: sanitizeColor(r.primaryLanguage.color) };
    langMap[n].count++;
  });

  const sorted = Object.entries(langMap).sort((a, b) => b[1].count - a[1].count);
  const total = sorted.reduce((s, [, d]) => s + d.count, 0);

  const bar = $("language-bar"), labels = $("language-labels");
  bar.innerHTML = labels.innerHTML = "";

  if (!sorted.length) { bar.innerHTML = '<span class="no-data">No language data</span>'; return; }

  const bFrag = document.createDocumentFragment(), lFrag = document.createDocumentFragment();
  sorted.forEach(([name, data]) => {
    const pct = (data.count / total) * 100;

    const seg = el("div", "lang-segment");
    seg.style.width = pct + "%";
    seg.style.backgroundColor = data.color;
    seg.title = `${name} ${pct.toFixed(1)}%`;
    bFrag.appendChild(seg);

    const label = el("span", "lang-label");
    label.innerHTML = `<span class="lang-dot" style="background:${data.color}"></span>${escapeHtml(name)} <span class="lang-pct">${pct.toFixed(1)}%</span>`;
    lFrag.appendChild(label);
  });
  bar.appendChild(bFrag);
  labels.appendChild(lFrag);
}