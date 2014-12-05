var tw = (function() {

	var table = {
		labels: true,
		decimal: '.',
		thousand: ','
	};

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

	var SETTINGS_TEMPLATE = '<div id="settings">';
	SETTINGS_TEMPLATE += '<div class="setting"><p>Column headers</p><select class="row-heading"><option value="0">First row</option><option value="1">No headers</option></select></div>'
	SETTINGS_TEMPLATE += '<div class="setting"><p>Decimal sep.</p><select class="dec-sep"><option value="0">Dot ( . )</option><option value="1">Comma ( , )</option><option value="2">Space (  )</option></select></div>'
	SETTINGS_TEMPLATE += '<div class="setting"><p>Thousand sep.</p><select class="thou-sep"><option value="0">Comma ( , )</option><option value="1">Space (   )</option><option value="2">Dot ( . )</option><option value="3">None</option></select></div>'
	SETTINGS_TEMPLATE += '</div>'

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

					//TODO: Add support for removing columns and changing field names
					//$('.header-row').prepend('<input type="checkbox" checked class="column-checkbox">')

					setupButton();

				}
			});

			function setupButton() {
				if (buttonInitilized === true) {
					return;
				};

				$('#tw-container').height(550).append(SETTINGS_TEMPLATE + '<div id="tw-footer"><button id="tw-create">Create App</button></div>');
				buttonInitilized = true;

				$('.setting .row-heading').on('change', function(event) {
					event.preventDefault();

					if( $(this).val() == 1 ) {
						table.labels = false;
						var $headerrow = $('.droparea').find('tr:first');
						var $firstrow = $headerrow.clone();

						$headerrow.find('th, td').each(function(index, val) {
							$(this).text('@' + (index + 1));
						})

						$firstrow.find('th, td').removeClass('header-row').addClass('demoted-header');
						$headerrow.after($firstrow);
					} else {
						table.labels = true;
						$('.droparea').find('tr:first').html($('.demoted-header'));
						$('.demoted-header').removeClass('demoted-header').addClass('header-row');
					}
				});

				$('.setting .dec-sep').on('change', function(event) {
					var value = $(this).val();
					switch (value) {
						case '0':
							table.decimal = '.';
							break;
						case '1':
							table.decimal = ',';
							break;
						case '2':
							table.decimal = ' ';
							break;
					};
				})

				$('.setting .thou-sep').on('change', function(event) {
					var value = $(this).val();
					switch (value) {
						case '0':
							table.thousand = ',';
							break;
						case '1':
							table.thousand = ' ';
							break;
						case '2':
							table.thousand = '.';
							break;
						case '3':
							table.thousand = '';
							break;
					};
				})

				$('#tw-create').on('click', function(event) {
					event.preventDefault();
					port.postMessage({
						action: "createApp",
						info: {
							tableidx: table.index,
							header: table.labels,
							decimal: table.decimal,
							thousand: table.thousand
						}
					})
					$(this).html('<img src="' + SPINNERURL + '" alt="">');
					$(this).off(event);
				});
			};

		});
	};

	function appCreated(info) {
		$('#tw-create').empty().text('Open App')
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