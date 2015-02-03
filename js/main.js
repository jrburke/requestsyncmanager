'use strict';

var registrations,
    manager = navigator.syncManager;
if (!manager) {
  console.error('!!!!!! navigator.syncManager does not exist');
}

var template = `<div class="regItem">
<pre>{raw}</pre>
<form class="intervalForm" data-index="{index}">
<input name="minInterval" type="number" placeholder="minInterval secs">
<button type="submit">set</button>
</div>`;

var tempNode = document.createElement('div');

function makeSerializable(target, source, keyObj) {
  Object.keys(keyObj || source).forEach(function(key) {
    var value = source[key];
    if (typeof value === 'object' && value && !Array.isArray(value) &&
        !(value instanceof RegExp)) {
      target[key] = {};
      makeSerializable(target[key], source[key], source[key].__proto__);
    } else {
      target[key] = source[key];
    }
  });
}

function makeRegNode(obj, index) {
  var html = template.replace(/{raw}/g, JSON.stringify(obj, null, '  '))
                      .replace(/{index}/g, index);

  tempNode.innerHTML = html;
  var resultDiv = tempNode.firstChild;
  tempNode.innerHTML = '';
  return resultDiv;
}

// Button actions, wired to the buttons with the IDs matching the object keys.
var actions = {
  listSync: function(evt) {
    var regDiv = document.getElementById('registrations');
    regDiv.innerHTML = '';

    manager.registrations().then(function(regs) {
      registrations = regs;
      console.log('REGISTRATIONS RETURNED ' + registrations.length + ' items');
      registrations.forEach(function(reg, i) {
        console.log('REGISTRATION ITEM:');
        var serializable = {};
        makeSerializable(serializable, reg, reg.__proto__);

        regDiv.appendChild(makeRegNode(serializable, i));
      });
    }).catch(function(e) {
      console.error('registrations() failed with: ' + e);
    });
  },

  changeMinSync: function(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var index = parseInt(evt.target.dataset.index, 10),
        input = evt.target.querySelector('input'),
        overridenMinInterval = parseInt(input.value, 10),
        reg = registrations[index];

    if (!reg) {
      console.error('No registration for index: ' + index);
      return;
    }

    var app = reg.app;
    manager.setPolicy(reg.task, app.origin, app.manifestURL,
                      app.isInBrowserElement, reg.state, overridenMinInterval)
    .then(function() {
      actions.listSync();
    })
    .catch(function(err) {
      console.error('Change min interval failed: ' + err);
    });
  }
};

// Wiring event handlers to the buttons.
Object.keys(actions).forEach(function(key) {
  var node = document.getElementById(key);
  if (node) {
    node.addEventListener('click', actions[key], false);
  }
});

document.body.addEventListener('submit', actions.changeMinSync, false);
