# vanilla-picker-mini

[![License](https://flat.badgen.net/badge/license/ISC/green)](https://github.com/Sphinxxxx/vanilla-picker-mini/blob/master/LICENSE.md)
[![Size](https://flat.badgen.net/badgesize/gzip/sphinxxxx/vanilla-picker-mini/master/dist/vanilla-picker-mini.min.js?label=min%2Bgzip)](https://github.com/Sphinxxxx/vanilla-picker-mini/tree/master/dist)

A simple, easy to use color picker with alpha selection.

This is a smaller version of [vanilla-picker](https://vanilla-picker.js.org/) 2.5.0, made for submission to the [MicroJS.com](http://microjs.com/) catalog.
The only difference from the full version is the lack of support for color *names*. This means you need to set the picker's color values in **`hex`/`rgba`/`hsla`** notation, and not "red", "yellowgreen" or "mediumaquamarine".

#### Demo

https://codepen.io/Sphinxxxx/pen/xazoQN


## Getting Started

#### Installing

Download `vanilla-picker-mini.js` from the `/dist` folder, or use a CDN:

```
<script src="https://cdn.rawgit.com/Sphinxxxx/vanilla-picker-mini/v1.0.2/dist/vanilla-picker-mini.min.js"></script>
```

#### Usage

```html
<div id="parent">Click me</div>

<script>

    /*
        Create a new Picker instance and set the parent element.
        By default, the color picker is a popup which appears when you click the parent.
    */
    var parent = document.querySelector('#parent');
    var picker = new Picker(parent);

    /*
        You can do what you want with the chosen color using two callbacks: onChange and onDone.
    */
    picker.onChange = function(color) {
        parent.style.background = color.rgbaString();
    };

    /* onDone is similar to onChange, but only called when you click 'Ok' */

</script>
```


## Options

```javascript
var picker = new Picker({

    parent:               /* Which element the picker should be attached to */

    /* If the picker is used as a popup, where to place it relative to the parent */
    popup:     'right'    //Default
               'left'
               'top'
               'bottom'
                false     //No popup, just add the picker as a normal child element of the parent

    template:             /* Custom HTML string from which to build the picker. See /src/picker.pug for required elements and class names */

    layout:    'default'  /* Suffix of a custom "layout_..." CSS class to handle the overall arrangement of the picker elements */

    alpha:      true      /* Whether to enable adjusting the alpha channel */

    editor:     true      /* Whether to show a text field for color value editing */

    color:                /* Initial color for the picker        (or call picker.setColor()) */

    onChange:             /* Callback whenever the color changes (or set  picker.onChange) */

    onDone:               /* Callback when the user clicks "Ok"  (or set  picker.onDone) */

    onOpen:               /* Callback when the popup opens       (or set  picker.onOpen) */

    onClose:              /* Callback when the popup closes      (or set  picker.onClose) */

});
```


## Accessibility

The color picker is built to support basic keyboard navigation and use with screen readers.
I would be very interested in feedback on improvements that could be done here!


## Credits

* Based on https://github.com/dissimulate/Picker by **Adam Brooks**
* Built with https://github.com/Joudee/color-conversion by **Joudee**
* Built with https://gist.github.com/mjackson/5311256 by **Michael Jackson**


## License

The ISC license - see the [LICENSE.md](LICENSE.md) file for details.
