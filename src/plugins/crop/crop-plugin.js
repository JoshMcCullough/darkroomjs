import {CropTransformation} from './crop-transformation';
import {CropHandler} from './crop-handler';

export function CropPlugin(options) {
  return (darkroom) => {
    this.handler = new CropHandler(darkroom.workingDrawer, {});

    this.cropButton = document.createElement('button');
    this.cropButton.innerHTML = require('./crop.svg');
    // this.cropButton.textContent = 'Crop';

    this.acceptButton = document.createElement('button');
    this.acceptButton.innerHTML = require('./done.svg');
    // this.acceptButton.textContent = 'Accept crop';
    this.acceptButton.className = 'darkroom-button--hide';
    this.acceptButton.disabled = true;

    this.cancelButton = document.createElement('button');
    this.cancelButton.innerHTML = require('./close.svg');
    // this.cancelButton.textContent = 'Cancel crop';
    this.cancelButton.className = 'darkroom-button--hide';
    this.cancelButton.disabled = true;

    darkroom.toolbarElement.appendChild(this.cropButton);
    darkroom.toolbarElement.appendChild(this.acceptButton);
    darkroom.toolbarElement.appendChild(this.cancelButton);

    // Actions
    this.toggleCropAction = () => {
      if (!this.handler.hasFocus()) {
        this.requireFocusAction();
      } else {
        this.releaseFocusAction();
      }
    };

    this.cropAction = () => {
      let zone = this.handler.getCurrentZone();

      if (!zone) {
        return;
      }

      this.releaseFocusAction();

      darkroom.applyTransformation(
        CropTransformation(zone)
      );
    };

    this.requireFocusAction = () => {
      this.handler.requireFocus();
      this.cropButton.className = 'darkroom-button--active';
      this.acceptButton.className = 'darkroom-button--success';
      this.cancelButton.className = 'darkroom-button--danger';
      this.acceptButton.disabled = false;
      this.cancelButton.disabled = false;
    };

    this.releaseFocusAction = () => {
      this.handler.releaseFocus();
      this.cropButton.className = '';
      this.acceptButton.className = 'darkroom-button--hide';
      this.cancelButton.className = 'darkroom-button--hide';
      this.acceptButton.disabled = true;
      this.cancelButton.disabled = true;
    };

    // Buttons click
    this.cropButton.addEventListener('click', this.toggleCropAction.bind(this));
    this.acceptButton.addEventListener('click', this.cropAction.bind(this));
    this.cancelButton.addEventListener('click', this.releaseFocusAction.bind(this));

    // Public API of the crop plugin
    return {
      crop: this.cropAction.bind(this),
      toggleCrop: this.toggleCropAction.bind(this),
      requireFocus: this.requireFocusAction.bind(this),
      releaseFocus: this.releaseFocusAction.bind(this),
    };
  };
}
