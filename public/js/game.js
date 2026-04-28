// ===== VIDEO GOAL TIMELINE =====
// Fixed timeline matching the actual goals in IceHockeyGame-480.mp4
const VIDEO_TIMELINE = [
  { time:  8, home: 1, away: 0 },
  { time: 17, home: 2, away: 0 },
  { time: 29, home: 2, away: 1 },
  { time: 39, home: 2, away: 2 },
  { time: 48, home: 2, away: 3 },
  { time: 59, home: 2, away: 4 },
  { time: 79, home: 3, away: 4 },
  { time: 91, home: 3, away: 5 },
  { time: 100, home: 4, away: 5 },
];
const VIDEO_FINAL_SCORE = { home: 4, away: 5 };

// ===== GAME STATE =====
const state = {
  balance: 976035.28,
  stake: 1,
  bets: [],
  homeTeam: null,
  awayTeam: null,
  homeIndex: 0,
  awayIndex: 1,
  odds: null,
  h2h: [],
  isPlaying: false,
  selectorSide: null, // 'home' or 'away'
  stakeInput: '1',
  // Auto play
  autoplay: {
    rounds: 10,
    lossLimit: 10,
    winLimit: 'none', // 'none' or '10x'
    skipResults: false,
    active: false,
    roundsLeft: 0,
    totalLoss: 0,
  },
};

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Random starting teams
  state.homeIndex = Math.floor(Math.random() * TEAMS.length);
  state.awayIndex = (state.homeIndex + 1 + Math.floor(Math.random() * (TEAMS.length - 1))) % TEAMS.length;

  loadMatch();
  bindEvents();
  updateBetslip();
  buildTeamSelectorGrid();
  positionBetslip();
  window.addEventListener('resize', positionBetslip);
});

// ===== MATCH SETUP =====
function loadMatch() {
  state.bets = [];
  state.isPlaying = false;
  state.homeTeam = TEAMS[state.homeIndex];
  state.awayTeam = TEAMS[state.awayIndex];

  // Pick random odds template
  state.odds = { ...ODDS_TEMPLATES[Math.floor(Math.random() * ODDS_TEMPLATES.length)] };

  // Generate H2H
  state.h2h = generateH2H();

  renderMatch();
  renderMarkets();
  renderCorrectScore();
  updateBetslip();
  clearSelections();
}

function loadNewMatch() {
  // Pick two new random teams
  state.homeIndex = Math.floor(Math.random() * TEAMS.length);
  state.awayIndex = (state.homeIndex + 1 + Math.floor(Math.random() * (TEAMS.length - 1))) % TEAMS.length;
  loadMatch();
}

function generateH2H() {
  const results = [];
  for (let i = 0; i < 5; i++) {
    const home = Math.floor(Math.random() * 6);
    const away = Math.floor(Math.random() * 6);
    results.push(`${home}-${away}`);
  }
  return results;
}

// ===== TEAM CYCLING =====
function cycleTeam(side, direction) {
  if (state.isPlaying) return;

  const dir = direction === 'up' ? -1 : 1;

  if (side === 'home') {
    state.homeIndex = (state.homeIndex + dir + TEAMS.length) % TEAMS.length;
    // Skip if same as away
    if (state.homeIndex === state.awayIndex) {
      state.homeIndex = (state.homeIndex + dir + TEAMS.length) % TEAMS.length;
    }
  } else {
    state.awayIndex = (state.awayIndex + dir + TEAMS.length) % TEAMS.length;
    if (state.awayIndex === state.homeIndex) {
      state.awayIndex = (state.awayIndex + dir + TEAMS.length) % TEAMS.length;
    }
  }

  // Trigger swap animation
  const teamEl = side === 'home' ? $('.team-home') : $('.team-away');
  teamEl.classList.add('team-swapping');
  setTimeout(() => teamEl.classList.remove('team-swapping'), 350);

  loadMatch();
}

function selectTeamFromPanel(teamIndex) {
  if (state.isPlaying) return;
  const side = state.selectorSide;

  if (side === 'home') {
    if (teamIndex === state.awayIndex) return;
    state.homeIndex = teamIndex;
  } else {
    if (teamIndex === state.homeIndex) return;
    state.awayIndex = teamIndex;
  }

  closeTeamSelector();

  // Trigger swap animation
  const teamEl = side === 'home' ? $('.team-home') : $('.team-away');
  teamEl.classList.add('team-swapping');
  setTimeout(() => teamEl.classList.remove('team-swapping'), 350);

  loadMatch();
}

// ===== TEAM SELECTOR PANEL =====
function buildTeamSelectorGrid() {
  const grid = $('#teamSelectorGrid');
  grid.innerHTML = TEAMS.map((team, i) => `
    <div class="team-selector-item" data-team-index="${i}">
      <img src="assets/team-badges/${team.logo}" alt="${team.name}">
      <span>${team.abbr}</span>
    </div>
  `).join('');

  // Bind clicks
  grid.querySelectorAll('.team-selector-item').forEach(item => {
    item.addEventListener('click', () => {
      selectTeamFromPanel(parseInt(item.dataset.teamIndex));
    });
  });
}

function openTeamSelector(side) {
  if (state.isPlaying || state.bets.length > 0) return;
  state.selectorSide = side;

  const el = $('#teamSelectorOverlay');
  const main = $('#mainContent');

  // Update active/disabled states
  const otherIndex = side === 'home' ? state.awayIndex : state.homeIndex;
  const currentIndex = side === 'home' ? state.homeIndex : state.awayIndex;
  const teamColor = side === 'home' ? state.homeTeam.color : state.awayTeam.color;

  $$('.team-selector-item').forEach(item => {
    const idx = parseInt(item.dataset.teamIndex);
    item.classList.toggle('active', idx === currentIndex);
    item.classList.toggle('disabled', idx === otherIndex);
  });

  // Position below the clicked badge
  const badgeId = side === 'home' ? 'homeBadgeWrapper' : 'awayBadgeWrapper';
  const badge = document.getElementById(badgeId);
  const badgeRect = badge.getBoundingClientRect();
  const mainRect = main.getBoundingClientRect();
  const topOffset = badgeRect.bottom - mainRect.top + main.scrollTop + 4;
  el.style.top = topOffset + 'px';

  // Set side class and glow color
  el.classList.remove('side-home', 'side-away');
  el.classList.add(`side-${side}`);
  el.style.setProperty('--selector-glow', teamColor);

  el.classList.add('visible');
}

function closeTeamSelector() {
  const el = $('#teamSelectorOverlay');
  el.classList.remove('visible');
  state.selectorSide = null;
}

// ===== RENDERING =====
function renderMatch() {
  const home = state.homeTeam;
  const away = state.awayTeam;

  // Set team colors as CSS variables on match header
  const matchHeader = $('#matchHeader');
  matchHeader.style.setProperty('--home-color', home.color);
  matchHeader.style.setProperty('--away-color', away.color);

  // Set glow colors
  $('#glowHome').style.background = home.color;
  $('#glowAway').style.background = away.color;

  // Badge wrapper colors
  $('#homeBadgeWrapper').style.setProperty('background', home.color);
  $('#awayBadgeWrapper').style.setProperty('background', away.color);

  // Team info
  $('#homeLogo').src = `assets/team-badges/${home.logo}`;
  $('#homeLogo').alt = home.name;
  $('#homeAbbr').textContent = home.abbr;
  $('#homeName').textContent = home.name;

  $('#awayLogo').src = `assets/team-badges/${away.logo}`;
  $('#awayLogo').alt = away.name;
  $('#awayAbbr').textContent = away.abbr;
  $('#awayName').textContent = away.name;

  // H2H
  const h2hContainer = $('#h2hResults');
  h2hContainer.innerHTML = state.h2h
    .map(r => `<div class="h2h-chip">${r}</div>`)
    .join('');
}

function renderMarkets() {
  const home = state.homeTeam;
  const away = state.awayTeam;
  const odds = state.odds;

  // Money
  $('#moneyHomeLabel').textContent = home.abbr;
  $('#moneyHomeOdds').textContent = odds.money[0].toFixed(2);
  $('#moneyAwayLabel').textContent = away.abbr;
  $('#moneyAwayOdds').textContent = odds.money[1].toFixed(2);

  // Spread
  $('#spreadHomeLabel').textContent = `${home.abbr} -1.5`;
  $('#spreadHomeOdds').textContent = odds.spread[0].toFixed(2);
  $('#spreadAwayLabel').textContent = `${away.abbr} +1.5`;
  $('#spreadAwayOdds').textContent = odds.spread[1].toFixed(2);

  // Total
  $('#totalOverOdds').textContent = odds.total[0].toFixed(2);
  $('#totalUnderOdds').textContent = odds.total[1].toFixed(2);

  // BTTS
  $('#bttsYesOdds').textContent = odds.btts[0].toFixed(2);
  $('#bttsNoOdds').textContent = odds.btts[1].toFixed(2);
}

function renderCorrectScore() {
  const home = state.homeTeam;
  const away = state.awayTeam;

  $('#csHomeHeader').textContent = `${home.abbr} wins`;
  $('#csAwayHeader').textContent = `${away.abbr} wins`;

  const homeContainer = $('#csHomeOptions');
  homeContainer.innerHTML = CORRECT_SCORES.home
    .map(score => `
      <button class="cs-btn" data-market="correctscore" data-selection="${score}">
        <span class="cs-score">${score}</span>
        <span class="cs-odds">${SCORE_ODDS[score].toFixed(2)}</span>
      </button>
    `).join('');

  const awayContainer = $('#csAwayOptions');
  awayContainer.innerHTML = CORRECT_SCORES.away
    .map(score => `
      <button class="cs-btn" data-market="correctscore" data-selection="${score}">
        <span class="cs-score">${score}</span>
        <span class="cs-odds">${SCORE_ODDS[score].toFixed(2)}</span>
      </button>
    `).join('');

  // Bind correct score buttons
  $$('.cs-btn').forEach(btn => {
    btn.addEventListener('click', () => handleBetToggle(btn));
  });
}

function clearSelections() {
  $$('.odd-btn.selected, .cs-btn.selected').forEach(el => el.classList.remove('selected'));
}

// ===== BETTING =====
function handleBetToggle(btn) {
  if (state.isPlaying) return;

  const market = btn.dataset.market;
  const selection = btn.dataset.selection;

  const existingIdx = state.bets.findIndex(
    b => b.market === market && b.selection === selection
  );

  if (existingIdx > -1) {
    state.bets.splice(existingIdx, 1);
    btn.classList.remove('selected');
  } else {
    if (market === 'correctscore') {
      // N-1 rule: allow multi-select but never all options
      const totalOptions = CORRECT_SCORES.home.length + CORRECT_SCORES.away.length;
      const currentCount = state.bets.filter(b => b.market === 'correctscore').length;
      if (currentCount >= totalOptions - 1) return;
    } else {
      // Single selection per market — deselect any prior pick
      const sameMarket = state.bets.findIndex(b => b.market === market);
      if (sameMarket > -1) {
        const prevSel = state.bets[sameMarket].selection;
        const prevBtn = document.querySelector(`.odd-btn[data-market="${market}"][data-selection="${prevSel}"]`);
        if (prevBtn) prevBtn.classList.remove('selected');
        state.bets.splice(sameMarket, 1);
      }
    }

    const odds = getOddsForSelection(market, selection);
    const label = getBetLabel(market, selection);
    const description = getBetDescription(market, selection);
    state.bets.push({ market, selection, odds, label, description });
    btn.classList.add('selected');
  }

  updateBetslip();
}

function getOddsForSelection(market, selection) {
  const o = state.odds;
  switch (market) {
    case 'money': return selection === 'home' ? o.money[0] : o.money[1];
    case 'spread': return selection === 'home' ? o.spread[0] : o.spread[1];
    case 'total': return selection === 'over' ? o.total[0] : o.total[1];
    case 'btts': return selection === 'yes' ? o.btts[0] : o.btts[1];
    case 'correctscore': return SCORE_ODDS[selection] || 10.00;
    default: return 1.00;
  }
}

function getBetLabel(market, selection) {
  const home = state.homeTeam.abbr;
  const away = state.awayTeam.abbr;
  switch (market) {
    case 'money': return selection === 'home' ? home : away;
    case 'spread': return selection === 'home' ? `${home} -1.5` : `${away} +1.5`;
    case 'total': return selection === 'over' ? 'Over 5.5' : 'Under 5.5';
    case 'btts': return selection === 'yes' ? 'Yes' : 'No';
    case 'correctscore': return selection;
    default: return selection;
  }
}

function getBetDescription(market) {
  switch (market) {
    case 'money': return 'Money';
    case 'spread': return 'Spread';
    case 'total': return 'Total';
    case 'btts': return 'BTTS';
    case 'correctscore': return 'Correct Score';
    default: return market;
  }
}

// ===== BETSLIP =====
function updateBetslip() {
  const count = state.bets.length;
  const totalStake = count * state.stake;
  const maxPay = state.bets.reduce((sum, b) => sum + (b.odds * state.stake), 0);

  $('#betCount').textContent = `${count} BET${count !== 1 ? 'S' : ''}`;
  $('#betTotalStake').textContent = `$${totalStake} TOTAL STAKE`;
  $('#betMaxPay').textContent = `$${maxPay.toFixed(2)}`;
  $('#stakeDisplay').textContent = `$${state.stake}`;

  $('#btnPlay').disabled = count === 0;

  // Toggle betslip visibility
  $('#betslip').classList.toggle('visible', count > 0);

  // Team arrows always visible; changing team will auto-clear bets

  // Add padding to main content when betslip visible
  $('#mainContent').classList.toggle('has-bets', count > 0);

  // Position betslip at bottom of mainContent on tall viewports
  positionBetslip();

  const betsContainer = $('#betslipBets');
  betsContainer.innerHTML = state.bets.map((bet, i) => `
    <div class="bet-item">
      <div class="bet-item-info">
        <span class="bet-item-market">${bet.description}</span>
        <span class="bet-item-selection">${bet.label}</span>
      </div>
      <div class="bet-item-right">
        <div>
          <div class="bet-item-odds">${bet.odds.toFixed(2)}</div>
          <div class="bet-item-pay">Pay: $${(bet.odds * state.stake).toFixed(2)}</div>
        </div>
        <button class="bet-item-remove" data-bet-index="${i}">×</button>
      </div>
    </div>
  `).join('');

  $$('.bet-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeBet(parseInt(btn.dataset.betIndex));
    });
  });
}

function removeBet(index) {
  const bet = state.bets[index];
  if (!bet) return;

  const selector = bet.market === 'correctscore'
    ? `.cs-btn[data-selection="${bet.selection}"]`
    : `.odd-btn[data-market="${bet.market}"][data-selection="${bet.selection}"]`;
  const btn = document.querySelector(selector);
  if (btn) btn.classList.remove('selected');

  state.bets.splice(index, 1);
  updateBetslip();
}

// ===== GAME SIMULATION =====
function simulateMatch() {
  const homeGoals = weightedRandomGoals();
  const awayGoals = weightedRandomGoals();
  return { home: homeGoals, away: awayGoals };
}

function weightedRandomGoals() {
  const weights = [0.08, 0.18, 0.25, 0.22, 0.14, 0.08, 0.03, 0.02];
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return i;
  }
  return 2;
}

function evaluateBets(score) {
  const results = [];
  const totalGoals = score.home + score.away;
  const scoreStr = `${score.home}-${score.away}`;

  for (const bet of state.bets) {
    let win = false;

    switch (bet.market) {
      case 'money':
        if (bet.selection === 'home') win = score.home > score.away;
        else win = score.away > score.home;
        break;
      case 'spread':
        if (bet.selection === 'home') win = (score.home - score.away) > 1.5;
        else win = (score.away - score.home) > -1.5;
        break;
      case 'total':
        if (bet.selection === 'over') win = totalGoals > 5.5;
        else win = totalGoals < 5.5;
        break;
      case 'btts': {
        const bothScored = score.home > 0 && score.away > 0;
        if (bet.selection === 'yes') win = bothScored;
        else win = !bothScored;
        break;
      }
      case 'correctscore':
        win = bet.selection === scoreStr;
        break;
    }

    const payout = win ? bet.odds * state.stake : 0;
    results.push({ ...bet, win, payout });
  }

  return results;
}

function playGame() {
  if (state.bets.length === 0 || state.isPlaying) return;

  const totalCost = state.bets.length * state.stake;
  if (totalCost > state.balance) return;

  state.isPlaying = true;
  state.balance -= totalCost;
  updateBalance();

  document.body.classList.add('simulating');
  $('#btnPlay').disabled = true;
  $('#btnPlay').textContent = 'PLAYING...';

  setTimeout(() => {
    document.body.classList.remove('simulating');

    ingame.timeline = VIDEO_TIMELINE;
    const score = VIDEO_FINAL_SCORE;

    const results = evaluateBets(score);
    const totalPayout = results.reduce((sum, r) => sum + r.payout, 0);

    state.balance += totalPayout;
    updateBalance();

    showInGame(score, results, totalPayout);
  }, 500);
}

// ===== IN-GAME VIEW =====
const ingame = { timers: [], minuteInterval: null, finalScore: null, results: null, payout: null, timeline: [], goalIndex: 0 };

function showInGame(score, results, payout) {
  const home = state.homeTeam;
  const away = state.awayTeam;

  ingame.finalScore = score;
  ingame.results = results;
  ingame.payout = payout;

  $('#ingameHomeBadge').src = `assets/team-badges/${home.logo}`;
  $('#ingameHomeBadge').alt = home.name;
  $('#ingameHomeAbbr').textContent = home.abbr;
  $('#ingameAwayBadge').src = `assets/team-badges/${away.logo}`;
  $('#ingameAwayBadge').alt = away.name;
  $('#ingameAwayAbbr').textContent = away.abbr;
  $('#ingameHomeBadgeWrap').style.background = home.color;
  $('#ingameAwayBadgeWrap').style.background = away.color;
  const scoreBar = $('#ingameScoreBar');
  scoreBar.style.setProperty('--igm-home-color', home.color);
  scoreBar.style.setProperty('--igm-away-color', away.color);

  $('#ingameLiveHomeScore').textContent = '0';
  $('#ingameLiveAwayScore').textContent = '0';
  $('#ingameMinute').textContent = "0'";

  buildIngameMarkets();
  updateIngameBetStates({ home: 0, away: 0 });
  updateScoreColors({ home: 0, away: 0 });

  $('#gameContent').hidden = true;
  $('#betslip').classList.add('force-hidden');
  $('#mainContent').classList.remove('has-bets');
  $('#mainContent').scrollTop = 0;
  $('#ingameView').classList.add('active');

  startIngameVideo();
}

function buildIngameMarkets() {
  const home = state.homeTeam;
  const away = state.awayTeam;
  const labels = { money: 'Match Result', spread: 'Spread', total: 'Total Goals', btts: 'Both Teams Score', correctscore: 'Correct Score' };

  const html = state.bets.map(bet => `
    <div class="res-bet-card igm-bet-card" data-market="${bet.market}" data-selection="${bet.selection}">
      <div class="res-bet-match">
        <div class="res-bet-mini-score">
          <img class="res-bet-mini-badge" src="assets/team-badges/${home.logo}" alt="">
          <span class="res-bet-mini-result igm-live-score">0:0</span>
          <img class="res-bet-mini-badge" src="assets/team-badges/${away.logo}" alt="">
        </div>
        <div class="res-bet-mini-abbrs">
          <span>${home.abbr}</span>
          <span>${away.abbr}</span>
        </div>
      </div>
      <div class="res-bet-info">
        <span class="res-bet-placed-label">Bet Placed</span>
        <span class="res-bet-type">${labels[bet.market]}: ${bet.label}</span>
        <span class="res-bet-stake">Stake: $${state.stake.toFixed(2)}</span>
      </div>
      <div class="res-bet-outcome">
        <span class="res-bet-odds">${bet.odds.toFixed(2)}</span>
      </div>
    </div>
  `).join('');
  $('#ingameMarkets').innerHTML = html;
}

function getCurrentWinnerForMarket(market, score) {
  const total = score.home + score.away;
  switch (market) {
    case 'money':
      if (score.home > score.away) return 'home';
      if (score.away > score.home) return 'away';
      return null;
    case 'spread':
      if ((score.home - score.away) > 1.5) return 'home';
      if ((score.away - score.home) >= -1.5) return 'away';
      return null;
    case 'total':
      return total > 5.5 ? 'over' : 'under';
    case 'btts':
      if (score.home > 0 && score.away > 0) return 'yes'; // both scored — resolved
      if (score.home > 0 || score.away > 0) return 'no';  // only one team scored so far
      return null; // 0:0 — no scoring yet, state is undecided
    case 'correctscore':
      return `${score.home}-${score.away}`;
    default:
      return null;
  }
}

function updateScoreColors(score) {
  const homeEl = $('#ingameLiveHomeScore');
  const awayEl = $('#ingameLiveAwayScore');
  homeEl.classList.toggle('score-leading', score.home > score.away);
  awayEl.classList.toggle('score-leading', score.away > score.home);
}

function updateIngameBetStates(score) {
  const scoreStr = `${score.home}:${score.away}`;
  document.querySelectorAll('#ingameMarkets .igm-live-score').forEach(el => {
    el.textContent = scoreStr;
  });
  for (const bet of state.bets) {
    const winner = getCurrentWinnerForMarket(bet.market, score);
    const card = document.querySelector(
      `#ingameMarkets .igm-bet-card[data-market="${bet.market}"][data-selection="${bet.selection}"]`
    );
    if (!card) continue;
    const isWinning = bet.selection === winner;
    card.classList.remove('igm-winning', 'igm-losing');
    card.classList.add(isWinning ? 'igm-winning' : 'igm-losing');
    const label = card.querySelector('.res-bet-placed-label');
    if (label) label.textContent = isWinning ? 'WINNING' : 'BET PLACED';
  }
}

function startIngameVideo() {
  ingame.goalIndex = 0;
  ingame.timers = [];

  const video = $('#ingameVideo');
  video.currentTime = 0;
  video.play().catch(() => {});

  video.addEventListener('timeupdate', onVideoTimeUpdate);
  video.addEventListener('ended', onVideoEnded);
}

function onVideoTimeUpdate() {
  const video = $('#ingameVideo');
  const t = video.currentTime;

  // Clock display (M:SS)
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  $('#ingameMinute').textContent = `${m}:${String(s).padStart(2, '0')}`;

  // Trigger any goals whose timestamp we've passed
  while (ingame.goalIndex < ingame.timeline.length && t >= ingame.timeline[ingame.goalIndex].time) {
    const goal = ingame.timeline[ingame.goalIndex];
    const prevHome = parseInt($('#ingameLiveHomeScore').textContent);
    const prevAway = parseInt($('#ingameLiveAwayScore').textContent);

    if (goal.home > prevHome) {
      const el = $('#ingameLiveHomeScore');
      el.textContent = goal.home;
      el.classList.remove('score-bump');
      void el.offsetWidth;
      el.classList.add('score-bump');
    }
    if (goal.away > prevAway) {
      const el = $('#ingameLiveAwayScore');
      el.textContent = goal.away;
      el.classList.remove('score-bump');
      void el.offsetWidth;
      el.classList.add('score-bump');
    }
    updateIngameBetStates({ home: goal.home, away: goal.away });
    updateScoreColors({ home: goal.home, away: goal.away });
    ingame.goalIndex++;
  }
}

function onVideoEnded() {
  detachVideoListeners();
  ingame.timers.push(setTimeout(finishIngame, 1200));
}

function detachVideoListeners() {
  const video = $('#ingameVideo');
  video.removeEventListener('timeupdate', onVideoTimeUpdate);
  video.removeEventListener('ended', onVideoEnded);
}

function skipIngame() {
  detachVideoListeners();
  ingame.timers.forEach(clearTimeout);
  ingame.timers = [];
  $('#ingameVideo').pause();
  finishIngame();
}

function finishIngame() {
  detachVideoListeners();
  ingame.timers.forEach(clearTimeout);
  const { finalScore, results, payout } = ingame;
  const last = ingame.timeline.length > 0
    ? ingame.timeline[ingame.timeline.length - 1]
    : { home: finalScore.home, away: finalScore.away };
  $('#ingameLiveHomeScore').textContent = last.home;
  $('#ingameLiveAwayScore').textContent = last.away;
  $('#ingameMinute').textContent = '1:40';
  updateIngameBetStates({ home: last.home, away: last.away });
  updateScoreColors({ home: last.home, away: last.away });
  $('#ingameView').classList.remove('active');
  showResult(finalScore, results, payout);
}

function updateBalance() {
  $('#balanceDisplay').textContent = `$${state.balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// ===== RESULT DISPLAY =====
function showResult(score, results, totalPayout) {
  // Always hide game content — autoplay calls showResult directly without going through showInGame
  $('#gameContent').hidden = true;
  $('#betslip').classList.add('force-hidden');
  $('#ingameVideo').pause();
  $('#ingameView').classList.remove('active');

  const home = state.homeTeam;
  const away = state.awayTeam;
  const won = totalPayout > 0;

  // Hero
  const hero = $('#resHero');
  hero.classList.toggle('win', won);
  $('#resEyebrow').textContent = won ? 'CONGRATULATIONS!' : 'FULL TIME';
  $('#resHeadline').textContent = won ? 'YOU WIN' : 'BETTER LUCK\nNEXT ROUND';
  $('#resHeadline').style.whiteSpace = won ? '' : 'pre-line';
  $('#resAmount').textContent = won ? `$${totalPayout.toFixed(2)}` : '';

  // Coins burst animation — show overlay first so layout is ready, then measure
  $('#resCoins').innerHTML = '';
  $('#resultOverlay').classList.add('visible');

  if (won) {
    requestAnimationFrame(() => {
      const heroEl    = $('#resHero');
      const overlayEl = $('#resultOverlay');
      const hr = heroEl.getBoundingClientRect();
      const or = overlayEl.getBoundingClientRect();
      const cx = (hr.left + hr.width  / 2) - or.left;
      const cy = (hr.top  + hr.height / 2) - or.top;

      const coinsEl     = $('#resCoins');
      const totalDur    = 5;
      const coinCount   = 90;
      const emojis      = ['🪙', '🪙', '🪙', '🪙', '💰', '💰', '⭐', '✨'];

      for (let i = 0; i < coinCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        // bias: more coins shoot outward strongly, some lob high
        const dist  = 120 + Math.random() * 340;
        const tx    = Math.cos(angle) * dist;
        const ty    = Math.sin(angle) * dist;
        const dur   = 0.6 + Math.random() * 0.9;
        const delay = Math.random() * (totalDur - dur);
        const size  = 1.6 + Math.random() * 1.4;
        const rot   = -720 + Math.random() * 1440; // spin up to 4 full turns

        const coin = document.createElement('span');
        coin.className = 'coin';
        coin.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        coin.style.left = `${cx}px`;
        coin.style.top  = `${cy}px`;
        coin.style.setProperty('--tx',    `${tx}px`);
        coin.style.setProperty('--ty',    `${ty}px`);
        coin.style.setProperty('--rot',   `${rot}deg`);
        coin.style.setProperty('--dur',   `${dur}s`);
        coin.style.setProperty('--delay', `${delay}s`);
        coin.style.setProperty('--size',  `${size}rem`);
        coinsEl.appendChild(coin);
      }
    });
  }

  // Score bar colors
  const scoreBar = $('#resScoreBar');
  scoreBar.style.setProperty('--res-home-color', home.color);
  scoreBar.style.setProperty('--res-away-color', away.color);

  // Score bar values
  $('#resHomeBadge').src = `assets/team-badges/${home.logo}`;
  $('#resHomeAbbr').textContent = home.abbr;
  $('#resAwayBadge').src = `assets/team-badges/${away.logo}`;
  $('#resAwayAbbr').textContent = away.abbr;

  const homeScoreEl = $('#resHomeScore');
  const awayScoreEl = $('#resAwayScore');
  homeScoreEl.textContent = score.home;
  awayScoreEl.textContent = score.away;
  homeScoreEl.classList.toggle('leading', score.home > score.away);
  awayScoreEl.classList.toggle('leading', score.away > score.home);

  // Bet slip cards
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const betId = Math.floor(1000000 + Math.random() * 9000000);

  $('#resBetslip').innerHTML = results.map(r => `
    <div class="res-bet-card ${r.win ? 'win' : ''}">
      <div class="res-bet-match">
        <div class="res-bet-mini-score">
          <img class="res-bet-mini-badge" src="assets/team-badges/${home.logo}" alt="">
          <span class="res-bet-mini-result">${score.home}:${score.away}</span>
          <img class="res-bet-mini-badge" src="assets/team-badges/${away.logo}" alt="">
        </div>
        <div class="res-bet-mini-abbrs">
          <span>${home.abbr}</span>
          <span>${away.abbr}</span>
        </div>
      </div>
      <div class="res-bet-info">
        <span class="res-bet-placed-label">Bet Placed</span>
        <span class="res-bet-type">${r.description}: ${r.label}</span>
        <span class="res-bet-stake">${dateStr}, ${timeStr} &nbsp;·&nbsp; Stake: $${state.stake.toFixed(2)}</span>
      </div>
      <div class="res-bet-outcome">
        <span class="res-bet-odds">${r.odds.toFixed(2)}</span>
        <span class="res-bet-result ${r.win ? 'won' : 'lost'}">${r.win ? 'Won: $' + r.payout.toFixed(2) : 'No Win'}</span>
      </div>
    </div>
  `).join('');

  // For loss state, show overlay now (win state shows it earlier, before rAF coin setup)
  if (!won) $('#resultOverlay').classList.add('visible');

  saveGameToHistory(score, results, totalPayout);
}

// ===== AUTO BET =====
function autoBet() {
  if (state.isPlaying) return;

  state.bets = [];
  clearSelections();

  const markets = ['money', 'spread', 'total', 'btts'];
  const numBets = Math.floor(Math.random() * 3) + 1;
  const shuffledMarkets = [...markets].sort(() => Math.random() - 0.5).slice(0, numBets);

  for (const market of shuffledMarkets) {
    let selection;
    switch (market) {
      case 'money': selection = Math.random() < 0.5 ? 'home' : 'away'; break;
      case 'spread': selection = Math.random() < 0.5 ? 'home' : 'away'; break;
      case 'total': selection = Math.random() < 0.5 ? 'over' : 'under'; break;
      case 'btts': selection = Math.random() < 0.5 ? 'yes' : 'no'; break;
    }

    const odds = getOddsForSelection(market, selection);
    const label = getBetLabel(market, selection);
    const description = getBetDescription(market, selection);
    state.bets.push({ market, selection, odds, label, description });

    const btn = document.querySelector(`.odd-btn[data-market="${market}"][data-selection="${selection}"]`);
    if (btn) btn.classList.add('selected');
  }

  updateBetslip();
}

// ===== BET HISTORY =====
const DUMMY_HISTORY = [
  {
    id: 'RND4812903',
    date: 'Apr 27, 2026', time: '4:45 PM',
    homeTeam: 'BOS', awayTeam: 'TOR',
    score: { home: 3, away: 2 },
    bets: [{ description: 'Money', label: 'BOS', odds: 1.75, win: true, payout: 8.75 }],
    stake: 5, totalPayout: 8.75
  },
  {
    id: 'RND7203541',
    date: 'Apr 27, 2026', time: '3:12 PM',
    homeTeam: 'NYR', awayTeam: 'PIT',
    score: { home: 1, away: 4 },
    bets: [
      { description: 'Money', label: 'NYR', odds: 1.90, win: false, payout: 0 },
      { description: 'Total', label: 'Over 5.5', odds: 1.88, win: false, payout: 0 }
    ],
    stake: 2, totalPayout: 0
  },
  {
    id: 'RND9381047',
    date: 'Apr 26, 2026', time: '6:30 PM',
    homeTeam: 'CHI', awayTeam: 'DET',
    score: { home: 4, away: 3 },
    bets: [
      { description: 'Spread', label: 'CHI -1.5', odds: 2.40, win: true, payout: 12.00 },
      { description: 'BTTS', label: 'Yes', odds: 1.72, win: true, payout: 8.60 }
    ],
    stake: 5, totalPayout: 20.60
  },
  {
    id: 'RND1053928',
    date: 'Apr 26, 2026', time: '2:00 PM',
    homeTeam: 'VAN', awayTeam: 'EDM',
    score: { home: 2, away: 6 },
    bets: [{ description: 'Correct Score', label: '2-6', odds: 22.00, win: true, payout: 22.00 }],
    stake: 1, totalPayout: 22.00
  },
  {
    id: 'RND6620183',
    date: 'Apr 25, 2026', time: '11:15 AM',
    homeTeam: 'FLA', awayTeam: 'TBL',
    score: { home: 3, away: 3 },
    bets: [
      { description: 'Total', label: 'Under 5.5', odds: 1.90, win: false, payout: 0 },
      { description: 'Money', label: 'FLA', odds: 1.85, win: false, payout: 0 }
    ],
    stake: 10, totalPayout: 0
  }
];

function getHistory() {
  try {
    const stored = sessionStorage.getItem('ihockey_history');
    const session = stored ? JSON.parse(stored) : [];
    return [...session, ...DUMMY_HISTORY];
  } catch (e) {
    return [...DUMMY_HISTORY];
  }
}

function saveGameToHistory(score, results, totalPayout) {
  try {
    const stored = sessionStorage.getItem('ihockey_history');
    const history = stored ? JSON.parse(stored) : [];
    const now = new Date();
    history.unshift({
      id: `RND${Math.floor(1000000 + Math.random() * 9000000)}`,
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      homeTeam: state.homeTeam.abbr,
      awayTeam: state.awayTeam.abbr,
      score,
      bets: results.map(r => ({ description: r.description, label: r.label, odds: r.odds, win: r.win, payout: r.payout })),
      stake: state.stake,
      totalPayout
    });
    if (history.length > 50) history.pop();
    sessionStorage.setItem('ihockey_history', JSON.stringify(history));
  } catch (e) { /* sessionStorage unavailable */ }
}

function openHistoryPanel() {
  renderHistory();
  $('#historyOverlay').removeAttribute('aria-hidden');
  $('#historyOverlay').classList.add('visible');
  $('#btnHistoryClose').focus();
}

function closeHistoryPanel() {
  $('#historyOverlay').setAttribute('aria-hidden', 'true');
  $('#historyOverlay').classList.remove('visible');
  $('#btnHistory').focus();
}

function renderHistory() {
  const history = getHistory();
  const body = $('#historyBody');
  if (history.length === 0) {
    body.innerHTML = `<p class="history-empty">No bets yet. Play a round to see your history.</p>`;
    return;
  }
  body.innerHTML = history.map(entry => {
    const hasWin = entry.bets.some(b => b.win);
    const totalPayout = entry.totalPayout ?? entry.bets.reduce((s, b) => s + b.payout, 0);
    return `
      <div class="history-entry ${hasWin ? 'has-win' : 'all-lost'}">
        <div class="history-entry-header">
          <div class="history-teams">
            <span class="history-team-abbr">${entry.homeTeam}</span>
            <span class="history-score">${entry.score.home}–${entry.score.away}</span>
            <span class="history-team-abbr">${entry.awayTeam}</span>
          </div>
          <div class="history-meta">
            <span class="history-date">${entry.date}</span>
            <span class="history-time">${entry.time}</span>
          </div>
        </div>
        ${entry.bets.map(b => `
          <div class="history-bet-row ${b.win ? 'win' : 'lost'}">
            <span class="history-bet-label">${b.description}: ${b.label}</span>
            <span class="history-bet-odds">${b.odds.toFixed(2)}</span>
            <span class="history-bet-result-badge ${b.win ? 'win' : 'lost'}">${b.win ? '+$' + b.payout.toFixed(2) : 'No Win'}</span>
          </div>
        `).join('')}
        <div class="history-entry-footer">
          <span class="history-stake">Stake: $${entry.stake} × ${entry.bets.length}</span>
          <span class="history-payout ${hasWin ? 'won' : ''}">${hasWin ? 'Return: $' + totalPayout.toFixed(2) : 'No Return'}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ===== AUTO PLAY OPTIONS PANEL =====
function openAutoplayPanel() {
  if (state.isPlaying) return;
  updateAutoplayDisplay();
  $('#autoplayOverlay').classList.add('visible');
}

function closeAutoplayPanel() {
  $('#autoplayOverlay').classList.remove('visible');
}

function updateAutoplayDisplay() {
  const ap = state.autoplay;
  $('#autoplayStakeVal').textContent = state.stake;
  $('#autoplayTotalRisk').textContent = (state.stake * ap.rounds).toFixed(0);

  // Rounds buttons
  $$('.autoplay-round-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.rounds) === ap.rounds);
  });

  // Loss limit
  $('#lossLimitInput').value = ap.lossLimit;

  // Win limit
  $('#winLimit10x').classList.toggle('active', ap.winLimit === '10x');
  $('#winLimitNone').classList.toggle('active', ap.winLimit === 'none');
}

function activateAutoplay() {
  const ap = state.autoplay;
  ap.active = true;
  ap.roundsLeft = ap.rounds;
  ap.totalLoss = 0;
  closeAutoplayPanel();
  runAutoplayRound();
}

function runAutoplayRound() {
  const ap = state.autoplay;
  if (!ap.active || ap.roundsLeft <= 0) {
    stopAutoplay();
    return;
  }

  // Auto-pick bets
  autoBet();

  // Check balance
  const totalCost = state.bets.length * state.stake;
  if (totalCost > state.balance) {
    stopAutoplay();
    return;
  }

  // Play the game
  state.isPlaying = true;
  state.balance -= totalCost;
  updateBalance();

  document.body.classList.add('simulating');
  $('#btnPlay').disabled = true;
  $('#btnPlay').textContent = `AUTO ${ap.roundsLeft}`;

  const delay = ap.skipResults ? 400 : 1500;

  setTimeout(() => {
    document.body.classList.remove('simulating');

    const score = simulateMatch();
    const results = evaluateBets(score);
    const totalPayout = results.reduce((sum, r) => sum + r.payout, 0);
    const netResult = totalPayout - totalCost;

    state.balance += totalPayout;
    updateBalance();

    // Track losses
    if (netResult < 0) {
      ap.totalLoss += Math.abs(netResult);
    }

    ap.roundsLeft--;

    // Check win limit
    if (ap.winLimit === '10x' && totalPayout >= state.stake * 10) {
      showResult(score, results, totalPayout);
      stopAutoplay();
      return;
    }

    // Check loss limit
    if (ap.totalLoss >= ap.lossLimit * state.stake) {
      showResult(score, results, totalPayout);
      stopAutoplay();
      return;
    }

    // Check rounds remaining
    if (ap.roundsLeft <= 0) {
      showResult(score, results, totalPayout);
      stopAutoplay();
      return;
    }

    if (ap.skipResults) {
      // Skip result screen, go to next round
      state.isPlaying = false;
      $('#btnPlay').textContent = 'PLAY ▶';
      loadNewMatch();
      setTimeout(() => runAutoplayRound(), 200);
    } else {
      showResult(score, results, totalPayout);
      // Override next button to continue autoplay
      state._autoplayContinue = true;
    }
  }, delay);
}

function stopAutoplay() {
  state.autoplay.active = false;
  state.autoplay.roundsLeft = 0;
  state._autoplayContinue = false;
  $('#btnPlay').textContent = 'PLAY ▶';
}

// ===== STAKE PANEL =====
function openStakePanel() {
  state.stakeInput = String(state.stake);
  updateStakeDisplay();
  $('#stakePanel').classList.add('open');
}

function closeStakePanel() {
  $('#stakePanel').classList.remove('open');
}

function setStake(value) {
  const num = parseFloat(value);
  if (!isNaN(num) && num > 0 && num <= 10000) {
    state.stake = num;
    state.stakeInput = String(num);
    updateStakeDisplay();
    updateBetslip();
  }
}

function updateStakeDisplay() {
  const display = state.stakeInput || '0';
  $('#stakeInputValue').textContent = `$${display}`;

  // Update preset active states
  $$('.stake-preset').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.amount) === parseFloat(display));
  });
}

function handleNumpadKey(key) {
  if (key === 'confirm') {
    const num = parseFloat(state.stakeInput);
    if (!isNaN(num) && num > 0) {
      setStake(num);
    }
    closeStakePanel();
    return;
  }

  if (key === 'backspace') {
    state.stakeInput = state.stakeInput.slice(0, -1) || '';
    updateStakeDisplay();
    return;
  }

  // Decimal point — only allow one
  if (key === '.' && state.stakeInput.includes('.')) return;

  // Limit length
  if (state.stakeInput.length >= 7) return;

  state.stakeInput += key;
  updateStakeDisplay();
}

function adjustStake(delta) {
  const current = parseFloat(state.stakeInput) || 0;
  const newVal = Math.max(1, current + delta);
  state.stakeInput = String(newVal);
  setStake(newVal);
}

// ===== BETSLIP POSITIONING =====
function positionBetslip() {
  const betslip = $('#betslip');
  const main = $('#mainContent');
  const mainRect = main.getBoundingClientRect();
  const offset = window.innerHeight - mainRect.bottom;
  // Only apply JS offset on desktop where the card floats above the viewport bottom.
  // On mobile/iOS (offset ≈ 0) clear the inline style so CSS `bottom: 0` + env()
  // safe-area handles positioning natively — avoids iOS fixed-positioning glitches.
  if (offset > 4) {
    betslip.style.bottom = Math.round(offset) + 'px';
  } else {
    betslip.style.bottom = '';
  }
}

// ===== EVENT BINDING =====
function bindEvents() {
  // Market buttons
  $$('.odd-btn').forEach(btn => {
    btn.addEventListener('click', () => handleBetToggle(btn));
  });

  // Team arrows
  $$('.team-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      cycleTeam(btn.dataset.side, btn.dataset.dir);
    });
  });

  // Randomize teams button
  $('#btnRandomize').addEventListener('click', () => {
    if (state.isPlaying) return;
    loadNewMatch();
  });

  // Team badge click → open selector
  $('#homeBadgeWrapper').addEventListener('click', () => openTeamSelector('home'));
  $('#awayBadgeWrapper').addEventListener('click', () => openTeamSelector('away'));

  // Team selector close
  $('#teamSelectorClose').addEventListener('click', closeTeamSelector);
  // Close team selector when clicking outside it
  document.addEventListener('click', (e) => {
    const overlay = $('#teamSelectorOverlay');
    if (!overlay.classList.contains('visible')) return;
    const isInsideSelector = overlay.contains(e.target);
    const isBadgeClick = e.target.closest('.team-badge-wrapper');
    if (!isInsideSelector && !isBadgeClick) {
      closeTeamSelector();
    }
  });

  // Betslip toggle
  $('#betslipSummary').addEventListener('click', () => {
    $('#betslip').classList.toggle('expanded');
  });

  // Actions
  $('#btnPlay').addEventListener('click', playGame);
  $('#btnAuto').addEventListener('click', openAutoplayPanel);
  $('#btnStake').addEventListener('click', openStakePanel);

  // Auto play panel
  $('#autoplayClose').addEventListener('click', closeAutoplayPanel);
  $('#autoplayOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAutoplayPanel();
  });

  $$('.autoplay-round-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.autoplay.rounds = parseInt(btn.dataset.rounds);
      updateAutoplayDisplay();
    });
  });

  $('#lossLimitMinus').addEventListener('click', () => {
    state.autoplay.lossLimit = Math.max(1, state.autoplay.lossLimit - 1);
    updateAutoplayDisplay();
  });
  $('#lossLimitPlus').addEventListener('click', () => {
    state.autoplay.lossLimit = Math.min(9999, state.autoplay.lossLimit + 1);
    updateAutoplayDisplay();
  });
  $('#lossLimitInput').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 1) {
      state.autoplay.lossLimit = Math.min(9999, val);
    }
  });
  $('#lossLimitInput').addEventListener('blur', () => {
    updateAutoplayDisplay();
  });

  $('#winLimit10x').addEventListener('click', () => {
    state.autoplay.winLimit = '10x';
    updateAutoplayDisplay();
  });
  $('#winLimitNone').addEventListener('click', () => {
    state.autoplay.winLimit = 'none';
    updateAutoplayDisplay();
  });

  $('#autoplaySkip').addEventListener('change', (e) => {
    state.autoplay.skipResults = e.target.checked;
  });

  $('#autoplayActivate').addEventListener('click', activateAutoplay);

  // Stake panel
  $('#stakePanelClose').addEventListener('click', closeStakePanel);
  $('#stakeMinus').addEventListener('click', () => adjustStake(-1));
  $('#stakePlus').addEventListener('click', () => adjustStake(1));

  $$('.stake-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      setStake(parseFloat(btn.dataset.amount));
    });
  });

  $$('.numpad-key').forEach(btn => {
    btn.addEventListener('click', () => {
      handleNumpadKey(btn.dataset.key);
    });
  });

  // In-game skip
  $('#btnSkipIngame').addEventListener('click', skipIngame);

  // History overlay
  $('#btnHistory').addEventListener('click', openHistoryPanel);
  $('#btnHistoryClose').addEventListener('click', closeHistoryPanel);
  $('#historyOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeHistoryPanel();
  });

  // Help overlay
  $('#btnHelp').addEventListener('click', () => {
    $('#helpOverlay').classList.add('visible');
  });
  $('#btnHelpClose').addEventListener('click', () => {
    $('#helpOverlay').classList.remove('visible');
  });
  $('#helpOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) $('#helpOverlay').classList.remove('visible');
  });

  // New game
  $('#btnNext').addEventListener('click', () => {
    $('#resultOverlay').classList.remove('visible');
    $('#gameContent').hidden = false;
    $('#betslip').classList.remove('force-hidden');
    const shouldContinue = state._autoplayContinue;
    state._autoplayContinue = false;
    setTimeout(() => {
      $('#btnPlay').textContent = 'PLAY ▶';
      state.isPlaying = false;
      loadNewMatch();
      if (shouldContinue && state.autoplay.active) {
        setTimeout(() => runAutoplayRound(), 300);
      }
    }, 300);
  });

  // Re-bet — same teams, same bets, back to betting screen
  $('#btnRebet').addEventListener('click', () => {
    $('#resultOverlay').classList.remove('visible');
    $('#gameContent').hidden = false;
    $('#betslip').classList.remove('force-hidden');
    $('#btnPlay').textContent = 'PLAY ▶';
    state.isPlaying = false;
  });
}
