/**
 * Manages UI relavant to blocking other players
 */
'use strict';

export function setUpUIForBlockingOtherUsers() {
  const blockedIPAddressesContainer = document.getElementById(
    'blocked-ip-addresses-container'
  );
  blockedIPAddressesContainer.addEventListener('click', (event) => {
    const target = event.target;
    // @ts-ignore
    if (target.tagName === 'TD') {
      Array.from(
        // @ts-ignore
        blockedIPAddressesContainer.getElementsByTagName('td')
      ).forEach((elem) => {
        elem.classList.remove('selected');
      });
      // @ts-ignore
      target.classList.add('selected');
    }
  });
}
