# GitHub Contributions Dashboard

A single-page web app that visualizes any GitHub user's profile, contribution graph, streak stats, repository highlights, and language distribution -- styled to match GitHub's dark theme.

## Features

- **Contribution Graph** -- GitHub-style 7x53 heatmap grid with color-coded intensity levels and hover tooltips
- **Profile Card** -- Avatar, bio, company, location, website, follower/following/repo counts
- **Contribution Breakdown** -- Commits, pull requests, issues, and code reviews totals
- **Streak Stats** -- Current streak, longest streak, best single day, daily average, most active weekday
- **Monthly Trend Chart** -- Bar chart of contributions per month over the past year
- **Weekday Activity Chart** -- Average contributions by day of the week
- **Repositories** -- Pinned or top-starred repos with language, stars, and forks
- **Language Distribution** -- Proportional bar showing language usage across public repos
- **Search History** -- In-memory dropdown of recent searches (session-scoped, no localStorage)
- **Back Navigation** -- Browser back button returns from dashboard to the landing page via History API
- **Loading Skeleton** -- Pulse-animated placeholder UI while data loads
- **Responsive Design** -- Works on desktop and mobile

## Tech Stack

- HTML, CSS, JavaScript (vanilla, no frameworks or build tools)
- GitHub GraphQL API v4
- CSS Grid for the contribution heatmap
- History API for SPA-style navigation

## Project Structure

```
index.html    -- Main page with all UI sections
style.css     -- GitHub-dark themed styles, animations, responsive layout
script.js     -- Data fetching, processing, and rendering logic
.env.js       -- GitHub Personal Access Token (gitignored)
.gitignore    -- Excludes .env.js from version control
```

## Setup

1. Clone the repository

```
git clone https://github.com/Abhra0404/WAP-JS-Project.git
cd WAP-JS-Project
```

2. Create a `.env.js` file in the project root

```js
const ENV = {
  GITHUB_TOKEN: "your_github_personal_access_token"
};
```

The token needs the `read:user` scope. Generate one at https://github.com/settings/tokens.

3. Serve the project with any static file server

```
npx serve .
# or
python3 -m http.server
```

4. Open the app in a browser and enter a GitHub username to fetch their profile

## API Usage

The app sends a single GraphQL query to `https://api.github.com/graphql` per search. The query fetches the user's profile, contribution calendar, contribution type totals, pinned items, and top 100 public repositories in one request.

## License

MIT
2. Open index.html in your browser

## 📅 Milestones

* Milestone 1: Project setup and planning ✅
* Milestone 2: API integration
* Milestone 3: Core features implementation
* Milestone 4: Deployment and final submission

## 💡 Future Enhancements

* Debounced search
* Pagination or infinite scroll
* Local storage for favorites
