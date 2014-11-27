var tw = (function() {

	var table = {};

	var port,
		$l,
		$tables = $('table:visible'),
		CSSURL = chrome.extension.getURL('css/styles.css'),
		SPINNERURL = chrome.extension.getURL('icons/loader.svg'),
		PANDAURL = chrome.extension.getURL('icons/sad_panda.jpg'),
		BGURL = chrome.extension.getURL('icons/bg.png');

	var CONTAINER_WRAPPER = '<div id="tw-container" style="position: fixed;z-index:9999"><div id="tw-header"><div id="tw-heading"><p>SenseIt - Visualize the Web</p>'
	CONTAINER_WRAPPER += '</div></div><div class="tw-spinner"><img src="' + SPINNERURL + '" alt=""></div></div>'

	var CONTAINER_TEMPLATE = '<div class="droparea-container"><div class="droparea nodrop"><p>Drag & Drop any table to visualize it</p>'
	CONTAINER_TEMPLATE += '</div></div>';


	function addStyles() {
		$('head').append($('<link>')
			.attr("rel", "stylesheet")
			.attr("type", "text/css")
			.attr("href", "//code.cdn.mozilla.net/fonts/fira.css"));

		$('head').append($('<link>')
			.attr("rel", "stylesheet")
			.attr("type", "text/css")
			.attr("href", CSSURL));
	};

	function toggleHighlight() {
		$tables.toggleClass('tw-highlight-table');
		$tables.draggable({
			helper: 'clone',
			appendTo: "body",
			zIndex: 10000,
			start: function(e, ui) {
				$(ui.helper).removeClass('tw-highlight-table');
				$(ui.helper).html('<div id="tw-drag-icon"><img src="' + BGURL + '"></img></div>')
			},
			cursorAt: {
				top: 50,
				left: 50
			}
		});
	};

	function ready(timer) {

		var timer = timer || 800;
		var buttonInitilized = false;

		$('.tw-spinner').fadeOut(timer, function() {

			$('#tw-container').append(CONTAINER_TEMPLATE);
			$('.droparea').css('background-image', 'url(' + BGURL + ')');
			$('.droparea').droppable({
				hoverClass: "tw-drop-hover",
				tolerance: 'pointer',
				drop: function(event, ui) {

					table.index = $('table:visible').index($(ui.draggable)) + 1;

					var $el = $(ui.draggable).clone();
					$el.id = 'tw-tempId'
					$el.removeClass();
					$el.find('*').removeClass();

					if( $el.find('th').length ) {
						var header = $el.find('th');
						$el.find('th').addClass('header-row')
					} else {
						var header = $el.find('tr:first');
						$el.find('tr:first').addClass('header-row')
					}

					$('#tw-container').width('100%')

					var $drop = $(this);
					$drop.css('background','#fff');
					$drop.removeClass('nodrop')
					$drop.empty();
					$drop.append($el);

					setupButton();

				}
			});

			function setupButton() {
				if (buttonInitilized === true) {
					return;
				};

				$('#tw-container').height(550).append('<div id="settings"></div><div id="tw-footer"><button id="tw-create"><span>Waiting for data</span></button></div>')

				buttonInitilized = true;

				$('#tw-create').text('Create App');
				$('#tw-create').toggleClass('active');

				$('#tw-create').on('click', function(event) {
					event.preventDefault();
					port.postMessage({
						action: "createApp",
						info: {
							tableidx: table.index,
							header: false
						}
					})
					$(this).off(event);
				});
			};

		});
	};

	function appCreated(info) {
		$('#tw-create').text('Open App')
		$('#tw-create').on('click', function(event) {
			window.open('http://localhost:4848/sense/app/' + info.appname);
		});
	}

	function abort(reason, timer) {
		var timer = timer || 800;
		$('.tw-spinner').fadeOut(timer, function() {
			$('#tw-container').append('<h1 class="error">Oops!</h1><p class="error">' + reason + '</p><img class="error" src="' + PANDAURL + '">');
		});
	};

	function registerListener() {
		port.onMessage.addListener(function(msg) {
			if (msg.action === 'connected') {
				ready();
			} else if (msg.action === 'appCreated') {
				appCreated(msg.info);
			} else if (msg.action === 'error') {
				abort(msg.info)
			}
		});
	};

	function init() {
		if ($('#tw-container').length !== 0) {
			toggleHighlight();
			$('#tw-container').remove();
		} else if ($tables.length === 0) {
			addStyles();
			$('body').append(CONTAINER_WRAPPER);
			abort('It seems there are no suitable HTML tables with data on this page. Perhaps try a different page?');
		} else {

			addStyles();
			$('body').append(CONTAINER_WRAPPER);

			$('#tw-container').draggable();

			toggleHighlight();

			port = chrome.runtime.connect({
				name: "tw"
			});

			registerListener();

			port.postMessage({
				action: "init",
				info: {
					host: location.host,
					url: location.href,
					noTables: $('table:visible').length
				}
			});
		};
	};

	return {
		init: init
	};

})();

tw.init();