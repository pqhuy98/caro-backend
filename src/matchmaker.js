import express from "express";
import http from "http";
import socketIO from "socket.io";
import { v4 as uuidv4 } from "uuid";
import Communicator from "~/src/communicator";
import Match from "~/src/match";
import _ from "lodash";

const AUTH = "AUTH";
const FIND_MATCH = "FIND_MATCH";
const STOP_FINDING = "STOP_FINDING";
const FOUND_MATCH = "FOUND_MATCH";

export default class MatchMaker {
	constructor(io, matchIO, authFunc) {
		this.match = {};
		this.matchOf = {};
		this.pool = new Set();
		this.comm = new Communicator();

		this.io = io;
		this.io.on('connection', socket => {
			// Authentication
			socket.on(AUTH, (data) => {
				if (authFunc(socket, data)) {
					this.comm.addConnection(socket);
					// Join existing match or find new match
					socket.on(FIND_MATCH, (data, callback) => {
						if (this.addToPool(socket)) {
							callback("OK");
						} else {
							callback("ERR:FIND_MATCH");
						}
					});
					socket.on(STOP_FINDING, (data, callback) => {
						if (this.removeFromPool(socket)) {
							callback("OK");
						} else {
							callback("ERR:STOP_FINDING");
						}
					});
				} else {
					socket.disconnect();
				}
			});
			socket.on("disconnect", () => {
				this.comm.removeConnection(socket);
				console.log(`${socket.id}(${socket.playerId}) has disconnected.`);			
			});
		});

		this.matchIO = matchIO;
		this.matchIO.on("connection", socket => {
			// Authentication
			socket.on(AUTH, (data, callback) => {
				let [playerId, matchId] = data.split(":");
				if (authFunc(socket, playerId) && this.match[matchId]) {
					// connect to maatch
					this.match[matchId].connect(socket);
				} else {
					socket.disconnect();					
				}
			});
		})
	}

	currentMatch(playerId) {
		return this.matchOf[playerId] || null;
	}

	addToPool(socket) {
		let playerId = socket.playerId;
		if (this.currentMatch(playerId) === null && !this.pool.has(socket.playerId)) {
			console.log("find game", socket.playerId + ":" + socket.id);
			this.pool.add(socket.playerId);
			console.log(this.pool);
			this.makeMatches();
			return true;
		} else {
			return false;
		}
	}

	removeFromPool(socket) {
		if (this.pool.has(socket.playerId)) {
			console.log("stop find", socket.playerId + ":" + socket.id);
			this.pool.delete(socket.playerId);
			console.log(this.pool);
			return true;
		} else {
			return false;
		}
	}

	makeMatches() {
		let players = Array.from(this.pool);
		for(let i = 0; i+1 < players.length; i+=2) {
			// There are player to match
			let player1Id = players[i];
			let player2Id = players[i+1];
			console.log("match", player1Id, player2Id);
			let match = new Match(
				[player1Id, player2Id],
				(playerId, game) => {
					delete this.matchOf[playerId];
					let cnt = 0;
					Object.keys(game.players).forEach((k) => {
						if (this.matchOf[game.players[k]]) {
							cnt++;
						}
					})
					if (cnt === 0) {
						delete this.match[game.id];
					}
				},
			);
			this.match[match.game.id] = match;
			// Connect all opening sockets to game
			[player1Id, player2Id].forEach((pId) => {
				this.matchOf[pId] = match;
				this.comm.send(pId, FOUND_MATCH, match.game.id),
				this.pool.delete(pId);
			});
		}
	}

	getMatch(id) {
		if (this.match[id]) {
			return this.match[id];
		} else {
			return null;
		}
	}
}