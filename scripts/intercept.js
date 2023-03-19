function listen(fn) {
	const property = Object.getOwnPropertyDescriptor(MessageEvent.prototype, "data");
	const data = property.get;

	function lookAtMessage() {
		const socket = this.currentTarget instanceof WebSocket;
		if (!socket) {
			return data.call(this);
		}
		const msg = data.call(this);
		Object.defineProperty(this, "data", { value: msg });
		fn(this);
		return msg;
	}
	property.get = lookAtMessage;
	Object.defineProperty(MessageEvent.prototype, "data", property);
}
listen(event => {
    localStorage.setItem(messageQueue, event)
    console.log(event);
});
