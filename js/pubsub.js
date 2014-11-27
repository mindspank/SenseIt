var pubsub = (function() {

	var privateTabId = null;
	var callbacks = {};

	function registerListener() {
		chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
			if (callbacks[message.filter]) {
				for (var i = 0; i < callbacks[message.filter].length; i += 1) {
					callbacks[message.filter][i](message.content);
				}
			}
		});
	};

	function getActiveTab(callback) {
		if (chrome.tabs) {
			var tabQuery = {
				active: true,
				currentWindow: true
			};

			chrome.tabs.query(tabQuery, function(tabs) {
				callback(tabs[0]);
			});
		}
	};

	function sendToTab(message) {
		getActiveTab(function(tab) {
			chrome.tabs.sendMessage(tab.id, message);
		})
	};

	function sendMessage(filter, message) {
		chromeMsg = {
			'filter': filter,
			'content': message
		};

		if (chrome.tabs) {
			chromeMsg.from = 'background';
			sendToTab(chromeMsg);
		} else {
			chromeMsg.from = 'content';
			chrome.runtime.sendMessage(chromeMsg);
		};
	};

	function subscribe(filter, callback) {
		if (callbacks[filter] === undefined) {
			callbacks[filter] = [];
		}
		callbacks[filter].push(callback);
	};

	registerListener();

	return {
		sub: subscribe,
		pub: sendMessage
	}

})();