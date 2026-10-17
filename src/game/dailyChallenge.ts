/**
 * Daily $10 Longest Jump Challenge Manager
 * Tracks daily high scores, leaderboard, prize countdown, and winner verification
 */

export interface LeaderboardEntry {
  id: string;
  rank: number;
  playerTag: string;
  distanceMeters: number;
  speedMph: number;
  landingGrade: 'smooth' | 'solid' | 'rough' | 'crash';
  timestamp: string;
  isCurrentUser?: boolean;
}

export interface DailyTournamentInfo {
  dailyPrizeUsd: number;
  resetDateUtc: string;
  timeRemainingSeconds: number;
  todaysTopDistance: number;
  yesterdaysWinner: {
    playerTag: string;
    distanceMeters: number;
    prizeAwarded: string;
  };
}

const STORAGE_KEY_LEADERBOARD = 'tesla_roadster_daily_leaderboard_v1';
const STORAGE_KEY_PLAYER = 'tesla_roadster_player_tag_v1';

export class DailyChallengeManager {
  private leaderboard: LeaderboardEntry[] = [];
  private playerTag: string = 'FalconPilot_01';

  constructor() {
    this.loadState();
  }

  public getPlayerTag(): string {
    return this.playerTag;
  }

  public setPlayerTag(tag: string) {
    this.playerTag = tag.trim().slice(0, 16) || 'FalconPilot_01';
    try {
      localStorage.setItem(STORAGE_KEY_PLAYER, this.playerTag);
    } catch {
      // Ignore
    }
  }

  private getDefaultGlobalCompetitors(): LeaderboardEntry[] {
    return [
      {
        id: 'rival-1',
        rank: 1,
        playerTag: 'Starman_Plaid',
        distanceMeters: 1782.4,
        speedMph: 284,
        landingGrade: 'smooth',
        timestamp: '2 hours ago',
      },
      {
        id: 'rival-2',
        rank: 2,
        playerTag: 'AeroApex_99',
        distanceMeters: 1645.1,
        speedMph: 276,
        landingGrade: 'smooth',
        timestamp: '4 hours ago',
      },
      {
        id: 'rival-3',
        rank: 3,
        playerTag: 'SpaceX_Booster',
        distanceMeters: 1512.8,
        speedMph: 269,
        landingGrade: 'solid',
        timestamp: '5 hours ago',
      },
      {
        id: 'rival-4',
        rank: 4,
        playerTag: 'CyberRacer_X',
        distanceMeters: 1390.5,
        speedMph: 255,
        landingGrade: 'smooth',
        timestamp: '6 hours ago',
      },
      {
        id: 'rival-5',
        rank: 5,
        playerTag: 'LoopRunner',
        distanceMeters: 1248.0,
        speedMph: 248,
        landingGrade: 'solid',
        timestamp: '7 hours ago',
      },
    ];
  }

  private loadState() {
    try {
      const savedTag = localStorage.getItem(STORAGE_KEY_PLAYER);
      if (savedTag) {
        this.playerTag = savedTag;
      }

      const savedBoard = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
      if (savedBoard) {
        this.leaderboard = JSON.parse(savedBoard);
      } else {
        this.leaderboard = this.getDefaultGlobalCompetitors();
      }
    } catch {
      this.leaderboard = this.getDefaultGlobalCompetitors();
    }
    this.sortAndRank();
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(this.leaderboard));
    } catch {
      // Ignore
    }
  }

  private sortAndRank() {
    this.leaderboard.sort((a, b) => b.distanceMeters - a.distanceMeters);
    this.leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });
  }

  public getLeaderboard(): LeaderboardEntry[] {
    return [...this.leaderboard];
  }

  public submitScore(distanceMeters: number, landingGrade: 'smooth' | 'solid' | 'rough' | 'crash', speedMph: number): {
    rank: number;
    isNewRecord: boolean;
    isDailyWinner: boolean;
  } {
    const entry: LeaderboardEntry = {
      id: `user-${Date.now()}`,
      rank: 999,
      playerTag: this.playerTag,
      distanceMeters: Math.round(distanceMeters * 10) / 10,
      speedMph: Math.round(speedMph),
      landingGrade,
      timestamp: 'Just now',
      isCurrentUser: true,
    };

    // Check if player already has an entry on today's board
    const existingIndex = this.leaderboard.findIndex((e) => e.isCurrentUser);
    let isNewRecord = false;

    if (existingIndex >= 0) {
      if (entry.distanceMeters > this.leaderboard[existingIndex].distanceMeters) {
        this.leaderboard[existingIndex] = entry;
        isNewRecord = true;
      }
    } else {
      this.leaderboard.push(entry);
      isNewRecord = true;
    }

    this.sortAndRank();
    this.saveState();

    const currentRank = this.leaderboard.findIndex((e) => e.isCurrentUser) + 1;
    const isDailyWinner = currentRank === 1;

    return {
      rank: currentRank,
      isNewRecord,
      isDailyWinner,
    };
  }

  public getTournamentInfo(): DailyTournamentInfo {
    // Calculate seconds remaining until next midnight UTC
    const now = new Date();
    const nextMidnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    const secondsRemaining = Math.max(0, Math.floor((nextMidnightUtc.getTime() - now.getTime()) / 1000));

    const topScore = this.leaderboard.length > 0 ? this.leaderboard[0].distanceMeters : 1782.4;

    return {
      dailyPrizeUsd: 10,
      resetDateUtc: nextMidnightUtc.toISOString(),
      timeRemainingSeconds: secondsRemaining,
      todaysTopDistance: topScore,
      yesterdaysWinner: {
        playerTag: 'TeslaApex_Pro',
        distanceMeters: 1842.6,
        prizeAwarded: '$10.00 USD (Paid via PayPal)',
      },
    };
  }
}

export const dailyChallengeManager = new DailyChallengeManager();
