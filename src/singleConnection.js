export default class SingleConnection {
	constructor() {
		this.connected = new Set();
	}

	connect(id) {
		this.connected.add(id);
	}

	disconnect(id) {
		this.connected.delete(id);
	}

	canConnect(id) {
		return !this.connected.has(id);
	}
}