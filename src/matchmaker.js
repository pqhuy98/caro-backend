import _ from "lodash";
import debug from "debug";
var log = debug("caro:match-maker");

export default class MatchMaker {
	constructor(options) {
		let { foundMatch, playerStatus } = options;
		this.foundMatch = foundMatch || _.noop;
		this.playerStatus = playerStatus || {};
		this.blackList = new Set(); // Players who can't join queue
		this.queue = new Set(); // store player Ids whose are in queue waiting for a match
	}


	join(playerId) {
		if (this.blackList.has(playerId)) {
			return false;
		}
		if (!this.queue.has(playerId)) {
			log("join " + playerId)
			this.queue.add(playerId);
			this.playerStatus.finding && this.playerStatus.finding(playerId);
			this.makeMatch();
			// setTimeout(() => this.makeMatch(), 0);
		}
		return true;
	}

	leave(playerId) {
		if (this.queue.has(playerId)) {
			log("leave " + playerId)
			this.queue.delete(playerId);
			this.playerStatus.none && this.playerStatus.none(playerId);
		}
		return true;
	}

	forbid(playerId) {
		if (!this.blackList.has(playerId)) {
			log("forbid " + playerId)
			this.blackList.add(playerId);
		}
		return true;
	}

	allow(playerId) {
		if (this.blackList.has(playerId)) {
			log("allow " + playerId)
			this.blackList.delete(playerId);
		}
		return true;
	}

	makeMatch() {
		let players = Array.from(this.queue);
		for(let i = 0; i+1 < players.length; i+=2) {
			// There are player to match
			let p1 = players[i];
			let p2 = players[i+1];
			log("match " + p1 + " " + p2);
			this.leave(p1);
			this.leave(p2);
			this.forbid(p1);
			this.forbid(p2);
			this.foundMatch([p1, p2]);
		}
	}
}