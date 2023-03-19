import { urlB64ToUint8Array } from "./helpers.js";

export default class PushNotifications {
	constructor(registration) {
		this.registration = registration;

		if (!("Notification" in window)) {
			console.log("This browser does not support notifications!");
			return;
		}

		Notification.requestPermission(status => {
			console.log("Notification permission status:", status);
			if (status === "granted") {
				this.addHookListeners();
			}
		});

		game.settings.register("pwa", "notifications", {
			name: "Notifications",
			hint: "Enable notifications (requires reload)",
			scope: "client",
			config: true,
			default: true,
			type: Boolean,
			onChange: () => location.reload(),
		});
		game.settings.register("pwa", "subscription", {
			scope: "client",
			config: false,
			type: Object,
		});
		game.settings.register("pwa", "vapidKeys", {
			scope: "world",
			config: false,
			type: Object,
			onChange: () => location.reload(),
		});

		this.vapidKeys = game.settings.get("pwa", "vapidKeys");
		if (!this.vapidKeys || this.vapidKeys == "") {
			const vapidKeys = WebPushLib.generateVAPIDKeys();
			Hooks.once("ready", () => game.settings.set("pwa", "vapidKeys", vapidKeys));
			this.vapidKeys = vapidKeys;
		}
		this.applicationServerPublicKey = this.vapidKeys.publicKey;

		registration.pushManager.getSubscription().then(subscription => {
			if (game.settings.get("pwa", "notifications")) {
				if (subscription) {
					this.subscription = subscription;
				} else {
					this.subscribeUser();
				}
			} else {
				this.unsubscribeUser();
			}
		});

		navigator.serviceWorker.addEventListener("message", event => {
			if (event.data === "Focus Chat") {
				ui.sidebar.activateTab("chat");
			}
		});
	}

	addHookListeners() {
		/* Hooks.on("renderChatMessage", (app, html) => {
			this.sendNotification(app.data.content ?? html[0].querySelector(".message-content").textContent);
		}); */
		globalThis.nextMessage = () => {
			Hooks.once("renderChatMessage", (app, html) => {
				this.sendNotification(app.data.content ?? html[0].querySelector(".message-content").textContent);
			});
		};
	}

	subscribeUser() {
		this.registration.pushManager
			.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlB64ToUint8Array(this.applicationServerPublicKey),
			})
			.then(subscription => {
				console.log("User is subscribed:", subscription);
				this.setSubscription(subscription);
			})
			.catch(err => {
				if (Notification.permission === "denied") {
					console.warn("Permission for notifications was denied");
				} else {
					console.error("Failed to subscribe the user: ", err);
				}
				this.setSubscription(null);
			});
	}

	unsubscribeUser() {
		this.registration.pushManager
			.getSubscription()
			.then(subscription => (subscription ? subscription.unsubscribe() : null))
			.catch(err => console.log("Error unsubscribing", err))
			.then(() => this.setSubscription(null));
	}

	setSubscription(subscription) {
		this.subscription = subscription;
		game.settings.set("pwa", "subscription", subscription);
	}

	sendNotification(payload) {
		const options = {
			TTL: 60,
			vapidDetails: {
				subject: "mailto: arcanistzed@gmail.com",
				publicKey: this.vapidKeys.publicKey,
				privateKey: this.vapidKeys.privateKey,
			},
		};
		if (this.subscription) WebPushLib.sendNotification(this.subscription.toJSON(), payload, options);
	}
}
