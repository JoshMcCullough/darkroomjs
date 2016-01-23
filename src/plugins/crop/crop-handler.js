import fabric from 'fabric';
import * as _ from 'lodash';

import {CropZone} from './crop-zone';

export class CropHandler {

  constructor(drawer, options = {}) {
    this.drawer = drawer;

    this.cropZone = null;

    // Init point
    this.startX = null;
    this.startY = null;

    // Keycrop
    this.isKeyCroping = false;
    this.isKeyLeft = false;
    this.isKeyUp = false;

    this.options = _.merge({
      // min crop dimension
      minHeight: 1,
      minWidth: 1,
      // ensure crop ratio
      ratio: null,
      // quick crop feature (set a key code to enable it)
      quickCropKey: false
    }, options);

    // Canvas events
    drawer.canvas.on('mouse:down', this.onMouseDown.bind(this));
    drawer.canvas.on('mouse:move', this.onMouseMove.bind(this));
    drawer.canvas.on('mouse:up', this.onMouseUp.bind(this));
    drawer.canvas.on('object:moving', this.onObjectMoving.bind(this));
    drawer.canvas.on('object:scaling', this.onObjectScaling.bind(this));
    fabric.util.addListener(fabric.document, 'keydown', this.onKeyDown.bind(this));
    fabric.util.addListener(fabric.document, 'keyup', this.onKeyUp.bind(this));
  }

  // Avoid crop zone to go beyond the canvas edges
  onObjectMoving(event) {
    if (!this.hasFocus()) {
      return;
    }

    let currentObject = event.target;

    if (currentObject !== this.cropZone) {
      return;
    }

    let canvas = this.drawer.canvas;
    let x = currentObject.getLeft(), y = currentObject.getTop();
    let w = currentObject.getWidth(), h = currentObject.getHeight();
    let maxX = canvas.getWidth() - w;
    let maxY = canvas.getHeight() - h;

    if (x < 0) {
      currentObject.set('left', 0);
    }
    if (y < 0) {
      currentObject.set('top', 0);
    }
    if (x > maxX) {
      currentObject.set('left', maxX);
    }
    if (y > maxY) {
      currentObject.set('top', maxY);
    }
  }

  // Prevent crop zone from going beyond the canvas edges (like mouseMove)
  onObjectScaling(event) {
    if (!this.hasFocus()) {
      return;
    }

    let preventScaling = false;
    let currentObject = event.target;

    if (currentObject !== this.cropZone) {
      return;
    }

    let canvas = this.drawer.canvas;
    // let pointer = canvas.getPointer(event.e);

    let minX = currentObject.getLeft();
    let minY = currentObject.getTop();
    let maxX = currentObject.getLeft() + currentObject.getWidth();
    let maxY = currentObject.getTop() + currentObject.getHeight();

    if (null !== this.options.ratio) {
      if (minX < 0 || maxX > canvas.getWidth() || minY < 0 || maxY > canvas.getHeight()) {
        preventScaling = true;
      }
    }

    if (minX < 0 || maxX > canvas.getWidth() || preventScaling) {
      currentObject.setScaleX(this.lastScaleX || 1);
    }
    if (minX < 0) {
      currentObject.setLeft(0);
    }

    if (minY < 0 || maxY > canvas.getHeight() || preventScaling) {
      currentObject.setScaleY(this.lastScaleY || 1);
    }
    if (minY < 0) {
      currentObject.setTop(0);
    }

    if (currentObject.getWidth() < this.options.minWidth) {
      currentObject.scaleToWidth(this.options.minWidth);
    }
    if (currentObject.getHeight() < this.options.minHeight) {
      currentObject.scaleToHeight(this.options.minHeight);
    }

    this.lastScaleX = currentObject.getScaleX();
    this.lastScaleY = currentObject.getScaleY();
  }

  // Init crop zone
  onMouseDown(event) {
    if (!this.hasFocus()) {
      return;
    }

    let canvas = this.drawer.canvas;

    // recalculate offset, in case canvas was manipulated since last `calcOffset`
    canvas.calcOffset();

    let pointer = canvas.getPointer(event.e);
    let x = pointer.x;
    let y = pointer.y;
    let point = new fabric.Point(x, y);

    // Check if user want to scale or drag the crop zone.
    let activeObject = canvas.getActiveObject();

    if (activeObject === this.cropZone || this.cropZone.containsPoint(point)) {
      return;
    }

    canvas.discardActiveObject();
    this.cropZone.setWidth(0);
    this.cropZone.setHeight(0);
    this.cropZone.setScaleX(1);
    this.cropZone.setScaleY(1);

    this.startX = x;
    this.startY = y;
  }

  // Extend crop zone
  onMouseMove(event) {
    // Quick crop feature
    if (this.isKeyCroping) {
      this.onMouseMoveKeyCrop(event);
      return;
    }

    if (null === this.startX || null === this.startY) {
      return;
    }

    let canvas = this.drawer.canvas;
    let pointer = canvas.getPointer(event.e);
    let x = pointer.x;
    let y = pointer.y;

    this._renderCropZone(this.startX, this.startY, x, y);
  }

  onMouseMoveKeyCrop(event) {
    let canvas = this.drawer.canvas;
    let zone = this.cropZone;

    let pointer = canvas.getPointer(event.e);
    let x = pointer.x;
    let y = pointer.y;

    if (!zone.left || !zone.top) {
      zone.setTop(y);
      zone.setLeft(x);
    }

    this.isKeyLeft = x < zone.left + zone.width / 2 ;
    this.isKeyUp = y < zone.top + zone.height / 2 ;

    this._renderCropZone(
      Math.min(zone.left, x),
      Math.min(zone.top, y),
      Math.max(zone.left + zone.width, x),
      Math.max(zone.top + zone.height, y)
    );
  }

  // Finish crop zone
  onMouseUp(event) {
    if (null === this.startX || null === this.startY) {
      return;
    }

    // TODO
    // if (this.cropZone.width < 1 || this.cropZone.height < 1) {
    //   this.releaseFocus();
    // }

    let canvas = this.drawer.canvas;

    this.cropZone.setCoords();
    canvas.setActiveObject(this.cropZone);
    canvas.calcOffset();

    this.startX = null;
    this.startY = null;
  }

  onKeyDown(event) {
    if (false === this.options.quickCropKey || event.keyCode !== this.options.quickCropKey || this.isKeyCroping) {
      return;
    }

    // Active quick crop flow
    this.isKeyCroping = true ;
    this.drawer.canvas.discardActiveObject();
    this.cropZone.setWidth(0);
    this.cropZone.setHeight(0);
    this.cropZone.setScaleX(1);
    this.cropZone.setScaleY(1);
    this.cropZone.setTop(0);
    this.cropZone.setLeft(0);
  }

  onKeyUp(event) {
    if (false === this.options.quickCropKey || event.keyCode !== this.options.quickCropKey || !this.isKeyCroping) {
      return;
    }

    // Unactive quick crop flow
    this.isKeyCroping = false;
    this.startX = 1;
    this.startY = 1;
    this.onMouseUp();
  }

  selectZone(x, y, width, height, forceDimension) {
    if (!this.hasFocus()) {
      this.requireFocus();
    }

    if (!forceDimension) {
      this._renderCropZone(x, y, x + width, y + height);
    } else {
      this.cropZone.set({
        'left': x,
        'top': y,
        'width': width,
        'height': height
      });
    }

    let canvas = this.drawer.canvas;

    canvas.bringToFront(this.cropZone);
    this.cropZone.setCoords();
    canvas.setActiveObject(this.cropZone);
    canvas.calcOffset();

  }

  toggleCrop() {
    if (!this.hasFocus()) {
      this.requireFocus();
    } else {
      this.releaseFocus();
    }
  }

  getCurrentZone() {
    if (!this.hasFocus()) {
      return null;
    }

    // Avoid croping empty zone
    if (this.cropZone.width < 1 && this.cropZone.height < 1) {
      return null;
    }

    let image = this.drawer.image;

    // Compute crop zone dimensions
    let top = this.cropZone.getTop() - image.getTop();
    let left = this.cropZone.getLeft() - image.getLeft();
    let width = this.cropZone.getWidth();
    let height = this.cropZone.getHeight();

    // Adjust dimensions to image only
    if (top < 0) {
      height += top;
      top = 0;
    }

    if (left < 0) {
      width += left;
      left = 0;
    }

    return {
      // Make sure to use relative dimension since the crop will be
      // applied on the source image.
      top: top / image.getHeight(),
      left: left / image.getWidth(),
      width: width / image.getWidth(),
      height: height / image.getHeight(),
    };

  }

  // Test wether crop zone is set
  hasFocus() {
    return this.cropZone !== null;
  }

  // Create the crop zone
  requireFocus() {
    this.cropZone = new CropZone({
      fill: 'transparent',
      hasBorders: false,
      originX: 'left',
      originY: 'top',
      // stroke: '#444',
      // strokeDashArray: [5, 5],
      // borderColor: '#444',
      cornerColor: '#444',
      cornerSize: 8,
      transparentCorners: false,
      lockRotation: true,
      hasRotatingPoint: false,
    });

    if (null !== this.options.ratio) {
      this.cropZone.set('lockUniScaling', true);
    }

    this.drawer.canvas.add(this.cropZone);
    this.drawer.canvas.defaultCursor = 'crosshair';
  }

  // Remove the crop zone
  releaseFocus() {
    if (null === this.cropZone) {
      return;
    }

    this.cropZone.remove();
    this.cropZone = null;

    this.drawer.canvas.defaultCursor = 'default';
  }

  _renderCropZone(fromX, fromY, toX, toY) {
    let canvas = this.drawer.canvas;

    let isRight = (toX > fromX);
    let isLeft = !isRight;
    let isDown = (toY > fromY);
    let isUp = !isDown;

    let minWidth = Math.min(+this.options.minWidth, canvas.getWidth());
    let minHeight = Math.min(+this.options.minHeight, canvas.getHeight());

    // Define corner coordinates
    let leftX = Math.min(fromX, toX);
    let rightX = Math.max(fromX, toX);
    let topY = Math.min(fromY, toY);
    let bottomY = Math.max(fromY, toY);

    // Replace current point into the canvas
    leftX = Math.max(0, leftX);
    rightX = Math.min(canvas.getWidth(), rightX);
    topY = Math.max(0, topY);
    bottomY = Math.min(canvas.getHeight(), bottomY);

    // Recalibrate coordinates according to given options
    if (rightX - leftX < minWidth) {
      if (isRight) {
        rightX = leftX + minWidth;
      } else {
        leftX = rightX - minWidth;
      }
    }
    if (bottomY - topY < minHeight) {
      if (isDown) {
        bottomY = topY + minHeight;
      } else {
        topY = bottomY - minHeight;
      }
    }

    // Truncate truncate according to canvas dimensions
    if (leftX < 0) {
      // Translate to the left
      rightX += Math.abs(leftX);
      leftX = 0;
    }
    if (rightX > canvas.getWidth()) {
      // Translate to the right
      leftX -= (rightX - canvas.getWidth());
      rightX = canvas.getWidth();
    }
    if (topY < 0) {
      // Translate to the bottom
      bottomY += Math.abs(topY);
      topY = 0;
    }
    if (bottomY > canvas.getHeight()) {
      // Translate to the right
      topY -= (bottomY - canvas.getHeight());
      bottomY = canvas.getHeight();
    }

    let width = rightX - leftX;
    let height = bottomY - topY;
    let currentRatio = width / height;

    if (this.options.ratio && +this.options.ratio !== currentRatio) {
      let ratio = +this.options.ratio;

      if (this.isKeyCroping) {
        isLeft = this.isKeyLeft;
        isUp = this.isKeyUp;
      }

      if (currentRatio < ratio) {
        let newWidth = height * ratio;

        if (isLeft) {
          leftX -= (newWidth - width);
        }
        width = newWidth;
      } else if (currentRatio > ratio) {
        let newHeight = height / (ratio * height / width);

        if (isUp) {
          topY -= (newHeight - height);
        }
        height = newHeight;
      }

      if (leftX < 0) {
        leftX = 0;
      }
      if (topY < 0) {
        topY = 0;
      }
      if (leftX + width > canvas.getWidth()) {
        let newWidth = canvas.getWidth() - leftX;

        height = newWidth * height / width;
        width = newWidth;
        if (isUp) {
          topY = fromY - height;
        }
      }
      if (topY + height > canvas.getHeight()) {
        let newHeight = canvas.getHeight() - topY;

        width = width * newHeight / height;
        height = newHeight;
        if (isLeft) {
          leftX = fromX - width;
        }
      }
    }

    // Apply coordinates
    this.cropZone.left = leftX;
    this.cropZone.top = topY;
    this.cropZone.width = width;
    this.cropZone.height = height;

    this.drawer.canvas.bringToFront(this.cropZone);

  }
}
