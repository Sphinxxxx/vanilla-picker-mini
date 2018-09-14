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
    
    var EVENT_CLICK_OUTSIDE = 'mousedown';
    var EVENT_TAB_MOVE = 'focusin';

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
                            .appendChild(document.createElement('style')).textContent = '## PLACEHOLDER-CSS ##';
    
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
            event = e && e.type,
            doHide = false;
    
        //Close programmatically:
        if (!e) {
            doHide = true;
        }
        //Close by clicking/tabbing outside the popup:
        else if (event === EVENT_CLICK_OUTSIDE || event === EVENT_TAB_MOVE) {
    
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
            //However, we don't re-focus the parent if the user closes the popup by clicking somewhere else on the screen,
            //because they may have scrolled to a different part of the page by then, and focusing would then inadvertently scroll the parent back into view:
            if(event !== EVENT_CLICK_OUTSIDE) {
                parent.focus();
            }
    
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
    
        var html = settings.template || '## PLACEHOLDER-HTML ##';
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
    
        addEvent(window, EVENT_CLICK_OUTSIDE, popupCloseProxy);
        addEvent(window, EVENT_TAB_MOVE,      popupCloseProxy); //Keyboard navigation, closeHandler() will check if focus has moved outside the popup.
        onKey(   dom,    ['Esc', 'Escape'],   popupCloseProxy);
    
        addEvent(this._domOkay, 'click',   onDoneProxy);
        onKey(   dom,           ['Enter'], onDoneProxy);
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
