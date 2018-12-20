(function ($) {

  function AntiscrollMock() {
  }

  AntiscrollMock.prototype.destroy = function () {
  };

  AntiscrollMock.prototype.rebuild = function () {
  };

  AntiscrollMock.prototype.refresh = function () {
  };

  function dontApply($contentElement, options) {
    if (options.debug) {
      console.warn('Scrollbars are not applied. A mock will be used to fake the public API.');
    }

    $contentElement.parent().data('antiscroll', new AntiscrollMock());
  }

  /**
   * Augment jQuery prototype.
   * $.fn.antiscroll should be run on the content element (not the wrapper!).
   * The data 'antiscroll' will be applied to the wrapper.
   *
   * @param {Object} options
   * @returns
   */
  $.fn.antiscroll = function (options) {
    return this.each(function () {
      var wrapperElement = this;
      var $wrapperElement = $(wrapperElement);

      // Apply OS X like scrollbars only on Windows
      if (options.onlyOnWindows && (navigator.platform.substr(0, 3) !== 'Win')) {
        dontApply($wrapperElement, options);
        return;
      }

      if (options.notOnWindows && (navigator.platform.substr(0, 3) === 'Win')) {
        dontApply($wrapperElement, options);
        return;
      }

      if (options.notOnMacintosh && (navigator.platform.substr(0, 3) === 'Mac')) {
        dontApply($wrapperElement, options);
        return;
      }

      if (options.autoWrap) {
        // Switch elements because wrapper element is inner element
        $wrapperElement.parent().addClass('antiscroll-wrap');
        $wrapperElement.addClass('antiscroll-inner');
        $wrapperElement = $wrapperElement.parent();
        wrapperElement = $wrapperElement.get();
      }

      if ($wrapperElement.data('antiscroll')) {
        $wrapperElement.data('antiscroll').destroy();
      }

      if (options.debug) {
        console.group('$.fn.antiscroll');
        console.log('Wrapper element:', $wrapperElement.get(0));
        console.log('Options:', options);
        console.groupEnd();
      }

      $wrapperElement.data('antiscroll', new $.Antiscroll(wrapperElement, options));
    });
  };

  /**
   * Expose constructor.
   */
  $.Antiscroll = Antiscroll;

  /**
   * Antiscroll pane constructor.
   *
   * @param {Element} wrapperElement wrapper element (main pane)
   * @param {Object} options options
   *
   * @access public
   * @returns {Antiscroll}
   */
  function Antiscroll(wrapperElement, options) {
    this.el = $(wrapperElement);
    this.options = options || {};
    this.options.cache = {
      isMovingUp: false,
      scrollPosition: 0,
      diff: 0
    };

    this.x = (false !== this.options.x) || this.options.forceHorizontal;
    this.y = (false !== this.options.y) || this.options.forceVertical;
    this.autoHide = false !== this.options.autoHide;

    // Reads "0" as an argument
    this.marginTop = undefined === this.options.marginTop ? 2 : this.options.marginTop;
    this.padding = undefined === this.options.padding ? 2 : this.options.padding;

    this.inner = this.el.find('.antiscroll-inner');

    if (options.debug) {
      console.group('Antiscroll');
      console.log('Inner element:', this.inner.get(0));
      console.log('Content width:', this.inner.css('width'));
      console.log('Content height:', this.inner.css('height'));
    }

    this.inner.css({
      width: '+=' + (this.y ? scrollbarSize() : 0),
      height: '+=' + (this.x ? scrollbarSize() : 0)
    });

    if (options.debug) {
      console.log('New content width:', this.inner.css('width'));
      console.log('New content height:', this.inner.css('height'));
      console.groupEnd();
    }

    if (options.autoResize) {
      $(window).resize($.proxy(this.rebuild, this));
    }

    this.refresh();
  }

  /**
   * Refresh scrollbars.
   *
   * @access public
   */
  Antiscroll.prototype.refresh = function () {
    if (this.options.debug) {
      console.group('Antiscroll.refresh');
    }

    var needHScroll = this.inner.get(0).scrollWidth > this.el.width() + (this.y ? scrollbarSize() : 0);
    var needVScroll = this.inner.get(0).scrollHeight > this.el.height() + (this.x ? scrollbarSize() : 0);

    if (this.options.debug) {
      console.log('Needs horizontal scroll:', needHScroll);
      console.log('Needs vertical scroll:', needVScroll);
    }

    if (this.x) {
      if (!this.horizontal && needHScroll) {
        this.horizontal = (this.options.notHorizontal) ? undefined : new Scrollbar.Horizontal(this);
      } else if (this.horizontal && !needHScroll) {
        this.horizontal.destroy();
        this.horizontal = null;
      } else if (this.horizontal) {
        this.horizontal.update();
      }
    }

    if (this.y) {
      if (!this.vertical && needVScroll) {
        this.vertical = (this.options.notVertical) ? undefined : new Scrollbar.Vertical(this);
      } else if (this.vertical && !needVScroll) {
        this.vertical.destroy();
        this.vertical = null;
      } else if (this.vertical) {
        this.vertical.update();
      }
    }

    if (this.options.debug) {
      console.groupEnd();
    }

    return 'Scrollbars have been refreshed.';
  };

  /**
   * Cleans up.
   *
   * @access public
   * @return {Antiscroll} for chaining
   */
  Antiscroll.prototype.destroy = function () {
    if (this.options.debug) {
      console.group('Antiscroll.destroy');
    }

    if (this.horizontal) {
      this.horizontal.destroy();
      this.horizontal = null;
    }

    if (this.vertical) {
      this.vertical.destroy();
      this.vertical = null;
    }

    if (this.options.debug) {
      console.groupEnd();
    }

    if (this.options.autoResize) {
      $(window).unbind('resize', this.rebuild);
    }

    return this;
  };

  /**
   * Rebuild Antiscroll.
   * @param {Object} moreOptions options
   * @return {Antiscroll} for chaining
   */
  Antiscroll.prototype.rebuild = function (moreOptions) {
    if (this.options.debug) {
      console.group('Antiscroll.rebuild');
    }

    var options = $.extend({}, this.options, moreOptions);

    if (options.debug) {
      console.log('Options:', options);
    }

    this.destroy();
    this.inner.attr('style', '');
    Antiscroll.call(this, this.el, options);

    if (this.options.debug) {
      console.groupEnd();
    }

    return this;
  };

  /**
   * Scrollbar constructor.
   *
   * @access public
   * @param {Element|jQuery} pane element
   * @returns {antiscroll-2_L1.Scrollbar}
   */
  function Scrollbar(pane) {
    this.pane = pane;
    this.pane.el.append(this.el);
    this.innerEl = this.pane.inner.get(0);

    this.dragging = false;
    this.enter = false;
    this.shown = false;

    // hovering
    this.pane.el.mouseenter($.proxy(this, 'mouseenter'));
    this.pane.el.mouseleave($.proxy(this, 'mouseleave'));

    // dragging
    this.el.mousedown($.proxy(this, 'mousedown'));

    // scrolling
    this.innerPaneScrollListener = $.proxy(this, 'scroll');
    this.pane.inner.scroll(this.innerPaneScrollListener);

    // wheel -optional-
    this.innerPaneMouseWheelListener = $.proxy(this, 'mousewheel');
    this.pane.inner.bind('mousewheel', this.innerPaneMouseWheelListener);

    // show
    var initialDisplay = this.pane.options.initialDisplay;

    if (initialDisplay !== false) {
      this.show();
      if (this.pane.autoHide) {
        this.hiding = setTimeout($.proxy(this, 'hide'), parseInt(initialDisplay, 10) || 3000);
      }
    }
  }

  /**
   * Cleans up.
   *
   * @access public
   * @return {Scrollbar} for chaining
   */
  Scrollbar.prototype.destroy = function () {
    this.el.remove();
    this.pane.inner.unbind('scroll', this.innerPaneScrollListener);
    this.pane.inner.unbind('mousewheel', this.innerPaneMouseWheelListener);
    return this;
  };

  /**
   * Called upon mouseenter.
   *
   * @access private
   */
  Scrollbar.prototype.mouseenter = function () {
    this.enter = true;
    this.show();
  };

  /**
   * Called upon mouseleave.
   *
   * @access private
   */
  Scrollbar.prototype.mouseleave = function () {
    this.enter = false;

    if (!this.dragging) {
      if (this.pane.autoHide) {
        this.hide();
      }
    }
  };

  /**
   * Called upon wrap scroll.
   *
   * @access private
   */
  Scrollbar.prototype.scroll = function () {
    if (!this.shown) {
      this.show();
      if (!this.enter && !this.dragging) {
        if (this.pane.autoHide) {
          this.hiding = setTimeout($.proxy(this, 'hide'), 1500);
        }
      }
    }

    this.update();
  };

  /**
   * Called upon scrollbar mousedown.
   *
   * @access private
   * @param {Event} event
   * @returns {undefined}
   */
  Scrollbar.prototype.mousedown = function (event) {
    event.preventDefault();

    this.dragging = true;

    this.startPageY = event.pageY - parseInt(this.el.css('top'), 10);
    this.startPageX = event.pageX - parseInt(this.el.css('left'), 10);

    // prevent crazy selections on IE
    this.el[0].ownerDocument.onselectstart = function () {
      return false;
    };

    // make scrollbar draggable
    var move = $.proxy(this, 'mousemove');
    var self = this;

    var onMouseUp = function () {
      self.dragging = false;
      this.onselectstart = null;

      $(this).unbind('mousemove', move);

      if (!self.enter) {
        self.hide();
      }
    };

    $(this.el[0].ownerDocument)
            .mousemove(move)
            .mouseup(onMouseUp);
  };

  /**
   * Show scrollbar.
   *
   * @access private
   * @returns {undefined}
   */
  Scrollbar.prototype.show = function () {
    if (!this.shown && this.update()) {
      this.el.addClass('antiscroll-scrollbar-shown');
      if (this.hiding) {
        clearTimeout(this.hiding);
        this.hiding = null;
      }
      this.shown = true;
    }
  };

  /**
   * Hide scrollbar.
   *
   * @access private
   */
  Scrollbar.prototype.hide = function () {
    if (this.pane.autoHide !== false && this.shown) {
      // check for dragging
      this.el.removeClass('antiscroll-scrollbar-shown');
      this.shown = false;
    }
  };

  /**
   * Horizontal scrollbar constructor.
   *
   * @access private
   * @param {type} pane
   * @returns {antiscroll-2_L1.Scrollbar.Horizontal}
   */
  Scrollbar.Horizontal = function (pane) {
    this.el = $('<div class="antiscroll-scrollbar antiscroll-scrollbar-horizontal"/>', pane.el);
    Scrollbar.call(this, pane);
  };

  /**
   * Inherits from Scrollbar.
   */
  inherits(Scrollbar.Horizontal, Scrollbar);

  /**
   * Updates size/position of scrollbar.
   *
   * @access private
   * @returns {Boolean}
   */
  Scrollbar.Horizontal.prototype.update = function () {
    var paneWidth = this.pane.el.width();
    var trackWidth = paneWidth - this.pane.padding * 2;
    var innerEl = this.pane.inner.get(0);

    this.el.css({
      width: trackWidth * paneWidth / innerEl.scrollWidth,
      left: trackWidth * innerEl.scrollLeft / innerEl.scrollWidth
    });

    return paneWidth < innerEl.scrollWidth;
  };

  /**
   * Called upon drag.
   *
   * @access private
   * @param {type} event
   * @returns {undefined}
   */
  Scrollbar.Horizontal.prototype.mousemove = function (event) {
    var trackWidth = this.pane.el.width() - this.pane.padding * 2;
    var pos = event.pageX - this.startPageX;
    var barWidth = this.el.width();
    var innerEl = this.pane.inner.get(0);

    // minimum top is 0, maximum is the track height
    var y = Math.min(Math.max(pos, 0), trackWidth - barWidth);

    innerEl.scrollLeft =
      (innerEl.scrollWidth - this.pane.el.width()) * y / (trackWidth - barWidth);
  };

  /**
   * Called upon container mousewheel.
   *
   * @access private
   * @param {type} ev
   * @param {type} x
   * @returns {Boolean}
   */
  Scrollbar.Horizontal.prototype.mousewheel = function (ev, x) {
    if ((x < 0 && 0 === this.pane.inner.get(0).scrollLeft) ||
      (x > 0 && (this.innerEl.scrollLeft + Math.ceil(this.pane.el.width())
        === this.innerEl.scrollWidth))) {
      ev.preventDefault();
      return false;
    }
  };

  /**
   * Vertical scrollbar constructor.
   *
   * @access private
   * @param {type} pane
   * @returns {antiscroll-2_L1.Scrollbar.Vertical}
   */
  Scrollbar.Vertical = function (pane) {
    this.el = $('<div class="antiscroll-scrollbar antiscroll-scrollbar-vertical" style="margin-top: ' + pane.marginTop + 'px;" />', pane.el);
    Scrollbar.call(this, pane);
  };

  /**
   * Inherits from Scrollbar.
   */
  inherits(Scrollbar.Vertical, Scrollbar);

  /**
   * Updates size/position of scrollbar.
   *
   * @access private
   */
  Scrollbar.Vertical.prototype.update = function () {
    if (this.pane.options.debug) {
      console.group('Scrollbar.Vertical.update');
    }

    var paneHeight = this.pane.el.height();
    var trackHeight = paneHeight - this.pane.padding * 2;
    var innerEl = this.innerEl;

    var barHeight = trackHeight * paneHeight / innerEl.scrollHeight;
    barHeight = barHeight < 20 ? 20 : barHeight;
    barHeight = parseInt(barHeight, 10);

    if (this.pane.options.debug) {
      console.groupCollapsed('Measurements');
      console.log('Content height: ', innerEl.scrollHeight);
      console.log('Container height:', paneHeight);
      console.log('Track height:', trackHeight);
      console.log('Scrollbar height:', barHeight);
      console.log('Scrollable track:', trackHeight - barHeight);
      console.groupEnd();
    }

    var topPos = trackHeight * innerEl.scrollTop / innerEl.scrollHeight;

    // If scrollbar would go beyond boundaries
    if ((topPos + barHeight) > trackHeight) {
      if (this.pane.options.debug) {
        console.warn('Scrollbar goes beyond boundaries. Offset will be adjusted.');
      }
      var overlap = (topPos + barHeight) - trackHeight;
      topPos = topPos - overlap;
    }

    if (this.pane.options.startBottom) {
      var paneHeightDiff = paneHeight - barHeight;
      var possibileScrollTop = innerEl.scrollHeight - paneHeightDiff;

      if (this.pane.options.debug) {
        console.log('Pane height - scrollbar:', paneHeightDiff);
        console.log('Scroll height before bottom: ' + parseInt(innerEl.scrollHeight, 10)
            + ' - ' + parseInt(paneHeightDiff, 10)
            + ' = ' + parseInt(possibileScrollTop, 10)
          , possibileScrollTop);
      }

      if (possibileScrollTop > 0) {
        topPos = paneHeightDiff;
        innerEl.scrollTop = possibileScrollTop;
        this.pane.options.startBottom = undefined;
      }
    }

    topPos = Math.round(topPos);

    if (this.pane.options.debug) {
      console.log('Scrolled track: ' + topPos + ' / ' + trackHeight);
      console.log('Scrolled content: ' + innerEl.scrollTop + ' / ' + innerEl.scrollHeight);
      this.pane.options.cache.diff = topPos - this.pane.options.cache.scrollPosition;
      console.groupEnd();
    }

    this.el.css({
      height: barHeight,
      top: topPos
    });

    this.pane.options.cache.scrollPosition = topPos;

    return paneHeight < innerEl.scrollHeight;
  };

  /**
   * Sets the position for the vertical scrollbar.
   * Called when the vertical scrollbar is dragged.
   *
   * @access private
   * @param {MouseEvent} event
   * @returns {undefined}
   */
  Scrollbar.Vertical.prototype.mousemove = function (event) {
    if (this.pane.options.debug) {
      console.group('Scrollbar.Vertical.mousemove');
    }

    var paneHeight = this.pane.el.height();
    var trackHeight = paneHeight - this.pane.padding * 2;
    var innerEl = this.innerEl;

    var pos = event.pageY - this.startPageY;
    var barHeight = this.el.height();
    var scrollableTrack = trackHeight - barHeight;

    // minimum top is 0, maximum is the track height
    var heightAboveBar = Math.min(Math.max(pos, 0), scrollableTrack);

    if (this.pane.options.debug) {
      console.groupCollapsed('Measurements');
      console.log('Content height: ', innerEl.scrollHeight);
      console.log('Container height:', paneHeight);
      console.log('Track height:', trackHeight);
      console.log('Scrollbar height:', barHeight);
      console.log('Scrollable track:', trackHeight - barHeight);
      console.groupEnd();
      console.log('Scrolled track: ' + heightAboveBar + ' / ' + trackHeight);
    }

    var topPos =
      (innerEl.scrollHeight - trackHeight)
      * heightAboveBar / scrollableTrack;
    topPos = Math.round(topPos);

    if (this.pane.options.debug) {
      console.log('Scrolled content: '
        + topPos + ' = '
        + '(' + innerEl.scrollHeight + ' - ' + paneHeight + ') * '
        + heightAboveBar + ' / ' + scrollableTrack);
    }

    innerEl.scrollTop = topPos;

    // TODO: Move across boundaries is missing!

    if (this.pane.options.debug) {
      console.groupEnd();
    }
  };

  /**
   * Called upon container mousewheel.
   *
   * @access private
   * @param {WheelEvent} event
   * @param {number} y
   * @returns {Boolean}
   */
  Scrollbar.Vertical.prototype.mousewheel = function (event, y) {
    if (this.pane.options.debug) {
      console.group('Scrollbar.Vertical.mousewheel');
      console.log('Mousewheel event', event);
    }

    if (event.deltaY < 0) {
      this.pane.options.cache.isMovingUp = false;
    } else {
      this.pane.options.cache.isMovingUp = true;
    }

    if (this.pane.options.debug) {
      console.log('Moves up: ' + this.pane.options.cache.isMovingUp);
      var heightOfMouseWheelMove = (-1 * event.deltaY) * event.deltaFactor;
      console.log('Delta factor: ' + heightOfMouseWheelMove);
      var scrolledContent = this.innerEl.scrollTop + heightOfMouseWheelMove;
      console.log('Scrolled content: ' + scrolledContent);
      console.groupEnd();
    }

    /**
     * Checks if scrolling with the mousewheel moves the scrollbar
     * all the way up or all the way down.
     *
     * @param {type} paneHeight
     * @param {type} scrollHeight
     * @param {type} scrollTop
     * @returns {Boolean} Returns true if the boundary was reached.
     */
    function hasReachedBoundary(paneHeight, scrollHeight, scrollTop) {
      if ((y > 0 && 0 === scrollTop) ||
        (y < 0 && (scrollTop + Math.ceil(paneHeight) === scrollHeight))) {
        return true;
      } else {
        return false;
      }
    }

    // Disable further mousewheel scrolling if the scrollbar is bottommost or topmost
    if (hasReachedBoundary(this.pane.el.height(), this.innerEl.scrollHeight, this.innerEl.scrollTop)) {
      event.preventDefault();
      return false;
    }
  };

  /**
   * Cross-browser inheritance.
   *
   * @access private
   * @param {Function} ctorA constructor
   * @param {Function} ctorB constructor we inherit from
   * @returns {undefined}
   */
  function inherits(ctorA, ctorB) {
    function f() {
    }
    f.prototype = ctorB.prototype;
    ctorA.prototype = new f;
  }

  /**
   * Scrollbar size detection.
   */
  var size;

  function scrollbarSize() {
    if (size === undefined) {
      var div = $(
          '<div class="antiscroll-inner" style="width:50px;height:50px;overflow-y:scroll;'
          + 'position:absolute;top:-200px;left:-200px;"><div style="height:100px;width:100%"/>'
          + '</div>'
      );

      $('body').append(div);
      var w1 = $(div).innerWidth();
      var w2 = $('div', div).innerWidth();
      $(div).remove();

      size = w1 - w2;
    }

    return size;
  }

})(jQuery);
