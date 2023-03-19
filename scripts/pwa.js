import PushNotifications from "./push.js";

(async () => {
	/** Web Manifest */
	const manifest = JSON.stringify({
		short_name: "Foundry VTT",
		name: "Foundry Virtual Tabletop",
		description:
			"Foundry VTT is a standalone application built for experiencing multiplayer tabletop RPGs using a feature-rich and modern self-hosted application where your players connect directly through a Progressive Web App.",
		icons: [
			{
				src: "icons/vtt.png",
				type: "image/png",
				sizes: "32x32",
			},
			{
				src: "icons/vtt-512.png",
				type: "image/png",
				sizes: "512x512",
			},
		],
		start_url: "/join",
		display: "standalone",
		theme_color: "#ff6400",
		background_color: "#4b4a44",
	});

	/** Service Worker */
	const serviceWorker = `self.addEventListener("fetch", () => {});`;

	Hooks.once("init", async () => {
		// If the manifest doesn't exist
		if (!(await fetch("/manifest.json")).ok) {
			// Upload manifest to root
			FilePicker.upload(
				"data",
				"/",
				new File([manifest], "manifest.json", {
					type: "application/json",
				})
			);

			Hooks.once("ready", () => {
				ui.notifications.info("PWA manifest created. Please reload the page to see the install button.");
			});
		}
	});

	// Alert is the service worker is not downloaded
	if (!(await fetch("/service-worker.js")).ok) {
		Hooks.once("ready", () =>
			new Dialog(
				{
					title: "Service Worker Required",
					content: `<p>A <code>service-worker.js</code> file must be placed in your user data (<code>Data</code>) directory. You can download the required file here, but must save it manually since modules do not have permission.</p>`,
					buttons: {
						yes: {
							icon: '<i class="fas fa-download"></i>',
							label: "Download",
							callback: () => {
								saveDataToFile(
									new File([serviceWorker], "service-worker.js", {
										type: "application/javascript",
									}),
									"application/javascript",
									"service-worker.js"
								);
							},
						},
					},
					default: "download",
				},
				{ jQuery: false }
			).render(true)
		);
		return;
	}

	// Warn about requiring HTTPS
	Hooks.once("ready", () => {
		if (!window.isSecureContext)
			ui.notifications.warn(
				`Due to browser restrictions, the PWA module requires a secure origin. Simply accessing your game via <code>localhost</code> or <code>127.0.0.1</code> is sufficient. If that's not possible, you may need an <a href="https://foundryvtt.com/article/ssl/">SSL certificate</a>.`,
				{ permanent: true }
			);
	});

	// Add the manifest to the DOM
	const link = document.createElement("link");
	link.rel = "manifest";
	link.href = "/manifest.json";
	document.head.append(link);

	// Register a service worker
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker
			.register("/service-worker.js")
			.then(registration => {
				console.log("Service Worker is registered", registration);
				Hooks.once("init", () => {
					new PushNotifications(registration);
				});
			})
			.catch(err => {
				console.error("Service Worker Error", err);
			});
	} else {
		console.warn("Service Workers are not supported");
	}
})();
