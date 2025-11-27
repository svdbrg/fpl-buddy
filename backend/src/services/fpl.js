import { CookieJar, Cookie } from 'tough-cookie';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';
const LOGIN_URL = 'https://users.premierleague.com/accounts/login/';

class FPLService {
  constructor() {
    this.cookieJar = new CookieJar();
    this.isAuthenticated = false;
  }

  async login(email, password) {
    try {
      // Get initial cookies and CSRF token
      const initialResponse = await fetch(LOGIN_URL, {
        method: 'GET',
        redirect: 'manual'
      });

      const setCookies = initialResponse.headers.getSetCookie?.() || [];
      for (const cookie of setCookies) {
        await this.cookieJar.setCookie(cookie, LOGIN_URL);
      }

      // Extract csrftoken from cookies
      const cookies = await this.cookieJar.getCookies(LOGIN_URL);
      const csrfToken = cookies.find(c => c.key === 'csrftoken')?.value;

      if (!csrfToken) {
        throw new Error('Could not get CSRF token');
      }

      // Perform login
      const formData = new URLSearchParams({
        login: email,
        password: password,
        app: 'plfpl-web',
        redirect_uri: 'https://fantasy.premierleague.com/'
      });

      const loginResponse = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies.map(c => `${c.key}=${c.value}`).join('; '),
          'X-CSRFToken': csrfToken,
          'Referer': LOGIN_URL
        },
        body: formData.toString(),
        redirect: 'manual'
      });

      const loginCookies = loginResponse.headers.getSetCookie?.() || [];
      for (const cookie of loginCookies) {
        await this.cookieJar.setCookie(cookie, LOGIN_URL);
      }

      // Check if we got sessionid cookie (indicates successful login)
      const allCookies = await this.cookieJar.getCookies(FPL_BASE_URL);
      this.isAuthenticated = allCookies.some(c => c.key === 'sessionid');

      return this.isAuthenticated;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  async fetchWithAuth(url) {
    const cookies = await this.cookieJar.getCookies(url);
    const cookieString = cookies.map(c => `${c.key}=${c.value}`).join('; ');

    const response = await fetch(url, {
      headers: {
        'Cookie': cookieString
      }
    });

    return response.json();
  }

  // Get all static data (players, teams, gameweeks)
  async getBootstrapStatic() {
    const response = await fetch(`${FPL_BASE_URL}/bootstrap-static/`);
    return response.json();
  }

  // Get all fixtures
  async getFixtures() {
    const response = await fetch(`${FPL_BASE_URL}/fixtures/`);
    return response.json();
  }

  // Get team info (public endpoint)
  async getTeamInfo(teamId) {
    const response = await fetch(`${FPL_BASE_URL}/entry/${teamId}/`);
    return response.json();
  }

  // Get current squad - try authenticated first, fall back to public endpoint
  async getMyTeam(teamId) {
    // First try the authenticated endpoint
    if (this.isAuthenticated) {
      try {
        const result = await this.fetchWithAuth(`${FPL_BASE_URL}/my-team/${teamId}/`);
        if (result.picks) return result;
      } catch (e) {
        console.log('Auth endpoint failed, trying public endpoint');
      }
    }

    // Fall back to public picks endpoint (current gameweek)
    const currentGw = await this.getCurrentGameweek();
    const [picksResponse, historyResponse] = await Promise.all([
      fetch(`${FPL_BASE_URL}/entry/${teamId}/event/${currentGw}/picks/`),
      fetch(`${FPL_BASE_URL}/entry/${teamId}/history/`)
    ]);

    const picksData = await picksResponse.json();
    const historyData = await historyResponse.json();

    // Calculate free transfers from history
    // FPL 2024/25 rules: 1 FT per week, max 5, resets to 1 if you use more than you have
    const freeTransfers = this.calculateFreeTransfers(historyData.current || []);

    // Get transfer info from picks data if available
    const eventTransfers = picksData.entry_history?.event_transfers || 0;
    const bank = picksData.entry_history?.bank || 0;

    // Transform to match my-team format
    return {
      picks: picksData.picks || [],
      chips: [],
      transfers: {
        limit: freeTransfers,
        made: eventTransfers,
        bank: bank
      },
      entry_history: picksData.entry_history
    };
  }

  // Calculate free transfers based on gameweek history
  calculateFreeTransfers(gwHistory) {
    if (!gwHistory || gwHistory.length === 0) return 1;

    let freeTransfers = 1; // Start with 1

    for (let i = 0; i < gwHistory.length; i++) {
      const gw = gwHistory[i];
      const transfersMade = gw.event_transfers || 0;
      const hitsTaken = gw.event_transfers_cost > 0;

      if (hitsTaken) {
        // If took a hit, reset to 1 after this GW
        freeTransfers = 1;
      } else if (transfersMade > 0) {
        // Used some/all free transfers, calculate remaining + 1 for next week
        freeTransfers = Math.min(5, freeTransfers - transfersMade + 1);
        if (freeTransfers < 1) freeTransfers = 1;
      } else {
        // No transfers made, accumulate (max 5)
        freeTransfers = Math.min(5, freeTransfers + 1);
      }
    }

    return freeTransfers;
  }

  // Get team history (public endpoint)
  async getTeamHistory(teamId) {
    const response = await fetch(`${FPL_BASE_URL}/entry/${teamId}/history/`);
    return response.json();
  }

  // Get live gameweek data
  async getLiveGameweek(gameweek) {
    const response = await fetch(`${FPL_BASE_URL}/event/${gameweek}/live/`);
    return response.json();
  }

  // Get player detailed stats
  async getPlayerDetails(playerId) {
    const response = await fetch(`${FPL_BASE_URL}/element-summary/${playerId}/`);
    return response.json();
  }

  // Make transfers (requires auth)
  async makeTransfers(teamId, transfers, wildcard = false, freeHit = false) {
    const cookies = await this.cookieJar.getCookies(FPL_BASE_URL);
    const cookieString = cookies.map(c => `${c.key}=${c.value}`).join('; ');
    const csrfToken = cookies.find(c => c.key === 'csrftoken')?.value;

    const payload = {
      chip: wildcard ? 'wildcard' : (freeHit ? 'freehit' : null),
      entry: teamId,
      event: await this.getCurrentGameweek(),
      transfers: transfers.map(t => ({
        element_in: t.playerIn,
        element_out: t.playerOut,
        purchase_price: t.purchasePrice,
        selling_price: t.sellingPrice
      }))
    };

    const response = await fetch(`${FPL_BASE_URL}/transfers/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
        'X-CSRFToken': csrfToken,
        'Referer': 'https://fantasy.premierleague.com/transfers'
      },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  // Set captain and vice-captain
  async setCaptain(teamId, captainId, viceCaptainId) {
    const myTeam = await this.getMyTeam(teamId);
    const picks = myTeam.picks.map(p => ({
      ...p,
      is_captain: p.element === captainId,
      is_vice_captain: p.element === viceCaptainId
    }));

    const cookies = await this.cookieJar.getCookies(FPL_BASE_URL);
    const cookieString = cookies.map(c => `${c.key}=${c.value}`).join('; ');
    const csrfToken = cookies.find(c => c.key === 'csrftoken')?.value;

    const response = await fetch(`${FPL_BASE_URL}/my-team/${teamId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify({ picks })
    });

    return response.json();
  }

  async getCurrentGameweek() {
    const data = await this.getBootstrapStatic();
    const currentGw = data.events.find(e => e.is_current);
    return currentGw?.id || 1;
  }

  // Helper to format player data with useful stats
  formatPlayerData(player, teams) {
    const team = teams.find(t => t.id === player.team);
    return {
      id: player.id,
      name: player.web_name,
      fullName: `${player.first_name} ${player.second_name}`,
      team: team?.short_name || 'Unknown',
      teamId: player.team,
      position: this.getPositionName(player.element_type),
      positionId: player.element_type,
      price: player.now_cost / 10,
      form: parseFloat(player.form),
      totalPoints: player.total_points,
      pointsPerGame: parseFloat(player.points_per_game),
      selectedBy: parseFloat(player.selected_by_percent),
      ictIndex: parseFloat(player.ict_index),
      expectedGoals: parseFloat(player.expected_goals || 0),
      expectedAssists: parseFloat(player.expected_assists || 0),
      expectedGoalInvolvements: parseFloat(player.expected_goal_involvements || 0),
      minutes: player.minutes,
      goals: player.goals_scored,
      assists: player.assists,
      cleanSheets: player.clean_sheets,
      status: player.status,
      news: player.news,
      newsAdded: player.news_added,
      chanceOfPlaying: player.chance_of_playing_next_round,
      photo: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photo?.replace('.jpg', '.png')}`
    };
  }

  getPositionName(positionId) {
    const positions = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' };
    return positions[positionId] || 'Unknown';
  }
}

export const fplService = new FPLService();
export default fplService;
