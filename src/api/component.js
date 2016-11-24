import { patchInner } from 'incremental-dom';
import {
  connected as $connected,
  created as $created,
  ctor_props as $ctor_props,
  ctor_createInitProps as $ctor_createInitProps,
  props as $props,
  renderer as $renderer,
  rendererDebounced as $rendererDebounced,
  rendering as $rendering,
  updated as $updated
} from '../util/symbols';
import assign from '../util/assign';
import createSymbol from '../util/create-symbol';
import data from '../util/data';
import dashCase from '../util/dash-case';
import debounce from '../util/debounce';
import getAllKeys from '../util/get-all-keys';
import getOwnPropertyDescriptors from '../util/get-own-property-descriptors';
import {getPropConfigs, getPropConfigsCount} from '../util/cached-prop-configs';
import getSetProps from './props';
import initProps from '../lifecycle/props-init';
import syncPropToAttr from '../util/sync-prop-to-attr';
import root from 'window-or-global';
import renderer from '../util/lifecycle-renderer';
import rendered from '../util/lifecycle-rendered';
import updated from '../util/lifecycle-updated';

const HTMLElement = root.HTMLElement || class {};
const _prevName = createSymbol('prevName');
const _prevOldValue = createSymbol('prevOldValue');
const _prevNewValue = createSymbol('prevNewValue');

function preventDoubleCalling (elem, name, oldValue, newValue) {
  return name === elem[_prevName] &&
    oldValue === elem[_prevOldValue] &&
    newValue === elem[_prevNewValue];
}

function syncPropsToAttrs (elem) {
  const props = getPropConfigs(elem.constructor);
  Object.keys(props).forEach((propName) => {
    const prop = props[propName];
    syncPropToAttr(elem, prop, propName, true);
  });
}

// TODO remove when not catering to Safari < 10.
//
// Ensures that definitions passed as part of the constructor are functions
// that return property definitions used on the element.
function ensurePropertyFunctions (Ctor) {
  const props = getPropConfigs(Ctor);
  return getAllKeys(props).reduce((descriptors, descriptorName) => {
    descriptors[descriptorName] = props[descriptorName];
    if (typeof descriptors[descriptorName] !== 'function') {
      descriptors[descriptorName] = initProps(descriptors[descriptorName]);
    }
    return descriptors;
  }, {});
}

// TODO remove when not catering to Safari < 10.
//
// This can probably be simplified into createInitProps().
function ensurePropertyDefinitions (Ctor) {
  const props = ensurePropertyFunctions(Ctor);
  return getAllKeys(props).reduce((descriptors, descriptorName) => {
    descriptors[descriptorName] = props[descriptorName](descriptorName);
    return descriptors;
  }, {});
}

// TODO refactor when not catering to Safari < 10.
//
// We should be able to simplify this where all we do is Object.defineProperty().
function createInitProps (Ctor) {
  const props = ensurePropertyDefinitions(Ctor);

  return (elem) => {
    if (!props) {
      return;
    }

    getAllKeys(props).forEach((name) => {
      const prop = props[name];
      prop.created(elem);

      // We check here before defining to see if the prop was specified prior
      // to upgrading.
      const hasPropBeforeUpgrading = name in elem;

      // This is saved prior to defining so that we can set it after it it was
      // defined prior to upgrading. We don't want to invoke the getter if we
      // don't need to, so we only get the value if we need to re-sync.
      const valueBeforeUpgrading = hasPropBeforeUpgrading && elem[name];

      // https://bugs.webkit.org/show_bug.cgi?id=49739
      //
      // When Webkit fixes that bug so that native property accessors can be
      // retrieved, we can move defining the property to the prototype and away
      // from having to do if for every instance as all other browsers support
      // this.
      Object.defineProperty(elem, name, prop);

      // DEPRECATED
      //
      // We'll be removing get / set callbacks on properties. Use the
      // updatedCallback() instead.
      //
      // We re-set the prop if it was specified prior to upgrading because we
      // need to ensure set() is triggered both in polyfilled environments and
      // in native where the definition may be registerd after elements it
      // represents have already been created.
      if (hasPropBeforeUpgrading) {
        elem[name] = valueBeforeUpgrading;
      }
    });
  };
}

export default class extends HTMLElement {
  static get observedAttributes () {
    const props = getPropConfigs(this);
    return Object.keys(props).map(key => {
      const { attribute } = props[key];
      return attribute === true ? dashCase(key) : attribute;
    }).filter(Boolean);
  }
  static set observedAttributes (value) {
    Object.defineProperty(this, 'observedAttributes', { configurable: true, value });
  }

  // returns inherited super props overwritten with this Component props
  static get props () {
    return assign({}, super.props, this[$ctor_props]);
  }
  static set props (value) {
    this[$ctor_props] = value;
  }

  constructor () {
    super();

    const { constructor } = this;

    // Used for the ready() function so it knows when it can call its callback.
    this[$created] = true;

    // TODO refactor to not cater to Safari < 10. This means we can depend on
    // built-in property descriptors.
    // Note: createInitProps must exist on the constructor and not from an inherited Component
    if (!constructor.hasOwnProperty($ctor_createInitProps)) {
      constructor[$ctor_createInitProps] = createInitProps(constructor);
    }

    // Set up a renderer that is debounced for property sets to call directly.
    this[$rendererDebounced] = debounce(this[$renderer].bind(this));

    // Set up property lifecycle.
    if (getPropConfigsCount(constructor) && constructor[$ctor_createInitProps]) {
      constructor[$ctor_createInitProps](this);
    }

    // DEPRECATED
    //
    // static render()
    if (!this.renderCallback && constructor.render) {
      this.renderCallback = constructor.render.bind(constructor, this);
    }

    // DEPRECATED
    //
    // static created()
    //
    // Props should be set up before calling this.
    if (typeof constructor.created === 'function') {
      constructor.created(this);
    }

    // DEPRECATED
    //
    // Feature has rarely been used.
    //
    // Created should be set before invoking the ready listeners.
    const elemData = data(this);
    const readyCallbacks = elemData.readyCallbacks;
    if (readyCallbacks) {
      readyCallbacks.forEach(cb => cb(this));
      delete elemData.readyCallbacks;
    }
  }

  // Custom Elements v1
  connectedCallback () {
    const { constructor } = this;

    // DEPRECATED
    //
    // No more reflecting back to attributes in favour of one-way reflection.
    syncPropsToAttrs(this);

    // Used to check whether or not the component can render.
    this[$connected] = true;

    // Render!
    this[$rendererDebounced]();

    // DEPRECATED
    //
    // static attached()
    if (typeof constructor.attached === 'function') {
      constructor.attached(this);
    }

    // DEPRECATED
    //
    // We can remove this once all browsers support :defined.
    this.setAttribute('defined', '');
  }

  // Custom Elements v1
  disconnectedCallback () {
    const { constructor } = this;

    // Ensures the component can't be rendered while disconnected.
    this[$connected] = false;

    // DEPRECATED
    //
    // static detached()
    if (typeof constructor.detached === 'function') {
      constructor.detached(this);
    }
  }

  // Custom Elements v1
  attributeChangedCallback (name, oldValue, newValue) {
    // Polyfill calls this twice.
    if (preventDoubleCalling(this, name, oldValue, newValue)) {
      return;
    }

    // Set data so we can prevent double calling if the polyfill.
    this[_prevName] = name;
    this[_prevOldValue] = oldValue;
    this[_prevNewValue] = newValue;

    const { attributeChanged } = this.constructor;
    const propertyName = data(this, 'attributeLinks')[name];

    if (propertyName) {
      const propData = data(this, 'props')[propertyName];

      // This ensures a property set doesn't cause the attribute changed
      // handler to run again once we set this flag. This only ever has a
      // chance to run when you set an attribute, it then sets a property and
      // then that causes the attribute to be set again.
      if (propData.syncingAttribute) {
        propData.syncingAttribute = false;
      } else {
        // Sync up the property.
        const propOpts = getPropConfigs(this.constructor)[propertyName];
        propData.settingAttribute = true;
        const newPropVal = newValue !== null && propOpts.deserialize
          ? propOpts.deserialize(newValue)
          : newValue;
        this[propertyName] = newPropVal;
      }
    }

    if (attributeChanged) {
      attributeChanged(this, { name, newValue, oldValue });
    }
  }

  updatedCallback (prev) {
    return updated(this, prev);
  }

  renderedCallback () {
    return rendered(this);
  }

  rendererCallback () {
    return renderer(this);
  }

  // Skate
  //
  // Invokes the complete render lifecycle.
  [$renderer] () {
    if (this[$rendering] || !this[$connected]) {
      return;
    }

    // Flag as rendering. This prevents anything from trying to render - or
    // queueing a render - while there is a pending render.
    this[$rendering] = true;

    if (this[$updated]() && typeof this.renderCallback === 'function') {
      this.rendererCallback();
      this.renderedCallback();
    }

    this[$rendering] = false;
  }

  // Skate
  //
  // Calls the user-defined updated() lifecycle callback.
  [$updated] () {
    const prev = this[$props];
    this[$props] = getSetProps(this);
    return this.updatedCallback(prev);
  }

  // Skate
  static extend (definition = {}, Base = this) {
    // Create class for the user.
    class Ctor extends Base {}

    // For inheriting from the object literal.
    const opts = getOwnPropertyDescriptors(definition);
    const prot = getOwnPropertyDescriptors(definition.prototype);

    // Prototype is non configurable (but is writable).
    delete opts.prototype;

    // Pass on static and instance members from the definition.
    Object.defineProperties(Ctor, opts);
    Object.defineProperties(Ctor.prototype, prot);

    return Ctor;
  }

  // Skate
  //
  // DEPRECATED
  //
  static updated (elem, prev) {
    return updated(elem, prev);
  }

  // Skate
  //
  // DEPRECATED
  //
  static rendered () {
    rendered();
  }

  // Skate
  //
  // DEPRECATED
  //
  static renderer (elem) {
    renderer(elem);
  }
}
