// ─── CONSTANTS ───

var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

var STAR_SVG = '<path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.751.751 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>';
var FORK_SVG = '<path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 111.5 0v.878a2.25 2.25 0 01-2.25 2.25h-1.5v2.128a2.251 2.251 0 11-1.5 0V8.5h-1.5A2.25 2.25 0 013.5 6.25v-.878a2.25 2.25 0 111.5 0zM5 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0zm6.75.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8 12.75a.75.75 0 100-1.5.75.75 0 000 1.5z"/>';

var tooltipEl = document.getElementById("tooltip");

// ─── HELPER FUNCTIONS ───

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateRange(startDate, endDate) {
  if (startDate && endDate) return formatDate(startDate) + " – " + formatDate(endDate);
  return "";
}

function safeColor(color) {
  if (color && /^#[0-9a-fA-F]{3,6}$/.test(color)) return color;
  return "#8b949e";
}

function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getContributionLevel(count) {
  if (count === 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
}

function makeSmallSvg(pathContent) {
  return '<svg viewBox="0 0 16 16" width="14" height="14" fill="#8b949e">' + pathContent + '</svg>';
}

// ─── INPUT & NAVIGATION ───

document.getElementById("username").addEventListener("keydown", function (e) {
  if (e.key === "Enter") fetchData();
});

window.history.replaceState({ view: "landing" }, "");
window.addEventListener("popstate", function (e) {
  if (!e.state || e.state.view === "landing") {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("welcome").classList.remove("hidden");
    document.getElementById("username").value = "";
  }
});

// ─── PROCESS CONTRIBUTION DATA ───

function processContributions(weeks) {
  // Flatten all days from all weeks into one sorted array
  var allDays = [];
  for (var w = 0; w < weeks.length; w++) {
    var days = weeks[w].contributionDays;
    for (var d = 0; d < days.length; d++) {
      allDays.push(days[d]);
    }
  }
  allDays.sort(function (a, b) { return a.date.localeCompare(b.date); });

  var today = new Date().toISOString().slice(0, 10);
  var bestDay = allDays[0];
  var longestStreak = 0;
  var tempStreak = 0;
  var longestEnd = 0;
  var weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  var weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  var monthly = {};

  for (var i = 0; i < allDays.length; i++) {
    var day = allDays[i];
    var count = day.contributionCount;

    // Track the day with the most contributions
    if (count > bestDay.contributionCount) {
      bestDay = day;
    }

    // Track longest streak
    if (count > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
        longestEnd = i;
      }
    } else {
      tempStreak = 0;
    }

    // Sum contributions by weekday
    weekdayTotals[day.weekday] += count;
    weekdayCounts[day.weekday]++;

    // Sum contributions by month ("YYYY-MM")
    var monthKey = day.date.slice(0, 7);
    if (!monthly[monthKey]) monthly[monthKey] = 0;
    monthly[monthKey] += count;
  }

  // Current streak: walk backwards from most recent day
  // Skip today if it has 0 contributions (streak can still be alive)
  var currentStreak = 0;
  var lastIdx = allDays.length - 1;
  if (allDays[lastIdx].date === today && allDays[lastIdx].contributionCount === 0) {
    lastIdx--;
  }
  for (var j = lastIdx; j >= 0; j--) {
    if (allDays[j].contributionCount > 0) currentStreak++;
    else break;
  }
  var currentStart = lastIdx - currentStreak + 1;

  // Find most active weekday
  var bestWeekday = 0;
  for (var k = 1; k < 7; k++) {
    if (weekdayTotals[k] > weekdayTotals[bestWeekday]) bestWeekday = k;
  }

  return {
    allDays: allDays,
    bestDay: bestDay,
    longestStreak: longestStreak,
    longestStart: longestEnd - longestStreak + 1,
    longestEnd: longestEnd,
    currentStreak: currentStreak,
    currentStart: currentStart,
    lastIdx: lastIdx,
    weekdayTotals: weekdayTotals,
    weekdayCounts: weekdayCounts,
    bestWeekday: bestWeekday,
    monthly: monthly
  };
}

// ─── FETCH DATA FROM API ───

async function fetchData() {
  var username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Please enter a GitHub username.");
    return;
  }

  // Show loading, hide other sections
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("welcome").classList.add("hidden");
  document.getElementById("btn-text").textContent = "";
  document.getElementById("btn-spinner").classList.remove("hidden");
  document.getElementById("fetch-btn").disabled = true;

  var query = `query($login:String!) {
    user(login:$login) {
      name login avatarUrl bio company location websiteUrl
      followers { totalCount }
      following { totalCount }
      repositories(first:100, ownerAffiliations:OWNER, orderBy:{field:STARGAZERS, direction:DESC}, privacy:PUBLIC) {
        totalCount
        nodes { name description stargazerCount forkCount primaryLanguage { name color } url updatedAt }
      }
      pinnedItems(first:6, types:REPOSITORY) {
        nodes { ...on Repository { name description stargazerCount forkCount primaryLanguage { name color } url } }
      }
      contributionsCollection {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount weekday } }
        }
      }
    }
  }`;

  try {
    var response = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query, variables: { login: username } })
    });

    var result = await response.json();

    if (result.errors) {
      alert("GitHub API error: " + result.errors[0].message);
      return;
    }
    if (!result.data || !result.data.user) {
      alert("User not found.");
      return;
    }

    renderDashboard(result.data.user);
    window.history.pushState({ view: "dashboard" }, "");
  } catch (err) {
    console.error(err);
    alert("Error fetching data. Check your token and username.");
  } finally {
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("btn-text").textContent = "Fetch";
    document.getElementById("btn-spinner").classList.add("hidden");
    document.getElementById("fetch-btn").disabled = false;
  }
}

// ─── RENDER DASHBOARD (orchestrates all sections) ───

function renderDashboard(user) {
  document.getElementById("dashboard").classList.remove("hidden");

  var contributions = user.contributionsCollection;
  var calendar = contributions.contributionCalendar;
  var stats = processContributions(calendar.weeks);

  renderProfile(user);
  renderContribBreakdown(contributions);
  renderCalendar(calendar.weeks, calendar.totalContributions);
  renderStats(stats, calendar.totalContributions);
  renderMonthlyChart(stats.monthly);
  renderWeekdayChart(stats.weekdayTotals, stats.weekdayCounts);
  renderRepos(user.pinnedItems.nodes, user.repositories.nodes);
  renderLanguages(user.repositories.nodes);
}

// ─── PROFILE ───

function renderProfile(user) {
  document.getElementById("avatar").src = user.avatarUrl;
  document.getElementById("profile-name").textContent = user.name || user.login;

  var loginLink = document.getElementById("profile-login");
  loginLink.textContent = "@" + user.login;
  loginLink.href = "https://github.com/" + encodeURIComponent(user.login);

  var bioEl = document.getElementById("profile-bio");
  bioEl.textContent = user.bio || "";
  bioEl.classList.toggle("hidden", !user.bio);

  // Company
  document.getElementById("profile-company").classList.toggle("hidden", !user.company);
  if (user.company) document.getElementById("company-text").textContent = user.company;

  // Location
  document.getElementById("profile-location").classList.toggle("hidden", !user.location);
  if (user.location) document.getElementById("location-text").textContent = user.location;

  // Website
  var websiteWrap = document.getElementById("profile-website");
  var websiteLink = document.getElementById("website-link");
  websiteWrap.classList.toggle("hidden", !user.websiteUrl);
  if (user.websiteUrl) {
    websiteLink.href = user.websiteUrl;
    websiteLink.textContent = user.websiteUrl.replace(/^https?:\/\//, "");
  }

  document.getElementById("followers-count").textContent = formatNumber(user.followers.totalCount);
  document.getElementById("following-count").textContent = formatNumber(user.following.totalCount);
  document.getElementById("repos-count").textContent = formatNumber(user.repositories.totalCount);
}

// ─── CONTRIBUTION BREAKDOWN ───

function renderContribBreakdown(contributions) {
  document.getElementById("commit-count").textContent = formatNumber(contributions.totalCommitContributions);
  document.getElementById("pr-count").textContent = formatNumber(contributions.totalPullRequestContributions);
  document.getElementById("issue-count").textContent = formatNumber(contributions.totalIssueContributions);
  document.getElementById("review-count").textContent = formatNumber(contributions.totalPullRequestReviewContributions);
}

// ─── CONTRIBUTION GRAPH (calendar heatmap) ───

function renderCalendar(weeks, total) {
  var calendarEl = document.getElementById("calendar");
  var monthsEl = document.getElementById("months");
  calendarEl.innerHTML = "";
  monthsEl.innerHTML = "";

  document.getElementById("total-label").textContent =
    total.toLocaleString() + " contributions in the last year";

  // Build month labels — track when the month changes across weeks
  var lastMonth = -1;
  var monthPositions = [];
  for (var i = 0; i < weeks.length; i++) {
    var month = parseInt(weeks[i].contributionDays[0].date.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      monthPositions.push({ month: month, column: i });
      lastMonth = month;
    }
  }

  for (var m = 0; m < monthPositions.length; m++) {
    var span = document.createElement("span");
    span.textContent = MONTHS[monthPositions[m].month];
    var nextColumn = (m < monthPositions.length - 1) ? monthPositions[m + 1].column : weeks.length;
    span.style.gridColumn = (monthPositions[m].column + 1) + " / span " + (nextColumn - monthPositions[m].column);
    monthsEl.appendChild(span);
  }

  var gridColumns = "repeat(" + weeks.length + ", 12px)";
  calendarEl.style.gridTemplateColumns = gridColumns;
  monthsEl.style.gridTemplateColumns = gridColumns;

  // Build day cells
  for (var w = 0; w < weeks.length; w++) {
    // Index each day by its weekday number (0-6) for this week
    var daysByWeekday = {};
    var weekDays = weeks[w].contributionDays;
    for (var d = 0; d < weekDays.length; d++) {
      daysByWeekday[weekDays[d].weekday] = weekDays[d];
    }

    for (var dayNum = 0; dayNum < 7; dayNum++) {
      var cell = document.createElement("div");
      var dayData = daysByWeekday[dayNum];

      if (dayData) {
        cell.className = "day level-" + getContributionLevel(dayData.contributionCount);
        addTooltipEvents(cell, dayData);
      } else {
        cell.className = "day day-empty";
      }

      calendarEl.appendChild(cell);
    }
  }
}

function addTooltipEvents(cell, dayData) {
  cell.addEventListener("mouseenter", function () {
    var count = dayData.contributionCount;
    var word = (count === 1) ? "contribution" : "contributions";
    tooltipEl.textContent = count + " " + word + " on " + formatDate(dayData.date);
    tooltipEl.style.display = "block";
  });

  cell.addEventListener("mousemove", function (e) {
    tooltipEl.style.left = (e.pageX + 12) + "px";
    tooltipEl.style.top = (e.pageY - 34) + "px";
  });

  cell.addEventListener("mouseleave", function () {
    tooltipEl.style.display = "none";
  });
}

// ─── STATS ───

function renderStats(stats, total) {
  var allDays = stats.allDays;
  var dailyAvg = allDays.length > 0 ? (total / allDays.length).toFixed(1) : "0";

  document.getElementById("total").textContent = total.toLocaleString();

  document.getElementById("current").textContent = stats.currentStreak + " days";
  document.getElementById("current-dates").textContent =
    stats.currentStreak > 0
      ? formatDateRange(allDays[stats.currentStart]?.date, allDays[stats.lastIdx]?.date)
      : "";

  document.getElementById("longest").textContent = stats.longestStreak + " days";
  document.getElementById("longest-dates").textContent =
    stats.longestStreak > 0
      ? formatDateRange(allDays[stats.longestStart]?.date, allDays[stats.longestEnd]?.date)
      : "";

  document.getElementById("best-day").textContent = stats.bestDay.contributionCount + " contributions";
  document.getElementById("best-day-date").textContent = formatDate(stats.bestDay.date);

  document.getElementById("daily-avg").textContent = dailyAvg + " / day";

  document.getElementById("active-weekday").textContent = WEEKDAYS[stats.bestWeekday];
  var weekdayAvg = (stats.weekdayTotals[stats.bestWeekday] / stats.weekdayCounts[stats.bestWeekday]).toFixed(1);
  document.getElementById("active-weekday-avg").textContent = weekdayAvg + " avg contributions";
}

// ─── MONTHLY CHART ───

function renderMonthlyChart(monthly) {
  // Sort months chronologically and find the max for scaling bars
  var keys = Object.keys(monthly).sort();
  var monthData = [];
  var max = 1;

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var monthIndex = parseInt(key.slice(5)) - 1;
    var value = monthly[key];
    monthData.push({ label: MONTHS[monthIndex], total: value });
    if (value > max) max = value;
  }

  var container = document.getElementById("monthly-chart");
  container.innerHTML = "";

  for (var j = 0; j < monthData.length; j++) {
    var barCol = document.createElement("div");
    barCol.className = "bar-col";

    var valueLabel = document.createElement("span");
    valueLabel.className = "bar-value";
    valueLabel.textContent = monthData[j].total;

    var fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.height = (monthData[j].total / max) * 100 + "%";
    fill.title = monthData[j].label + ": " + monthData[j].total + " contributions";

    var monthLabel = document.createElement("span");
    monthLabel.className = "bar-label";
    monthLabel.textContent = monthData[j].label;

    barCol.appendChild(valueLabel);
    barCol.appendChild(fill);
    barCol.appendChild(monthLabel);
    container.appendChild(barCol);
  }
}

// ─── WEEKDAY CHART ───

function renderWeekdayChart(totals, counts) {
  // Calculate average contributions per weekday
  var averages = [];
  var max = 1;
  for (var i = 0; i < 7; i++) {
    var avg = counts[i] > 0 ? totals[i] / counts[i] : 0;
    averages.push(avg);
    if (avg > max) max = avg;
  }

  var container = document.getElementById("weekday-chart");
  container.innerHTML = "";

  for (var j = 0; j < 7; j++) {
    var row = document.createElement("div");
    row.className = "weekday-row";

    var label = document.createElement("span");
    label.className = "weekday-label";
    label.textContent = WEEKDAYS_FULL[j].slice(0, 3);

    var barWrap = document.createElement("div");
    barWrap.className = "weekday-bar-wrap";

    var fill = document.createElement("div");
    fill.className = "weekday-bar-fill";
    fill.style.width = (averages[j] / max) * 100 + "%";

    barWrap.appendChild(fill);

    var valueText = document.createElement("span");
    valueText.className = "weekday-val";
    valueText.textContent = averages[j].toFixed(1) + " avg (" + totals[j] + " total)";

    row.appendChild(label);
    row.appendChild(barWrap);
    row.appendChild(valueText);
    container.appendChild(row);
  }
}

// ─── REPOSITORIES ───

function renderRepos(pinned, allRepos) {
  var repos = pinned.length > 0 ? pinned : allRepos.slice(0, 6);
  var titleText = pinned.length > 0 ? "Pinned Repositories" : "Popular Repositories";
  document.getElementById("repos-title").textContent = titleText;

  var grid = document.getElementById("repos-grid");
  grid.innerHTML = "";

  for (var i = 0; i < repos.length; i++) {
    var repo = repos[i];

    var card = document.createElement("a");
    card.className = "repo-card";
    card.href = repo.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    var name = document.createElement("h4");
    name.className = "repo-name";
    name.textContent = repo.name;

    var desc = document.createElement("p");
    desc.className = "repo-desc";
    desc.textContent = repo.description || "No description";

    var meta = document.createElement("div");
    meta.className = "repo-meta";

    if (repo.primaryLanguage) {
      var langSpan = document.createElement("span");
      langSpan.className = "repo-lang";
      langSpan.innerHTML =
        '<span class="lang-dot" style="background:' + safeColor(repo.primaryLanguage.color) + '"></span>' +
        escapeHtml(repo.primaryLanguage.name);
      meta.appendChild(langSpan);
    }

    var stars = document.createElement("span");
    stars.innerHTML = makeSmallSvg(STAR_SVG) + " " + repo.stargazerCount;
    meta.appendChild(stars);

    var forks = document.createElement("span");
    forks.innerHTML = makeSmallSvg(FORK_SVG) + " " + repo.forkCount;
    meta.appendChild(forks);

    card.appendChild(name);
    card.appendChild(desc);
    card.appendChild(meta);
    grid.appendChild(card);
  }
}

// ─── LANGUAGE DISTRIBUTION ───

function renderLanguages(repos) {
  // Count how many repos use each language
  var langMap = {};
  for (var i = 0; i < repos.length; i++) {
    var lang = repos[i].primaryLanguage;
    if (!lang) continue;
    if (!langMap[lang.name]) {
      langMap[lang.name] = { count: 0, color: safeColor(lang.color) };
    }
    langMap[lang.name].count++;
  }

  // Sort languages by count (most used first)
  var sorted = Object.entries(langMap).sort(function (a, b) {
    return b[1].count - a[1].count;
  });

  var totalRepos = 0;
  for (var j = 0; j < sorted.length; j++) {
    totalRepos += sorted[j][1].count;
  }

  var bar = document.getElementById("language-bar");
  var labels = document.getElementById("language-labels");
  bar.innerHTML = "";
  labels.innerHTML = "";

  if (sorted.length === 0) {
    bar.innerHTML = '<span class="no-data">No language data</span>';
    return;
  }

  for (var k = 0; k < sorted.length; k++) {
    var langName = sorted[k][0];
    var langData = sorted[k][1];
    var percent = (langData.count / totalRepos) * 100;

    // Color segment in the bar
    var segment = document.createElement("div");
    segment.className = "lang-segment";
    segment.style.width = percent + "%";
    segment.style.backgroundColor = langData.color;
    segment.title = langName + " " + percent.toFixed(1) + "%";
    bar.appendChild(segment);

    // Label below the bar
    var labelSpan = document.createElement("span");
    labelSpan.className = "lang-label";
    labelSpan.innerHTML =
      '<span class="lang-dot" style="background:' + langData.color + '"></span>' +
      escapeHtml(langName) +
      ' <span class="lang-pct">' + percent.toFixed(1) + '%</span>';
    labels.appendChild(labelSpan);
  }
}