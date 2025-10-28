const NHL_TEAMS = {
    ANA: { name: 'Anaheim Ducks', primaryColor: '#f47a38', secondaryColor: '#000' },
    BOS: { name: 'Boston Bruins', primaryColor: '#ffb81c', secondaryColor: '#000' },
    BUF: { name: 'Buffalo Sabres', primaryColor: '#002654', secondaryColor: '#fcb514' },
    CAR: { name: 'Carolina Hurricanes', primaryColor: '#ce1126', secondaryColor: '#000' },
    CBJ: { name: 'Columbus Blue Jackets', primaryColor: '#002654', secondaryColor: '#ce1126' },
    CGY: { name: 'Calgary Flames', primaryColor: '#ce1126', secondaryColor: '#f1be48' },
    CHI: { name: 'Chicago Blackhawks', primaryColor: '#cf0a2c', secondaryColor: '#000' },
    COL: { name: 'Colorado Avalanche', primaryColor: '#6f263d', secondaryColor: '#236192' },
    DAL: { name: 'Dallas Stars', primaryColor: '#006847', secondaryColor: '#8f8f8c' },
    DET: { name: 'Detroit Red Wings', primaryColor: '#ce1126', secondaryColor: '#fff' },
    EDM: { name: 'Edmonton Oilers', primaryColor: '#041e42', secondaryColor: '#ff4c00' },
    FLA: { name: 'Florida Panthers', primaryColor: '#041e42', secondaryColor: '#c8102e' },
    LAK: { name: 'Los Angeles Kings', primaryColor: '#111', secondaryColor: '#a2aaad' },
    MIN: { name: 'Minnesota Wild', primaryColor: '#154734', secondaryColor: '#a6192e' },
    MTL: { name: 'Montreal Canadiens', primaryColor: '#af1e2d', secondaryColor: '#192168' },
    NJD: { name: 'New Jersey Devils', primaryColor: '#ce1126', secondaryColor: '#000' },
    NSH: { name: 'Nashville Predators', primaryColor: '#ffb81c', secondaryColor: '#041e42' },
    NYI: { name: 'New York Islanders', primaryColor: '#00539b', secondaryColor: '#f47d30' },
    NYR: { name: 'New York Rangers', primaryColor: '#0038a8', secondaryColor: '#ce1126' },
    OTT: { name: 'Ottawa Senators', primaryColor: '#c52032', secondaryColor: '#000' },
    PHI: { name: 'Philadelphia Flyers', primaryColor: '#f74902', secondaryColor: '#000' },
    PIT: { name: 'Pittsburgh Penguins', primaryColor: '#fcb514', secondaryColor: '#000' },
    SEA: { name: 'Seattle Kraken', primaryColor: '#001628', secondaryColor: '#99d9d9' },
    SJS: { name: 'San Jose Sharks', primaryColor: '#006d75', secondaryColor: '#ea7200' },
    STL: { name: 'St. Louis Blues', primaryColor: '#002f87', secondaryColor: '#fcb514' },
    TBL: { name: 'Tampa Bay Lightning', primaryColor: '#002868', secondaryColor: '#fff' },
    TOR: { name: 'Toronto Maple Leafs', primaryColor: '#00205b', secondaryColor: '#fff' },
    UTA: { name: 'Utah Mammoth', primaryColor: '#69b3e7', secondaryColor: '#000' },
    VAN: { name: 'Vancouver Canucks', primaryColor: '#00205b', secondaryColor: '#00843d' },
    VGK: { name: 'Vegas Golden Knights', primaryColor: '#b4975a', secondaryColor: '#333f42' },
    WPG: { name: 'Winnipeg Jets', primaryColor: '#041e42', secondaryColor: '#004c97' },
    WSH: { name: 'Washington Capitals', primaryColor: '#041e42', secondaryColor: '#c8102e' }
};

const DEFAULT_TEAMS = ['NJD', 'PIT'];
const activeTeams = new Set(DEFAULT_TEAMS);
const countdownIntervals = new Map();

const elements = {
    countdownContainer: document.getElementById('countdownContainer'),
    teamGrid: document.getElementById('teamGrid'),
    teamMenu: document.querySelector('.team-menu'),
    menuToggle: document.querySelector('.team-menu-toggle')
};

function initApp() {
    populateTeamMenu();
    setupEventListeners();
    DEFAULT_TEAMS.forEach(teamCode => loadTeamData(teamCode));
    updateDynamicStyles();
}

function populateTeamMenu() {
    elements.teamGrid.innerHTML = Object.entries(NHL_TEAMS)
        .filter(([code]) => !DEFAULT_TEAMS.includes(code))
        .map(([code, team]) => `
            <div class="team-item" data-team="${code}">
                <img src="https://assets.nhle.com/logos/nhl/svg/${code}_light.svg" alt="${team.name}" loading="lazy">
                <span>${team.name}</span>
            </div>
        `).join('');
}

function setupEventListeners() {
    elements.menuToggle.addEventListener('click', toggleTeamMenu);
    elements.teamMenu.addEventListener('click', (e) => {
        if (e.target === elements.teamMenu) toggleTeamMenu();
    });
    elements.teamGrid.addEventListener('click', handleTeamSelection);
}

function toggleTeamMenu() {
    const isHidden = elements.teamMenu.getAttribute('aria-hidden') === 'true';
    elements.teamMenu.setAttribute('aria-hidden', !isHidden);
}

function handleTeamSelection(e) {
    const teamItem = e.target.closest('.team-item');
    if (!teamItem) return;

    const teamCode = teamItem.dataset.team;
    if (activeTeams.has(teamCode)) return;

    activeTeams.add(teamCode);
    teamItem.classList.add('hidden');
    addCountdownCard(teamCode);
    loadTeamData(teamCode);
    toggleTeamMenu();
}

function addCountdownCard(teamCode) {
    const card = document.createElement('div');
    card.className = 'countdown-card';
    card.dataset.team = teamCode;
    elements.countdownContainer.appendChild(card);
}

function removeTeamCard(teamCode) {
    if (DEFAULT_TEAMS.includes(teamCode)) return;

    activeTeams.delete(teamCode);
    const card = document.querySelector(`.countdown-card[data-team="${teamCode}"]`);
    if (card) card.remove();

    const teamItem = document.querySelector(`.team-item[data-team="${teamCode}"]`);
    if (teamItem) teamItem.classList.remove('hidden');

    if (countdownIntervals.has(teamCode)) {
        clearInterval(countdownIntervals.get(teamCode));
        countdownIntervals.delete(teamCode);
    }
}

async function loadTeamData(teamCode) {
    const card = document.querySelector(`.countdown-card[data-team="${teamCode}"]`);
    if (!card) return;

    card.innerHTML = '<div class="loading">Loading...</div>';

    try {
        const response = await fetch(`https://corsproxy.io/?https://api-web.nhle.com/v1/club-schedule-season/${teamCode}/now`);
        if (!response.ok) throw new Error('Failed to fetch schedule');

        const data = await response.json();
        const games = findUpcomingGames(data.games);

        if (!games.nextGame) {
            card.innerHTML = '<div class="error">No upcoming games found</div>';
            return;
        }

        renderCountdownCard(card, teamCode, games.nextGame, games.followingGame);
        startCountdown(teamCode, games.nextGame);
    } catch (error) {
        card.innerHTML = `<div class="error">Failed to load game data</div>`;
    }
}

function findUpcomingGames(games) {
    const now = new Date();
    const upcomingGames = games.filter(game => new Date(game.startTimeUTC) > now);
    return {
        nextGame: upcomingGames[0] || null,
        followingGame: upcomingGames[1] || null
    };
}

function renderCountdownCard(card, teamCode, game, followingGame) {
    const team = NHL_TEAMS[teamCode];
    const isHomeGame = game.homeTeam.abbrev === teamCode;
    const opponent = isHomeGame ? game.awayTeam : game.homeTeam;
    const gameDate = new Date(game.startTimeUTC);
    const location = isHomeGame ? 'Home' : `@ ${opponent.placeName.default}`;

    const removeButton = !DEFAULT_TEAMS.includes(teamCode) 
        ? `<button class="remove-team" onclick="removeTeamCard('${teamCode}')">Remove</button>` 
        : '';

    let followingGameHtml = '';
    if (followingGame) {
        const followingDate = new Date(followingGame.startTimeUTC);
        const followingIsHome = followingGame.homeTeam.abbrev === teamCode;
        const followingOpponent = followingIsHome ? followingGame.awayTeam : followingGame.homeTeam;
        const followingLocation = followingIsHome ? 'vs' : '@';
        followingGameHtml = `
            <div class="following-game">
                <span class="following-label">Following Game:</span>
                <span class="following-matchup">${followingLocation} ${followingOpponent.abbrev}</span>
                <span class="following-date">${formatShortDate(followingDate)}</span>
            </div>
        `;
    }

    card.innerHTML = `
        ${removeButton}
        <div class="team-header">
            <img class="team-logo" src="https://assets.nhle.com/logos/nhl/svg/${teamCode}_light.svg" alt="${team.name}">
            <div class="team-info">
                <h2>${team.name}</h2>
                <div class="next-game">Next Game</div>
            </div>
        </div>
        <div class="game-details">
            <div class="matchup">${game.homeTeam.abbrev} vs ${game.awayTeam.abbrev}</div>
            <div class="game-date">${formatGameDate(gameDate)}</div>
            <div class="game-location">${location}</div>
        </div>
        <div class="countdown">
            <div class="time-unit">
                <span class="value" data-countdown="days">-</span>
                <span class="label">Days</span>
            </div>
            <div class="time-unit">
                <span class="value" data-countdown="hours">-</span>
                <span class="label">Hours</span>
            </div>
            <div class="time-unit">
                <span class="value" data-countdown="minutes">-</span>
                <span class="label">Minutes</span>
            </div>
            <div class="time-unit">
                <span class="value" data-countdown="seconds">-</span>
                <span class="label">Seconds</span>
            </div>
        </div>
        ${followingGameHtml}
    `;
}

function formatGameDate(date) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-GB', options);
}

function formatShortDate(date) {
    const options = { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-GB', options);
}

function startCountdown(teamCode, game) {
    if (countdownIntervals.has(teamCode)) {
        clearInterval(countdownIntervals.get(teamCode));
    }

    const card = document.querySelector(`.countdown-card[data-team="${teamCode}"]`);
    const gameTime = new Date(game.startTimeUTC);

    const updateCountdown = () => {
        const now = new Date();
        const diff = gameTime - now;

        if (diff <= 0) {
            clearInterval(countdownIntervals.get(teamCode));
            countdownIntervals.delete(teamCode);
            setTimeout(() => loadTeamData(teamCode), 5000);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const daysEl = card.querySelector('[data-countdown="days"]');
        const hoursEl = card.querySelector('[data-countdown="hours"]');
        const minutesEl = card.querySelector('[data-countdown="minutes"]');
        const secondsEl = card.querySelector('[data-countdown="seconds"]');

        if (daysEl) daysEl.textContent = days;
        if (hoursEl) hoursEl.textContent = hours;
        if (minutesEl) minutesEl.textContent = minutes;
        if (secondsEl) secondsEl.textContent = seconds;
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    countdownIntervals.set(teamCode, interval);
}

function updateDynamicStyles() {
    const style = document.createElement('style');
    const teamStyles = Object.entries(NHL_TEAMS).map(([code, team]) => `
        .countdown-card[data-team="${code}"] {
            border-color: ${team.primaryColor};
        }
        .countdown-card[data-team="${code}"] .team-header {
            background: linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor});
        }
    `).join('');
    
    style.textContent = teamStyles;
    document.head.appendChild(style);
}

initApp();