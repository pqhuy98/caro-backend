import Game from "caro-core/dist";
import express from "express";
import http from "http";
import socketIO from "socket.io";
import { v4 as uuidv4 } from "uuid";
import Communicator from "~/src/communicator";
import MatchMaker from "~/src/matchmaker";
import _ from "lodash";

const app = express();
app.get("/status/:playerId", (req, res) => {
	let match = mm.currentMatch(req.params.playerId);
	console.log(match);
	res.send(JSON.stringify(match ? match.game.id : "null"));
})

const server = http.createServer(app);

// Match makinbg

const matchMakingIO = socketIO(server, {
	path: "/match_making",
	pingInterval: 5000,
});

const matchIO = socketIO(server, {
	path: "/on_match",
	pingInterval: 5000,
});

const mm = new MatchMaker(matchMakingIO, matchIO,
	(socket, data) => {
		let playerId = data;
		if (true) {
			console.log("User", playerId, "connected.");
			socket.playerId = playerId;
			return true;
		} else {
			console.log("Unauthorized AUTH request with data:", data);
			socket.disconnect();
			return false;
		}
	}
);

server.listen(8080);