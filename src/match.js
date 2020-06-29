import _ from "lodash";
import Communicator from "~/src/communicator";
import Game from "caro-core/dist";

const JOIN = "JOIN";
const LATEST = "LATEST";
const ACTION = "ACTION";
const ABANDON = "ABANDON";
const DISCONNECT = "DISCONNECT";

export default class Match {
	constructor(playerIds, abandonCallback) {
		this.game = new Game(..._.shuffle(playerIds));
		this.comm = new Communicator;
		this.abandonCallback = abandonCallback;
	}

	connect(socket) {
		console.log("match connect", socket.playerId);
		this.comm.addConnection(socket);
		this.comm.broadcast(JOIN, socket.playerId);

		// Send latest
		let data = JSON.stringify(this.game);
		socket.emit(LATEST, data);

		socket.on(ACTION, (data) => {
			let action = JSON.parse(data);
			action.playerId = socket.playerId;
			let next = this.game.act(action);
			console.log("\n\n");
			console.log("game", this.game);
			console.log("ACTION", action);
			console.log("next", next);
			if (next) {
				Object.assign(this.game, next);
				this.comm.broadcast(ACTION, JSON.stringify(action));
			}
		});
		socket.on(ABANDON, (data, callback) => {
			if (callback) {
				callback("OK");
			}
			this.comm.broadcast(ABANDON, socket.playerId);
			socket.disconnect();
			this.abandonCallback(socket.playerId, this.game);
		});
		socket.on("disconnect", () => {
			this.comm.removeConnection(socket);
			this.comm.broadcast(DISCONNECT, socket.playerId);
		})
	}
}