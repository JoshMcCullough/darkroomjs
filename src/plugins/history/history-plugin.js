export function HistoryPlugin() {
  return (darkroom) => {
    let initialImage;
    let undoButton;
    let redoButton;
    let doneTransformations = [];
    let undoneTransformations = [];

    let refreshUI = () => {
      undoButton.disabled = (0 === doneTransformations.length);
      redoButton.disabled = (0 === undoneTransformations.length);
    };

    let resetDarkroomImage = () => new Promise((resolve, reject) => {
      initialImage.clone((clone) => {
        darkroom.sourceDrawer.setFabricImage(clone);
        darkroom.sourceDrawer.render();
        resolve();
      });
    });

    let applyTransformations = (transformations) => {
      if (0 === transformations.length) {
        return Promise.resolve(null);
      }

      let transformation = transformations[0];
      let action = transformation(darkroom.sourceDrawer);

      // If action did not returned Promise then create empty one
      if (!action || typeof action.then !== 'function') {
        action = Promise.resolve(null);
      }

      return action.then(() => applyTransformations(transformations.slice(1)));
    };

    let undo = () => {
      if (0 === doneTransformations.length) {
        return Promise.resolve(null);
      }

      undoneTransformations.unshift(
        doneTransformations.pop()
      );

      return resetDarkroomImage()
        .then(() => applyTransformations(doneTransformations))
        .then(() => refreshUI())
        .then(() => {
          darkroom.sourceDrawer.image.cloneAsImage((clone) => {
            darkroom.workingDrawer.setFabricImage(clone);
            darkroom.workingDrawer.render();
          });
        })
      ;
    };

    let redo = () => {
      if (0 === undoneTransformations.length) {
        return Promise.resolve(null);
      }

      let transformation = undoneTransformations.shift();

      // Apply transformation
      let action = transformation(darkroom.sourceDrawer);

      // If action did not returned Promise then create empty one
      if (!action || typeof action.then !== 'function') {
        action = Promise.resolve(null);
      }

      return action.then(() => {
        darkroom.sourceDrawer.image.cloneAsImage((clone) => {
          darkroom.workingDrawer.setFabricImage(clone);
          darkroom.workingDrawer.render();
        });
      }).then(() => {
        doneTransformations.push(transformation);
        refreshUI();
      });
    };

    darkroom.sourceDrawer.image.clone((clone) => {
      initialImage = clone;
    });

    undoButton = document.createElement('button');
    undoButton.innerHTML = require('./undo.svg');
    // undoButton.textContent = 'Undo';
    undoButton.disabled = true;
    undoButton.addEventListener('click', undo);

    redoButton = document.createElement('button');
    redoButton.innerHTML = require('./redo.svg');
    // redoButton.textContent = 'Redo';
    redoButton.disabled = true;
    redoButton.addEventListener('click', redo);

    darkroom.toolbarElement.appendChild(undoButton);
    darkroom.toolbarElement.appendChild(redoButton);

    darkroom.events.subscribe('transformation', (payload) => {
      // Stack the transformation
      doneTransformations.push(payload.transformation);

      // Empty the undone transformations
      undoneTransformations = [];

      // Update the buttons
      refreshUI();
    });

    return {
      undo: undo,
      redo: redo,
    };
  };
}
