import * as _ from 'lodash';

import {Drawer} from './core/drawer';
import {EventEmitter} from './core/event-emitter';

import {HistoryPlugin} from './plugins/history/history-plugin';
import {RotatePlugin} from './plugins/rotate/rotate-plugin';
import {CropPlugin} from './plugins/crop/crop-plugin';
import {SavePlugin} from './plugins/save/save-plugin';

require('./style.css');

/**
 * Default options when instanciating a new Darkroom object.
 */
const defaultOptions = {
  workingDrawer: {
    className: 'darkroom-working-drawer'
  },

  sourceDrawer: {
    className: 'darkroom-source-drawer'
  },

  plugins: {
    history: {},
    rotate: {},
    crop: {},
    save: {},
  }
};

/**
 * List of built-in plugins.
 *
 * This eases the configuration of the plugins when instanciating
 * a new Darkroom object.
 */
const pluginsMap = {
  history: HistoryPlugin,
  crop: CropPlugin,
  rotate: RotatePlugin,
  save: SavePlugin,
};

/**
 * Darkroom
 */
export default class Darkroom {

  /**
   * Darkroom main @constructor.
   *
   * @param {string|element} target
   * @param {Object} options
   */
  constructor(target, options = {}) {
    this.options = _.merge(defaultOptions, options);
    this.events = new EventEmitter();

    this.initialized = this._loadImage(target)
      .then(() => this._createDom())
      .then(() => this._initializePlugins())
    ;
  }

  /**
   * Call a transformation callback to the source drawer and
   * export new image to the working drawer.

   * @param {function} transformation
   */
  applyTransformation(transformation) {
    if (typeof transformation !== 'function') {
      throw new TypeError('Transformation must be a valid function');
    }

    // Apply translation to the source drawer
    let action = transformation(this.sourceDrawer);

    // If action did not returned Promise then create empty one
    if (!action || typeof action.then !== 'function') {
      action = Promise.resolve(null);
    }

    // Once action completed clone the source drawer image
    // and render it in the working drawer
    return action.then(() => {
      this.sourceDrawer.image.cloneAsImage((clone) => {
        this.workingDrawer.setFabricImage(clone);
        this.workingDrawer.render();
      });
    }).then(() => {
      this.events.publish('transformation', {
        transformation: transformation
      });
    });
  }

  /**
   * Ensure imageElement is a valid IMG element and
   * wait for the image being loaded.
   *
   * @param {string|element} imageElement The image element
   *
   * @return {Promise} Resolves when image is fully loaded
   */
  _loadImage(imageElement) {
    // Transform string into DOM element
    if (typeof imageElement === 'string') {
      imageElement = document.querySelector(imageElement);
    }

    // Check element is a valid image DOM element
    if (!imageElement || imageElement.nodeName !== 'IMG') {
      throw new TypeError('Darkroom needs to be applied on a valid image element');
    }

    // Save original image element
    this.originalImageElement = imageElement;

    return new Promise((resolve, reject) => {
      if (imageElement.complete) {
        resolve();
      } else {
        imageElement.onload = () => resolve();
        imageElement.onerror = () => reject();
      }
    });
  }

  /**
   * Create the initial DOM structure.
   */
  _createDom() {
    // This allow to hide original image and bypass rendered
    // width & height of the image.
    this.originalImageElement.style.display = 'none';

    // Drawers
    this.workingDrawer = new Drawer(this.originalImageElement, this.options.workingDrawer);
    this.sourceDrawer = new Drawer(this.originalImageElement, this.options.sourceDrawer);
    this.sourceDrawer.containerElement.style.display = 'none';

    // Toolbar
    this.toolbarElement = document.createElement('div');
    this.toolbarElement.className = 'darkroom-toolbar';

    // Container
    this.containerElement = document.createElement('div');
    this.containerElement.className = 'darkroom-container';
    this.containerElement.style.position = 'relative';
    this.containerElement.appendChild(this.toolbarElement);
    this.containerElement.appendChild(this.workingDrawer.containerElement);
    this.containerElement.appendChild(this.sourceDrawer.containerElement);

    // Replace image element
    this.originalImageElement.parentNode.replaceChild(this.containerElement, this.originalImageElement);
    this.containerElement.appendChild(this.originalImageElement);
  }

  /**
   * Instanciate all plugins according to given options.
   */
  _initializePlugins() {
    this.plugins = {};

    for (let name in this.options.plugins) {
      let pluginCallback;
      let options = this.options.plugins[name];

      // Set false or null to disable plugin
      if (!options) {
        continue;
      }

      if (_.isPlainObject(options) && pluginsMap[name]) {
        pluginCallback = new pluginsMap[name](options);
      } else if (_.isFunction(options)) {
        pluginCallback = options;
      } else {
        throw new TypeError(`Unable to initialize plugin ${name}`);
      }

      this.plugins[name] = pluginCallback(this);
    }
  }
}
