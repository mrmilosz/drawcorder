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
    recordingInputNode = recordingSectionNode.querySelector('.input'),
    titleInputNode = recordingSectionNode.querySelector('[name="title"]'),
    undoButtonNode = recordingSectionNode.querySelector('.undo'),
    redoButtonNode = recordingSectionNode.querySelector('.redo'),
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
        stopTape();
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
    recordingPainter = new Painter(recordingInputNode);

  recordingInputNode.addEventListener('mousedown', function(event) {
    event.preventDefault();
    if (event.which === 1) {
      mouseAnchor = this;
      var coords = extractMouseCoords(event, mouseAnchor);
      recordingPainter.layer(coords);
      updateTape(coords, 'initial');
    }
  });

  document.addEventListener('mousemove', function(event) {
    if (mouseAnchor) {
      var coords = extractMouseCoords(event, mouseAnchor);
      recordingPainter.paint(coords);
      updateTape(coords);
    }
  });

  document.addEventListener('mouseup', function() {
    mouseAnchor = null;
  });

  undoButtonNode.addEventListener('click', function(event) {
    event.preventDefault();
    updateTape(null, 'undo');
    recordingPainter.undo();
  });

  redoButtonNode.addEventListener('click', function(event) {
    event.preventDefault();
    updateTape(null, 'redo');
    recordingPainter.redo();
  });

  function Painter(container) {
    this.container = container;
    this.context = null;
    this.undoStack = [];
  };

  Painter.prototype.layer = function(coords) {
    var canvasNode = document.createElement('canvas');
    this.container.appendChild(canvasNode);
    canvasNode.width = canvasNode.clientWidth;
    canvasNode.height = canvasNode.clientHeight;
    this.context = canvasNode.getContext('2d');
    this.context.beginPath();
    this.context.arc(coords.x, coords.y, 2, 2 * Math.PI, false);
    this.context.fillStyle = '#000000';
    this.context.fill();
    this.context.beginPath();
    this.context.moveTo(coords.x, coords.y);
  };

  Painter.prototype.paint = function(coords) {
    this.context.lineTo(coords.x, coords.y);
    this.context.lineWidth = 3;
    this.context.lineJoin = 'round';
    this.context.strokeStyle = '#000000';
    this.context.stroke();
  };
  
  Painter.prototype.undo = function() {
    var lastCanvasNode = this.container.querySelector('canvas:last-child');
    if (lastCanvasNode) {
      this.undoStack.push(lastCanvasNode);
      this.container.removeChild(lastCanvasNode);
    }
  };

  Painter.prototype.redo = function() {
    if (this.undoStack.length) {
      this.container.appendChild(this.undoStack.pop());
    }
  };
  
  Painter.prototype.reset = function() {
    this.context = null;
    this.undoStack = [];
    var self = this;
    Array.prototype.forEach.call(this.container.querySelectorAll('canvas'), function(canvasNode) {
      self.container.removeChild(canvasNode);
    });
  };

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

  function updateTape(coords, special) {
    var time = 0;
    if (baseTime === null) {
      baseTime = new Date().getTime();
    }
    else {
      time = new Date().getTime() - baseTime;
    }
    tape.push({
      time: time,
      special: special,
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
    recordingPainter.reset(recordingInputNode);
    titleInputNode.value = '';
    tape = [];
    baseTime = null;
  }

  // Playback
  var playbackId = 0,
    playbackPainter = new Painter(displayNode);

  function playTape() {
    var currentPlaybackId = ++playbackId,
      tape = JSON.parse(displayNode.getAttribute('data-recording')).data;

    playbackPainter.reset(displayNode);

    function read() {
      if (currentPlaybackId === playbackId) {
        var currentFrameTime = new Date().getTime() - startTime;
        progressBarNode.style.left = parseInt(progressNode.clientWidth * currentFrameTime / totalTapeTime) + 'px';
        while (tape.length && currentFrameTime >= tape[0].time) {
          var head = tape.shift();
          if (head.special === 'initial') {
            playbackPainter.layer(head.coords);
          }
          else if (head.special === 'undo') {
            playbackPainter.undo();
          }
          else if (head.special === 'redo') {
            playbackPainter.redo();
          }
          else {
            playbackPainter.paint(head.coords);
          }
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

  function stopTape() {
    ++playbackId;
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
