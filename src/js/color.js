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
