//@flow
import data from './data';
import getDefaultValue from './get-default-value';
import {getPropDefs} from './cached-prop-defs';
import toNullString from './to-null-string';

export default function syncAttrToProp (elem:any, attrName:string, newValue:?string) {

  const propName:string|Symbol = data(elem, 'attributeLinks')[attrName];

  // Must be linked to a prop.
  if (!propName) {
    return;
  }

  const propData = data(elem, 'props')[propName];
  const newAttrValue:?string = toNullString(newValue);

  // Don't sync back the prop if attribute was set from syncPropToAttr
  let mustSyncProp:boolean = true;
  if (propData.attrValueFromProp !== undefined) {
    if (propData.attrValueFromProp === newAttrValue) {
      console.log('ignore attr change. it was set from prop', typeof propData.attrValueFromProp, propData.attrValueFromProp);
      mustSyncProp = false;
    }
    else {
      console.warn('ignore attr change. different value', propData.attrValueFromProp, newAttrValue);
    }
    delete propData.attrValueFromProp;
  }

  if (!mustSyncProp) {
    return;
  }

  console.log('syncAttrToProp', attrName, 'attr value:', typeof newValue, newValue);

  const propDef:IPropDef = getPropDefs(elem.constructor)[propName];

  // let currSerializedValue:?string = null;
  // const defaultValue:any = getDefaultValue(elem, propName, propDef);
  // if (propData.internalValue !== defaultValue) {
  //   currSerializedValue = toNullString(propDef.serialize(propData.internalValue));
  // }
  //
  // if (currSerializedValue === newAttrValue) {
  //   // prop is already in sync
  //   //console.log('prop is already in sync.');
  //   // todo: should we just schedule a re-render anyway?
  //   return;
  // }

  //const newPropVal:any = propDef.deserialize(newAttrValue);

  const newPropVal:any = newAttrValue !== null && propDef.deserialize
    ? propDef.deserialize(newAttrValue)
    : newAttrValue;

  // Sync prop but prevent a re-sync back to attribute
  console.log('syncProp', propName, 'to', typeof newPropVal, newPropVal);
  propData.settingProp = true;
  elem[propName] = newPropVal;
  propData.settingProp = false;
}
