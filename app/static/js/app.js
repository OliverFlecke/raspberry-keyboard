"use strict";

const socket = io();
let connected = false;
let keystrokeId = 0;
const processingQueue = [];

function onSocketConnect() {
  connected = true;
  document.getElementById('status-connected').style.display = 'inline-block';
  document.getElementById('status-disconnected').style.display = 'none';
  document.getElementById('instructions').style.visibility = 'visible';
  document.getElementById('disconnect-reason').style.visibility = 'hidden';
}

function onSocketDisconnect(reason) {
  connected = false;
  document.getElementById('status-connected').style.display = 'none';
  document.getElementById('status-disconnected').style.display = 'inline-block';
  document.getElementById('disconnect-reason').style.visibility = 'visible';
  document.getElementById('disconnect-reason').innerText = 'Error: ' + reason;
  document.getElementById('instructions').style.visibility = 'hidden';
}

function limitRecentKeys(limit) {
  const recentKeysDiv = document.getElementById('recent-keys');
  while (recentKeysDiv.childElementCount > limit) {
    recentKeysDiv.removeChild(recentKeysDiv.firstChild);
  }
}

function addKeyCard(key, keystrokeId) {
  const card = document.createElement('div');
  card.classList.add('key-card');
  if (key === ' ') {
    card.innerHTML = '&nbsp;';
  } else {
    card.innerText = key;
  }
  card.setAttribute('keystroke-id', keystrokeId);
  document.getElementById('recent-keys').appendChild(card);
  limitRecentKeys(10);
}

function updateKeyStatus(keystrokeId, success) {
  const recentKeysDiv = document.getElementById('recent-keys');
  const cards = recentKeysDiv.children;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (parseInt(card.getAttribute('keystroke-id')) === keystrokeId) {
      if (success) {
        card.classList.add('processed-key-card');
      } else {
        card.classList.add('unsupported-key-card');
      }
      return;
    }
  }
}

function onKeyDown(evt) {
  if (!connected) {
    return;
  }
  if (!evt.metaKey) {
//    evt.preventDefault();
    addKeyCard(evt.key, keystrokeId);
    processingQueue.push(keystrokeId);
    keystrokeId++;
  }

  let location = null;
  if (evt.location === 1) {
    location = 'left';
  } else if (evt.location === 2) {
    location = 'right';
  }
  
  const data = packageFromEvent(evt, location);
  console.debug('Key', data);
  return;

  socket.emit('keystroke', data);
}

function onDisplayHistoryChanged(evt) {
  if (evt.target.checked) {
    document.getElementById('recent-keys').style.visibility = 'visible';
  } else {
    document.getElementById('recent-keys').style.visibility = 'hidden';
    limitRecentKeys(0);
  }
}

function packageFromEvent(evt, location = null) {
  return {
    metaKey: evt.metaKey,
    altKey: evt.altKey,
    shiftKey: evt.shiftKey,
    ctrlKey: evt.ctrlKey,
    key: evt.key,
    keyCode: evt.keyCode,
    location: location,
  };
}

const textInput = document.getElementById('input-box');
textInput.addEventListener("keydown", (evt) => {
	if (evt.key === 'Enter') {
//		onSend();
	}
	if (evt.key === 'Backspace') {
		socket.emit('keystroke', packageFromEvent(evt));
	}
});

/**
 * @param c character
 * @returns number for the keycode
 */
function getKeyCode(c) {
	switch (c) {
		case '\n': return 13;
		case '=':
		case '+':
			return 61;
		case `'`: 
		case '"': 
			return 222;

		case '/': return 191;
		case '-': return 173;
		case ';': 
		case ':': 
			return 59;
		case '!': return 49;
		case '?': return 191;
		case ',': return 188;
		case '.': return 190;
		case '(': return 57;
		case ')': return 48;
		default: return c.toUpperCase().charCodeAt();
	}
}
function isShift(c) {
	switch (c) {
		case '=':
		case '/':
		case `'`:
		case ';':
		case '-':
			return false;
		case '(':
		case ')':
		case '+':
		case '"':
		case ':':
		case '!': 
		case '?': 
			return true;
		default: return 'A'.charCodeAt() <= c.charCodeAt() && c.charCodeAt() <= 'Z'.charCodeAt();
	}
}

function toPackage(c) {
	return {
		key: c,
		keyCode: getKeyCode(c), 
		shiftKey: isShift(c),
		altKey: false,
		ctrlKey: false,
		location: null,
		metaKey: false,
	}
}

function onSend() {
	const text = textInput.value;
	text.split('').forEach(c => socket.emit('keystroke', toPackage(c)));
	textInput.value = '';	
}

document.getElementById('send').addEventListener("click", onSend);
document.querySelector('body').addEventListener("keydown", onKeyDown);
document.getElementById('display-history-checkbox').addEventListener("change", onDisplayHistoryChanged);
socket.on('connect', onSocketConnect);
socket.on('disconnect', onSocketDisconnect);
socket.on('keystroke-received', (data) => {
  updateKeyStatus(processingQueue.shift(), data.success);
});

