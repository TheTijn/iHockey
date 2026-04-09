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
  if (state.isPlaying || state.bets.length > 0) return;

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
    // Remove any existing bet in the same market
    const sameMarket = state.bets.findIndex(b => b.market === market);
    if (sameMarket > -1) {
      const prevSel = state.bets[sameMarket].selection;
      const selector = market === 'correctscore'
        ? `.cs-btn[data-market="${market}"][data-selection="${prevSel}"]`
        : `.odd-btn[data-market="${market}"][data-selection="${prevSel}"]`;
      const prevBtn = document.querySelector(selector);
      if (prevBtn) prevBtn.classList.remove('selected');
      state.bets.splice(sameMarket, 1);
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

  // Toggle team arrows hidden when bets exist
  $$('.team-arrow').forEach(el => el.classList.toggle('hidden', count > 0));

  // Toggle badge wrapper locked when bets exist
  $('#homeBadgeWrapper').classList.toggle('locked', count > 0);
  $('#awayBadgeWrapper').classList.toggle('locked', count > 0);

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
      case 'btts':
        const bothScored = score.home > 0 && score.away > 0;
        if (bet.selection === 'yes') win = bothScored;
        else win = !bothScored;
        break;
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

    const score = simulateMatch();
    const results = evaluateBets(score);
    const totalPayout = results.reduce((sum, r) => sum + r.payout, 0);

    state.balance += totalPayout;
    updateBalance();
    showResult(score, results, totalPayout);
  }, 1500);
}

function updateBalance() {
  $('#balanceDisplay').textContent = `$${state.balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// ===== RESULT DISPLAY =====
function showResult(score, results, totalPayout) {
  const home = state.homeTeam;
  const away = state.awayTeam;

  $('#resultHomeLogo').src = `assets/team-badges/${home.logo}`;
  $('#resultHomeAbbr').textContent = home.abbr;
  $('#resultAwayLogo').src = `assets/team-badges/${away.logo}`;
  $('#resultAwayAbbr').textContent = away.abbr;
  $('#resultScore').textContent = `${score.home} - ${score.away}`;

  const outcomesEl = $('#resultOutcomes');
  outcomesEl.innerHTML = results.map(r => `
    <div class="result-outcome-item ${r.win ? 'win' : 'lose'}">
      <span>${r.description}: ${r.label}</span>
      <span>${r.win ? '+$' + r.payout.toFixed(2) : 'LOST'}</span>
    </div>
  `).join('');

  const payoutEl = $('#resultPayout');
  if (totalPayout > 0) {
    payoutEl.textContent = `+$${totalPayout.toFixed(2)}`;
    payoutEl.className = '';
  } else {
    payoutEl.textContent = '$0.00';
    payoutEl.className = 'loss';
  }

  $('#resultOverlay').classList.add('visible');
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
  if (window.innerHeight > 800) {
    // Tall viewport: anchor betslip to bottom of mainContent
    const main = $('#mainContent');
    const header = $('.header');
    const headerHeight = header.getBoundingClientRect().height;
    const mainMaxHeight = 800;
    const mainBottom = headerHeight + mainMaxHeight;
    const offset = window.innerHeight - mainBottom;
    betslip.style.bottom = offset + 'px';
  } else {
    // Short viewport: betslip at viewport bottom
    betslip.style.bottom = '0px';
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

  // Team badge click → open selector
  $('#homeBadgeWrapper').addEventListener('click', () => openTeamSelector('home'));
  $('#awayBadgeWrapper').addEventListener('click', () => openTeamSelector('away'));

  // Team selector close
  $('#teamSelectorClose').addEventListener('click', closeTeamSelector);

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

  // Next match
  $('#btnNext').addEventListener('click', () => {
    $('#resultOverlay').classList.remove('visible');
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
}
