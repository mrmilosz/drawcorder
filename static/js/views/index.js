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
    mouseAnchor = null;

  recordingInputNode.addEventListener('mousedown', function(event) {
    event.preventDefault();
    if (event.which === 1) {
      mouseAnchor = this;
      var coords = extractMouseCoords(event, mouseAnchor);
      painter.paint(recordingInputNode, coords);
      updateTape(coords, 'initial');
    }
  });

  document.addEventListener('mousemove', function(event) {
    if (mouseAnchor) {
      var coords = extractMouseCoords(event, mouseAnchor);
      painter.paint(coords);
      updateTape(coords);
    }
  });

  document.addEventListener('mouseup', function() {
    if (event.which === 1) {
      mouseAnchor = null;
    }
  });

  undoButtonNode.addEventListener('click', function(event) {
    event.preventDefault();
    updateTape(null, 'undo');
    painter.undo(recordingInputNode);
  });

  redoButtonNode.addEventListener('click', function(event) {
    event.preventDefault();
    updateTape(null, 'redo');
    painter.redo(recordingInputNode);
  });

  var painter = {
    context: null,
    undoStack: [],
    paint: function(container, coords) {
      if (arguments.length >= 2) {
        var canvasNode = document.createElement('canvas');
        container.appendChild(canvasNode);
        canvasNode.width = canvasNode.clientWidth;
        canvasNode.height = canvasNode.clientHeight;
        this.context = canvasNode.getContext('2d');
        this.context.beginPath();
        this.context.arc(coords.x, coords.y, 2, 2 * Math.PI, false);
        this.context.fillStyle = '#000000';
        this.context.fill();
        this.context.beginPath();
        this.context.moveTo(coords.x, coords.y);
      }
      else {
        coords = container;
        this.context.lineTo(coords.x, coords.y);
        this.context.lineWidth = 3;
        this.context.lineJoin = 'round';
        this.context.strokeStyle = '#000000';
        this.context.stroke();
      }
    },
    undo: function(container) {
      var lastCanvasNode = container.querySelector('canvas:last-child');
      if (lastCanvasNode) {
        this.undoStack.push(lastCanvasNode);
        container.removeChild(lastCanvasNode);
      }
    },
    redo: function(container) {
      if (this.undoStack.length) {
        container.appendChild(this.undoStack.pop());
      }
    },
    reset: function(container) {
      this.context = null;
      this.undoStack = [];
      Array.prototype.forEach.call(container.querySelectorAll('canvas'), function(canvasNode) {
        container.removeChild(canvasNode);
      });
    }
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
    painter.reset(recordingInputNode);
    titleInputNode.value = '';
    tape = [];
    baseTime = null;
  }

  // Playback
  var playbackId = 0;

  function playTape() {
    var currentPlaybackId = ++playbackId,
      tape = JSON.parse(displayNode.getAttribute('data-recording')).data;

    function read() {
      if (currentPlaybackId === playbackId) {
        var currentFrameTime = new Date().getTime() - startTime;
        progressBarNode.style.left = parseInt(progressNode.clientWidth * currentFrameTime / totalTapeTime) + 'px';
        while (tape.length && currentFrameTime >= tape[0].time) {
          var head = tape.shift();
          if (head.special === 'initial') {
            painter.paint(displayNode, head.coords);
          }
          else if (head.special === 'undo') {
            painter.undo(displayNode);
          }
          else if (head.special === 'redo') {
            painter.redo(displayNode);
          }
          else {
            painter.paint(head.coords);
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
