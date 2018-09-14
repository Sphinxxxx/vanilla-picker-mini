/*!
 * vanilla-picker-mini v1.0.1
 * https://github.com/Sphinxxxx/vanilla-picker-mini
 *
 * Copyright 2017-2018 Andreas Borgen (https://github.com/Sphinxxxx), Adam Brooks (https://github.com/dissimulate)
 * Released under the ISC license.
 */
;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Picker = factory();
  }
}(this, function() {
'use strict';

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

/* Color conversion */

var Color = (function() {

    /**
     * Create a color converter.
     */
    function Color(r, g, b, a) {
        var that = this;
    
        function parseString(input) {
            var a;
    
            function extractNumbers(input) {
                return input.match(/([\-\d\.e]+)/g).map(Number);
            }
    
            //HSL string. Examples:
            //    hsl(120, 60%,  50%) or 
            //    hsla(240, 100%, 50%, .7)
            if (input.startsWith('hsl')) {
                var hsla = extractNumbers(input),
                    h = hsla[0],
                    s = hsla[1],
                    l = hsla[2];
                a = (hsla[3] === undefined) ? 1 : hsla[3];
    
                h /= 360;
                s /= 100;
                l /= 100;
                that.hsla([h, s, l, a]);
            }
    
            //RGB string. Examples:
            //    rgb(51, 170, 51)
            //    rgba(51, 170, 51, .7)
            else if (input.startsWith('rgb')) {
                var rgba = extractNumbers(input),
                    r = rgba[0],
                    g = rgba[1],
                    b = rgba[2];
                a = (rgba[3] === undefined) ? 1 : rgba[3];
    
                that.rgba([r, g, b, a]);
            }
    
            //Hex string:
            else {
                that.rgba(Color.hexToRgb(input));
            }
        }
    
        if (r === undefined) {
            //No color input - the color can be set later through .hsla()/.rgba()/.hex()
        }
        //Single input - RGB(A) array
        else if (Array.isArray(r)) {
            this.rgba(r);
        }
        //Single input - CSS string
        else if (b === undefined) {
            var color = r && ('' + r).trim();
            if (color) {
                parseString(color.toLowerCase());
            }
        }
        else {
            this.rgba([r, g, b, (a === undefined) ? 1 : a]);
        }
    }
    
    var cp = Color.prototype;
    
    /**
     * RGBA representation.
     */
    cp.rgba = function(rgb) {
        //get
        if(!rgb) {
            if (this._rgba) {
                return this._rgba;
            }
            if (!this._hsla) {
                throw new Error('No color is set');
            }
    
            return this._rgba = Color.hslToRgb(this._hsla);
        }
        //set
        else {
            if (rgb.length === 3) {
                rgb[3] = 1;
            }
    
            this._rgba = rgb;
            this._hsla = null;
        }
    };
    cp.rgbString = function() {
        return 'rgb(' + this.rgba().slice(0, 3) + ')';
    };
    cp.rgbaString = function() {
        return 'rgba(' + this.rgba() + ')';
    };
    
    /**
     * HSLA representation.
     */
    cp.hsla = function(hsl) {
        //get
        if(!hsl) {
            if (this._hsla) {
                return this._hsla;
            }
            if (!this._rgba) {
                throw new Error('No color is set');
            }
    
            return this._hsla = Color.rgbToHsl(this._rgba);
        }
        //set
        else {
            if (hsl.length === 3) {
                hsl[3] = 1;
            }
    
            this._hsla = hsl;
            this._rgba = null;
        }
    };
    cp.hslString = function() {
        var c = this.hsla();
        return 'hsl(' + c[0] * 360 + ',' + c[1] * 100 + '%,' + c[2] * 100 + '%)';
    };
    cp.hslaString = function() {
        var c = this.hsla();
        return 'hsla(' + c[0] * 360 + ',' + c[1] * 100 + '%,' + c[2] * 100 + '%,' + c[3] + ')';
    };
    
    /**
     * HEX representation.
     */
    cp.hex = function(val) {
        //get
        if(!val) {
            var rgb = this.rgba(),
                hex = rgb.map(function(x, i) {
                    return (i < 3) ? x.toString(16) : Math.round(x * 255).toString(16);
                });
    
            return '#' + hex.map(function(x) {
                return x.padStart(2, '0');
            }).join('');
        }
        //set
        else {
            this.rgba(Color.hexToRgb(val));
        }
    };
    
    /**
     * Splits a HEX string into its RGB(A) components.
     */
    Color.hexToRgb = function(input) {
        //Normalize all hex codes (3/4/6/8 digits) to 8 digits RGBA
        var hex = (input.startsWith('#') ? input.slice(1) : input)
            .replace(/^(\w{3})$/,          '$1F')               //987    -> 987F
            .replace(/^(\w)(\w)(\w)(\w)$/, '$1$1$2$2$3$3$4$4')  //9876   -> 99887766
            .replace(/^(\w{6})$/,          '$1FF');             //987654 -> 987654FF
    
        if (!hex.match(/^([0-9a-fA-F]{8})$/)) {
            throw new Error('Unknown hex color: ' + input);
        }
    
        var rgba = hex.match(/^(\w\w)(\w\w)(\w\w)(\w\w)$/).slice(1) //98765432 -> 98 76 54 32
                      .map(function(x) {
                          return parseInt(x, 16); //Hex to decimal
                      });
    
        rgba[3] = rgba[3] / 255;
        return rgba;
    };
    
    /**
     * https://gist.github.com/mjackson/5311256
     * 
     * Converts an RGB color value to HSL. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes r, g, and b are contained in the set [0, 255] and
     * returns h, s, and l in the set [0, 1].
     */
    Color.rgbToHsl = function(vals) {
        var r = vals[0],
            g = vals[1],
            b = vals[2],
            a = vals[3];
    
        r /= 255;
        g /= 255;
        b /= 255;
    
        var max = Math.max(r, g, b),
            min = Math.min(r, g, b);
    
        var h, s, l = (max + min) / 2;
    
        if (max === min) {
            h = s = 0; // achromatic
        }
        else {
            var d = max - min;
            s = (l > 0.5) ? d / (2 - max - min) 
                          : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
    
            h /= 6;
        }
    
        return [h, s, l, a];
    };
    
    /**
     * https://gist.github.com/mjackson/5311256
     * 
     * Converts an HSL color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes h, s, and l are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     */
    Color.hslToRgb = function(vals) {
        var h = vals[0],
            s = vals[1],
            l = vals[2],
            a = vals[3];
    
        var r, g, b;
    
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }
    
        if (s === 0) {
            r = g = b = l; // achromatic
        }
        else {
            var q = (l < 0.5) ? l * (1 + s) 
                              : l + s - (l * s),
                p = (2 * l) - q;
    
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
    
        var rgba = [r * 255, g * 255, b * 255].map(Math.round);
        rgba[3] = a;
    
        return rgba;
    };


    return Color;    
})();

/*global HTMLElement*/

/*global $*/
/*global parseHTML*/
/*global addEvent*/
/*global stopEvent*/
/*global dragTrack*/
/*global Color*/


/* Color picker */

var Picker = (function() {

    var BG_TRANSP = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'2\' height=\'2\'%3E%3Cpath d=\'M1,0H0V1H2V2H1\' fill=\'lightgrey\'/%3E%3C/svg%3E")';
    var HUES = 360;

    //We need to use keydown instead of keypress to handle Esc from the editor textbox:
    var EVENT_KEY = 'keydown'; //'keypress'
    function onKey(target, keys, handler) {
        addEvent(target, EVENT_KEY, function(e) {
            if (keys.indexOf(e.key) >= 0) {
                handler(e);
            }
        });
    }
    
    //Inlined Picker CSS:
    document.documentElement.firstElementChild //<head>, or <body> if there is no <head>
                            .appendChild(document.createElement('style')).textContent = '.picker_wrapper.no_alpha .picker_alpha{display:none}.picker_wrapper.no_editor .picker_editor{position:absolute;z-index:-1;opacity:0}.layout_default.picker_wrapper{display:flex;flex-flow:row wrap;justify-content:space-between;align-items:stretch;font-size:10px;width:25em;padding:.5em}.layout_default.picker_wrapper input,.layout_default.picker_wrapper button{font-size:1rem}.layout_default.picker_wrapper>*{margin:.5em}.layout_default.picker_wrapper::before{content:\'\';display:block;width:100%;height:0;order:1}.layout_default .picker_slider,.layout_default .picker_selector{padding:1em}.layout_default .picker_hue{width:100%}.layout_default .picker_sl{flex:1 1 auto}.layout_default .picker_sl::before{content:\'\';display:block;padding-bottom:100%}.layout_default .picker_editor{order:1;width:6rem}.layout_default .picker_editor input{width:calc(100% + 2px);height:calc(100% + 2px)}.layout_default .picker_sample{order:1;flex:1 1 auto}.layout_default .picker_done{order:1}.picker_wrapper{box-sizing:border-box;background:#f2f2f2;box-shadow:0 0 0 1px silver;cursor:default;font-family:sans-serif;color:#444;pointer-events:auto}.picker_wrapper:focus{outline:none}.picker_wrapper button,.picker_wrapper input{margin:-1px}.picker_selector{position:absolute;z-index:1;display:block;transform:translate(-50%, -50%);border:2px solid white;border-radius:100%;box-shadow:0 0 3px 1px #67b9ff;background:currentColor;cursor:pointer}.picker_slider .picker_selector{border-radius:2px}.picker_hue{position:relative;background-image:linear-gradient(90deg, red, yellow, lime, cyan, blue, magenta, red);box-shadow:0 0 0 1px silver}.picker_sl{position:relative;box-shadow:0 0 0 1px silver;background-image:linear-gradient(180deg, white, rgba(255,255,255,0) 50%),linear-gradient(0deg, black, rgba(0,0,0,0) 50%),linear-gradient(90deg, gray, rgba(128,128,128,0))}.picker_alpha,.picker_sample{position:relative;background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'2\' height=\'2\'%3E%3Cpath d=\'M1,0H0V1H2V2H1\' fill=\'lightgrey\'/%3E%3C/svg%3E") left top/contain white;box-shadow:0 0 0 1px silver}.picker_alpha .picker_selector,.picker_sample .picker_selector{background:none}.picker_editor input{box-sizing:border-box;font-family:monospace;padding:.1em .2em}.picker_sample::before{content:\'\';position:absolute;display:block;width:100%;height:100%;background:currentColor}.picker_done button{box-sizing:border-box;padding:.2em .5em;cursor:pointer}.picker_arrow{position:absolute;z-index:-1}.picker_wrapper.popup{position:absolute;z-index:2;margin:1.5em}.picker_wrapper.popup,.picker_wrapper.popup .picker_arrow::before,.picker_wrapper.popup .picker_arrow::after{background:#f2f2f2;box-shadow:0 0 10px 1px rgba(0,0,0,0.4)}.picker_wrapper.popup .picker_arrow{width:3em;height:3em;margin:0}.picker_wrapper.popup .picker_arrow::before,.picker_wrapper.popup .picker_arrow::after{content:"";display:block;position:absolute;top:0;left:0;z-index:-99}.picker_wrapper.popup .picker_arrow::before{width:100%;height:100%;transform:skew(45deg);transform-origin:0 100%}.picker_wrapper.popup .picker_arrow::after{width:150%;height:150%;box-shadow:none}.popup.popup_top{bottom:100%;left:0}.popup.popup_top .picker_arrow{bottom:0;left:0;transform:rotate(-90deg)}.popup.popup_bottom{top:100%;left:0}.popup.popup_bottom .picker_arrow{top:0;left:0;transform:rotate(90deg) scale(1, -1)}.popup.popup_left{top:0;right:100%}.popup.popup_left .picker_arrow{top:0;right:0;transform:scale(-1, 1)}.popup.popup_right{top:0;left:100%}.popup.popup_right .picker_arrow{top:0;left:0}';
    
    /**
     * A callback that gets the picker's current color value.
     * 
     * @callback Picker~colorCallback
     * @param {Object} color
     * @param {function}  color.rgba        - Gets the RGBA color components.
     * @param {function}  color.hsla        - Gets the HSLA color components (all values between 0 and 1, inclusive).
     * @param {function}  color.rgbString   - Gets the RGB  CSS value (e.g. `rgb(255,215,0)`).
     * @param {function}  color.rgbaString  - Gets the RGBA CSS value (e.g. `rgba(255,215,0, .5)`).
     * @param {function}  color.hslString   - Gets the HSL  CSS value (e.g. `hsl(50.6,100%,50%)`).
     * @param {function}  color.hslaString  - Gets the HSLA CSS value (e.g. `hsla(50.6,100%,50%, .5)`).
     * @param {function}  color.hex         - Gets the 8 digit #RRGGBBAA (not supported in all browsers).
     */
    
    /**
     * Create a color picker.
     * 
     * @example
     * var picker = new Picker(myParentElement);
     * picker.onDone = function(color) {
     *     myParentElement.style.backgroundColor = color.rgbaString();
     * };
     * 
     * @example
     * var picker = new Picker({
     *     parent: myParentElement,
     *     color: 'gold',
     *     onChange: function(color) {
     *                   myParentElement.style.backgroundColor = color.rgbaString();
     *               },
     * });
     * 
     * @param {Object} options - @see {@linkcode Picker#setOptions|setOptions()}
     */
    function Picker(options) {
        var that = this;
    
        //Default settings
        this.settings = {
            //Allow creating a popup without putting it on screen yet.
            //  parent: document.body,
            popup: 'right',
            layout: 'default',
            alpha: true,
            editor: true
        };
    
        //Keep openHandler() pluggable, but call it in the right context:
        //https://stackoverflow.com/questions/46014034/es6-removeeventlistener-from-arrow-function-oop
        this._openProxy = function(e) {
            that.openHandler(e);
        };
    
        /**
         * Callback whenever the color changes.
         * @member {Picker~colorCallback}
         */
        this.onChange = null;
        /**
         * Callback when the user clicks "Ok".
         * @member {Picker~colorCallback}
         */
        this.onDone = null;
        /**
         * Callback when the popup opens.
         * @member {Picker~colorCallback}
         */
        this.onOpen = null;
        /**
         * Callback when the popup closes.
         * @member {Picker~colorCallback}
         */
        this.onClose = null;
    
        this.setOptions(options);
    }
    
    var pp = Picker.prototype;
    
    /**
     * Set the picker options.
     * 
     * @param {Object}       options
     * @param {HTMLElement}  options.parent          - Which element the picker should be attached to.
     * @param {('top'|'bottom'|'left'|'right'|false)}
     *                       [options.popup=right]    - If the picker is used as a popup, where to place it relative to the parent. `false` to add the picker as a normal child element of the parent.
     * @param {string}       [options.template]       - Custom HTML string from which to build the picker. See /src/picker.pug for required elements and class names.
     * @param {string}       [options.layout=default] - Suffix of a custom "layout_..." CSS class to handle the overall arrangement of the picker elements.
     * @param {boolean}      [options.alpha=true]     - Whether to enable adjusting the alpha channel.
     * @param {boolean}      [options.editor=true]    - Whether to show a text field for color value editing.
     * @param {string}       [options.color]          - Initial color for the picker.
     * @param {function}     [options.onChange]       - @see {@linkcode Picker#onChange|onChange}
     * @param {function}     [options.onDone]         - @see {@linkcode Picker#onDone|onDone}
     * @param {function}     [options.onOpen]         - @see {@linkcode Picker#onOpen|onOpen}
     * @param {function}     [options.onClose]        - @see {@linkcode Picker#onClose|onClose}
     */
    pp.setOptions = function(options) {
        if (!options) { return; }
        var settings = this.settings;
    
        function transfer(source, target, skipKeys) {
            for (var key in source) {
                if (skipKeys && skipKeys.indexOf(key) >= 0) {
                    continue;
                }
    
                target[key] = source[key];
            }
        }
    
        if (options instanceof HTMLElement) {
            settings.parent = options;
        }
        else {
            //New parent?
            if (settings.parent && options.parent && settings.parent !== options.parent) {
                settings.parent.removeEventListener('click', this._openProxy, false);
                this._popupInited = false;
            }
    
            transfer(options, settings /*, skipKeys*/);
    
            //Event callbacks. Hook these up before setColor() below,
            //because we'll need to fire onChange() if there is a color in the options
            if (options.onChange) {
                this.onChange = options.onChange;
            }
            if (options.onDone) {
                this.onDone = options.onDone;
            }
            if (options.onOpen) {
                this.onOpen = options.onOpen;
            }
            if (options.onClose) {
                this.onClose = options.onClose;
            }
    
            //Note: Look for color in 'options', as a color value in 'settings' may be an old one we don't want to revert to.
            var col = options.color;
            if (col) {
                this._setColor(col);
            }
        }
    
        //Init popup behavior once we have all the parts we need:
        var parent = settings.parent;
        if (parent && settings.popup && !this._popupInited) {
    
            addEvent(parent, 'click', this._openProxy);
    
            //Keyboard navigation: Open on [Space] or [Enter]
            //https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values#Whitespace_keys
            onKey(parent, [' ', 'Spacebar', 'Enter'], this._openProxy);
    
            //This must wait until we have created our DOM..
            //  addEvent(window, 'mousedown', (e) => this.closeHandler(e));
            //  addEvent(this._domOkay, 'click', (e) => this.closeHandler(e));
    
            this._popupInited = true;
        }
        else if (options.parent && !settings.popup) {
            this.show();
        }
    };
    
    /**
     * Default behavior for opening the popup
     */
    pp.openHandler = function(e) {
        if (this.show()) {
            //If the parent is an <a href="#"> element, avoid scrolling to the top:
            e && e.preventDefault();
    
            //A trick to avoid re-opening the dialog if you click the parent element while the dialog is open:
            this.settings.parent.style.pointerEvents = 'none';
    
            //Recommended popup behavior with keyboard navigation from http://whatsock.com/tsg/Coding%20Arena/Popups/Popup%20(Internal%20Content)/demo.htm
            //Wait a little before focusing the textbox, in case the dialog was just opened with [Space] (would overwrite the color value with a " "):
            var toFocus = (e && (e.type === EVENT_KEY)) ? this._domEdit : this.domElement;
            setTimeout(function() {
                toFocus.focus();
            }, 100);
    
            if (this.onOpen) {
                this.onOpen(this.color);
            }
        }
    };
    
    /**
     * Default behavior for closing the popup
     */
    pp.closeHandler = function(e) {
        var parent = this.settings.parent,
            doHide = false;
    
        //Close programmatically:
        if (!e) {
            doHide = true;
        }
        //Close by clicking/tabbing outside the popup:
        else if (e.type === 'mousedown' || e.type === 'focusin') {
    
            //Note: Now that we have added the 'focusin' event,
            //this trick requires the picker wrapper to be focusable (via `tabindex` - see /src/picker.pug),
            //or else the popup loses focus if you click anywhere on the picker's background.
            if (!this.domElement.contains(e.target)) {
                doHide = true;
            }
        }
        //Close by clicking "Ok" or pressing "Esc":
        else {
            //Don't bubble the click up to the parent, because that's the trigger to re-open the popup:
            stopEvent(e);
    
            doHide = true;
        }
    
        if (doHide && this.hide()) {
            parent.style.pointerEvents = '';
    
            //Recommended popup behavior from http://whatsock.com/tsg/Coding%20Arena/Popups/Popup%20(Internal%20Content)/demo.htm
            parent.focus();
    
            if (this.onClose) {
                this.onClose(this.color);
            }
        }
    };
    
    /**
     * Move the popup to a different parent, optionally opening it at the same time.
     *
     * @param {Object}  options - @see {@linkcode Picker#setOptions|setOptions()} (Usually a new `.parent` and `.color`).
     * @param {boolean} open    - Whether to open the popup immediately.
     */
    pp.movePopup = function(options, open) {
        //Cleanup if the popup is currently open (at least revert the current parent's .pointerEvents);
        this.closeHandler();
    
        this.setOptions(options);
        if (open) {
            this.openHandler();
        }
    };
    
    /**
     * Set/initialize the picker's color.
     * 
     * @param {string}  color  - RGBA/HSLA/HEX string, or RGBA array.
     * @param {boolean} silent - If true, won't trigger onChange.
     */
    pp.setColor = function(color, silent) {
        this._setColor(color, { silent: silent });
    };
    
    pp._setColor = function(color, flags) {
        if(typeof color === 'string') { color = color.trim(); }
        if (!color) { return; }
    
        flags = flags || {};
        var c;
        try {
            //Will throw on unknown colors
            c = new Color(color);
        }
        catch (ex) {
            if(flags.failSilently) { return; }
            throw ex;
        }
    
        if (!this.settings.alpha) {
            var hsla = c.hsla();
            hsla[3] = 1;
            c.hsla(hsla);
        }
        this.color = c;
        this._setHSLA(null, null, null, null, flags);
    };
    
    /**
     * Show/open the picker.
     */
    pp.show = function() {
        var settings = this.settings;
        if (!settings.parent) { return false; }
    
        //Unhide html if it exists
        if (this.domElement) {
            var toggled = this._toggleDOM(true);
    
            //Things could have changed through setOptions():
            this._setPosition();
    
            return toggled;
        }
    
        var html = settings.template || '<div class="picker_wrapper" tabindex="-1"><div class="picker_arrow"></div><div class="picker_hue picker_slider"><div class="picker_selector"></div></div><div class="picker_sl"><div class="picker_selector"></div></div><div class="picker_alpha picker_slider"><div class="picker_selector"></div></div><div class="picker_editor"><input aria-label="Type a color name or hex value"/></div><div class="picker_sample"></div><div class="picker_done"><button>Ok</button></div></div>';
        var wrapper = parseHTML(html);
    
        this.domElement = wrapper;
        this._domH =      $('.picker_hue', wrapper);
        this._domSL =     $('.picker_sl', wrapper);
        this._domA =      $('.picker_alpha', wrapper);
        this._domEdit =   $('.picker_editor input', wrapper);
        this._domSample = $('.picker_sample', wrapper);
        this._domOkay =   $('.picker_done button', wrapper);
    
        wrapper.classList.add('layout_' + settings.layout);
        if (!settings.alpha) {
            wrapper.classList.add('no_alpha');
        }
        if (!settings.editor) {
            wrapper.classList.add('no_editor');
        }
        this._ifPopup(function() {
            wrapper.classList.add('popup');
        });
    
        this._setPosition();
    
        if (this.color) {
            this._updateUI();
        }
        else {
            this._setColor('#0cf');
        }
        this._bindEvents();
    
        return true;
    };
    
    /**
     * Hide the picker.
     */
    pp.hide = function() {
        return this._toggleDOM(false);
    };
    
    /**
     * Handle user input.
     * 
     * @private
     */
    pp._bindEvents = function() {
        var that = this,
            dom = this.domElement;
    
        //Prevent clicks while dragging from bubbling up to the parent:
        addEvent(dom, 'click', function(e) {
            e.preventDefault();
        });
    
        /* Draggable color selection */
    
        //Select hue
        dragTrack(this._domH, function(x, y) {
            that._setHSLA(x);
        });
    
        //Select saturation/lightness
        dragTrack(this._domSL, function(x, y) {
            that._setHSLA(null, x, 1 - y);
        });
    
        //Select alpha
        if (this.settings.alpha) {
            dragTrack(this._domA, function(x, y) {
                that._setHSLA(null, null, null, 1 - y);
            });
        }
    
        /* Direct color value editing */
    
        //Always init the editor, for accessibility and screen readers (we'll hide it with CSS if `!settings.editor`)
        var editInput = this._domEdit;
        /*if(this.settings.editor)*/{
    
            addEvent(editInput, 'input', function(e) {
                that._setColor(this.value, { fromEditor: true, failSilently: true });
            });
    
            //Select all text on focus:
            addEvent(editInput, 'focus', function(e) {
                var input = this;
                //If no current selection:
                if (input.selectionStart === input.selectionEnd) {
                    input.select();
                }
            });
        }
    
        /* Close the dialog */
    
        function popupCloseProxy(e) {
            that._ifPopup(function() {
                that.closeHandler(e);
            });
        }
        function onDoneProxy(e) {
            that._ifPopup(function() {
                that.closeHandler(e);
            });
            if (that.onDone) {
                that.onDone(that.color);
            }
        }
    
        addEvent(window, 'mousedown', popupCloseProxy);
        addEvent(window, 'focusin',   popupCloseProxy); //Keyboard navigation, closeHandler() will check if focus has moved outside the popup.
        onKey(dom, ['Esc', 'Escape'], popupCloseProxy);
    
        addEvent(this._domOkay, 'click', onDoneProxy);
        onKey(dom, ['Enter'], onDoneProxy);
    };
    
    /**
     * Position the picker on screen.
     * 
     * @private
     */
    pp._setPosition = function() {
        var parent = this.settings.parent,
            elm = this.domElement;
    
        if (parent !== elm.parentNode) {
            parent.appendChild(elm);
        }
    
        this._ifPopup(function(popup) {
    
            //Allow for absolute positioning of the picker popup:
            if (getComputedStyle(parent).position === 'static') {
                parent.style.position = 'relative';
            }
    
            var cssClass = (popup === true) ? 'popup_right' : 'popup_' + popup;
    
            ['popup_top', 'popup_bottom', 'popup_left', 'popup_right'].forEach(function(c) {
                //Because IE doesn't support .classList.toggle()'s second argument...
                if (c === cssClass) {
                    elm.classList.add(c);
                }
                else {
                    elm.classList.remove(c);
                }
            });
    
            //Allow for custom placement via CSS:
            elm.classList.add(cssClass);
        });
    };
    
    /**
     * "Hub" for all color changes
     * 
     * @private
     */
    pp._setHSLA = function(h, s, l, a, flags) {
        flags = flags || {};
    
        var col = this.color,
            hsla = col.hsla();
    
        [h, s, l, a].forEach(function(x, i) {
            if (x || x === 0) {
                hsla[i] = x;
            }
        });
        col.hsla(hsla);
    
        this._updateUI(flags);
    
        if (this.onChange && !flags.silent) {
            this.onChange(col);
        }
    };
    
    pp._updateUI = function(flags) {
        if (!this.domElement) { return; }
        flags = flags || {};
    
        var col = this.color,
            hsl = col.hsla(),
            cssHue = 'hsl(' + hsl[0] * HUES + ', 100%, 50%)',
            cssHSL = col.hslString(),
            cssHSLA = col.hslaString();
    
        var uiH = this._domH,
            uiSL = this._domSL,
            uiA = this._domA,
            thumbH =  $('.picker_selector', uiH),
            thumbSL = $('.picker_selector', uiSL),
            thumbA =  $('.picker_selector', uiA);
    
        function posX(parent, child, relX) {
            child.style.left = relX * 100 + '%'; //(parent.clientWidth * relX) + 'px';
        }
        function posY(parent, child, relY) {
            child.style.top = relY * 100 + '%'; //(parent.clientHeight * relY) + 'px';
        }
    
        /* Hue */
    
        posX(uiH, thumbH, hsl[0]);
    
        //Use the fully saturated hue on the SL panel and Hue thumb:
        this._domSL.style.backgroundColor = this._domH.style.color = cssHue;
    
        /* S/L */
    
        posX(uiSL, thumbSL, hsl[1]);
        posY(uiSL, thumbSL, 1 - hsl[2]);
    
        //Use the opaque HSL on the SL thumb:
        uiSL.style.color = cssHSL;
    
        /* Alpha */
    
        posY(uiA, thumbA, 1 - hsl[3]);
    
        var opaque = cssHSL,
            transp = opaque.replace('hsl', 'hsla').replace(')', ', 0)'),
            bg = 'linear-gradient(' + [opaque, transp] + ')';
    
        //Let the Alpha slider fade from opaque to transparent:
        this._domA.style.backgroundImage = bg + ', ' + BG_TRANSP;
    
        /* Editable value */
    
        //Don't update the editor if the user is typing.
        //That creates too much noise because of our auto-expansion of 3/4/6 -> 8 digit hex codes.
        if (!flags.fromEditor) {
            var hex = col.hex();
            this._domEdit.value = this.settings.alpha ? hex : hex.substr(0, 7);
        }
    
        /* Sample swatch */
    
        this._domSample.style.color = cssHSLA;
    };
    
    pp._ifPopup = function(actionIf, actionElse) {
        var settings = this.settings;
        if (settings.parent && settings.popup) {
            actionIf && actionIf(settings.popup);
        }
        else {
            actionElse && actionElse();
        }
    };
    
    pp._toggleDOM = function(toVisible) {
        var dom = this.domElement;
        if (!dom) { return false; }
    
        var displayStyle = toVisible ? '' : 'none',
            toggle = dom.style.display !== displayStyle;
    
        if (toggle) {
            dom.style.display = displayStyle;
        }
        return toggle;
    };


    return Picker;
})();


return Picker;
}));
