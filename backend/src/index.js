import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './db.js';
import fplService from './services/fpl.js';
import { analyzeTeam, getReasoningLog, getLatestDecision } from './services/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', authenticated: fplService.isAuthenticated });
});

// Login to FPL
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = process.env.FPL_EMAIL;
    const password = process.env.FPL_PASSWORD;

    if (!email || !password) {
      return res.status(400).json({ error: 'FPL credentials not configured' });
    }

    const success = await fplService.login(email, password);
    res.json({ success, message: success ? 'Logged in successfully' : 'Login failed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bootstrap data (players, teams, gameweeks)
app.get('/api/bootstrap', async (req, res) => {
  try {
    const data = await fplService.getBootstrapStatic();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all players with formatted data
app.get('/api/players', async (req, res) => {
  try {
    const data = await fplService.getBootstrapStatic();
    const players = data.elements.map(p => fplService.formatPlayerData(p, data.teams));
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get fixtures
app.get('/api/fixtures', async (req, res) => {
  try {
    const fixtures = await fplService.getFixtures();
    res.json(fixtures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current gameweek
app.get('/api/gameweek', async (req, res) => {
  try {
    const data = await fplService.getBootstrapStatic();
    const current = data.events.find(e => e.is_current);
    const next = data.events.find(e => e.is_next);
    res.json({ current, next, events: data.events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my team
app.get('/api/my-team', async (req, res) => {
  try {
    const teamId = process.env.FPL_TEAM_ID;
    if (!teamId) {
      return res.status(400).json({ error: 'FPL_TEAM_ID not configured' });
    }

    const [myTeam, teamInfo, bootstrap] = await Promise.all([
      fplService.getMyTeam(teamId),
      fplService.getTeamInfo(teamId),
      fplService.getBootstrapStatic()
    ]);

    // Enrich picks with player data
    const enrichedPicks = myTeam.picks.map(pick => {
      const player = bootstrap.elements.find(p => p.id === pick.element);
      return {
        ...pick,
        player: player ? fplService.formatPlayerData(player, bootstrap.teams) : null
      };
    });

    res.json({
      picks: enrichedPicks,
      chips: myTeam.chips,
      transfers: myTeam.transfers,
      teamInfo,
      bank: (teamInfo.last_deadline_bank || 0) / 10,
      value: (teamInfo.last_deadline_value || 0) / 10
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team history
app.get('/api/my-team/history', async (req, res) => {
  try {
    const teamId = process.env.FPL_TEAM_ID;
    if (!teamId) {
      return res.status(400).json({ error: 'FPL_TEAM_ID not configured' });
    }

    const history = await fplService.getTeamHistory(teamId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const teamId = process.env.FPL_TEAM_ID;
    if (!teamId) {
      return res.status(400).json({ error: 'FPL_TEAM_ID not configured' });
    }

    const [myTeam, teamInfo, bootstrap, fixtures, history] = await Promise.all([
      fplService.getMyTeam(teamId),
      fplService.getTeamInfo(teamId),
      fplService.getBootstrapStatic(),
      fplService.getFixtures(),
      fplService.getTeamHistory(teamId)
    ]);

    const currentGw = bootstrap.events.find(e => e.is_current)?.id || 1;
    const nextGw = bootstrap.events.find(e => e.is_next)?.id || currentGw + 1;

    const allPlayers = bootstrap.elements.map(p =>
      fplService.formatPlayerData(p, bootstrap.teams)
    );

    // Determine which chips have been used
    const chipsUsed = (history.chips || []).map(c => c.name);
    const allChips = ['wildcard', 'freehit', 'bboost', 'triplecaptain'];
    // Note: You get 2 wildcards (one before GW20, one after), but API just shows 'wildcard'
    const chipsAvailable = allChips.filter(c => {
      if (c === 'wildcard') {
        // Check if wildcard was used this half of season
        const wcUsed = history.chips?.filter(ch => ch.name === 'wildcard') || [];
        return wcUsed.length < 2; // Can use 2 total
      }
      return !chipsUsed.includes(c);
    });

    const recommendation = await analyzeTeam({
      currentSquad: myTeam.picks,
      allPlayers,
      fixtures,
      budget: (teamInfo.last_deadline_bank || 0) / 10,
      freeTransfers: myTeam.transfers?.limit || 1,
      gameweek: nextGw,
      maxHits: parseInt(process.env.MAX_HITS) || -8,
      chipsAvailable,
      chipsUsed
    });

    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI reasoning log
app.get('/api/reasoning', async (req, res) => {
  try {
    const bootstrap = await fplService.getBootstrapStatic();
    const currentGw = bootstrap.events.find(e => e.is_current)?.id || 1;
    const nextGw = bootstrap.events.find(e => e.is_next)?.id || currentGw + 1;
    // Use nextGw since analysis is always for the upcoming gameweek
    const log = getReasoningLog(nextGw);
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get latest decision
app.get('/api/decision', async (req, res) => {
  try {
    const bootstrap = await fplService.getBootstrapStatic();
    const currentGw = bootstrap.events.find(e => e.is_current)?.id || 1;
    const decision = getLatestDecision(currentGw);
    res.json(decision || { message: 'No decision yet for this gameweek' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute transfers
app.post('/api/transfers/execute', async (req, res) => {
  try {
    const { transfers, chip } = req.body;
    const teamId = process.env.FPL_TEAM_ID;

    if (!teamId) {
      return res.status(400).json({ error: 'FPL_TEAM_ID not configured' });
    }

    if (!transfers || transfers.length === 0) {
      return res.status(400).json({ error: 'No transfers provided' });
    }

    // Check if authenticated
    if (!fplService.isAuthenticated) {
      // Try to login first
      const email = process.env.FPL_EMAIL;
      const password = process.env.FPL_PASSWORD;
      if (email && password) {
        const loginSuccess = await fplService.login(email, password);
        if (!loginSuccess) {
          return res.status(401).json({
            error: 'FPL authentication failed. Please check credentials.',
            requiresAuth: true
          });
        }
      } else {
        return res.status(401).json({
          error: 'FPL credentials not configured',
          requiresAuth: true
        });
      }
    }

    // Get player data to fetch current prices
    const bootstrap = await fplService.getBootstrapStatic();
    const [myTeam, history] = await Promise.all([
      fplService.getMyTeam(teamId),
      fplService.getTeamHistory(teamId)
    ]);

    // Build transfers with prices
    const transfersWithPrices = transfers.map(t => {
      const playerIn = bootstrap.elements.find(p => p.id === t.playerIn);
      const playerOut = bootstrap.elements.find(p => p.id === t.playerOut);

      // Get selling price from current squad (may have profit/loss)
      const squadPlayer = myTeam.picks.find(p => p.element === t.playerOut);
      const sellingPrice = squadPlayer?.selling_price || playerOut?.now_cost || 0;

      return {
        playerIn: t.playerIn,
        playerOut: t.playerOut,
        purchasePrice: playerIn?.now_cost || 0,
        sellingPrice: sellingPrice
      };
    });

    // Determine chip usage
    const useWildcard = chip === 'wildcard';
    const useFreeHit = chip === 'freehit';

    const result = await fplService.makeTransfers(
      teamId,
      transfersWithPrices,
      useWildcard,
      useFreeHit
    );

    // Check for errors in FPL response
    if (result.error || result.errors) {
      return res.status(400).json({
        error: 'Transfer failed',
        details: result.error || result.errors
      });
    }

    res.json({
      success: true,
      message: `Successfully executed ${transfers.length} transfer(s)`,
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leagues data with full standings for private leagues
app.get('/api/leagues', async (req, res) => {
  try {
    const teamId = process.env.FPL_TEAM_ID;
    if (!teamId) {
      return res.status(400).json({ error: 'FPL_TEAM_ID not configured' });
    }

    const teamInfo = await fplService.getTeamInfo(teamId);
    const leagues = teamInfo.leagues?.classic || [];

    // Get private leagues and fetch their full standings
    const privateLeagues = leagues.filter(l => l.league_type !== 's');

    const leaguesWithStandings = await Promise.all(
      privateLeagues.map(async (league) => {
        try {
          const standingsRes = await fetch(
            `https://fantasy.premierleague.com/api/leagues-classic/${league.id}/standings/`
          );
          const standingsData = await standingsRes.json();

          return {
            id: league.id,
            name: league.name,
            myRank: league.entry_rank,
            totalTeams: league.rank_count,
            standings: standingsData.standings?.results?.map(entry => ({
              rank: entry.rank,
              lastRank: entry.last_rank,
              movement: entry.last_rank - entry.rank,
              playerName: entry.player_name,
              teamName: entry.entry_name,
              totalPoints: entry.total,
              gwPoints: entry.event_total,
              isMe: entry.entry === parseInt(teamId)
            })) || []
          };
        } catch (e) {
          return {
            id: league.id,
            name: league.name,
            myRank: league.entry_rank,
            totalTeams: league.rank_count,
            standings: []
          };
        }
      })
    );

    res.json(leaguesWithStandings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get performance history from DB
app.get('/api/performance', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM performance ORDER BY gameweek ASC');
    const performance = stmt.all();
    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all decisions
app.get('/api/decisions', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM decisions ORDER BY created_at DESC LIMIT 20');
    const decisions = stmt.all();
    res.json(decisions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`FPL Analyzer backend running on port ${PORT}`);
  console.log(`Team ID: ${process.env.FPL_TEAM_ID || 'Not configured'}`);
});
