'use strict';

var registrations,
    manager = navigator.syncManager;
if (!manager) {
  console.error('!!!!!! navigator.syncManager does not exist');
}

var template = `<div class="regItem">
  <pre>{raw}</pre>
  <form class="changeMinSync" data-index="{index}">
    <input name="minInterval" type="number" placeholder="minInterval secs">
    <button type="submit">set</button>
  </form>
  <form class="syncNow" data-index="{index}">
    <button type="submit">run now</button>
  </form>
  <form class="toggleState" data-index="{index}" data-newstate="{newState}">
    <button type="submit">set {newState}</button>
  </form>
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

function makeRegNode(obj, index, newState) {
  var html = template.replace(/{raw}/g, JSON.stringify(obj, null, '  '))
                      .replace(/{index}/g, index)
                      .replace(/{newState}/g, newState);

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

        var newState = serializable.state === 'enabled' ?
                       'disabled' : 'enabled';

        regDiv.appendChild(makeRegNode(serializable, i, newState));
      });
    }).catch(function(e) {
      console.error('registrations() failed with: ' + e);
    });
  },

 changeMinSync: function(formNode, reg) {
    var input = formNode.querySelector('input'),
        overridenMinInterval = parseInt(input.value, 10);

    return reg.setPolicy(reg.state, overridenMinInterval);
  },

 syncNow: function(formNode, reg) {
    return reg.runNow();
  },

  toggleState: function(formNode, reg) {
    return reg.setPolicy(formNode.dataset.newstate, reg.overridenMinInterval);
  },

  onFormSubmit: function(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var formNode = evt.target,
        index = parseInt(formNode.dataset.index, 10),
        reg = registrations[index],
        action = formNode.className;

    if (!reg) {
      console.error('No registration for index: ' + index);
      return;
    }

    actions[action](formNode, reg)
    .then(function() {
      actions.listSync();
    })
    .catch(function(err) {
      console.error(action + ' failed: ' + err);
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

document.body.addEventListener('submit', actions.onFormSubmit, false);
