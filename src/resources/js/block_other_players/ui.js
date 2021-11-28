/**
 * Manages UI relavant to blocking other players
 */
'use strict';

import { getPartialIP } from '../data_channel/parse_candidate';
import { blockedIPList } from './blocked_ip_list';

blockedIPList.readArrayViewAndUpdate([
  ['123.123.234.123', 1638021842754, ''],
  ['123.223.412.123', 1638021842756, ''],
  ['124.241.221.124', 16380218427556, ''],
  ['122.142.124.123', 1638021842754, ''],
]);

const blockedIPAddressesContainer = document.querySelector(
  'table.blocked-ip-addresses-table tbody'
);

export function setUpUIForBlockingOtherUsers() {
  displayBlockedIPs(blockedIPList.createArrayView());
  blockedIPAddressesContainer.addEventListener('click', (event) => {
    const target = event.target;
    // @ts-ignore
    if (target.tagName === 'TD') {
      Array.from(
        // @ts-ignore
        blockedIPAddressesContainer.getElementsByTagName('tr')
      ).forEach((elem) => {
        elem.classList.remove('selected');
      });
      // select TR element which is parent element of TD element
      // @ts-ignore
      target.parentElement.classList.add('selected');
    }
  });
  document
    .querySelector('table.blocked-ip-addresses-table .delete-btn')
    .addEventListener('click', () => {
      const selectedTRElement =
        blockedIPAddressesContainer.querySelector('.selected');
      // @ts-ignore
      blockedIPList.removeAt(Number(selectedTRElement.dataset.index));
      displayBlockedIPs(blockedIPList.createArrayView());
    });
}

/**
 * Display the given blocked IP list array view.
 * @param {[string, number, string][]} blockedIPs
 */
function displayBlockedIPs(blockedIPs) {
  // Clear the current displaying
  while (blockedIPAddressesContainer.firstChild) {
    blockedIPAddressesContainer.removeChild(
      blockedIPAddressesContainer.firstChild
    );
  }
  // Display the given list
  blockedIPs.forEach((blockedIP, index) => {
    const trElement = document.createElement('tr');
    const tdElementForIP = document.createElement('td');
    const tdElementForTime = document.createElement('td');
    const tdElementForRemark = document.createElement('td');
    const inputElement = document.createElement('input');
    tdElementForRemark.appendChild(inputElement);
    trElement.appendChild(tdElementForIP);
    trElement.appendChild(tdElementForTime);
    trElement.appendChild(tdElementForRemark);
    trElement.dataset.index = String(index);
    tdElementForIP.textContent = getPartialIP(blockedIP[0]);
    tdElementForTime.textContent = new Date(blockedIP[1]).toLocaleString();
    inputElement.value = blockedIP[2];
    blockedIPAddressesContainer.appendChild(trElement);
  });
}
