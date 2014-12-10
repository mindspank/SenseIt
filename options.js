function save() {
	var settings = {
		useServer: document.getElementById('useServer').checked,
		url: document.getElementById('url').value,
		decimal: document.getElementById('decimal').value,
		thousand: document.getElementById('thousand').value
	}
	chrome.storage.sync.set(settings, function() {
		document.body.appendChild(document.createTextNode('Settings was saved'));
	})
}

function restore() {
		chrome.storage.sync.get({
			useServer: false,
			url: '',
			decimal: 0,
			thousand: 0
		}, function(items) {
			console.log(items)
			document.getElementById('useServer').checked = items.useServer;
			document.getElementById('url').value = items.url;
			document.getElementById('decimal').value = items.decimal;
			document.getElementById('thousand').value = items.thousand;
		})
}
document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click',save);