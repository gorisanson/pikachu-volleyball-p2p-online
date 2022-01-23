/**
 * Manages UI relevant to blocking other players
 */
'use strict';
import { getIfLocalStorageIsAvailable } from '../utils/is_local_storage_available';
import { blockedIPList } from './blocked_ip_list';
import { channel } from '../data_channel/data_channel';

const MAX_REMARK_LENGTH = 20;

const blockedIPAddressesTableTbody = document.querySelector(
  'table.blocked-ip-addresses-table tbody'
);
const deleteBtn = document.querySelector(
  'table.blocked-ip-addresses-table .delete-btn'
);
const blockThisPeerBtn = document.getElementById('block-this-peer-btn');

const isLocalStorageAvailable = getIfLocalStorageIsAvailable();

export function setUpUIForBlockingOtherUsers() {
  // @ts-ignore
  deleteBtn.disabled = true;
  // @ts-ignore
  blockThisPeerBtn.disabled = true;
  if (!isLocalStorageAvailable) {
    document
      .getElementById('blocked-ip-addresses-table-container')
      .classList.add('hidden');
    return;
  }

  let stringifiedBlockedIPListArrayView = null;
  try {
    stringifiedBlockedIPListArrayView = window.localStorage.getItem(
      'stringifiedBlockedIPListArrayView'
    );
  } catch (err) {
    console.log(err);
  }
  if (stringifiedBlockedIPListArrayView !== null) {
    const arrayView = JSON.parse(stringifiedBlockedIPListArrayView);
    // TODO: Remove the if statement below can after
    // the previous version localStorage caches of clients
    // can be considered to be all expired.
    if (arrayView.length > 0 && arrayView[0].length !== 4) {
      window.localStorage.removeItem('stringifiedBlockedIPListArrayView');
      location.reload();
    } else {
      blockedIPList.readArrayViewAndUpdate(arrayView);
    }
  }
  displayBlockedIPs(blockedIPList.createArrayView());
  displayNumberOfBlockedIPAddresses();

  document.body.addEventListener('click', (event) => {
    Array.from(
      // @ts-ignore
      blockedIPAddressesTableTbody.getElementsByTagName('tr')
    ).forEach((elem) => {
      elem.classList.remove('selected');
    });
    // @ts-ignore
    deleteBtn.disabled = true;
    const target = event.target;
    if (
      // @ts-ignore
      blockedIPAddressesTableTbody.contains(target) &&
      // @ts-ignore
      target.tagName === 'TD'
    ) {
      // select TR element which is parent element of TD element
      // @ts-ignore
      target.parentElement.classList.add('selected');
      // @ts-ignore
      deleteBtn.disabled = false;
    }
  });
  deleteBtn.addEventListener('click', () => {
    const selectedTRElement =
      blockedIPAddressesTableTbody.querySelector('.selected');
    // @ts-ignore
    blockedIPList.removeAt(Number(selectedTRElement.dataset.index));
    try {
      window.localStorage.setItem(
        'stringifiedBlockedIPListArrayView',
        JSON.stringify(blockedIPList.createArrayView())
      );
    } catch (err) {
      console.log(err);
    }
    displayBlockedIPs(blockedIPList.createArrayView());
    displayNumberOfBlockedIPAddresses();
  });

  const askAddThisPeerToBlockedListBox = document.getElementById(
    'ask-add-this-peer-to-blocked-list'
  );
  const askAddThisPeerToBlockedListYesBtn = document.getElementById(
    'ask-add-this-peer-to-blocked-list-yes-btn'
  );
  const askAddThisPeerToBlockedListNoBtn = document.getElementById(
    'ask-add-this-peer-to-blocked-list-no-btn'
  );
  const noticeAddingThisPeerToBlockedListIsCompletedBox =
    document.getElementById(
      'notice-adding-this-peer-to-blocked-list-is-completed'
    );
  blockThisPeerBtn.addEventListener('click', () => {
    document.getElementById(
      'partial-ip-address-of-this-peer-to-be-blocked'
    ).textContent = channel.peerPartialPublicIP;
    askAddThisPeerToBlockedListBox.classList.remove('hidden');
  });
  askAddThisPeerToBlockedListYesBtn.addEventListener('click', () => {
    // @ts-ignore
    blockThisPeerBtn.disabled = true;
    blockedIPList.AddStagedPeerHashedIPWithPeerPartialIP(
      channel.peerPartialPublicIP
    );
    try {
      window.localStorage.setItem(
        'stringifiedBlockedIPListArrayView',
        JSON.stringify(blockedIPList.createArrayView())
      );
    } catch (err) {
      console.log(err);
    }
    askAddThisPeerToBlockedListBox.classList.add('hidden');
    noticeAddingThisPeerToBlockedListIsCompletedBox.classList.remove('hidden');
  });
  askAddThisPeerToBlockedListNoBtn.addEventListener('click', () => {
    askAddThisPeerToBlockedListBox.classList.add('hidden');
  });
  document
    .getElementById(
      'notice-adding-this-peer-to-blocked-list-is-completed-exit-game-btn'
    )
    .addEventListener('click', () => {
      location.reload();
    });
  document
    .getElementById(
      'notice-adding-this-peer-to-blocked-list-is-completed-do-not-exit-game-btn'
    )
    .addEventListener('click', () => {
      noticeAddingThisPeerToBlockedListIsCompletedBox.classList.add('hidden');
    });
}

/**
 * Show blockThisPeerBtn and enable it if a peer's full public IP is available.
 */
export function showBlockThisPeerBtn() {
  if (!isLocalStorageAvailable) {
    return;
  }
  blockThisPeerBtn.classList.remove('hidden');
  if (blockedIPList.isPeerHashedIPStaged() && !blockedIPList.isFull()) {
    // @ts-ignore
    blockThisPeerBtn.disabled = false;
  }
}

/**
 * Display the given blocked IP list array view.
 * @param {[string, string, number, string][]} blockedIPs
 */
function displayBlockedIPs(blockedIPs) {
  // Clear the current displaying
  while (blockedIPAddressesTableTbody.firstChild) {
    blockedIPAddressesTableTbody.removeChild(
      blockedIPAddressesTableTbody.firstChild
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
    tdElementForIP.textContent = blockedIP[1];
    tdElementForTime.textContent = new Date(blockedIP[2]).toLocaleString();
    inputElement.value = blockedIP[3];
    inputElement.addEventListener('input', (event) => {
      // @ts-ignore
      const newRemark = event.target.value.slice(0, MAX_REMARK_LENGTH);
      inputElement.value = newRemark;
      blockedIPList.editRemarkAt(index, newRemark);
      try {
        window.localStorage.setItem(
          'stringifiedBlockedIPListArrayView',
          JSON.stringify(blockedIPList.createArrayView())
        );
      } catch (err) {
        console.log(err);
      }
    });
    blockedIPAddressesTableTbody.appendChild(trElement);
  });
}

/**
 * Display the number of blocked IPs in the list
 */
function displayNumberOfBlockedIPAddresses() {
  document.getElementById('number-of-blocked-ip-addresses').textContent =
    String(blockedIPList.length);
}
