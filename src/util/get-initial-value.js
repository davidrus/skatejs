//@flow
export default function getInitialValue (elem:any, name:string|Symbol, propDef:IPropDef):any {
  return typeof propDef.initial === 'function' ? propDef.initial(elem, { name }) : propDef.initial;
}
