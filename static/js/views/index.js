'use strict';
document.addEventListener('DOMContentLoaded', function() {
  var pageTitleNode = document.querySelector('.header .title a'),

    playbackSectionNode = document.querySelector('.playback.section'),
    titleNode = playbackSectionNode.querySelector('.title'),
    displayNode = playbackSectionNode.querySelector('.display'),
    playButtonNode = playbackSectionNode.querySelector('.play'),
    homeButtonNode = playbackSectionNode.querySelector('.home'),
    progressNode = playbackSectionNode.querySelector('.progress'),
    progressBarNode = playbackSectionNode.querySelector('.progress .bar'),
    tweetButtonNode = playbackSectionNode.querySelector('.tweet'),

    recordingSectionNode = document.querySelector('.recording.section'),
    recordingInputNode = recordingSectionNode.querySelector('[name="recording"]'),
    titleInputNode = recordingSectionNode.querySelector('[name="title"]'),
    resetButtonNode = recordingSectionNode.querySelector('.reset');

  pageTitleNode.addEventListener('click', function(event) {
    window.history.pushState('', '', '/');
    handleStateChange('');
    event.preventDefault();
  });

  homeButtonNode.addEventListener('click', function() {
    window.history.pushState('', '', '/');
    handleStateChange('');
  });

  resetButtonNode.addEventListener('click', function(event) {
    resetRecording()
    recordingInputNode.focus();
    event.preventDefault();
  });

  function showSection(sectionName) {
    Array.prototype.forEach.call(document.querySelectorAll('.section'), function(sectionNode) {
      if (sectionNode.classList.contains(sectionName)) {
        sectionNode.classList.add('visible');
      }
      else {
        sectionNode.classList.remove('visible');
      }
    });
  }

  function handleStateChange(state) {
    if (state !== null) {
      var id = state;

      if (id) {
        showSection('loading');
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            var response = JSON.parse(xhr.responseText);
            if (response.error) {
              showSection('recording');
              recordingInputNode.focus();
              console.log(response.error); // TODO handle properly
            }
            else if (response.result) {
              showSection('playback');
              playButtonNode.focus();
              titleNode.textContent = response.result.recording.title || 'Untitled recording';
              displayNode.setAttribute('data-recording', JSON.stringify(response.result.recording));
              displayNode.value = '';
              playTape();
            }
          }
        }
        xhr.open('GET', '/' + id + '.json');
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.send(null);
      }
      else {
        showSection('recording');
        recordingInputNode.focus();
      }
    }
  }

  window.addEventListener('popstate', function(event) {
    if (event) {
      handleStateChange(event.state);
    }
  });

  history.replaceState(location.pathname.substr(1), location.pathname.substr(1), location.pathname);
  handleStateChange(location.pathname.substr(1));

  // Recording
  var tape = [],
    baseTime = null,
    mouseAnchor = null,
    recordingContext = recordingInputNode.getContext('2d');

  recordingInputNode.width = recordingInputNode.clientWidth;
  recordingInputNode.height = recordingInputNode.clientHeight;

  recordingInputNode.addEventListener('mousedown', function(event) {
    event.preventDefault();
    mouseAnchor = this;
    var coords = extractMouseCoords(event, mouseAnchor);
    draw(recordingContext, coords, true);
    updateTape(coords, true);
  });

  document.addEventListener('mousemove', function(event) {
    if (mouseAnchor) {
      var coords = extractMouseCoords(event, mouseAnchor);
      draw(recordingContext, coords, false);
      updateTape(coords, false);
    }
  });

  document.addEventListener('mouseup', function() {
    mouseAnchor = null;
  });

  function draw(context, coords, initial) {
    if (initial) {
      context.beginPath();
      context.arc(coords.x, coords.y, 2, 2 * Math.PI, false);
      context.fillStyle = '#000000';
      context.fill();
      context.beginPath();
      context.moveTo(coords.x, coords.y);
    }
    else {
      context.lineTo(coords.x, coords.y);
      context.lineWidth = 3;
      context.lineJoin = 'round';
      context.strokeStyle = '#000000';
      context.stroke();
    }
  }

  function extractMouseCoords(event, mouseAnchor) {
    var offset = documentOffset(mouseAnchor);
    return {
      x: event.pageX - offset.left,
      y: event.pageY - offset.top
    };
  }

  function documentOffset(node) {
    var offsetLeft = 0;
    var offsetTop = 0;
    do {
      offsetLeft += node.offsetLeft;
      offsetTop += node.offsetTop;
    }
    while (node = node.offsetParent);
    return {
      left: offsetLeft,
      top: offsetTop
    };
  }

  function updateTape(coords, initial) {
    var time = 0;
    if (baseTime === null) {
      baseTime = new Date().getTime();
    }
    else {
      time = new Date().getTime() - baseTime;
    }
    tape.push({
      time: time,
      initial: initial,
      coords: coords
    });
  }

  recordingSectionNode.addEventListener('submit', function(event) {
    event.preventDefault();

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        var response = JSON.parse(xhr.responseText);
        if (response.error) {
          console.log(response.error); // TODO handle properly
        }
        else if (response.result) {
          history.pushState(response.result.id, response.result.id, '/' + response.result.id);
          handleStateChange(response.result.id);
        }
      }
    }
    xhr.open('POST', '/');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send(JSON.stringify({
      title: titleInputNode.value,
      data: tape
    }));

    resetRecording();
    showSection('loading');
  });

  function resetRecording() {
    // Fix canvas scaling
    recordingInputNode.width = recordingInputNode.clientWidth;
    recordingInputNode.height = recordingInputNode.clientHeight;
    recordingContext.clearRect(0, 0, recordingInputNode.width, recordingInputNode.height);
    titleInputNode.value = '';
    tape = [];
    baseTime = null;
  }

  // Playback
  var playbackId = 0,
    displayContext = displayNode.getContext('2d');

  function playTape() {
    var currentPlaybackId = ++playbackId,
      tape = JSON.parse(displayNode.getAttribute('data-recording')).data;

    // Fix canvas scaling
    displayNode.width = displayNode.clientWidth;
    displayNode.height = displayNode.clientHeight;

    displayContext.clearRect(0, 0, displayNode.width, displayNode.height);

    function read() {
      if (currentPlaybackId === playbackId) {
        var currentFrameTime = new Date().getTime() - startTime;
        progressBarNode.style.left = parseInt(progressNode.clientWidth * currentFrameTime / totalTapeTime) + 'px';
        while (tape.length && currentFrameTime >= tape[0].time) {
          var head = tape.shift();
          draw(displayContext, head.coords, head.initial);
        }
        if (tape.length) {
          window.requestAnimationFrame(read);
        }
      }
    }

    var startTime = new Date().getTime(),
      totalTapeTime = tape[tape.length - 1].time;
    read();
  }

  playButtonNode.addEventListener('click', playTape);

  tweetButtonNode.addEventListener('click', function() {
    window.location = 'https://twitter.com/intent/tweet?' + ([
      [    'text', 'Drawcorder — share replays of what you draw'],
      ['hashtags', 'drawcorder'                                 ],
      [     'url', window.location.href                         ]
    ]).map(function(item) {
      return encodeURIComponent(item[0]) + '=' + encodeURIComponent(item[1]);
    }).join('&');
  });
});
