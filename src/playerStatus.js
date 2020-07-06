const none = "none";
const finding = "finding";
const inMatch = "inMatch";

export default class PlayerStatus {
	constructor() {
		this.players = new Map();
	}

	get(id) {
		return this.players.get(id) || { status: none };
	}

	none(id) {
		this.players.set(id, {
			status: none,
		})
	}

	finding(id) {
		this.players.set(id, {
			status: finding,
		});
	}

	inMatch(id, matchId) {
		this.players.set(id, {
			status: inMatch,
			matchId: matchId,
		});
	}
}