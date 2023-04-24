'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

// change: using 'toDataURL' method to toBlob() and break the 2m size limits in DataUrl
// ref: https://stackoverflow.com/questions/695151/data-protocol-url-size-limitations/41755526#41755526

(function () {
    var out$ = typeof exports != 'undefined' && exports || typeof define != 'undefined' && {} || this || window;
    if (typeof define !== 'undefined') define('save-svg-as-png', [], function () {
        return out$;
    });
    out$.default = out$;

    var xmlNs = 'http://www.w3.org/2000/xmlns/';
    var xhtmlNs = 'http://www.w3.org/1999/xhtml';
    var svgNs = 'http://www.w3.org/2000/svg';
    var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';
    var urlRegex = /url\(["']?(.+?)["']?\)/;
    var fontFormats = {
        woff2: 'font/woff2',
        woff: 'font/woff',
        otf: 'application/x-font-opentype',
        ttf: 'application/x-font-ttf',
        eot: 'application/vnd.ms-fontobject',
        sfnt: 'application/font-sfnt',
        svg: 'image/svg+xml'
    };

    // integrated & modified code from fileSaver.js
    // The one and only way of getting global scope in all environments
    // https://stackoverflow.com/q/3277182/1008999
    var _global = (typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.window === window ? window : (typeof self === 'undefined' ? 'undefined' : _typeof(self)) === 'object' && self.self === self ? self : (typeof global === 'undefined' ? 'undefined' : _typeof(global)) === 'object' && global.global === global ? global : this;

    function bom(blob, opts) {
        if (typeof opts === 'undefined') {
            opts = { autoBom: false };
        } else if ((typeof opts === 'undefined' ? 'undefined' : _typeof(opts)) !== 'object') {
            console.warn('Deprecated: Expected third argument to be a object');
            opts = { autoBom: !opts };
        }

        // prepend BOM for UTF-8 XML and text/* types (including HTML)
        // note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
        if (opts.autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
            return new Blob([String.fromCharCode(0xFEFF), blob], { type: blob.type });
        }
        return blob;
    }

    function download(url, name, opts) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.onload = function () {
            saveAs(xhr.response, name, opts);
        };
        xhr.onerror = function () {
            console.error('could not download file');
        };
        xhr.send();
    }

    function corsEnabled(url) {
        var xhr = new XMLHttpRequest();
        // use sync to avoid popup blocker
        xhr.open('HEAD', url, false);
        try {
            xhr.send();
        } catch (e) {}
        return xhr.status >= 200 && xhr.status <= 299;
    }

    // `a.click()` doesn't work for all browsers (#465)
    function click(node) {
        try {
            node.dispatchEvent(new MouseEvent('click'));
        } catch (e) {
            var evt = document.createEvent('MouseEvents');
            evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);
            node.dispatchEvent(evt);
        }
    }

    // shared by some methods
    var autoClean = function autoClean(link, opts) {
        // clean resources when click to download
        if (opts && opts.autoClearObjectURL) {
            link.onclick = function () {
                return requestAnimationFrame(function () {
                    return URL.revokeObjectURL(link.href);
                });
            };
        }
    };

    // save file method 1
    function saveAsOpt1(blob, name, opts) {
        var URL = _global.URL || _global.webkitURL;
        var a = document.createElement('a');
        name = name || blob.name || 'download';

        a.download = name;
        a.rel = 'noopener'; // tabnabbing;

        if (typeof blob === 'string') {
            // Support regular links
            a.href = blob;
            autoClean(a, opts);

            if (a.origin !== location.origin) {
                corsEnabled(a.href) ? download(blob, name, opts) : click(a, a.target = '_blank');
            } else {
                click(a);
            }
        } else {
            // Support blobs
            a.href = URL.createObjectURL(blob);
            a.onclick = function () {
                return requestAnimationFrame(function () {
                    return URL.revokeObjectURL(a.href);
                });
            };
            // setTimeout(function () { URL.revokeObjectURL(a.href) }, 4E4); // 40s
            setTimeout(function () {
                click(a);
            }, 0);
        }
    }

    // save file method 2
    function saveAsOpt2(blob, name, opts) {
        name = name || blob.name || 'download';

        if (typeof blob === 'string') {
            if (corsEnabled(blob)) {
                download(blob, name, opts);
            } else {
                var a = document.createElement('a');
                a.href = blob;
                a.target = '_blank';
                autoClean(a, opts);
                setTimeout(function () {
                    click(a);
                });
            }
        } else {
            navigator.msSaveOrOpenBlob(bom(blob, opts), name);
        }
    }

    // save file method 2
    function saveAsOpt3(blob, name, opts, popup) {
        // Open a popup immediately do go around popup blocker
        // Mostly only available on user interaction and the fileReader is async so...
        popup = popup || open('', '_blank');
        if (popup) {
            popup.document.title = popup.document.body.innerText = 'downloading...';
        }

        if (typeof blob === 'string') {
            if (opts && opts.autoClearObjectURL) {
                setTimeout(function () {
                    URL.revokeObjectURL(blob);
                }, 4E4); // 40s
            }
            return download(blob, name, opts);
        }

        var force = blob.type === 'application/octet-stream';
        var isSafari = /constructor/i.test(_global.HTMLElement) || _global.safari;
        var isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent);

        if ((isChromeIOS || force && isSafari || isMacOSWebView) && typeof FileReader !== 'undefined') {
            // Safari doesn't allow downloading of blob URLs
            var reader = new FileReader();
            reader.onloadend = function () {
                var url = reader.result;
                url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, 'data:attachment/file;');
                if (popup) {
                    popup.location.href = url;
                } else {
                    location = url;
                }
                popup = null; // reverse-tabnabbing #460
            };
            reader.readAsDataURL(blob);
        } else {
            var _URL = _global.URL || _global.webkitURL;
            var url = _URL.createObjectURL(blob);
            if (popup) {
                popup.location = url;
            } else {
                location.href = url;
            }
            popup = null; // reverse-tabnabbing #460
            setTimeout(function () {
                _URL.revokeObjectURL(url);
            }, 4E4); // 40s
        }
    }
    // Detect WebView inside a native macOS app by ruling out all browsers
    // We just need to check for 'Safari' because all other browsers (besides Firefox) include that too
    // https://www.whatismybrowser.com/guides/the-latest-user-agent/macos
    var isMacOSWebView = /Macintosh/.test(navigator.userAgent) && /AppleWebKit/.test(navigator.userAgent) && !/Safari/.test(navigator.userAgent);

    // global method define
    var saveAs = _global.saveAs || (
    // probably in some web worker
    (typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== 'object' || window !== _global ? function saveAs() {} /* noop */
    // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView
    : 'download' in HTMLAnchorElement.prototype && !isMacOSWebView ? saveAsOpt1
    // Use msSaveOrOpenBlob as a second approach
    : 'msSaveOrOpenBlob' in navigator ? saveAsOpt2
    // Fallback to using FileReader and a popup
    : saveAsOpt3);

    // export
    _global.saveAs = saveAs.saveAs = saveAs;
    out$.saveAs = _global.saveAs;

    var isElement = function isElement(obj) {
        return obj instanceof HTMLElement || obj instanceof SVGElement;
    };
    var requireDomNode = function requireDomNode(el) {
        if (!isElement(el)) throw new Error('an HTMLElement or SVGElement is required; got ' + el);
    };
    var requireDomNodePromise = function requireDomNodePromise(el) {
        return new Promise(function (resolve, reject) {
            if (isElement(el)) resolve(el);else reject(new Error('an HTMLElement or SVGElement is required; got ' + el));
        });
    };
    var isExternal = function isExternal(url) {
        return url && url.lastIndexOf('http', 0) === 0 && url.lastIndexOf(window.location.host) === -1;
    };

    var getFontMimeTypeFromUrl = function getFontMimeTypeFromUrl(fontUrl) {
        var formats = Object.keys(fontFormats).filter(function (extension) {
            return fontUrl.indexOf('.' + extension) > 0;
        }).map(function (extension) {
            return fontFormats[extension];
        });
        if (formats) return formats[0];
        console.error('Unknown font format for ' + fontUrl + '. Fonts may not be working correctly.');
        return 'application/octet-stream';
    };

    var arrayBufferToBase64 = function arrayBufferToBase64(buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        for (var i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }return window.btoa(binary);
    };

    var getDimension = function getDimension(el, clone, dim) {
        var v = el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim] || clone.getAttribute(dim) !== null && !clone.getAttribute(dim).match(/%$/) && parseInt(clone.getAttribute(dim)) || el.getBoundingClientRect()[dim] || parseInt(clone.style[dim]) || parseInt(window.getComputedStyle(el).getPropertyValue(dim));
        return typeof v === 'undefined' || v === null || isNaN(parseFloat(v)) ? 0 : v;
    };

    var getDimensions = function getDimensions(el, clone, width, height) {
        if (el.tagName === 'svg') return {
            width: width || getDimension(el, clone, 'width'),
            height: height || getDimension(el, clone, 'height')
        };else if (el.getBBox) {
            var _el$getBBox = el.getBBox(),
                x = _el$getBBox.x,
                y = _el$getBBox.y,
                _width = _el$getBBox.width,
                _height = _el$getBBox.height;

            return {
                width: x + _width,
                height: y + _height
            };
        }
    };

    var reEncode = function reEncode(data) {
        return decodeURIComponent(encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, function (match, p1) {
            var c = String.fromCharCode('0x' + p1);
            return c === '%' ? '%25' : c;
        }));
    };

    var uriToBlob = function uriToBlob(uri) {
        var byteString = window.atob(uri.split(',')[1]);
        var mimeString = uri.split(',')[0].split(':')[1].split(';')[0];
        var buffer = new ArrayBuffer(byteString.length);
        var intArray = new Uint8Array(buffer);
        for (var i = 0; i < byteString.length; i++) {
            intArray[i] = byteString.charCodeAt(i);
        }
        return new Blob([buffer], { type: mimeString });
    };

    var query = function query(el, selector) {
        if (!selector) return;
        try {
            return el.querySelector(selector) || el.parentNode && el.parentNode.querySelector(selector);
        } catch (err) {
            console.warn('Invalid CSS selector "' + selector + '"', err);
        }
    };

    var detectCssFont = function detectCssFont(rule, href) {
        // Match CSS font-face rules to external links.
        // @font-face {
        //   src: local('Abel'), url(https://fonts.gstatic.com/s/abel/v6/UzN-iejR1VoXU2Oc-7LsbvesZW2xOQ-xsNqO47m55DA.woff2);
        // }
        var match = rule.cssText.match(urlRegex);
        var url = match && match[1] || '';
        if (!url || url.match(/^data:/) || url === 'about:blank') return;
        var fullUrl = url.startsWith('../') ? href + '/../' + url : url.startsWith('./') ? href + '/.' + url : url;
        return {
            text: rule.cssText,
            format: getFontMimeTypeFromUrl(fullUrl),
            url: fullUrl
        };
    };

    var inlineImages = function inlineImages(el) {
        return Promise.all(Array.from(el.querySelectorAll('image')).map(function (image) {
            var href = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || image.getAttribute('href');
            if (!href) return Promise.resolve(null);
            if (isExternal(href)) {
                href += (href.indexOf('?') === -1 ? '?' : '&') + 't=' + new Date().valueOf();
            }
            return new Promise(function (resolve, reject) {
                var canvas = document.createElement('canvas');
                var img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = href;
                img.onerror = function () {
                    return reject(new Error('Could not load ' + href));
                };
                img.onload = function () {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL('image/png'));
                    resolve(true);
                };
            });
        }));
    };

    var cachedFonts = {};
    var inlineFonts = function inlineFonts(fonts) {
        return Promise.all(fonts.map(function (font) {
            return new Promise(function (resolve, reject) {
                if (cachedFonts[font.url]) return resolve(cachedFonts[font.url]);

                var req = new XMLHttpRequest();
                req.addEventListener('load', function () {
                    // TODO: it may also be worth it to wait until fonts are fully loaded before
                    // attempting to rasterize them. (e.g. use https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet)
                    var fontInBase64 = arrayBufferToBase64(req.response);
                    var fontUri = font.text.replace(urlRegex, 'url("data:' + font.format + ';base64,' + fontInBase64 + '")') + '\n';
                    cachedFonts[font.url] = fontUri;
                    resolve(fontUri);
                });
                req.addEventListener('error', function (e) {
                    console.warn('Failed to load font from: ' + font.url, e);
                    cachedFonts[font.url] = null;
                    resolve(null);
                });
                req.addEventListener('abort', function (e) {
                    console.warn('Aborted loading font from: ' + font.url, e);
                    resolve(null);
                });
                req.open('GET', font.url);
                req.responseType = 'arraybuffer';
                req.send();
            });
        })).then(function (fontCss) {
            return fontCss.filter(function (x) {
                return x;
            }).join('');
        });
    };

    var cachedRules = null;
    var styleSheetRules = function styleSheetRules() {
        if (cachedRules) return cachedRules;
        return cachedRules = Array.from(document.styleSheets).map(function (sheet) {
            try {
                return { rules: sheet.cssRules, href: sheet.href };
            } catch (e) {
                console.warn('Stylesheet could not be loaded: ' + sheet.href, e);
                return {};
            }
        });
    };

    var inlineCss = function inlineCss(el, options) {
        var _ref = options || {},
            selectorRemap = _ref.selectorRemap,
            modifyStyle = _ref.modifyStyle,
            modifyCss = _ref.modifyCss,
            fonts = _ref.fonts,
            excludeUnusedCss = _ref.excludeUnusedCss;

        var generateCss = modifyCss || function (selector, properties) {
            var sel = selectorRemap ? selectorRemap(selector) : selector;
            var props = modifyStyle ? modifyStyle(properties) : properties;
            return sel + '{' + props + '}\n';
        };
        var css = [];
        var detectFonts = typeof fonts === 'undefined';
        var fontList = fonts || [];
        styleSheetRules().forEach(function (_ref2) {
            var rules = _ref2.rules,
                href = _ref2.href;

            if (!rules) return;
            Array.from(rules).forEach(function (rule) {
                if (typeof rule.style != 'undefined') {
                    if (query(el, rule.selectorText)) css.push(generateCss(rule.selectorText, rule.style.cssText));else if (detectFonts && rule.cssText.match(/^@font-face/)) {
                        var font = detectCssFont(rule, href);
                        if (font) fontList.push(font);
                    } else if (!excludeUnusedCss) {
                        css.push(rule.cssText);
                    }
                }
            });
        });

        return inlineFonts(fontList).then(function (fontCss) {
            return css.join('\n') + fontCss;
        });
    };

    var downloadOptions = function downloadOptions() {
        if (!navigator.msSaveOrOpenBlob && !('download' in document.createElement('a'))) {
            return { popup: window.open() };
        }
    };

    out$.prepareSvg = function (el, options, done) {
        requireDomNode(el);

        var _ref3 = options || {},
            _ref3$left = _ref3.left,
            left = _ref3$left === undefined ? 0 : _ref3$left,
            _ref3$top = _ref3.top,
            top = _ref3$top === undefined ? 0 : _ref3$top,
            w = _ref3.width,
            h = _ref3.height,
            _ref3$scale = _ref3.scale,
            scale = _ref3$scale === undefined ? 1 : _ref3$scale,
            _ref3$responsive = _ref3.responsive,
            responsive = _ref3$responsive === undefined ? false : _ref3$responsive,
            _ref3$excludeCss = _ref3.excludeCss,
            excludeCss = _ref3$excludeCss === undefined ? false : _ref3$excludeCss;

        return inlineImages(el).then(function () {
            var clone = el.cloneNode(true);
            clone.style.backgroundColor = (options || {}).backgroundColor || el.style.backgroundColor;

            var _getDimensions = getDimensions(el, clone, w, h),
                width = _getDimensions.width,
                height = _getDimensions.height;

            if (el.tagName !== 'svg') {
                if (el.getBBox) {
                    if (clone.getAttribute('transform') != null) {
                        clone.setAttribute('transform', clone.getAttribute('transform').replace(/translate\(.*?\)/, ''));
                    }
                    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.appendChild(clone);
                    clone = svg;
                } else {
                    console.error('Attempted to render non-SVG element', el);
                    return;
                }
            }

            clone.setAttribute('version', '1.1');
            clone.setAttribute('viewBox', [left, top, width, height].join(' '));
            if (!clone.getAttribute('xmlns')) clone.setAttributeNS(xmlNs, 'xmlns', svgNs);
            if (!clone.getAttribute('xmlns:xlink')) clone.setAttributeNS(xmlNs, 'xmlns:xlink', 'http://www.w3.org/1999/xlink');

            if (responsive) {
                clone.removeAttribute('width');
                clone.removeAttribute('height');
                clone.setAttribute('preserveAspectRatio', 'xMinYMin meet');
            } else {
                clone.setAttribute('width', width * scale);
                clone.setAttribute('height', height * scale);
            }

            Array.from(clone.querySelectorAll('foreignObject > *')).forEach(function (foreignObject) {
                foreignObject.setAttributeNS(xmlNs, 'xmlns', foreignObject.tagName === 'svg' ? svgNs : xhtmlNs);
            });

            if (excludeCss) {
                var outer = document.createElement('div');
                outer.appendChild(clone);
                var src = outer.innerHTML;
                if (typeof done === 'function') done(src, width, height);else return { src: src, width: width, height: height };
            } else {
                return inlineCss(el, options).then(function (css) {
                    var style = document.createElement('style');
                    style.setAttribute('type', 'text/css');
                    style.innerHTML = '<![CDATA[\n' + css + '\n]]>';

                    var defs = document.createElement('defs');
                    defs.appendChild(style);
                    clone.insertBefore(defs, clone.firstChild);

                    var outer = document.createElement('div');
                    outer.appendChild(clone);
                    var src = outer.innerHTML.replace(/NS\d+:href/gi, 'xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href');

                    if (typeof done === 'function') done(src, width, height);else return { src: src, width: width, height: height };
                });
            }
        });
    };

    out$.svgAsDataUri = function (el, options, done) {
        requireDomNode(el);
        return out$.prepareSvg(el, options).then(function (_ref4) {
            var src = _ref4.src,
                width = _ref4.width,
                height = _ref4.height;

            var svgXml = 'data:image/svg+xml;base64,' + window.btoa(reEncode(doctype + src));
            if (typeof done === 'function') {
                done(svgXml, width, height);
            }
            return svgXml;
        });
    };

    out$.svgAsPngUri = function (el, options, done) {
        requireDomNode(el);

        var _ref5 = options || {},
            _ref5$encoderType = _ref5.encoderType,
            encoderType = _ref5$encoderType === undefined ? 'image/png' : _ref5$encoderType,
            _ref5$encoderOptions = _ref5.encoderOptions,
            encoderOptions = _ref5$encoderOptions === undefined ? 0.8 : _ref5$encoderOptions,
            canvg = _ref5.canvg;

        var convertToPng = function convertToPng(_ref6) {
            var src = _ref6.src,
                width = _ref6.width,
                height = _ref6.height;

            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            var pixelRatio = window.devicePixelRatio || 1;

            // canvas maximum width & height limits: 65535 x 65535 (test in latest chrome)
            var cWidth = width * pixelRatio;
            var cHeight = height * pixelRatio;
            canvas.width = cWidth > 65535 ? 65535 : cWidth;
            canvas.height = cHeight > 65535 ? 65535 : cHeight;
            canvas.style.width = canvas.width + 'px';
            canvas.style.height = canvas.height + 'px';
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

            if (canvg) {
                canvg(canvas, src);
            } else {
                context.drawImage(src, 0, 0);
            }

            var png = '';
            try {
                return new Promise(function (resolve) {
                    canvas.toBlob(function (blob) {
                        png = URL.createObjectURL(blob);

                        if (typeof done === 'function') {
                            done(png, canvas.width, canvas.height);
                        }
                        resolve(png);
                    }, encoderType, encoderOptions);
                });
            } catch (e) {
                if (typeof SecurityError !== 'undefined' && e instanceof SecurityError || e.name === 'SecurityError') {
                    console.error('Rendered SVG images cannot be downloaded in this browser.');
                    return;
                } else throw e;
            }
        };

        if (canvg) return out$.prepareSvg(el, options).then(convertToPng);else return out$.svgAsDataUri(el, options).then(function (uri) {
            return new Promise(function (resolve, reject) {
                var image = new Image();
                image.onload = function () {
                    var imgPromise = convertToPng({
                        src: image,
                        width: image.width,
                        height: image.height
                    });
                    resolve(imgPromise);
                };
                image.onerror = function () {
                    reject('There was an error loading the data URI as an image on the following SVG\n' + window.atob(uri.slice(26)) + 'Open the following link to see browser\'s diagnosis\n' + uri);
                };
                image.src = uri;
            });
        });
    };

    out$.download = function (name, uri, options) {
        try {
            if (!options) {
                options = {};
            }
            var downloadOpt = {
                autoClearObjectURL: true
            };
            var opts = Object.assign(options, downloadOpt);
            saveAs(uri, name, opts);
        } catch (e) {
            console.error(e);
            console.warn('Error while getting object URL. Falling back to string URL.');
        }
    };

    out$.saveSvg = function (el, name, options) {
        var downloadOpts = downloadOptions(); // don't inline, can't be async
        return requireDomNodePromise(el).then(function (el) {
            return out$.svgAsDataUri(el, options || {});
        }).then(function (uri) {
            return out$.download(name, uri, downloadOpts || {});
        });
    };

    out$.saveSvgAsPng = function (el, name, options) {
        var downloadOpts = downloadOptions(); // don't inline, can't be async
        return requireDomNodePromise(el).then(function (el) {
            return out$.svgAsPngUri(el, options || {});
        }).then(function (uri) {
            return out$.download(name, uri, downloadOpts || {});
        });
    };
})();