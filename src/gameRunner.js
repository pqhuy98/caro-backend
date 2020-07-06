import _ from "lodash";
import Game from "caro-core/dist";

export default class GameRunner {
	constructor(options) {
		this.games = new Map();
	}

	has(matchId) {
		return this.games.has(matchId);
	}

	newGame(playerIds, settings) {
		let game = new Game(..._.shuffle(playerIds));
		this.games.set(game.id, game);
		return game.id;
	}

	latest(matchId) {
		if (this.games.has(matchId)) {
			return this.games.get(matchId);
		} else {
			return new Error("Match not found.");
		}
	}

	act(matchId, action) {
		if (this.games.has(matchId)) {
			let game = this.games.get(matchId);
			let next = game.act(action);
			if (next === null) {
				return new Error("Invalid action.");
			} else {
				this.games.set(matchId, next);
				if (next.gameOver) {
					// game over
					// close the game in 60 seconds.
					setTimeout(() => {
						this.games.delete(matchId);
					}, 60 * 1000);
				}
				return null;
			}
		} else {
			return new Error("Game not found.");
		}
	}
}