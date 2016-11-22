//@flow
export default function getDefaultValue (elem:any, name:string|Symbol, propDef:IPropDef):any {
  return typeof propDef.default === 'function' ? propDef.default(elem, { name }) : propDef.default;
}
