import Game from "caro-core/dist";
import express from "express";
import cors from "cors";
import http from "http";
import socketIO from "socket.io";
import requireAuth from "socketio-auth";
import { v4 as uuidv4 } from "uuid";
import GameRunner from "~/src/gameRunner";
import MatchMaker from "~/src/matchMaker";
import PlayerStatus from "~/src/playerStatus";
import SingleConnection from "~/src/singleConnection";
import _ from "lodash";
import debug from "debug";

const log = debug("caro:index");

// Networking

const app = express();
app.use(cors());
app.get("/status/:playerId", (req, res) => {
	res.send(JSON.stringify(playerStatus.get(req.params.playerId)));
})
const server = http.createServer(app);

// Socket IO

const io = socketIO().attach(server);
const matchMaking = io.of("/match-making")
const gameBroadcast = io.of("/playing");

let authOptions = (singleConnection) => {
	let sc = null;
	if (singleConnection) {
		sc = new SingleConnection();
	}
	return {
		authenticate: function(socket, data, callback) {
			let playerId = data;
			if (sc && !sc.canConnect(playerId)) {
				return callback(new Error("Already connected"));
			}
			if (true) {
				return callback(null, true);
			} else {
				return callback(new Error("Unauthorized"));
			}
		},
		postAuthenticate: function(socket, data) {
			let playerId = data;
			socket.playerId = playerId;
			socket.join(socket.playerId);
			sc && sc.connect(playerId);
		},
		disconnect: function(socket) {
			sc && socket.auth && sc.disconnect(socket.playerId);
		},
	}
}

requireAuth(matchMaking, authOptions(true));
requireAuth(gameBroadcast, authOptions(false));

// Socket IO helpers

function socketsOf(nsp, playerId, callback) {
	nsp.to(playerId).clients((error, socketIds) => {
		if (error) throw error;
		let result = [];
		socketIds.forEach((sid) => {
			let id = sid.split("#")[1];
			result.push(io.sockets.sockets[id]);
		});
		callback(result);
	})
}
function disconnectAll(nsp, playerId) {
 	socketsOf(nsp, playerId,  (sockets) => {
		sockets.forEach((s) => s.disconnect(true));
	});
}

// Services

const playerStatus = new PlayerStatus();
const gameRunner = new GameRunner();
const matchMaker = new MatchMaker({
	foundMatch: (playerIds) => {
		console.log("found ", playerIds);
		let matchId = gameRunner.newGame(playerIds, {});
		playerIds.forEach((playerId) => {
			playerStatus.inMatch(playerId, matchId);
			matchMaking.to(playerId).emit(FOUND_MATCH, matchId);
			setTimeout(() => disconnectAll(matchMaking, playerId), 0);
		});
	},
	playerStatus,
});

// Match making

const FIND_MATCH = "FIND_MATCH";
const STOP_FINDING = "STOP_FINDING";
const FOUND_MATCH = "FOUND_MATCH";

matchMaking.on('connect', socket => {
	socket.on("authenticated", () => {
		console.log(socket.playerId);
	});
	socket.on(FIND_MATCH, (data, callback) => {
		let playerId = socket.playerId;
		log("find match " + playerId);
		if (matchMaker.join(playerId)) {
			callback("OK");
		} else {
			callback(error("Cannot find match."));
		}
	});
	socket.on(STOP_FINDING, (data, callback) => {
		let playerId = socket.playerId;
		log("stop find" + playerId);
		if (matchMaker.leave(playerId)) {
			callback("OK");
		} else {
			callback(error("Cannot stop finding."));
		}
	});
	socket.on("disconnect", () => {
		if (socket.auth) {
			let playerId = socket.playerId;
			socketsOf(matchMaking, socket.playerId, (sockets) => {
				if (sockets.length === 0) {
					matchMaker.leave(socket.playerId);
				}
			});		
		}
	});
});

// Game runners

const CONNECT = "CONNECT";
const LATEST = "LATEST";
const ACTION = "ACTION";
const QUIT = "QUIT";
const DISCONNECT = "DISCONNECT";

gameBroadcast.on("connect", socket => {
	socket.once(CONNECT, (data, callback) => {
		// Connected to match
		let matchId = data;
		let playerId = socket.playerId;
		if (gameRunner.has(matchId)) {
			callback("OK");
		} else {
			callback(error("Match not found."));
			return;
		}
		socket.emit(LATEST, JSON.stringify(gameRunner.latest(matchId)));
		socket.join(matchId);
		gameBroadcast.to(matchId).emit(CONNECT, JSON.stringify({ playerId }));

		socket.on(ACTION, (data) => {
			let action = JSON.parse(data);
			action.playerId = playerId;
			let err = gameRunner.act(matchId, action);
			if (err === null) {
				// ok
				gameBroadcast.to(matchId).emit(ACTION, JSON.stringify(action));
			}
		});

		socket.once(QUIT, (data, callback) => {
			gameBroadcast.to(matchId).emit(QUIT, JSON.stringify({ playerId }));
			disconnectAll(gameBroadcast, playerId);
			playerStatus.none(playerId);
			matchMaker.allow(playerId);
		});

		socket.on("disconnect", () => {
			gameBroadcast.to(matchId).emit(DISCONNECT, JSON.stringify({ playerId }));
		});
	});
});

function error(msg) {
	return "error:" + msg;
}

server.listen(8080);