"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

(function (factory, window, document) {
  if ((typeof exports === "undefined" ? "undefined" : _typeof(exports)) === 'object') {
    // CommonJS
    module.exports = factory(window, document);
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(function () {
      return factory(window, document);
    });
  } else {
    window.Noose = factory(window, document);
  }
})(function (window, document) {
  'use strict';

  function noop() {} // Default options


  var defaults = {
    // Containing element for the noose
    container: 'body',
    // Classes for styling
    classes: {
      noose: '',
      selected: 'selected'
    },
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

  var Noose =
  /*#__PURE__*/
  function () {
    function Noose(container, opts) {
      _classCallCheck(this, Noose);

      var self = this; // Parse arguments

      if (_typeof(container) === 'object' && container != null && !(container instanceof Element)) {
        opts = container;
        container = null;
      }

      opts = self.opts = Object.assign({}, defaults, opts); // Container must be position (anything but static)

      if (typeof container === 'string' || container instanceof Element) {
        opts.container = container;
      } // Get containers


      if (opts.container instanceof Element) {
        self.containers = [opts.container];
      } else if (typeof opts.container === 'string') {
        self.containers = document.querySelectorAll(opts.container);
      } else {
        throw new Error('Invalid container option');
      } // Setup states


      self.coors = {
        // Relative to document top left origin
        pointer: {
          start: null,
          end: null // The current/end position of the mouse/touch

        },
        // Relative to container
        noose: {
          top: null,
          bottom: null // The bottom right position of the noose

        },
        // Relative to document top left origin
        container: {}
      }; // Create noose

      var noose = self.noose = document.createElement('div');
      noose.style.position = 'absolute';
      noose.style.zIndex = self.opts.style.zIndex;
      noose.style.border = self.opts.style.border;

      if (opts.classes.noose) {
        noose.classList.add(self.opts.classes.noose);
      }

      var started = false; // Flag for noose-ing started

      var throttled = false;

      self._onStart = function (e) {
        if (e.which === 1 & self.opts.enabled && (!started || e.currentTarget !== self.currentTarget)) {
          started = true;
          self.currentTarget = e.currentTarget; // Initialize container values

          var style = window.getComputedStyle(self.currentTarget);

          if (style.position === 'static') {
            console.warn('Container is not a positioned element. This may cause issues positioning the noose and/or selecting elements.');
          }

          var container = self.coors.container;
          var pointer = self.coors.pointer;
          var noose = self.coors.noose; // Does the container have scrollbars

          if (self.opts.scroll > 0 && self.opts.scrollEdge > 0) {
            container.scrollX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && self.currentTarget.scrollHeight > self.currentTarget.clientHeight;
            container.scrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && self.currentTarget.scrollWidth > self.currentTarget.clientWidth;
          } else {
            container.scrollX = false;
            container.scrollY = false;
          } // Set the max allowed scroll amount


          container.maxScrollY = container.scrollY && self.currentTarget.scrollHeight - self.currentTarget.clientHeight || 0;
          container.maxScrollX = container.scrollX && self.currentTarget.scrollWidth - self.currentTarget.clientWidth || 0; // Reset start positions

          pointer.start = null;
          noose.start = null;
          self.updateContainerPosition().updatePointerPosition(e); // If the scrollbar was click then don't start

          if (self.opts.scrollbar && (container.scrollX && pointer.start.x > container.x + container.w - self.opts.scrollbar || container.scrollY && pointer.start.y > container.y + container.h - self.opts.scrollbar)) {
            started = false;
            return;
          }

          self.noose.style.display = 'none';

          if (self.opts.start.apply(self, [e, self.coors]) === false || e.defaultPrevented) {
            started = false;
            return;
          }

          self.currentTarget.appendChild(self.noose);
        }
      };

      self._onMove = function (e) {
        if (self.opts.enabled) {
          if (started && e.currentTarget === self.currentTarget) {
            e.preventDefault();

            if (e.type !== 'scroll') {
              self.updatePointerPosition(e);
            }

            self.updateContainerPosition().updateNoosePosition(); // Draw noose

            var top = self.coors.noose.top;
            var bottom = self.coors.noose.bottom;
            self.noose.style.left = top.x + 'px';
            self.noose.style.top = top.y + 'px';
            self.noose.style.width = bottom.x - top.x + 'px';
            self.noose.style.height = bottom.y - top.y + 'px';
            self.noose.style.display = 'block'; // Scroll container

            var container = self.coors.container;
            var pointer = self.coors.pointer.end;
            if (container.scrollY && pointer.y - container.y < 10) self.currentTarget.scrollTop -= self.opts.scroll;else if (container.scrollY && self.currentTarget.scrollTop < container.maxScrollY && container.y + container.h - pointer.y < 10) self.currentTarget.scrollTop += self.opts.scroll;else if (container.scrollX && pointer.x - container.x < 10) self.currentTarget.scrollLeft -= self.opts.scroll;else if (container.scrollX && self.currentTarget.scrollLeft < container.maxScrollX && container.x + container.w - pointer.x < 10) self.currentTarget.scrollLeft += self.opts.scroll; // Compute selection

            if (self.opts.throttle) {
              // Throttle calls to compute
              if (!throttled) {
                throttled = true;
                setTimeout(function () {
                  self.compute();
                  throttled = false;
                }, self.opts.throttle);
              }
            } else {
              self.compute();
            }
          }
        }
      };

      self._onEnd = function (e) {
        if (e.which === 1 && self.opts.enabled && started) {
          started = false;

          if (e.currentTarget === self.currentTarget) {
            self.updateContainerPosition().updatePointerPosition(e).updateNoosePosition();
            self.compute();
            setTimeout(function () {
              self.opts.stop.apply(self, [e, self.coors, self.selected]);
            }, 0);
            self.currentTarget.removeChild(self.noose);
          }
        }
      }; // Register handlers


      Array.prototype.forEach.call(self.containers, function (container) {
        container.addEventListener('mousedown', self._onStart);
        container.addEventListener('mousemove', self._onMove);
        container.addEventListener('scroll', self._onMove);
        container.addEventListener('mouseup', self._onEnd);
      });
      return self;
    }
    /**
     * Destroy this Noose instance.
     *
     * @returns {Noose} This instance.
     */


    _createClass(Noose, [{
      key: "destroy",
      value: function destroy() {
        var self = this;
        self.containers.forEach(function (container) {
          container.removeEventListener('mousedown', self._onStart);
          container.removeEventListener('mousemove', self._onMove);
          container.removeEventListener('scroll', self._onMove);
          container.removeEventListener('mouseup', self._onEnd);
        });
        return self;
      }
      /**
       * Update the current container's position.
       * 
       * @returns {Noose} This instance.
       */

    }, {
      key: "updateContainerPosition",
      value: function updateContainerPosition() {
        var container = this.currentTarget;
        var containerCoors = this.coors.container;
        var rect = container.getBoundingClientRect(); // Get position relative to the document's top left origin

        containerCoors.x = rect.left + window.pageXOffset;
        containerCoors.y = rect.top + window.pageYOffset;
        containerCoors.w = rect.width;
        containerCoors.h = rect.height;
        return this;
      }
      /**
       * Update the current pointer (mouse/touch) position.
       *
       * @returns {Noose} This instance.
       */

    }, {
      key: "updatePointerPosition",
      value: function updatePointerPosition(e) {
        var pointer = this.coors.pointer; // Get position relative to the document's top left origin

        var pos = {
          x: e.pageX,
          y: e.pageY
        }; // Keep start static

        if (!pointer.start) pointer.start = pos; // Current position is always end

        pointer.end = pos;
        return this;
      }
      /**
       * Updates the noose top/bottom position.
       *
       * @returns {Noose} This instance.
       */

    }, {
      key: "updateNoosePosition",
      value: function updateNoosePosition() {
        var currentTarget = this.currentTarget;
        var pointer = this.coors.pointer;
        var container = this.coors.container;
        var noose = this.coors.noose; // Pointer and container are both relative to document top left origin.
        // The noose is positioned absolute relative to the container. So that's
        // (pointer - container), and also account for the container's scroll position.

        if (!noose.start) {
          // Keep start position static
          noose.start = {
            x: pointer.start.x - container.x + currentTarget.scrollLeft,
            y: pointer.start.y - container.y + currentTarget.scrollTop
          };
        }

        var endX = pointer.end.x - container.x + currentTarget.scrollLeft;
        var endY = pointer.end.y - container.y + currentTarget.scrollTop; // Determine top and bottom of the noose
        // top < bottom

        noose.top = {
          x: Math.min(noose.start.x, endX),
          y: Math.min(noose.start.y, endY)
        };
        noose.bottom = {
          x: Math.max(noose.start.x, endX),
          y: Math.max(noose.start.y, endY)
        };
        return this;
      }
      /**
       * Compute the selected elements within the noose region.
       *
       * @returns {Noose} This instance.
       */

    }, {
      key: "compute",
      value: function compute() {
        var self = this; // Only do if select is enabled

        if (self.opts.select) {
          var className = self.opts.classes.selected;
          var elements = self.currentTarget.querySelectorAll(self.opts.select);
          var top = self.coors.noose.top;
          var bottom = self.coors.noose.bottom;
          var offsetX = self.coors.container.x;
          var offsetY = self.coors.container.y;
          self.selected = [];
          Array.prototype.forEach.call(elements, function (element) {
            if (element === self.noose) return;
            var include = false; // Get absolution position of element relative to container

            var rect = element.getBoundingClientRect();
            var topX = rect.left + window.pageXOffset - offsetX + self.currentTarget.scrollLeft;
            var topY = rect.top + window.pageYOffset - offsetY + self.currentTarget.scrollTop;
            var bottomX = rect.width + topX;
            var bottomY = rect.height + topY;

            if (self.opts.mode === 'fit') {
              // Include is entire element is within noose
              include = top.x <= topX && top.y <= topY && bottom.x >= bottomX && bottom.y >= bottomY;
            } else {
              // Include if partially touching
              include = !(top.x > bottomX || top.y > bottomY || bottom.x < topX || bottom.y < topY);
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

    }, {
      key: "version",
      get: function get() {
        return '1.0.0';
      }
    }]);

    return Noose;
  }();

  return Noose;
}, window, document);