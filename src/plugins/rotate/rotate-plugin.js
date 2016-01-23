import {RotateTransformation} from './rotate-transformation';

export function RotatePlugin(options) {
  return (darkroom) => {
    var buttonLeft, buttonRight;

    buttonLeft = document.createElement('button');
    buttonLeft.innerHTML = require('./rotate-left.svg');
    // buttonLeft.textContent = 'Rotate left';
    buttonLeft.addEventListener('click', (event) => {
      darkroom.applyTransformation(
        RotateTransformation(-90)
      );
    });

    buttonRight = document.createElement('button');
    buttonRight.innerHTML = require('./rotate-right.svg');
    // buttonRight.textContent = 'Rotate right';
    buttonRight.addEventListener('click', (event) => {
      darkroom.applyTransformation(
        RotateTransformation(90)
      );
    });

    darkroom.toolbarElement.appendChild(buttonLeft);
    darkroom.toolbarElement.appendChild(buttonRight);
  };
}
