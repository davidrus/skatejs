//@flow
// import {
//   connected as $connected,
// } from '../util/symbols';
import empty from './empty';
import getDefaultValue from './get-default-value';
import getInitialValue from './get-initial-value';
import getPropData from './get-prop-data';
import syncAttrToProp from './sync-attr-to-prop';
import toNullString from './to-null-string';

/**
 * Removes or updates the attribute to match newAttrValue
 */
function updateAttrIfNeeded(elem:any, propDef:IPropDef, newAttrValue:?string) {

  // Normalize
  newAttrValue = toNullString(newAttrValue);

  const attrName:string = String(propDef.attrName);
  const currAttrValue:?string = toNullString(elem.getAttribute(attrName));

  if (currAttrValue !== newAttrValue) {

    // Prevent an unnecessary re-sync from syncAttrToProp
    const propData:any = getPropData(elem, propDef.name);
    propData.attrValueFromProp = newAttrValue;

    if (newAttrValue === null) {
      console.log('removing Attr', attrName);
      elem.removeAttribute(attrName);
    }
    else {
      console.log('setting attr', attrName, 'to', typeof newAttrValue, newAttrValue);
      elem.setAttribute(attrName, newAttrValue);
    }

  }
  else {
    console.log('setAttrIfNeeded NOT needed', attrName, 'is already', typeof currAttrValue, currAttrValue);
  }
}

function syncFirstTimePropToAttr (elem:any, propDef:IPropDef) {
  const propName:string|Symbol = propDef.name;
  const propData:any = getPropData(elem, propName);

  let syncAttrValue:any = propData.lastAssignedValue;
  if (empty(syncAttrValue)) {
    // todo: setter could have been called with undefined or null!
    // so we set this back to initial when connected again
    if ('initial' in propDef) {
      syncAttrValue = getInitialValue(elem, propName, propDef);
    } else if ('default' in propDef) {
      syncAttrValue = getDefaultValue(elem, propName, propDef);
    }
  }
  if (!empty(syncAttrValue) && propDef.serialize) {
    syncAttrValue = propDef.serialize(syncAttrValue);
  }

  if (!empty(syncAttrValue)) {
    // propData.syncingAttribute = true;
    // elem.setAttribute(attributeName, syncAttrValue);
    updateAttrIfNeeded(elem, propDef, syncAttrValue);
  }
  else{
    console.log('syncFirstTimePropToAttr', propName, 'NOT removed!');
    // init the prop from the attr
    if (propDef.attrName) {
      const attrValue:?string = toNullString(elem.getAttribute(propDef.attrName));
      if (attrValue !== null) {
        syncAttrToProp(elem, String(propDef.attrName), attrValue);
      }
    }

  }

}

function syncExistingPropToAttr (elem:any, propDef:IPropDef) {
  // // Sync attribute only if connected
  // if (!elem[$connected]) {
  //   console.log('syncPropToAttr STOP elem is not connected');
  //   return;
  // }
  const propName:string|Symbol = propDef.name;
  const propData:any = getPropData(elem, propName);

  // Don't sync back the attribute when called from syncAttrToProp
  if (propData.settingProp) {
    propData.settingProp = false;
    console.log('syncExistingPropToAttr', propName, 'STOPPED called from syncAttrToProp propVal:', typeof propData.internalValue, propData.internalValue);
    return;
  }

  // let newAttrValue:?string = null;
  // // // const defaultValue:any = getDefaultValue(elem, propName, propDef);
  // // // if (propData.internalValue !== defaultValue) {
  // //   newAttrValue = toNullString(propDef.serialize(propData.internalValue));
  // // // }


  const { internalValue } = propData;
  const serializedValue:?string = toNullString(propDef.serialize(internalValue));
  const currentAttrValue:?string = toNullString(elem.getAttribute(propDef.attrName));
  const serializedIsEmpty:boolean = empty(serializedValue);
  const attributeChanged:boolean = !(
    (serializedIsEmpty && empty(currentAttrValue)) || serializedValue === currentAttrValue
  );

  updateAttrIfNeeded(elem, propDef, serializedValue);
}


export default function syncPropToAttr (elem:any, propDef:IPropDef, isFirstSync:boolean) {
  // Must have a linked attribute
  if (propDef.attrName) {
    if (isFirstSync) {
      // todo: called when component is Connected. not only the first time!
      syncFirstTimePropToAttr(elem, propDef);
    } else {
      syncExistingPropToAttr(elem, propDef);
    }
  }
}