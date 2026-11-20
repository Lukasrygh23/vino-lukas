export function supportsV13Applications() {
  return Boolean(foundry.appv1?.api?.Application);
}
