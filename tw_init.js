var settings, appinfo;

chrome.storage.sync.get({
	decimal: 0,
	thousand: 0,
	useServer: false,
	url: ''
}, function(items) {
	settings = items;
})

chrome.storage.onChanged.addListener(function(changes, namespace) {
	for (key in changes) {
		settings[key] = changes[key].newValue;
	}
});

chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.executeScript(tab.id, {
		"file": "js/jquery-2.1.1.min.js",
		"runAt": "document_end"
	}, function() {
		chrome.tabs.executeScript(tab.id, {
			"file": "content.js",
			"runAt": "document_end"
		});
	});
});

chrome.runtime.onConnect.addListener(function(port) {

	var glob,
		app,
		counter = 0,
		connection,
		loadscript,
		serverappname;

	port.onMessage.addListener(function(msg) {
		if (msg.action === 'init') {
			app = msg.info;
			if( settings.useServer === true ) {
				connectToServer();
			} else {
				connectToDesktop();
			};
		} else if (msg.action === 'createApp') {
			create(msg.info, app);
		} else if (msg.action === 'getDocList') {
			glob.getDocList().then(function(reply) {
				var list = reply.map(function(d) {
					return {
						name: d.qDocName
					}
				});
				port.postMessage({
					"action": "doclist",
					"info": list
				});
			})
		}
	});

	function connectToDesktop() {
		qsocks.Connect().then(function(global) {
			glob = global;
			port.postMessage({
				'action': "connected"
			})
		}, function(error) {
			port.postMessage({
				'action': "error",
				"info": 'Could not connect to Qlik Sense.<br>Are you sure it\'s running?'
			})
			console.log(error)
		});
	};

	function connectToServer() {

		var secure = settings.url.indexOf("https://") == 0 ? true : false;

		var conn = {
			host: new URL(settings.url).hostname + '/app/%3Ftransient%3D',
			isSecure: secure
		}

		var auth = $.get(settings.url + 'hub/').done(function() {

			qsocks.Connect(conn).then(function(global) {
				glob = global;
				port.postMessage({
					'action': "connected"
				})
			}, function(error) {
				port.postMessage({
					'action': "error",
					"info": 'Could not connect to Qlik Sense.<br>Are you sure it\'s the right server adress?'
				})
				console.log(error)
			});

		}).fail(function() {
			port.postMessage({
					'action': "error",
					"info": 'Could not connect to Qlik Sense.<br>Are you sure it\'s the right server adress?'
			})
		})
	};

	function create(msg, app, title) {

		appinfo = app;

		var d = new Date(Date.now());
		var msg = msg;
		var date = new Date();
		var datestr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toJSON().slice(0, 10)
		var appname = title || app.host + ' - ' + datestr;

		connection = {
			qName: app.host + ' ' + Date.now(),
			qConnectionString: app.url,
			qType: 'internet'
		};

		var hasLabels = msg.header === true ? 'embedded labels' : 'no labels';
		var transpose = msg.transpose === true ? ' ,filters(Transpose()) ' : '';

		loadscript = "SET ThousandSep='" + msg.thousand + "';\r\nSET DecimalSep='" + msg.decimal;
		loadscript += "';\r\nLoad * from [lib://" + connection.qName + "] (html, UTF8, " + hasLabels + ", table is @" + msg.tableidx + transpose + ");";

		createAndOpen(glob, appname)
			.then(createConnection)
			.then(getSetScript)
			.then(reload)
			.then(save)
			.then(function() {
				port.postMessage({
					'action': "appCreated",
					"info": {
						appname: settings.useServer === true ? serverappname : appname
					}
				})
			}, function(error) {
				if (error.code === 1000) {
					counter++
					var newName = app.host + ' - ' + datestr + ' - ' + counter
					create(msg, app, newName)
				} else {
					console.log(error)
				}
			})

	};

	function createAndOpen(glob, appname) {
		if(settings.useServer === true) {
			return new Promise(function(resolve, reject) {
				glob.createApp(appname).then(function(reply) {
					if(reply.qSuccess === false) {
						return reject('Could not create app');
					}

					//store away app id to send back to content script
					serverappname = reply.qAppId;

					glob.openDoc(reply.qAppId).then(function(handle) {
						return resolve(handle)
					}, function(error) {
						//If app already is opened
						if(error.code === 1002) {
							glob.getActiveDoc().then(function(handle) {
								return resolve(handle)
							})
						}
					})
				}, function(error) {
					return reject(error);
				})
			})
		} else {
			return new Promise(function(resolve, reject) {
				glob.createDocEx(appname).then(function() {
					glob.getActiveDoc().then(function(handle) {
						return resolve(handle)
					})
				}, function(error) {
					return reject(error);
				})
			})
		}
	};

	function createConnection(handle) {
		return new Promise(function(resolve, reject) {
			handle.createConnection(connection).then(function() {
				return resolve(handle);
			}, function(error) {
				return reject(error);
			})
		})
	};

	function getSetScript(handle) {
		return new Promise(function(resolve, reject) {
			handle.getScript().then(function(script) {
				script += ('\r\n' + loadscript);
				handle.setScript(script).then(function(reply) {
					return resolve(handle);
				}, function(error) {
					return reject(error);
				})
			})
		})
	};

	function save(handle) {
		return new Promise(function(resolve, reject) {
			handle.doSave().then(function() {
				return resolve(handle);
			}, function(error) {
				return reject(error);
			})
		})
	};

	function reload(handle) {
		return new Promise(function(resolve, reject) {
			handle.doReload().then(function(reply) {
				return resolve(handle);
			})
		})
	};

});