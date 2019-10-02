/**
 * Noose
 * 
 * version: 1.0.0
 */

(function (factory, window, document) {
    if (typeof exports === 'object') {
        // CommonJS
        module.exports = factory(window, document);
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(() => {
            return factory(window, document)
        });
    } else {
        window.Noose = factory(window, document);
    }
}(function (window, document) {
    'use strict';

    function noop() {}

    // Default options
    const defaults = {
        // Classes for styling
        classes: {
            noose: 'noose',
            selected: 'selected'
        },
        // Enable/disable computing of selected elements
        compute: true,
        // Containing element for the noose
        container: 'body',
        // Whether the noose is enabled
        enabled: true,
        // The selection mode, part or whole
        mode: 'touch',
        // The amount of pixels to scroll
        scroll: 10,
        // The edge offset when scrolling should happen
        scrollEdge: 10,
        // The scrollbar size
        scrollbar: 17,
        // Elements to select
        select: '*',
        // On noose-ing start handler
        start: noop,
        // On noose-ing stop handler
        stop: noop,
        // Styles for the noose
        style: {
            border: '1px dotted #000',
            zIndex: 1000
        },
        // Throttle calls to compute selection
        throttle: 200
    };

    class Noose {
        constructor(container, opts) {
            const self = this;
            // Parse arguments
            if (typeof container === 'object' && container != null && !(container instanceof HTMLElement)) {
                opts = container;
                container = null;
            }
            opts = self.opts = Object.assign({}, defaults, opts);
            // Container must be positioned (anything but static)
            if (typeof container === 'string' || container instanceof HTMLElement) {
                opts.container = container;
            }
            // Get containers
            if (opts.container instanceof HTMLElement) {
                self.containers = [opts.container];
            } else if (typeof opts.container === 'string') {
                self.containers = document.querySelectorAll(opts.container);
            } else {
                throw new Error('Invalid container option');
            }
            // Setup states
            self.coors = {
                // Relative to document top left origin
                pointer: {
                    start: null,
                    end: {} // The current/end position of the mouse/touch
                },
                // Relative to container
                noose: {
                    top: null,
                    bottom: null // The bottom right position of the noose
                },
                // Relative to document top left origin
                container: {}
            };
            // Create noose
            const noose = self.noose = document.createElement('div');
            noose.style.position = 'absolute';
            noose.style.zIndex = opts.style.zIndex;
            noose.style.border = opts.style.border;
            if (opts.classes.noose) {
                noose.classList.add(opts.classes.noose);
            }
            let started = false; // Flag for noose-ing started
            let throttled = false;
            self._onStart = function (e) {
                if (opts.enabled &&
                    (!started || e.currentTarget !== self.currentTarget) &&
                    (e.type !== 'mousedown' || e.which === 1)) {
                    started = true;
                    const element = self.currentTarget = e.currentTarget;
                    const cCoors = self.coors.container;
                    const pCoors = self.coors.pointer;
                    const nCoors = self.coors.noose;

                    // Initialize container values
                    const style = window.getComputedStyle(element);
                    if (style.position === 'static') {
                        console.warn('Container is not a positioned element. This may cause issues positioning the noose and/or selecting elements.');
                    }
                    // Does the container have scrollbars
                    if (opts.scroll > 0 && opts.scrollEdge > 0) {
                        cCoors.scrollX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && element.scrollHeight > element.clientHeight;
                        cCoors.scrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && element.scrollWidth > element.clientWidth;
                    } else {
                        cCoors.scrollX = false;
                        cCoors.scrollY = false;
                    }
                    // Set the max allowed scroll amount
                    cCoors.maxScrollY = cCoors.scrollY && element.scrollHeight - element.clientHeight || 0;
                    cCoors.maxScrollX = cCoors.scrollX && element.scrollWidth - element.clientWidth || 0;
                    // Reset start positions
                    pCoors.start = null;
                    nCoors.start = null;
                    self.updateContainerPosition().updatePointerPosition(e);
                    // If the scrollbar was click then don't start
                    if (opts.scrollbar &&
                        ((cCoors.scrollX && pCoors.start.x > (cCoors.x + cCoors.w - opts.scrollbar) ||
                            cCoors.scrollY && pCoors.start.y > (cCoors.y + cCoors.h - opts.scrollbar)))) {
                        started = false;
                        return;
                    }
                    noose.style.display = 'none';
                    if (opts.start.apply(self, [e, self.coors]) === false) {
                        started = false;
                        return;
                    }
                    element.appendChild(noose);
                }
            };
            self._onMove = function (e) {
                if (opts.enabled) {
                    if (started && e.currentTarget === self.currentTarget) {
                        e.cancelable && e.preventDefault();
                        if (e.type !== 'scroll') {
                            self.updatePointerPosition(e);
                        }
                        self.updateContainerPosition().updateNoosePosition();
                        // Draw noose
                        let nTop = self.coors.noose.top;
                        let nBottom = self.coors.noose.bottom;
                        noose.style.left = nTop.x + 'px';
                        noose.style.top = nTop.y + 'px';
                        noose.style.width = (nBottom.x - nTop.x) + 'px';
                        noose.style.height = (nBottom.y - nTop.y) + 'px';
                        noose.style.display = 'block';

                        // Scroll container
                        let element = self.currentTarget;
                        let cCoors = self.coors.container;
                        let pEnd = self.coors.pointer.end;
                        if (cCoors.scrollY && (pEnd.y - cCoors.y < opts.scrollEdge))
                            element.scrollTop -= opts.scroll;
                        else if (cCoors.scrollY && element.scrollTop < cCoors.maxScrollY && (cCoors.y + cCoors.h - pEnd.y < opts.scrollEdge))
                            element.scrollTop += opts.scroll;
                        else if (cCoors.scrollX && (pEnd.x - cCoors.x < opts.scrollEdge))
                            element.scrollLeft -= opts.scroll;
                        else if (cCoors.scrollX && element.scrollLeft < cCoors.maxScrollX && (cCoors.x + cCoors.w - pEnd.x < opts.scrollEdge))
                            element.scrollLeft += opts.scroll;

                        if (opts.compute) {
                            // Compute selection
                            if (opts.throttle) {
                                // Throttle calls to compute
                                if (!throttled) {
                                    throttled = true;
                                    setTimeout(function () {
                                        self.compute();
                                        throttled = false;
                                    }, opts.throttle);
                                }
                            } else {
                                self.compute();
                            }
                        }
                    }
                }
            };
            self._onEnd = function (e) {
                if (self.opts.enabled &&
                    started &&
                    (e.type !== 'mouseup' || e.which === 1)) {
                    started = false;
                    if (e.currentTarget === self.currentTarget) {
                        self.updateContainerPosition().updatePointerPosition(e).updateNoosePosition();
                        opts.compute && self.compute();
                        setTimeout(function () {
                            opts.stop.apply(self, [e, self.coors, self.selected]);
                        }, 0);
                        self.currentTarget.removeChild(noose);
                    }
                }
            };
            // Register handlers
            Array.prototype.forEach.call(self.containers, function (container) {
                // Fixing chrome mobile touch event issue
                // https://developers.google.com/web/updates/2017/01/scrolling-intervention
                container.addEventListener('mousedown', self._onStart);
                container.addEventListener('touchstart', self._onStart, false);
                container.addEventListener('mousemove', self._onMove);
                container.addEventListener('touchmove', self._onMove, false);
                container.addEventListener('scroll', self._onMove);
                container.addEventListener('mouseup', self._onEnd);
                container.addEventListener('touchend', self._onEnd, false);

                container.noose = self;
            });

            return self;
        }
        /**
         * Destroy this Noose instance.
         *
         * @returns {Noose} This instance.
         */
        destroy() {
            const self = this;
            self.containers.forEach(function (container) {
                container.removeEventListener('mousedown', self._onStart);
                container.removeEventListener('touchstart', self._onStart);
                container.removeEventListener('mousemove', self._onMove);
                container.removeEventListener('touchmove', self._onMove);
                container.removeEventListener('scroll', self._onMove);
                container.removeEventListener('mouseup', self._onEnd);
                container.removeEventListener('touchend', self._onEnd);

                delete container.noose;
            });
            self.noose.remove();
            self.noose = null;

            return self;
        }
        /**
         * Update the current container's position.
         * 
         * @returns {Noose} This instance.
         */
        updateContainerPosition() {
            const cCoors = this.coors.container;
            const rect = this.currentTarget.getBoundingClientRect();
            // Get position relative to the document's top left origin
            cCoors.x = rect.left + window.pageXOffset;
            cCoors.y = rect.top + window.pageYOffset;
            cCoors.w = rect.width;
            cCoors.h = rect.height;

            return this;
        }
        /**
         * Update the current pointer (mouse/touch) position.
         *
         * @returns {Noose} This instance.
         */
        updatePointerPosition(e) {
            const root = e && e.touches && e.touches[0] || e;
            const pCoors = this.coors.pointer;

            if (root && typeof root.pageX === 'number') {
                // Get position relative to the document's top left origin

                // Current position is always end
                pCoors.end = {
                    x: root.pageX,
                    y: root.pageY
                };
                // Keep start static
                if (!pCoors.start) {
                    pCoors.start = pCoors.end;
                }
            }

            return this;
        }
        /**
         * Updates the noose top/bottom position.
         *
         * @returns {Noose} This instance.
         */
        updateNoosePosition() {
            const element = this.currentTarget;
            const pCoors = this.coors.pointer;
            const cCoors = this.coors.container;
            const nCoors = this.coors.noose;
            // Pointer and container are both relative to document top left origin.
            // The noose is positioned absolute relative to the container. So that's
            // (pointer - container), and also account for the container's scroll position.
            const endX = Math.max(pCoors.end.x - cCoors.x + element.scrollLeft, 0);
            const endY = Math.max(pCoors.end.y - cCoors.y + element.scrollTop, 0);

            if (!nCoors.start) {
                // Keep start position static
                nCoors.start = {
                    x: endX,
                    y: endY
                };
            }

            // Determine top and bottom of the noose
            // top < bottom
            nCoors.top = {
                x: Math.min(nCoors.start.x, endX),
                y: Math.min(nCoors.start.y, endY)
            };
            nCoors.bottom = {
                x: Math.min(Math.max(nCoors.start.x, endX), element.scrollWidth),
                y: Math.min(Math.max(nCoors.start.y, endY), element.scrollHeight)
            };

            return this;
        }
        /**
         * Compute the selected elements within the noose region.
         *
         * @returns {Noose} This instance.
         */
        compute() {
            const self = this;
            // Only do if select is enabled
            if (self.opts.select) {
                const className = self.opts.classes.selected;
                const elements = self.currentTarget.querySelectorAll(self.opts.select);
                const nTop = self.coors.noose.top;
                const nBottom = self.coors.noose.bottom;
                const offsetX = self.coors.container.x;
                const offsetY = self.coors.container.y;
                self.selected = [];
                Array.prototype.forEach.call(elements, function (element) {
                    if (element === self.noose)
                        return; // Don't include noose
                    let include = false;
                    // Get absolute position of element relative to container
                    const rect = element.getBoundingClientRect();
                    const topX = rect.left + window.pageXOffset - offsetX + self.currentTarget.scrollLeft;
                    const topY = rect.top + window.pageYOffset - offsetY + self.currentTarget.scrollTop;
                    const bottomX = rect.width + topX;
                    const bottomY = rect.height + topY;
                    if (self.opts.mode === 'fit') {
                        // Include is entire element is within noose
                        include = nTop.x <= topX && nTop.y <= topY && nBottom.x >= bottomX && nBottom.y >= bottomY;
                    } else {
                        // Include if partially touching
                        include = !(nTop.x > bottomX || nTop.y > bottomY || nBottom.x < topX || nBottom.y < topY);
                    }
                    if (include) {
                        className && element.classList.add(className);
                        self.selected.push(element);
                    } else {
                        className && element.classList.remove(className);
                    }
                });
            }

            return self;
        }
        /**
         * Get the current version.
         */
        static get version() {
            return '1.0.0';
        }
    }

    return Noose;
}, window, document));
