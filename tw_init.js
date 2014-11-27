chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.executeScript(tab.id, {
		"file": "js/jquery-2.1.1.min.js",
		"runAt": "document_end"
	}, function() {
		chrome.tabs.executeScript(tab.id, {
			"file": "js/pubsub.js",
			"runAt": "document_end"
		}, function() {
			chrome.tabs.executeScript(tab.id, {
				"file": "content.js",
				"runAt": "document_end"
			});
		});
	});
});

chrome.runtime.onConnect.addListener(function(port) {

	var glob,
		app,
		counter = 0,
		connection,
		loadscript;

	port.onMessage.addListener(function(msg) {
		if (msg.action === 'init') {
			app = msg.info;
			connect()
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

	function connect(obj) {

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

	function create(msg, app, title) {

		var d = new Date(Date.now());
		var msg = msg;
		var date = new Date();
		var datestr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toJSON().slice(0, 10)
		var appname = title || app.host + ' - ' + datestr;

		connection = {
			qName: app.host,
			qConnectionString: app.url,
			qType: 'internet'
		};

		loadscript = 'Load * from [lib://' + app.host + '] (html, UTF8, embedded labels, table is @' + msg.tableidx + ');';

		createAndOpen(glob, appname)
			.then(createConnection)
			.then(getSetScript)
			.then(reload)
			.then(save)
			.then(function() {
				port.postMessage({
					'action': "appCreated",
					"info": {
						appname: appname
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
		return new Promise(function(resolve, reject) {
			glob.createDocEx(appname).then(function() {
				glob.getActiveDoc().then(function(handle) {
					return resolve(handle)
				})
			}, function(error) {
				return reject(error);
			})
		})
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
				})
			})
		})
	};

	function save(handle) {
		return new Promise(function(resolve, reject) {
			handle.doSave().then(function() {
				return resolve(handle);
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