var _ = require( 'lodash' );
var EventEmitter = require( 'events' ).EventEmitter;
var Hls = require( 'hls.js' );
var PlaybackState = require( 'sdk/base/playback/PlaybackState' );
var StateMachine = require( 'javascript-state-machine' );


var STATE = {
	IDLE: 'IDLE',
	PLAYING: 'PLAYING',
	STOPPED: 'STOPPED',
	PAUSED: 'PAUSED'
};

var fsm = StateMachine.create( {
	initial: STATE.STOPPED,
	error: function ( eventName, from ) {
		console.warn( 'Event', eventName, 'inappropriate in current state', from );
	},
	events: [ {
		name: 'play',
		from: STATE.STOPPED,
		to: STATE.PLAYING
	}, {
		name: 'stop',
		from: STATE.PLAYING,
		to: STATE.STOPPED
	}, {
		name: 'stop',
		from: STATE.PAUSED,
		to: STATE.STOPPED
	}, {
		name: 'pause',
		from: STATE.PLAYING,
		to: STATE.PAUSED
	}, {
		name: 'resume',
		from: STATE.PAUSED,
		to: STATE.PLAYING
	} ]
} );

function _onLoadedData() {
	if ( fsm.is( STATE.STOPPED ) || fsm.is( STATE.PAUSED ) ) return;

	this.emit( 'html5-playback-status', {
		type: PlaybackState.DATA_LOADING,
		mediaNode: this.audioNode
	} );
}

function _onLoadStart() {
	if ( fsm.is( STATE.STOPPED ) || fsm.is( STATE.PAUSED ) ) return;

	this.emit( 'html5-playback-status', {
		type: PlaybackState.LOAD_START,
		mediaNode: this.audioNode
	} );
}

function _onCanPlay() {
	if ( fsm.is( STATE.STOPPED ) || fsm.is( STATE.PAUSED ) ) return;

	if( this.url !== null ){
		this.audioNode.play();
		this.emit( 'html5-playback-status', {
			type: PlaybackState.CAN_PLAY,
			mediaNode: this.audioNode
		} );
	}
}

function _onCanPlayThrough() {
	if ( fsm.is( STATE.STOPPED ) || fsm.is( STATE.PAUSED ) ) return;

	if( this.url !== null ){
		this.audioNode.play();

		this.emit( 'html5-playback-status', {
			type: PlaybackState.CAN_PLAY_THROUGH,
			mediaNode: this.audioNode
		} );
	}
}

function _onWaiting() {
	if ( fsm.is( STATE.STOPPED ) || fsm.is( STATE.PAUSED ) ) return;

	this.emit( 'html5-playback-status', {
		type: PlaybackState.WAITING,
		mediaNode: this.audioNode
	} );
}

function _onEmptied() {
	if ( fsm.is( STATE.STOPPED ) || fsm.is( STATE.PAUSED ) ) return;

	this.emit( 'html5-playback-status', {
		type: PlaybackState.EMPTIED,
		mediaNode: this.audioNode
	} );
}

function _onAbort() {
	if ( fsm.is( STATE.STOPPED ) || fsm.is( STATE.PAUSED ) ) return;

	this.emit( 'html5-playback-status', {
		type: PlaybackState.ABORT,
		mediaNode: this.audioNode
	} );
}

function _onEnded() {
	if ( fsm.is( STATE.STOPPED ) ) return;
	this.emit( 'html5-playback-status', {
		type: PlaybackState.ENDED,
		mediaNode: this.audioNode
	} );
}

function _onPlay() {

	if( this.url !== null ){
		this.emit( 'html5-playback-status', {
			type: PlaybackState.PLAY,
			mediaNode: this.audioNode
		} );
	}
}

function _onPause() {
	if ( !fsm.is( STATE.STOPPED ) ) {
		this.emit( 'html5-playback-status', {
			type: PlaybackState.PAUSE,
			mediaNode: this.audioNode
		} );
	} else {
		this.emit( 'html5-playback-status', {
			type: PlaybackState.STOP,
			mediaNode: this.audioNode
		} );
	}
}

function _onError() {

	var audioNode = this.audioNode;

	if ( fsm.is( STATE.STOPPED ) ) {
		this.emit( 'html5-playback-status', {
			type: PlaybackState.STOP,
			mediaNode: audioNode
		} );
	} else if ( audioNode.readyState != 3 ) {
		this.resetAudioNode();
		this.emit( 'html5-playback-status', {
			type: PlaybackState.ERROR,
			mediaNode: audioNode
		} );
	} else {
		this.emit( 'html5-playback-status', {
			type: PlaybackState.STOP,
			mediaNode: audioNode
		} );
	}

}

function _onOffline(){
	console.log( 'MediaElement::offline' );
	var audioNode = this.audioNode;	
	 this.emit( 'html5-playback-status', {
	 	type: PlaybackState.ERROR,
	 	mediaNode: audioNode
	 } );
}

function _onTimeUpdate() {
	if ( fsm.is( STATE.STOPPED ) || fsm.is( STATE.PAUSED ) ) return;

	if ( this.audioNode.currentTime.toFixed( 1 ) == this.audioNode.duration.toFixed( 1 ) ) {
		this.emit( 'html5-playback-status', {
			type: PlaybackState.ENDED,
			mediaNode: this.audioNode
		} );
	} else {
		if ( !this.isLive ) {
			this.emit( 'html5-playback-status', {
				type: PlaybackState.TIME_UPDATE,
				mediaNode: this.audioNode
			} );
		}
	}
}

function attachEvents() {
	this.boundOnOffline = _onOffline.bind(this);
	this.audioNode.addEventListener( 'loadeddata', _onLoadedData.bind( this ) );
	this.audioNode.addEventListener( 'loadstart', _onLoadStart.bind( this ) );
	this.audioNode.addEventListener( 'canplay', _onCanPlay.bind( this ) );
	this.audioNode.addEventListener( 'canplaythrough', _onCanPlayThrough.bind( this ) );
	this.audioNode.addEventListener( 'waiting', _onWaiting.bind( this ) );
	this.audioNode.addEventListener( 'emptied', _onEmptied.bind( this ) );
	this.audioNode.addEventListener( 'abort', _onAbort.bind( this ) );
	this.audioNode.addEventListener( 'ended', _onEnded.bind( this ) );
	this.audioNode.addEventListener( 'play', _onPlay.bind( this ) );
	this.audioNode.addEventListener( 'pause', _onPause.bind( this ) );
	this.audioNode.addEventListener( 'timeupdate', _onTimeUpdate.bind( this ) );
	this.audioNode.addEventListener( 'error', _onError.bind( this ) );
	window.addEventListener('offline', this.boundOnOffline);
}

function removeEvents() {
	this.audioNode.removeEventListener( 'loadeddata', _onLoadedData );
	this.audioNode.removeEventListener( 'loadstart', _onLoadStart );
	this.audioNode.removeEventListener( 'canplay', _onCanPlay );
	this.audioNode.removeEventListener( 'canplaythrough', _onCanPlayThrough );
	this.audioNode.removeEventListener( 'waiting', _onWaiting );
	this.audioNode.removeEventListener( 'emptied', _onEmptied );
	this.audioNode.removeEventListener( 'abort', _onAbort );
	this.audioNode.removeEventListener( 'ended', _onEnded );
	this.audioNode.removeEventListener( 'play', _onPlay );
	this.audioNode.removeEventListener( 'pause', _onPause );
	this.audioNode.removeEventListener( 'timeupdate', _onTimeUpdate );
	this.audioNode.removeEventListener( 'error', _onError );
	window.removeEventListener('offline', this.boundOnOffline );
}

function getAudioNode() {

	if ( !this.audioNode ) {

		this.audioNode = new Audio();
		this.audioNode.autoplay = false;
		this.audioNode.preload = 'none';

		attachEvents.call( this );
	}

	return this.audioNode;
}

module.exports = _.assign( new EventEmitter(), {
	audioNode: null,

	init: function () {
			this.audioNode = getAudioNode.call( this );
			this.url = null;
			this.audioNode.src = '';
			try {
                this.audioNode.play().catch(function(e){});
            }catch(e){
				//IE fix
				this.audioNode.play();
			}
			this.audioNode.pause();
	},

	playAudio: function ( url, useHls, isLive ) {
		this.audioNode = getAudioNode.call( this );
		this.url = url || this.url;
		this.isLive = isLive || this.isLive;
		this.useHls = useHls || this.useHls;

		if ( useHls ) {
			var hls = new Hls();

			hls.loadSource( url );
			hls.attachMedia( this.audioNode );
		} else {
			this.audioNode.src = url;
			this.audioNode.load();
		}

		fsm.play();
	},

	stop: function () {
		var context = this;
		if ( fsm.is( STATE.STOPPED ) ) return;

		this.audioNode = getAudioNode.call( this );

		fsm.stop();
		this.audioNode.pause();
		setTimeout(function(){ 
			context.audioNode.src = '';
			context.url = null;
		 }, 300);
		
	},

	pause: function () {
		if ( fsm.is( STATE.PAUSED ) ) return;

		this.audioNode = getAudioNode.call( this );

		this.audioNode.pause();
		fsm.pause();
	},

	resume: function () {
		if ( !fsm.is( STATE.PAUSED ) ) return;

		this.audioNode = getAudioNode.call( this );

		this.audioNode.play();
		fsm.resume();
	},

	mute: function () {
		this.audioNode = getAudioNode.call( this );

		this.audioNode.muted = true;
	},

	unMute: function () {
		this.audioNode = getAudioNode.call( this );

		this.audioNode.muted = false;
	},

	setVolume: function ( volume ) {
		this.audioNode = getAudioNode.call( this );

		this.audioNode.volume = volume;
	},

	isStopped: function () {
		return fsm.is( STATE.STOPPED );
	},

	resetAudioNode: function () {

		removeEvents.call( this );
		this.audioNode = null;

		if ( fsm.can( 'stop' ) ) {
			fsm.stop();
		}
	}
} );
