import getAllKeys from './get-all-keys';

export default function updated(elem, prev) {
  if (!prev) {
    return true;
  }

  // use get all keys so that we check Symbols as well as regular props
  // using a for loop so we can break early
  const allKeys = getAllKeys(prev);
  for (let i = 0; i < allKeys.length; i += 1) {
    if (prev[allKeys[i]] !== elem[allKeys[i]]) {
      return true;
    }
  }

  return false;
}
