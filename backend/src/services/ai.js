import Anthropic from '@anthropic-ai/sdk';
import db from '../db.js';

const client = new Anthropic();
const DEMO_MODE = process.env.DEMO_MODE === 'true' || !process.env.ANTHROPIC_API_KEY;

function logReasoning(gameweek, message, type = 'info') {
  const stmt = db.prepare(
    'INSERT INTO reasoning_log (gameweek, message, type) VALUES (?, ?, ?)'
  );
  stmt.run(gameweek, message, type);
}

// Helper to add delay for realistic demo experience
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateDemoRecommendation(squadPlayers, topPlayers, gameweek, freeTransfers = 1) {
  // Clear previous reasoning for this gameweek
  const clearStmt = db.prepare('DELETE FROM reasoning_log WHERE gameweek = ?');
  clearStmt.run(gameweek);

  logReasoning(gameweek, "🤖 DEMO MODE - Simulating AI analysis...", "start");
  await delay(800);

  // Find the captain (highest form player in squad)
  const sortedByForm = [...squadPlayers]
    .filter(p => p.player)
    .sort((a, b) => (b.player?.form || 0) - (a.player?.form || 0));

  const captain = sortedByForm[0]?.player;
  const viceCaptain = sortedByForm[1]?.player;

  logReasoning(gameweek, `Evaluating ${squadPlayers.length} players in your squad...`, "thinking");
  await delay(600);

  logReasoning(gameweek, `You have ${freeTransfers} free transfer(s) available`, "info");
  await delay(400);

  // Find potential transfer targets
  const squadIds = squadPlayers.map(p => p.element);
  const potentialTargets = topPlayers
    .filter(p => !squadIds.includes(p.id) && p.form >= 4)
    .slice(0, 30);

  logReasoning(gameweek, `Found ${potentialTargets.length} high-form players not in your squad`, "info");
  await delay(500);

  // Find weakest players in squad (lowest form)
  const weakestPlayers = [...squadPlayers]
    .filter(p => p.player && p.player.form < 4)
    .sort((a, b) => (a.player?.form || 0) - (b.player?.form || 0));

  // Generate transfer recommendations up to freeTransfers count
  const transfers = [];
  const usedTargetIds = new Set();
  const usedOutIds = new Set();

  for (let i = 0; i < Math.min(freeTransfers, weakestPlayers.length); i++) {
    const weakPlayer = weakestPlayers[i]?.player;
    if (!weakPlayer || usedOutIds.has(weakPlayer.id)) continue;

    // Find best replacement for this position that we haven't already recommended
    const replacement = potentialTargets.find(p =>
      p.positionId === weakPlayer.positionId &&
      !usedTargetIds.has(p.id) &&
      p.form > weakPlayer.form + 1  // Must be significantly better
    );

    if (replacement) {
      logReasoning(gameweek, `Identified ${weakPlayer.name} (form: ${weakPlayer.form}) as potential transfer out`, "warning");
      await delay(400);
      logReasoning(gameweek, `${replacement.name} has excellent form (${replacement.form}) and good fixtures`, "insight");
      await delay(300);

      transfers.push({
        playerOut: weakPlayer.id,
        playerOutName: weakPlayer.name,
        playerIn: replacement.id,
        playerInName: replacement.name,
        reason: `${weakPlayer.name} has poor form (${weakPlayer.form}). ${replacement.name} offers better value with form of ${replacement.form} and favorable upcoming fixtures.`
      });

      usedTargetIds.add(replacement.id);
      usedOutIds.add(weakPlayer.id);
    }
  }

  if (transfers.length === 0) {
    logReasoning(gameweek, "No obvious transfer improvements found - squad looks solid", "success");
    await delay(500);
  } else if (transfers.length < freeTransfers) {
    logReasoning(gameweek, `Recommending ${transfers.length} of ${freeTransfers} available transfers - quality over quantity`, "info");
    await delay(400);
  }

  // Generate insights based on squad
  const insights = [];

  // Check for injuries
  const injuredPlayers = squadPlayers.filter(p => p.player?.news);
  if (injuredPlayers.length > 0) {
    insights.push(`Watch ${injuredPlayers.map(p => p.player.name).join(', ')} - injury concerns reported`);
    injuredPlayers.forEach(p => {
      logReasoning(gameweek, `⚠️ ${p.player.name}: ${p.player.news}`, "warning");
    });
    await delay(400);
  }

  // Best performers
  const topPerformers = sortedByForm.slice(0, 3).map(p => p.player?.name).filter(Boolean);
  if (topPerformers.length > 0) {
    insights.push(`Your top performers: ${topPerformers.join(', ')}`);
    logReasoning(gameweek, `Top form in your squad: ${topPerformers.join(', ')}`, "insight");
    await delay(400);
  }

  // Captain reasoning
  if (captain) {
    logReasoning(gameweek, `Recommending ${captain.name} as captain - highest form (${captain.form}) in squad`, "captain");
    insights.push(`${captain.name} is the standout captain choice with ${captain.form} form rating`);
    await delay(500);
  }

  // Demo chip advice
  logReasoning(gameweek, "Evaluating chip strategy...", "thinking");
  await delay(500);
  logReasoning(gameweek, "💎 All chips available - saving for optimal gameweeks", "insight");

  const recommendation = {
    transfers,
    captain: captain ? {
      id: captain.id,
      name: captain.name,
      reason: `Best form in squad (${captain.form}) with ${captain.totalPoints} total points this season`
    } : null,
    viceCaptain: viceCaptain ? {
      id: viceCaptain.id,
      name: viceCaptain.name,
      reason: `Second highest form (${viceCaptain.form}) - reliable backup option`
    } : null,
    chipAdvice: {
      useThisWeek: null,
      reasoning: "No blank or double gameweeks detected. Save chips for better opportunities - typically around GW18-19 and GW25-30 when fixture congestion causes blanks/doubles.",
      futureStrategy: "Hold Wildcard for fixture swings, Free Hit for blank GWs, Bench Boost & Triple Captain for double GWs when your players have two games."
    },
    confidence: transfers.length > 0 ? "medium" : "high",
    summary: transfers.length > 0
      ? `Found ${transfers.length} recommended transfer(s) to improve your squad. ${captain?.name} is the top captain pick based on current form.`
      : `Your squad is in good shape! No urgent transfers needed. ${captain?.name} remains the best captain option.`,
    keyInsights: insights
  };

  return recommendation;
}

export async function analyzeTeam({
  currentSquad,
  allPlayers,
  fixtures,
  budget,
  freeTransfers,
  gameweek,
  maxHits = -8,
  chipsAvailable = ['wildcard', 'freehit', 'benchboost', 'triplecaptain'],
  chipsUsed = []
}) {
  logReasoning(gameweek, "Starting team analysis...", "start");
  logReasoning(gameweek, `Current budget: £${budget.toFixed(1)}m, Free transfers: ${freeTransfers}`, "info");

  // Get top players by form for analysis
  const topPlayers = allPlayers
    .filter(p => p.status === 'a' || p.status === 'd') // available or doubtful
    .sort((a, b) => b.form - a.form)
    .slice(0, 100);

  // Get current squad player details
  const squadPlayers = currentSquad.map(sq => {
    const player = allPlayers.find(p => p.id === sq.element);
    return { ...sq, player };
  });

  // Get upcoming fixtures for next 5 gameweeks
  const upcomingFixtures = fixtures.filter(f =>
    f.event >= gameweek && f.event <= gameweek + 5
  );

  // Build fixture difficulty map
  const fixtureDifficulty = {};
  upcomingFixtures.forEach(f => {
    if (!fixtureDifficulty[f.team_h]) fixtureDifficulty[f.team_h] = [];
    if (!fixtureDifficulty[f.team_a]) fixtureDifficulty[f.team_a] = [];
    fixtureDifficulty[f.team_h].push({ gw: f.event, difficulty: f.team_h_difficulty, home: true, opponent: f.team_a });
    fixtureDifficulty[f.team_a].push({ gw: f.event, difficulty: f.team_a_difficulty, home: false, opponent: f.team_h });
  });

  // Find players with injury concerns in squad
  const injuredPlayers = squadPlayers.filter(p =>
    p.player?.news || p.player?.chanceOfPlaying < 75
  );

  if (injuredPlayers.length > 0) {
    logReasoning(gameweek, `Found ${injuredPlayers.length} player(s) with injury concerns`, "warning");
    injuredPlayers.forEach(p => {
      logReasoning(gameweek, `⚠️ ${p.player?.name}: ${p.player?.news || 'Chance of playing: ' + p.player?.chanceOfPlaying + '%'}`, "warning");
    });
  }

  // Detect blank/double gameweeks from fixtures
  const gwFixtureCounts = {};
  for (let gw = gameweek; gw <= gameweek + 10; gw++) {
    gwFixtureCounts[gw] = {};
    fixtures.filter(f => f.event === gw).forEach(f => {
      gwFixtureCounts[gw][f.team_h] = (gwFixtureCounts[gw][f.team_h] || 0) + 1;
      gwFixtureCounts[gw][f.team_a] = (gwFixtureCounts[gw][f.team_a] || 0) + 1;
    });
  }

  // Find GWs with blanks or doubles
  const specialGws = [];
  for (const [gw, teams] of Object.entries(gwFixtureCounts)) {
    const doubles = Object.entries(teams).filter(([t, c]) => c >= 2).length;
    const blanks = 20 - Object.keys(teams).length; // 20 teams total
    if (doubles > 0 || blanks > 0) {
      specialGws.push({ gw: parseInt(gw), doubles, blanks });
    }
  }

  const prompt = `You are an expert Fantasy Premier League manager. Analyze the current team and recommend transfers, captain picks, AND chip strategy.

## Current Squad (GW${gameweek})
Budget: £${budget.toFixed(1)}m | Free Transfers: ${freeTransfers}
${squadPlayers.map(p => `- ${p.player?.name} (${p.player?.position}, ${p.player?.team}) - Form: ${p.player?.form}, Points: ${p.player?.totalPoints}, Price: £${p.player?.price}m${p.player?.news ? ` [NEWS: ${p.player.news}]` : ''}`).join('\n')}

## Top Available Players by Form
${topPlayers.slice(0, 30).map(p => `- ${p.name} (${p.position}, ${p.team}) - Form: ${p.form}, Points: ${p.totalPoints}, Price: £${p.price}m, xGI: ${p.expectedGoalInvolvements.toFixed(2)}${p.news ? ` [NEWS: ${p.news}]` : ''}`).join('\n')}

## Fixture Difficulty (Next 5 GWs)
Teams with easy fixtures (FDR 2 or less):
${Object.entries(fixtureDifficulty)
  .filter(([teamId, fixtures]) => fixtures.slice(0, 3).every(f => f.difficulty <= 2))
  .map(([teamId, fixtures]) => `- Team ${teamId}: ${fixtures.slice(0, 5).map(f => `GW${f.gw}(${f.difficulty}${f.home ? 'H' : 'A'})`).join(', ')}`)
  .slice(0, 10)
  .join('\n')}

## Special Gameweeks Detected
${specialGws.length > 0 ? specialGws.map(s => `- GW${s.gw}: ${s.doubles} teams with doubles, ${s.blanks} teams blanking`).join('\n') : 'No blank or double gameweeks detected in next 10 GWs'}

## Chips Available
${chipsAvailable.map(c => `- ${c.toUpperCase()}`).join('\n')}
${chipsUsed.length > 0 ? `\nChips already used: ${chipsUsed.join(', ')}` : ''}

## Chip Strategy Guide
- WILDCARD: Best used when team needs 4+ transfers, or before a good fixture run. Save one for late season.
- FREE HIT: Best for blank gameweeks (when many teams don't play) - build a one-week team.
- BENCH BOOST: Best for double gameweeks when your bench has good fixtures too.
- TRIPLE CAPTAIN: Best for a double gameweek with a premium captain playing twice, or exceptional single GW fixture.

## Constraints
- Free transfers available: ${freeTransfers} (use them or lose them - they cap at 5!)
- Max point hits allowed: ${maxHits} (each extra transfer beyond free costs -4 points)
- Must maintain valid squad: 2 GKP, 5 DEF, 5 MID, 3 FWD
- Max 3 players from same team
- Transfers must be within budget

## Transfer Strategy
With ${freeTransfers} free transfers available, consider making multiple moves if beneficial.
Don't waste free transfers - if you have 5 FTs, making 0 transfers means you lose 4 of them.
Recommend UP TO ${freeTransfers} transfers if there are clear improvements to be made.

## Task
Analyze the team and provide recommendations in this exact JSON format:
{
  "transfers": [
    {"playerOut": <id>, "playerOutName": "<name>", "playerIn": <id>, "playerInName": "<name>", "reason": "<brief reason>"}
  ],
  "captain": {"id": <id>, "name": "<name>", "reason": "<brief reason>"},
  "viceCaptain": {"id": <id>, "name": "<name>", "reason": "<brief reason>"},
  "chipAdvice": {
    "useThisWeek": null | "wildcard" | "freehit" | "benchboost" | "triplecaptain",
    "reasoning": "<why or why not to use a chip this week>",
    "futureStrategy": "<brief advice on when to use remaining chips>"
  },
  "confidence": "high" | "medium" | "low",
  "summary": "<2-3 sentence summary of your analysis>",
  "keyInsights": ["<insight 1>", "<insight 2>", "<insight 3>"]
}

If no transfers are recommended, use an empty array for transfers.
If no chip should be used this week, set useThisWeek to null.
Focus on form, fixtures, and value. Be strategic about chip usage - don't waste them!`;

  logReasoning(gameweek, "Analyzing player form and fixture difficulty...", "thinking");

  try {
    let recommendation;

    if (DEMO_MODE) {
      // Demo mode - simulate AI analysis with realistic delays and responses
      recommendation = await generateDemoRecommendation(squadPlayers, topPlayers, gameweek, freeTransfers);
    } else {
      const response = await client.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0].text;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response');
      }

      recommendation = JSON.parse(jsonMatch[0]);
    }

    // Log key insights
    logReasoning(gameweek, "Analysis complete!", "success");
    recommendation.keyInsights?.forEach(insight => {
      logReasoning(gameweek, insight, "insight");
    });

    if (recommendation.transfers?.length > 0) {
      recommendation.transfers.forEach(t => {
        logReasoning(gameweek, `📝 Transfer: ${t.playerOutName} → ${t.playerInName}`, "transfer");
        logReasoning(gameweek, `   Reason: ${t.reason}`, "info");
      });
    } else {
      logReasoning(gameweek, "No transfers recommended - team looks solid!", "success");
    }

    logReasoning(gameweek, `👑 Captain: ${recommendation.captain.name} - ${recommendation.captain.reason}`, "captain");
    logReasoning(gameweek, `🥈 Vice: ${recommendation.viceCaptain.name} - ${recommendation.viceCaptain.reason}`, "info");

    // Store decision in database
    const stmt = db.prepare(`
      INSERT INTO decisions (gameweek, transfers, captain, vice_captain, reasoning, confidence)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      gameweek,
      JSON.stringify(recommendation.transfers),
      recommendation.captain.id,
      recommendation.viceCaptain.id,
      recommendation.summary,
      recommendation.confidence
    );

    return recommendation;
  } catch (error) {
    logReasoning(gameweek, `Error during analysis: ${error.message}`, "error");
    throw error;
  }
}

export function getReasoningLog(gameweek, limit = 50) {
  const stmt = db.prepare(`
    SELECT * FROM reasoning_log
    WHERE gameweek = ? OR gameweek IS NULL
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(gameweek, limit);
}

export function getLatestDecision(gameweek) {
  const stmt = db.prepare(`
    SELECT * FROM decisions
    WHERE gameweek = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return stmt.get(gameweek);
}
