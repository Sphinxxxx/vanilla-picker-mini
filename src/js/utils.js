/* Polyfills */

String.prototype.startsWith = String.prototype.startsWith || function(needle) {
    return (this.indexOf(needle) === 0);
};
String.prototype.padStart = String.prototype.padStart || function(len, pad) {
    var str = this;
    while (str.length < len) {
        str = pad + str;
    }
    return str;
};


/* UI utils */

function parseHTML(htmlString) {
    //https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro
    var div = document.createElement('div');
    div.innerHTML = htmlString;
    return div.firstElementChild;
}

function $(selector, context) {
    return (context || document).querySelector(selector);
}

function addEvent(target, type, handler) {
    target.addEventListener(type, handler, false);
}

function stopEvent(e) {
    //Stop an event from bubbling up to the parent:
    e.preventDefault();
    e.stopPropagation();
}

function dragTrack(area, callback) {
    var dragging = false;

    function clamp(val, min, max) {
        return Math.max(min, Math.min(val, max));
    }

    function onMove(e, info, starting) {
        if (starting) { dragging = true; }
        if (!dragging) { return; }

        e.preventDefault();

        var bounds = area.getBoundingClientRect(),
            w = bounds.width,
            h = bounds.height,
            x = info.clientX,
            y = info.clientY;

        var relX = clamp(x - bounds.left, 0, w),
            relY = clamp(y - bounds.top, 0, h);

        callback(relX / w, relY / h);
    }

    function onMouse(e, starting) {
        var button = (e.buttons === undefined) ? e.which : e.buttons;
        if (button === 1) {
            onMove(e, e, starting);
        }
    }

    function onTouch(e, starting) {
        if (e.touches.length === 1) {
            onMove(e, e.touches[0], starting);
        }
    }

    addEvent(area, 'mousedown',   function(e) { onMouse(e, true); });
    addEvent(area, 'touchstart',  function(e) { onTouch(e, true); });
    addEvent(area, 'mousemove',   onMouse);
    addEvent(area, 'touchmove',   onTouch);
    addEvent(area, 'mouseup',     function(e) { dragging = false; });
    addEvent(area, 'touchend',    function(e) { dragging = false; });
    addEvent(area, 'touchcancel', function(e) { dragging = false; });
}
