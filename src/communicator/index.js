import Game from "caro-core/dist";
import express from "express";
import http from "http";
import socketIO from "socket.io";
import { v4 as uuidv4 } from "uuid";

export default class Communicator {
	constructor() {
		this.sockets = {};
	}

	addConnection(socket) {
		let playerId = socket.playerId;
		if (!this.sockets[playerId]) {
			this.sockets[playerId] = new Set();
		}
		if (!this.sockets[playerId].has(socket)) {
			this.sockets[playerId].add(socket);
		}
	}

	removeConnection(socket) {
		let playerId = socket.playerId;
		if (this.sockets[playerId] && this.sockets[playerId].has(socket)) {
			this.sockets[playerId].delete(socket);
			if (this.sockets[playerId].size === 0) {
				delete this.sockets[playerId];
			}
		}
	}

	broadcast(tag, data) {
		Object.keys(this.sockets).forEach((playerId) => {
			this.sockets[playerId].forEach((socket) => {
				socket.emit(tag, data);
			});
		});
	}

	send(playerId, tag, data) {
		console.log("comm send", playerId, tag, data);
		if (this.sockets[playerId]) {
			this.sockets[playerId].forEach((socket) => {
				socket.emit(tag, data);
			});			
		}
	}

	connections(playerId) {
		if (playerId in this.sockets) {
			return Array.from(this.sockets[playerId]);
		} else {
			return [];
		}
	}
}
