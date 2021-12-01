/**
 * Manages UI relevant to blocking other players
 */
'use strict';
import { getIfLocalStorageIsAvailable } from '../utils/is_local_storage_available';
import { blockedIPList } from './blocked_ip_list';
import { channel } from '../data_channel/data_channel';
import { getPartialIP } from '../data_channel/parse_candidate';

const MAX_REMARK_LENGTH = 20;

const blockedIPAddressesContainer = document.querySelector(
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
    // TODO: do something
    // local storage가 활성화되어 있지 않아 ip 차단 기능 이용이 불가능합니다.
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
    blockedIPList.readArrayViewAndUpdate(
      JSON.parse(stringifiedBlockedIPListArrayView)
    );
  }
  displayBlockedIPs(blockedIPList.createArrayView());
  displayNumberOfBlockedIPAddresses();

  document.body.addEventListener('click', (event) => {
    Array.from(
      // @ts-ignore
      blockedIPAddressesContainer.getElementsByTagName('tr')
    ).forEach((elem) => {
      elem.classList.remove('selected');
    });
    // @ts-ignore
    deleteBtn.disabled = true;
    const target = event.target;
    if (
      // @ts-ignore
      blockedIPAddressesContainer.contains(target) &&
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
      blockedIPAddressesContainer.querySelector('.selected');
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
  // TODO: localstorage 사용가능한지 디텍트해서 블락킹 사용 못한다고 메시지 띄우기
  // TODO: 클릭후 정말 추가할거냐는 메시지 띄우고 추가하고 나서는 버튼 비활성화
  blockThisPeerBtn.addEventListener('click', () => {
    document.getElementById(
      'partial-ip-address-of-this-peer-to-be-blocked'
    ).textContent = channel.peerPartialPublicIP;
    askAddThisPeerToBlockedListBox.classList.remove('hidden');
  });
  askAddThisPeerToBlockedListYesBtn.addEventListener('click', () => {
    // @ts-ignore
    blockThisPeerBtn.disabled = true;
    blockedIPList.add(channel.peerFullPublicIP);
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
  if (channel.peerFullPublicIP && !blockedIPList.isFull()) {
    // @ts-ignore
    blockThisPeerBtn.disabled = false;
  }
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
    blockedIPAddressesContainer.appendChild(trElement);
  });
}

/**
 * Display the number of blocked IPs in the list
 */
function displayNumberOfBlockedIPAddresses() {
  document.getElementById('number-of-blocked-ip-addresses').textContent =
    String(blockedIPList.length);
}
