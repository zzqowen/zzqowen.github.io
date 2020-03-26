import 'mediaelement/standalone';

var player = new MediaElement('player', {
		pluginPath: "/path/to/shims/",
		success: function(mediaElement, originalNode) {
			// do things

		}
	});