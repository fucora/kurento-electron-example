"use strict"

var video;
var webRtcPeer;

const desktopCapturer = require('electron').desktopCapturer;
var ws = new WebSocket('wss://147.75.199.219:8443/one2many');

const BrowserWindow = require('electron').remote;

window.onload = function() {
	video = document.getElementById('video');


	document.getElementById('call').addEventListener('click', function() { presenter(); } );
	document.getElementById('viewer').addEventListener('click', function() { viewer(); } );
	document.getElementById('terminate').addEventListener('click', function() { stop(); } );
	
}

$(".menu").hide();

window.onbeforeunload = function() {
	ws.close();
}

function refresh() {
  $('select').imagepicker({
    hide_select : false
  });
}

	function addSource(source) {
	  console.log("SOURCE ID: " + source.id);
	  $('select').append($('<option>', {
		value: source.id,
		text: source.name
	  }));
	  refresh();
	}

	function showSources() {
	  desktopCapturer.getSources({ types:['window', 'screen'] }, function(error, sources) {
		for (let source of sources) {
		  console.log("Name: " + source.name + "ID: " + source.id);
		  addSource(source);
		}
	  });
	}
	
	showSources();
	refresh();

ws.onopen = function() {
	console.log("WEB SOCKET OPENED");
	$(".menu").show();
}

ws.onmessage = function(message) {
	var parsedMessage = JSON.parse(message.data);
	console.info('Received message: ' + message.data);

	switch (parsedMessage.id) {
	case 'presenterResponse':
		presenterResponse(parsedMessage);
		break;
	case 'viewerResponse':
		viewerResponse(parsedMessage);
		break;
	case 'stopCommunication':
		dispose();
		break;
	case 'iceCandidate':
		webRtcPeer.addIceCandidate(parsedMessage.candidate)
		break;
	default:
		console.error('Unrecognized message', parsedMessage);
	}
}

function presenterResponse(message) {
	if (message.response != 'accepted') {
		var errorMsg = message.message ? message.message : 'Unknow error';
		console.warn('Call not accepted for the following reason: ' + errorMsg);
		dispose();
	} else {
		webRtcPeer.processAnswer(message.sdpAnswer);
	}
}

function viewerResponse(message) {
	if (message.response != 'accepted') {
		var errorMsg = message.message ? message.message : 'Unknow error';
		console.warn('Call not accepted for the following reason: ' + errorMsg);
		dispose();
	} else {
		webRtcPeer.processAnswer(message.sdpAnswer);
	}
}


function presenter() {
	if (!webRtcPeer) {
		showSpinner(video);
		

   		var options = {
   		  localVideo : video,
   		  onicecandidate : onIceCandidate,
		  sendSource : 'screen'
   		};

   	    webRtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options,function(error) {
   	       if (error) {
   	           return console.error(error);
   	       }
   	       webRtcPeer.generateOffer(onOfferPresenter);
   	    });
	}
}

function onOfferPresenter(error, offerSdp) {
	var message = {
		id : 'presenter',
		sdpOffer : offerSdp
	};
	sendMessage(message);
}


function viewer() {
	if (!webRtcPeer) {
		showSpinner(video);

		var options = {
		       remoteVideo : video,
		       onicecandidate : onIceCandidate
		}

		webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
			if(error) return onError(error);

			this.generateOffer(onOfferViewer);
		});
	}
}

function onOfferViewer(error, offerSdp) {
	if (error) return onError(error)

	var message = {
		id : 'viewer',
		sdpOffer : offerSdp
	}
	sendMessage(message);
}

function onIceCandidate(candidate) {
	   console.log('Local candidate' + JSON.stringify(candidate));

	   var message = {
	      id : 'onIceCandidate',
	      candidate : candidate
	   }
	   sendMessage(message);
}

function stop() {
	if (webRtcPeer) {
		var message = {
				id : 'stop'
		}
		sendMessage(message);
		dispose();
	}
}

function dispose() {
	if (webRtcPeer) {
		webRtcPeer.dispose();
		webRtcPeer = null;
	}
	hideSpinner(video);
}

function sendMessage(message) {
	var jsonMessage = JSON.stringify(message);
	console.log('Senging message: ' + jsonMessage);
	ws.send(jsonMessage);
}

function showSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].poster = './img/transparent-1px.png';
		arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
	}
}

function hideSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].src = '';
		arguments[i].poster = './img/webrtc.png';
		arguments[i].style.background = '';
	}
}

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
	event.preventDefault();
	$(this).ekkoLightbox();
});
